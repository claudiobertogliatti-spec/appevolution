import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

export default function Step08RegistraLezioni({ step, partnerId, onComplete, onSaveDraft }) {
  const [videos, setVideos] = useState(step?.data?.videos || []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState(null);

  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/api/partner-journey/operativo/upload/${partnerId}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).url); }
            catch (e) { reject(new Error("Risposta non valida")); }
          } else reject(new Error(`HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
      const next = [...videos, { name: file.name, url, uploaded_at: new Date().toISOString() }];
      setVideos(next);
      onSaveDraft({ videos: next });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

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
      secondaryNote="Puoi tornare qui in qualunque momento per aggiungere lezioni o sostituirne."
    >
      <label className="block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-8 text-center cursor-pointer hover:border-yellow-400 mb-4 transition">
        <input type="file" accept="video/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
        <div className="text-sm text-slate-500">⬆ Aggiungi una lezione</div>
      </label>
      {busy && (
        <div className="mb-3">
          <div className="bg-slate-200 rounded h-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Upload {progress}%</p>
        </div>
      )}
      {videos.length > 0 && (
        <ul className="space-y-2">
          {videos.map((v, i) => (
            <li key={i} className="text-sm bg-slate-50 px-3 py-2 rounded flex items-center gap-2">
              <span className="text-green-700">✓</span>
              <span className="text-slate-900 truncate flex-1">{v.name}</span>
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
