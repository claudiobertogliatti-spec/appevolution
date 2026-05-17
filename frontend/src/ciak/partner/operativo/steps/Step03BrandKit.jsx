import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

async function uploadFile(file, partnerId) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/partner-journey/operativo/upload/${partnerId}`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(`Upload fallito: ${r.status}`);
  return (await r.json()).url;
}

const DEFAULT_COLORS = ["#0F172A", "#FACC15", "#E5E7EB"];

export default function Step03BrandKit({ step, partnerId, onComplete, onSaveDraft }) {
  const [logo, setLogo] = useState(step?.data?.logo_url || "");
  const [foto, setFoto] = useState(step?.data?.foto_url || "");
  const [colors, setColors] = useState(step?.data?.colors || DEFAULT_COLORS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const updateColor = (i, v) => {
    const next = [...colors];
    next[i] = v;
    setColors(next);
    onSaveDraft({ colors: next });
  };

  const handle = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadFile(file, partnerId);
      if (kind === "logo") {
        setLogo(url);
        onSaveDraft({ logo_url: url });
      } else {
        setFoto(url);
        onSaveDraft({ foto_url: url });
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const validColors = colors.every((c) => /^#[0-9a-f]{6}$/i.test(c));
  const canComplete = logo && foto && validColors && !busy;

  return (
    <StepBase
      eyebrow="Step 3 — Brand kit"
      title="Logo + 1 foto + 3 colori"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ logo_url: logo, foto_url: foto, colors })}
      secondaryNote="Servono per costruire il funnel coerente col tuo brand."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <UploadSlot
          label="Logo (PNG/SVG con sfondo trasparente)"
          accept="image/*,.svg"
          url={logo}
          onPick={(f) => handle("logo", f)}
        />
        <UploadSlot
          label="Foto personale"
          accept="image/*"
          url={foto}
          onPick={(f) => handle("foto", f)}
        />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900 mb-2">Colori brand (3)</div>
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={c}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-24 text-xs border border-gray-200 rounded px-2 py-1 font-mono"
              />
            </div>
          ))}
        </div>
      </div>
      {busy && <p className="text-xs text-slate-500 mt-3">Upload in corso...</p>}
      {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
    </StepBase>
  );
}

function UploadSlot({ label, accept, url, onPick }) {
  return (
    <label className={`block border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition ${url ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"}`}>
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {url ? (
        <img src={url} alt="" className="mt-2 max-h-20 mx-auto rounded" />
      ) : (
        <div className="text-xs text-slate-500 mt-2">⬆ Clicca o trascina</div>
      )}
    </label>
  );
}
