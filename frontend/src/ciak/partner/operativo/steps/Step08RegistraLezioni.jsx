import React, { useState } from "react";
import StepBase from "./StepBase";
import { uploadVideoResumable } from "../../../lib/gcsResumableUpload";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

/**
 * Step 8 — Carica i video delle lezioni del videocorso (uno alla volta).
 *
 * Come Step07, i video grezzi NON passano dal backend (Cloud Run rifiuta > ~32 MB
 * con HTTP 413). Ogni lezione va diretta su GCS con upload a CHUNK e auto-ripresa
 * (vedi lib/gcsResumableUpload) e poi nella pipeline (video_type="videocorso" +
 * lesson_id → partner_videocorso.lessons.{id}).
 * Manteniamo la UX a lista piatta: a ogni video assegniamo un lesson_id stabile.
 */
export default function Step08RegistraLezioni({ step, partnerId, onComplete, onSaveDraft }) {
  const [videos, setVideos] = useState(step?.data?.videos || []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  // lesson_id stabile e non riusato: max suffisso numerico esistente + 1.
  const nextLessonId = (list) => {
    const max = list.reduce((m, v) => {
      const n = parseInt(String(v.lesson_id || "").replace(/^lez-/, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    return `lez-${max + 1}`;
  };

  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setProgress(0);
    setStatusMsg(null);
    const contentType = file.type || "video/mp4";
    const lessonId = nextLessonId(videos);
    try {
      // 1+2. Sessione + upload a chunk con auto-ripresa
      const { gcs_path } = await uploadVideoResumable({
        api: API,
        sessionBody: {
          partner_id: partnerId,
          video_type: "videocorso",
          lesson_id: lessonId,
          filename: file.name,
          content_type: contentType,
        },
        file,
        onProgress: setProgress,
        onStatus: setStatusMsg,
      });

      // 3. Conferma → avvia la pipeline per questa lezione
      const confRes = await fetch(`${API}/api/partner-journey/video/confirm-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          video_type: "videocorso",
          lesson_id: lessonId,
          lesson_title: file.name,
          gcs_path,
        }),
      });
      if (!confRes.ok) throw new Error(`Conferma fallita (HTTP ${confRes.status})`);

      const next = [...videos, {
        name: file.name,
        lesson_id: lessonId,
        gcs_path,
        status: "processing",
        submitted_at: new Date().toISOString(),
      }];
      setVideos(next);
      onSaveDraft({ videos: next });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
      setProgress(0);
      setStatusMsg(null);
    }
  };

  // Rimozione solo dalla lista locale: l'elaborazione, se già avviata, prosegue.
  const removeVideo = (idx) => {
    const next = videos.filter((_, i) => i !== idx);
    setVideos(next);
    onSaveDraft({ videos: next });
  };

  return (
    <StepBase
      eyebrow="Step 8 — Lezioni"
      title="Carica i video delle lezioni (uno alla volta)"
      ctaDisabled={videos.length === 0 || busy}
      onCta={() => onComplete({ videos })}
      secondaryNote="MP4 o MOV, anche grezzi. Ci pensiamo noi al taglio e al render. Se la connessione cade, l'upload riprende da solo. Puoi tornare qui per aggiungere altre lezioni."
    >
      <label className={`block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-8 text-center cursor-pointer hover:border-yellow-400 mb-4 transition ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <input type="file" accept="video/*" className="hidden" disabled={busy} onChange={(e) => handle(e.target.files?.[0])} />
        <div className="text-sm text-slate-500">⬆ Aggiungi una lezione</div>
      </label>
      {busy && (
        <div className="mb-3">
          <div className="bg-slate-200 rounded h-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Upload {progress}%{statusMsg ? ` — ${statusMsg}` : ""}</p>
        </div>
      )}
      {videos.length > 0 && (
        <ul className="space-y-2">
          {videos.map((v, i) => (
            <li key={v.lesson_id || i} className="text-sm bg-slate-50 px-3 py-2 rounded flex items-center gap-2">
              <span className="text-green-700">✓</span>
              <span className="text-slate-900 truncate flex-1">{v.name}</span>
              <span className="text-xs text-slate-400">in elaborazione</span>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="text-xs text-red-600 hover:underline"
              >
                rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
    </StepBase>
  );
}
