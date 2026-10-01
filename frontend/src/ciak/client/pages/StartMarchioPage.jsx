import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clientGet, clientPut, getClientToken } from "../api";

/**
 * Il marchio di Ciak Start: scelte semplici, una schermata alla volta.
 * Niente codici colore né termini da grafico: si sceglie fra opzioni pronte,
 * e logo e foto si caricano solo se già ci sono. Le opzioni arrivano dal server.
 */
const PASSI = ["colori", "lettere", "voce", "parole", "logo", "foto"];
const TITOLI = {
  colori: "Quali colori ti somigliano di più?",
  lettere: "Quali lettere vuoi usare per il tuo nome?",
  voce: "Come vuoi parlare alle persone?",
  parole: "Tre parole che descrivono il tuo lavoro",
  logo: "Hai già un logo?",
  foto: "Una tua foto",
};

function Palette({ colori }) {
  return (
    <span className="flex overflow-hidden rounded-lg border border-slate-200" aria-hidden="true">
      {colori.map((c) => (
        <span key={c} className="h-9 w-12" style={{ background: c }} />
      ))}
    </span>
  );
}

async function caricaFile(file, clientId) {
  const fd = new FormData();
  fd.append("file", file);
  // notify=false: il team vede l'invio dal pannello, non da un avviso per file.
  const res = await fetch(`/api/partner-journey/operativo/upload/${clientId}?notify=false`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getClientToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error("upload");
  const dati = await res.json();
  return dati.url;
}

export function StartMarchioPage({ dashboard }) {
  const clientId = dashboard?.client?.id;
  const [opzioni, setOpzioni] = useState(null);
  const [valori, setValori] = useState({});
  const [passo, setPasso] = useState(0);
  const [caricamento, setCaricamento] = useState(true);
  const [inviato, setInviato] = useState(false);
  const [modifica, setModifica] = useState(false);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState("");
  const [invio, setInvio] = useState(false);
  const [carico, setCarico] = useState(false);
  const titoloRef = useRef(null);

  useEffect(() => {
    let annullato = false;
    clientGet("/start/marchio")
      .then((dati) => {
        if (annullato) return;
        setOpzioni(dati.opzioni);
        setValori(dati.valori || {});
        setInviato(Boolean(dati.completato_at));
      })
      .catch((e) => {
        if (!annullato) setErrore(e.message === "AUTH_EXPIRED" ? "La sessione è scaduta: riapri il link che ti abbiamo mandato." : "Non riesco a caricare questa pagina. Riprova fra poco.");
      })
      .finally(() => {
        if (!annullato) setCaricamento(false);
      });
    return () => {
      annullato = true;
    };
  }, []);

  // Le lettere si vedono davvero: si caricano i font solo per l'anteprima.
  useEffect(() => {
    if (!opzioni) return undefined;
    const famiglie = opzioni.font.map((f) => `family=${f.famiglia.replace(/ /g, "+")}:wght@500;700`).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${famiglie}&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [opzioni]);

  useEffect(() => {
    if (titoloRef.current) titoloRef.current.focus();
  }, [passo, inviato, modifica]);

  async function salva(parziale) {
    setSalvataggio("Salvo...");
    try {
      const r = await clientPut("/start/marchio", { valori: parziale });
      setValori((v) => ({ ...v, ...r.valori }));
      setSalvataggio("Salvato");
      setErrore("");
      return true;
    } catch (e) {
      setSalvataggio("");
      setErrore("Non sono riuscito a salvare. Controlla la connessione e riprova.");
      return false;
    }
  }

  async function scegli(parziale) {
    setValori((v) => ({ ...v, ...parziale }));
    await salva(parziale);
  }

  async function vai(delta) {
    const corrente = PASSI[passo];
    const daSalvare = corrente === "parole" ? { parole_chiave: valori.parole_chiave || [] } : null;
    if (daSalvare && !(await salva(daSalvare))) return;
    setPasso((p) => Math.min(Math.max(p + delta, 0), PASSI.length - 1));
  }

  async function sceglieFile(tipo, file) {
    if (!file) return;
    setCarico(true);
    setErrore("");
    try {
      const url = await caricaFile(file, clientId);
      await scegli({ [tipo]: url });
    } catch (e) {
      setErrore("Non sono riuscito a caricare il file. Prova con un'immagine più leggera, oppure salta e la mandi dopo.");
    } finally {
      setCarico(false);
    }
  }

  async function invia() {
    setInvio(true);
    setErrore("");
    try {
      await clientPut("/start/marchio", { valori: {}, completato: true });
      setInviato(true);
      setModifica(false);
    } catch (e) {
      if (e.mancanti && e.mancanti.length) {
        const mappa = { palette_id: 0, font_id: 1, tono_id: 2, parole_chiave: 3 };
        setPasso(mappa[e.mancanti[0]] ?? 0);
        setErrore("Manca ancora una scelta: l'ho aperta qui sotto.");
      } else {
        setErrore("Non sono riuscito a inviare. Riprova fra poco.");
      }
    } finally {
      setInvio(false);
    }
  }

  if (caricamento) return <p className="text-sm text-slate-500">Un attimo, preparo la pagina...</p>;
  if (!opzioni) return <p className="text-sm text-red-700">{errore}</p>;

  if (inviato && !modifica) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" data-testid="marchio-inviato">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 ref={titoloRef} tabIndex={-1} className="mt-2 text-2xl font-semibold text-slate-900 outline-none">
          Grazie, abbiamo le tue scelte
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Con i tuoi colori, le tue lettere e il tuo modo di parlare prepariamo il tuo marchio. Prima di
          mandartelo lo controlliamo noi.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/cliente/start"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-yellow-400 px-6 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300"
          >
            Torna al tuo percorso
          </Link>
          <button
            type="button"
            onClick={() => {
              setPasso(0);
              setModifica(true);
            }}
            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500"
          >
            Voglio cambiare qualcosa
          </button>
        </div>
      </section>
    );
  }

  const corrente = PASSI[passo];
  const ultimo = passo === PASSI.length - 1;
  const parole = valori.parole_chiave || [];
  const paroleOk = parole.filter((p) => (p || "").trim()).length >= 3;
  const avantiOk =
    (corrente === "colori" && Boolean(valori.palette_id)) ||
    (corrente === "lettere" && Boolean(valori.font_id)) ||
    (corrente === "voce" && Boolean(valori.tono_id)) ||
    (corrente === "parole" && paroleOk) ||
    corrente === "logo" ||
    corrente === "foto";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
        Il tuo marchio · {passo + 1} di {PASSI.length}
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={PASSI.length}
        aria-valuenow={passo + 1}
        aria-label="Avanzamento"
      >
        <div className="h-full bg-yellow-400" style={{ width: `${((passo + 1) / PASSI.length) * 100}%` }} />
      </div>

      <h1 ref={titoloRef} tabIndex={-1} className="mt-5 text-xl font-semibold leading-snug text-slate-900 outline-none sm:text-2xl">
        {TITOLI[corrente]}
      </h1>

      {corrente === "colori" && (
        <div className="mt-4 space-y-3" role="radiogroup" aria-label="Colori">
          <p className="text-sm text-slate-600">Scegli quella che senti più tua. Potrai sempre cambiarla.</p>
          {opzioni.palette.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={valori.palette_id === p.id}
              onClick={() => scegli({ palette_id: p.id })}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors duration-200 ${valori.palette_id === p.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
            >
              <Palette colori={p.colori} />
              <span>
                <span className="block text-base font-semibold text-slate-900">{p.nome}</span>
                <span className="block text-sm text-slate-600">{p.descrizione}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {corrente === "lettere" && (
        <div className="mt-4 space-y-3" role="radiogroup" aria-label="Lettere">
          <p className="text-sm text-slate-600">Questo è il modo in cui si vedrà il tuo nome ovunque.</p>
          {opzioni.font.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={valori.font_id === f.id}
              onClick={() => scegli({ font_id: f.id })}
              className={`w-full rounded-xl border-2 p-4 text-left transition-colors duration-200 ${valori.font_id === f.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
            >
              <span className="block text-2xl text-slate-900" style={{ fontFamily: `'${f.famiglia}', system-ui, sans-serif`, fontWeight: 700 }}>
                {(dashboard?.client?.name || "Il tuo nome").trim()}
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{f.nome}.</span> {f.descrizione}
              </span>
            </button>
          ))}
        </div>
      )}

      {corrente === "voce" && (
        <div className="mt-4 space-y-3" role="radiogroup" aria-label="Modo di parlare">
          <p className="text-sm text-slate-600">Pensa a come parli quando spieghi qualcosa a una persona che ti ascolta.</p>
          {opzioni.toni.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={valori.tono_id === t.id}
              onClick={() => scegli({ tono_id: t.id })}
              className={`w-full rounded-xl border-2 p-4 text-left text-base font-semibold text-slate-900 transition-colors duration-200 ${valori.tono_id === t.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
            >
              {t.nome}
            </button>
          ))}
        </div>
      )}

      {corrente === "parole" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">Parole semplici, per esempio: calma, ascolto, concretezza.</p>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <label htmlFor={`parola-${i}`} className="sr-only">
                Parola {i + 1}
              </label>
              <input
                id={`parola-${i}`}
                type="text"
                maxLength={40}
                value={parole[i] || ""}
                onChange={(e) => {
                  const prossime = [0, 1, 2].map((k) => parole[k] || "");
                  prossime[i] = e.target.value;
                  setValori((v) => ({ ...v, parole_chiave: prossime }));
                }}
                placeholder={`Parola ${i + 1}`}
                className="w-full rounded-xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-yellow-400"
              />
            </div>
          ))}
        </div>
      )}

      {(corrente === "logo" || corrente === "foto") && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            {corrente === "logo"
              ? "Se ce l'hai, caricalo qui. Se non ce l'hai, va benissimo: partiamo dal tuo nome."
              : "Una foto in cui ti piaci, con il viso ben visibile. Se non ce l'hai a portata di mano, puoi saltare e mandarla dopo."}
          </p>
          {valori[corrente === "logo" ? "logo_url" : "foto_url"] ? (
            <img
              src={valori[corrente === "logo" ? "logo_url" : "foto_url"]}
              alt={corrente === "logo" ? "Il tuo logo" : "La tua foto"}
              className="max-h-48 rounded-xl border border-slate-200 object-contain"
            />
          ) : null}
          <label className="inline-flex min-h-[48px] cursor-pointer items-center rounded-xl border-2 border-dashed border-slate-300 px-5 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500 focus-within:ring-2 focus-within:ring-yellow-400">
            {carico ? "Carico..." : valori[corrente === "logo" ? "logo_url" : "foto_url"] ? "Scegli un altro file" : "Scegli un'immagine"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={carico}
              onChange={(e) => sceglieFile(corrente === "logo" ? "logo_url" : "foto_url", e.target.files?.[0])}
            />
          </label>
        </div>
      )}

      <p className="mt-4 min-h-[1.25rem] text-sm" aria-live="polite">
        {errore ? <span className="text-red-700">{errore}</span> : <span className="text-slate-400">{salvataggio}</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => vai(-1)}
          disabled={passo === 0}
          className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500 disabled:opacity-40"
        >
          Indietro
        </button>
        {ultimo ? (
          <button
            type="button"
            onClick={invia}
            disabled={invio || carico}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300 disabled:opacity-50"
          >
            {invio ? "Invio..." : "Invia le mie scelte"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => vai(1)}
            disabled={!avantiOk}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300 disabled:opacity-50"
          >
            {corrente === "logo" && !valori.logo_url ? "Non ce l'ho, avanti" : "Avanti"}
          </button>
        )}
      </div>
    </section>
  );
}
