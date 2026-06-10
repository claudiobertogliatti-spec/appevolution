/**
 * Upload resiliente browser → GCS (sessione resumable) per i video dei partner.
 *
 * Sostituisce la vecchia PUT single-shot: con file da 2-4 GB su connessioni
 * domestiche, un singolo calo di rete al 90% buttava via l'intero upload.
 *
 * Strategia:
 *  - upload a CHUNK da 32 MiB (multiplo di 256 KiB, requisito GCS)
 *  - dopo ogni errore: query dell'offset committato (PUT "bytes *​/N" → 308 + Range)
 *    e ripresa ESATTAMENTE da lì — si perde al massimo un chunk, mai il file
 *  - retry con backoff esponenziale + attesa del ritorno online (navigator.onLine)
 *  - la sessione (upload_url) è persistita in localStorage: se il partner chiude
 *    o ricarica la pagina e ri-seleziona lo stesso file, l'upload riparte
 *    dall'offset già caricato (le sessioni GCS valgono ~7 giorni)
 *
 * Uso:
 *   const { gcs_path } = await uploadVideoResumable({
 *     api: API,
 *     sessionBody: { partner_id, video_type, lesson_id?, filename, content_type },
 *     file,
 *     onProgress: (pct) => ...,        // 0-100
 *     onStatus: (msg) => ...,          // messaggi umani ("Riconnessione...", ...)
 *   });
 */

const CHUNK_SIZE = 32 * 1024 * 1024; // 32 MiB — multiplo di 256 KiB
const MAX_ATTEMPTS = 10;             // tentativi consecutivi falliti prima di arrendersi

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function storageKey(sessionBody, file) {
  const { partner_id, video_type, lesson_id } = sessionBody;
  return `gcs-upload:${partner_id}:${video_type}:${lesson_id || "-"}:${file.name}:${file.size}:${file.lastModified}`;
}

function waitForOnline(onStatus) {
  if (navigator.onLine) return Promise.resolve();
  if (onStatus) onStatus("Connessione assente — in attesa che torni la rete...");
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener("online", handler);
      resolve();
    };
    window.addEventListener("online", handler);
  });
}

/**
 * PUT di un chunk. Risolve con { status, rangeEnd }.
 *  - 308: chunk accettato, upload incompleto (rangeEnd = ultimo byte committato)
 *  - 200/201: upload completato e oggetto finalizzato
 * Rigetta su errori di rete o status inattesi.
 */
function putChunk(uploadUrl, file, start, end, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${file.size}`);
    xhr.timeout = 10 * 60 * 1000; // 10 min per chunk: largo anche per upload lenti
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.min(99, Math.round(((start + e.loaded) / file.size) * 100));
        onProgress(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range"); // "bytes=0-X"
        const m = range && range.match(/bytes=0-(\d+)/);
        resolve({ status: 308, rangeEnd: m ? parseInt(m[1], 10) : end - 1 });
      } else if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, rangeEnd: file.size - 1 });
      } else {
        reject(new Error(`GCS HTTP ${xhr.status}`));
      }
    };
    xhr.ontimeout = () => reject(new Error("Timeout di rete sul chunk"));
    xhr.onerror = () => reject(new Error("Errore di rete sul chunk"));
    xhr.send(file.slice(start, end));
  });
}

/**
 * Chiede a GCS quanti byte ha già committato per questa sessione.
 * Ritorna: offset (byte successivo da inviare), oppure:
 *  - file.size se l'upload risulta già completato
 *  - lancia { sessionDead: true } se la sessione non è più valida (404/410/400)
 */
function queryCommittedOffset(uploadUrl, fileSize) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Range", `bytes */${fileSize}`);
    xhr.timeout = 30 * 1000;
    xhr.onload = () => {
      if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range");
        const m = range && range.match(/bytes=0-(\d+)/);
        resolve(m ? parseInt(m[1], 10) + 1 : 0);
      } else if (xhr.status >= 200 && xhr.status < 300) {
        resolve(fileSize); // già completato
      } else if ([400, 404, 410].includes(xhr.status)) {
        const e = new Error("Sessione di upload scaduta");
        e.sessionDead = true;
        reject(e);
      } else {
        reject(new Error(`Query offset fallita (HTTP ${xhr.status})`));
      }
    };
    xhr.ontimeout = () => reject(new Error("Timeout sulla query offset"));
    xhr.onerror = () => reject(new Error("Errore di rete sulla query offset"));
    xhr.send(null);
  });
}

async function createSession(api, sessionBody) {
  const res = await fetch(`${api}/api/partner-journey/video/request-upload-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionBody),
  });
  if (!res.ok) throw new Error(`Sessione upload fallita (HTTP ${res.status})`);
  return res.json(); // { upload_url, gcs_path, ... }
}

export async function uploadVideoResumable({ api, sessionBody, file, onProgress, onStatus }) {
  const key = storageKey(sessionBody, file);

  // 1. Riusa la sessione persistita (ripresa dopo refresh/chiusura pagina), altrimenti creane una
  let session = null;
  let offset = 0;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      session = JSON.parse(stored);
      offset = await queryCommittedOffset(session.upload_url, file.size);
      if (offset > 0 && onStatus) {
        onStatus(`Ripresa upload dal ${Math.round((offset / file.size) * 100)}% già caricato`);
      }
    }
  } catch (e) {
    session = null; // sessione morta o storage corrotto → si riparte puliti
    offset = 0;
  }
  if (!session) {
    session = await createSession(api, sessionBody);
    try {
      localStorage.setItem(key, JSON.stringify({ upload_url: session.upload_url, gcs_path: session.gcs_path }));
    } catch (e) { /* storage pieno: si procede senza persistenza */ }
  }

  // 2. Loop a chunk con ripresa automatica
  let failures = 0;
  while (offset < file.size) {
    await waitForOnline(onStatus);
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    try {
      const { status, rangeEnd } = await putChunk(session.upload_url, file, offset, end, onProgress);
      offset = status === 308 ? rangeEnd + 1 : file.size;
      failures = 0;
      if (onStatus) onStatus(null); // tutto ok, pulisci eventuali messaggi
    } catch (err) {
      failures += 1;
      if (failures >= MAX_ATTEMPTS) {
        throw new Error(
          "Upload interrotto dopo ripetuti errori di rete. Il progresso è salvato: " +
          "ri-seleziona lo stesso file per riprendere da dove eri."
        );
      }
      const backoff = Math.min(30000, 1000 * 2 ** failures);
      if (onStatus) onStatus(`Problema di rete — nuovo tentativo tra ${Math.round(backoff / 1000)}s (${failures}/${MAX_ATTEMPTS})...`);
      await sleep(backoff);
      await waitForOnline(onStatus);
      // Chiedi a GCS dove eravamo rimasti: si riprende dall'offset reale
      try {
        offset = await queryCommittedOffset(session.upload_url, file.size);
      } catch (qErr) {
        if (qErr.sessionDead) {
          // Sessione scaduta (>7gg o invalidata): nuova sessione, si riparte da zero
          if (onStatus) onStatus("Sessione scaduta — creo una nuova sessione di upload...");
          session = await createSession(api, sessionBody);
          localStorage.setItem(key, JSON.stringify({ upload_url: session.upload_url, gcs_path: session.gcs_path }));
          offset = 0;
        }
        // altri errori sulla query: il loop ritenta col prossimo giro
      }
    }
  }

  if (onProgress) onProgress(100);
  localStorage.removeItem(key); // upload completo: niente più da riprendere
  return { gcs_path: session.gcs_path };
}
