import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

/**
 * Step 7 — Carica il video grezzo della masterclass.
 *
 * Il video grezzo (centinaia di MB) NON passa dal backend: Cloud Run rifiuta
 * ogni richiesta sopra ~32 MB con HTTP 413. Usiamo il flusso a 3 passi:
 *   1. POST /video/request-upload-session → sessione GCS resumable (upload_url)
 *   2. PUT diretto del file su GCS (bypassa Cloud Run, progress nativo)
 *   3. POST /video/confirm-upload → registra gcs_path + avvia la pipeline Celery
 *      (taglio filler, transcript, render, upload YouTube → ready_for_review)
 */
export default function Step07RegistraMasterclass({ step, partnerId, onComplete, onSaveDraft }) {
  // Compat: i partner con il vecchio schema hanno video_url; il nuovo schema usa
  // video_submitted (il video è in elaborazione, non c'è un URL riproducibile).
  const alreadyDone = !!(step?.data?.video_submitted || step?.data?.video_url);
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [fileName, setFileName] = useState(step?.data?.filename || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [progress, setProgress] = useState(0);

  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setProgress(0);
    const contentType = file.type || "video/mp4";
    try {
      // 1. Sessione di upload diretto su GCS
      const sessRes = await fetch(`${API}/api/partner-journey/video/request-upload-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          video_type: "masterclass",
          filename: file.name,
          content_type: contentType,
        }),
      });
      if (!sessRes.ok) throw new Error(`Sessione upload fallita (HTTP ${sessRes.status})`);
      const { upload_url, gcs_path } = await sessRes.json();

      // 2. PUT diretto del file su GCS (con progress)
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", contentType);
        // Single-shot resumable: dichiara la dimensione totale così GCS finalizza
        // l'oggetto in un'unica PUT (la sessione è stata creata con size sconosciuta).
        if (file.size > 0) {
          xhr.setRequestHeader("Content-Range", `bytes 0-${file.size - 1}/${file.size}`);
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload su GCS fallito (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Errore di rete durante l'upload"));
        xhr.send(file);
      });

      // 3. Conferma → avvia la pipeline
      const confRes = await fetch(`${API}/api/partner-journey/video/confirm-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          video_type: "masterclass",
          gcs_path,
        }),
      });
      if (!confRes.ok) throw new Error(`Conferma fallita (HTTP ${confRes.status})`);

      setFileName(file.name);
      setSubmitted(true);
      onSaveDraft({
        video_submitted: true,
        gcs_path,
        filename: file.name,
        video_pipeline_status: "queued",
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <StepBase
      eyebrow="Step 7 — Masterclass"
      title="Carica il video grezzo della masterclass"
      ctaDisabled={!submitted || busy}
      onCta={() => onComplete({ video_submitted: true, filename: fileName })}
      secondaryNote="MP4 o MOV, anche grezzo senza editing. Ci pensiamo noi al taglio e al render finale."
    >
      <label className={`block border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition ${submitted ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"} ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <input
          type="file"
          accept="video/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => handle(e.target.files?.[0])}
        />
        {submitted ? (
          <div className="text-sm text-green-700">
            ✓ Video caricato{fileName ? ` — ${fileName}` : ""}<br />
            <span className="text-xs text-green-600">In elaborazione: lo tagliamo e renderizziamo noi. Lo trovi in revisione tra poco.</span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">⬆ Clicca o trascina il file video</div>
        )}
      </label>
      {busy && (
        <div className="mt-3">
          <div className="bg-slate-200 rounded h-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Upload {progress}%</p>
        </div>
      )}
      {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
    </StepBase>
  );
}
