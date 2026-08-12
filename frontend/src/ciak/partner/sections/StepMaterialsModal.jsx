import React, { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Image, Loader2, RefreshCw, X } from "lucide-react";
import { authHeaders } from "../api";
import { API } from "../../../utils/api-config";

const safePublicUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ["youtube.com", "www.youtube.com", "youtu.be", "ciak.io", "www.ciak.io"].includes(u.hostname);
  } catch { return false; }
};

export default function StepMaterialsModal({ partnerId, step, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true); setError(null); setPreview(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/operativo/step-materials/${encodeURIComponent(partnerId)}/${encodeURIComponent(step.id)}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [partnerId, step.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl); }, [preview]);

  const fetchBlob = async (material, download = false) => {
    const path = download ? material.download_url : material.preview_url;
    if (!path) return;
    try {
      const r = await fetch(`${API}${path}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a"); a.href = objectUrl; a.download = material.title; a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } else setPreview({ material, objectUrl });
    } catch (e) { setError(`Impossibile aprire il materiale: ${e.message}`); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4">
          <div><div className="text-xs font-mono font-bold text-amber-600">{step.code} · ARCHIVIO DELLO STEP</div><h2 className="text-xl sm:text-2xl font-extrabold mt-1">{step.title}</h2></div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" aria-label="Chiudi"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">
          {loading && <div className="py-16 flex justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> Carico i materiali…</div>}
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700"><p>{error}</p><button onClick={load} className="mt-3 inline-flex items-center gap-2 font-bold"><RefreshCw className="h-4 w-4" /> Riprova</button></div>}
          {!loading && !error && data && (
            <>
              {data.materials.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">Materiale non ancora disponibile. Il team sta completando l'archiviazione di questo step.</div>
              ) : (
                <div className="grid lg:grid-cols-[300px_1fr] gap-5">
                  <div className="space-y-3">
                    {data.materials.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex gap-2 items-start"><span className="mt-0.5">{m.type === "image" ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><div className="min-w-0"><div className="font-bold text-sm">{m.title}</div>{m.version > 1 && <div className="text-xs text-slate-400">Versione {m.version}</div>}</div></div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.preview_url && <button onClick={() => fetchBlob(m)} className="px-3 py-1.5 rounded-lg bg-slate-950 text-white text-xs font-bold">Visualizza</button>}
                          {m.download_url && <button onClick={() => fetchBlob(m, true)} className="px-3 py-1.5 rounded-lg border text-xs font-bold inline-flex gap-1"><Download className="h-3.5 w-3.5" /> Scarica</button>}
                          {m.public_url && safePublicUrl(m.public_url) && <a href={m.public_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold inline-flex gap-1"><ExternalLink className="h-3.5 w-3.5" /> Guarda su YouTube</a>}
                        </div>
                        {m.type === "data" && <dl className="mt-3 space-y-2">{Object.entries(m.metadata || {}).map(([k, v]) => <div key={k}><dt className="text-[11px] uppercase text-slate-400">{k.replaceAll("_", " ")}</dt><dd className="text-sm break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></div>)}</dl>}
                        {m.metadata?.pending && <p className="mt-2 text-xs text-amber-700">La playlist ufficiale è in preparazione.</p>}
                      </div>
                    ))}
                  </div>
                  <div className="min-h-[360px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {!preview ? <p className="text-sm text-slate-500 px-6 text-center">Seleziona “Visualizza” per consultare il materiale senza uscire da Ciak.</p> : preview.material.type === "image" ? <img src={preview.objectUrl} alt={preview.material.title} className="max-w-full max-h-[65vh] object-contain" /> : <iframe title={preview.material.title} src={preview.objectUrl} className="w-full h-[65vh] bg-white" />}
                  </div>
                </div>
              )}
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Il tuo progetto resta sempre ordinato in Ciak.</strong><p className="mt-1">{data.workbook_notice}</p></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
