import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

export default function Step07RegistraMasterclass({ step, partnerId, onComplete, onSaveDraft }) {
  const [videoUrl, setVideoUrl] = useState(step?.data?.video_url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [progress, setProgress] = useState(0);

  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Upload con XHR per avere progress
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
      setVideoUrl(url);
      onSaveDraft({ video_url: url });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <StepBase
      eyebrow="Step 7 — Masterclass"
      title="Carica il video grezzo della masterclass"
      ctaDisabled={!videoUrl || busy}
      onCta={() => onComplete({ video_url: videoUrl })}
      secondaryNote="MP4 o MOV, anche grezzo senza editing. Ci pensiamo noi al taglio e al render finale."
    >
      <label className={`block border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition ${videoUrl ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"}`}>
        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        {videoUrl ? (
          <div className="text-sm text-green-700">✓ Video caricato — <a className="underline" href={videoUrl} target="_blank" rel="noreferrer">apri</a></div>
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
