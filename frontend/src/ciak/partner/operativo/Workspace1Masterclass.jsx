import React, { useState, useEffect, useCallback } from "react";
import WorkspaceShell from "./WorkspaceShell";
import { API } from "../../../utils/api-config";
import { uploadVideoResumable } from "../../lib/gcsResumableUpload";
import { AGENTS } from "./agents";

/**
 * WORKSPACE 1 — "Creiamo la tua Masterclass" (Fase Valida, agente Andrea).
 *
 * Pilota della nuova architettura a Workspace. Riusa i motori esistenti:
 *   - script: POST /api/partner-journey/masterclass/generate-script
 *   - 4 task AI nuove: POST /api/partner-journey/workspace/{id}/masterclass/generate/{task}
 *   - video grezzo: flusso GCS resumable + /video/confirm-upload (pipeline Celery)
 *   - approvazione video: POST /api/partner-journey/masterclass/approve-video
 * Stato aggregato: GET /api/partner-journey/workspace/{id}/masterclass
 */
export default function Workspace1Masterclass({ partnerId, onBack }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // task_id in corso, o "script"/"video"/"approve"
  const [err, setErr] = useState(null);

  // Visore script
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptData, setScriptData] = useState(null);

  // Upload
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(null);

  const agent = AGENTS?.ANDREA || { name: "Andrea", initial: "A" };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/masterclass`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setState(await r.json());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  // ── Genera script (motore esistente) ────────────────────────────────────
  const generateScript = async () => {
    setBusy("script");
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/masterclass/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Completa prima il Posizionamento.");
      }
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(null);
    }
  };

  // ── Genera una task AI dedicata (storyboard/slide/regia/checklist) ────────
  const generateTask = async (taskId) => {
    setBusy(taskId);
    setErr(null);
    try {
      const r = await fetch(
        `${API}/api/partner-journey/workspace/${partnerId}/masterclass/generate/${taskId}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partner_id: partnerId }) }
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Errore nella generazione.");
      }
      const data = await r.json();
      if (data.state) setState(data.state);
      else await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(null);
    }
  };

  // ── Apri il visore script + segna "letto" ─────────────────────────────────
  const openScript = async () => {
    setScriptOpen(true);
    try {
      const r = await fetch(`${API}/api/partner-journey/masterclass/${partnerId}`);
      if (r.ok) setScriptData(await r.json());
    } catch { /* noop */ }
    try {
      await fetch(`${API}/api/partner-journey/workspace/${partnerId}/masterclass/mark-read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      load();
    } catch { /* noop */ }
  };

  // ── Upload video grezzo (GCS resumable + pipeline) ────────────────────────
  const handleUpload = async (file) => {
    if (!file) return;
    setBusy("video");
    setErr(null);
    setProgress(0);
    setStatusMsg(null);
    try {
      const { gcs_path } = await uploadVideoResumable({
        api: API,
        sessionBody: {
          partner_id: partnerId,
          video_type: "masterclass",
          filename: file.name,
          content_type: file.type || "video/mp4",
        },
        file,
        onProgress: setProgress,
        onStatus: setStatusMsg,
      });
      const conf = await fetch(`${API}/api/partner-journey/video/confirm-upload`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, video_type: "masterclass", gcs_path }),
      });
      if (!conf.ok) throw new Error(`Conferma fallita (HTTP ${conf.status})`);
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(null);
      setProgress(0);
      setStatusMsg(null);
    }
  };

  // ── Approva il video finale ───────────────────────────────────────────────
  const approveVideo = async () => {
    setBusy("approve");
    setErr(null);
    try {
      const r = await fetch(
        `${API}/api/partner-journey/masterclass/approve-video?partner_id=${encodeURIComponent(partnerId)}`,
        { method: "POST" }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-[Poppins,system-ui,sans-serif]">Carico il workspace…</div>;
  }
  if (!state) {
    return <div className="p-8 text-center text-red-600 font-[Poppins,system-ui,sans-serif]">Errore: {err || "stato non disponibile"}</div>;
  }

  const v = state.video || {};

  // Task AI con handler di generazione per le 4 dedicate
  const aiTasks = (state.ai_tasks || []).map((t) => {
    const generable = ["storyboard", "slide_spec", "regia", "checklist"].includes(t.id);
    const inFlight = busy === t.id;
    return {
      ...t,
      status: inFlight ? "in_elaborazione" : t.status,
      generable,
      onGenerate: () => generateTask(t.id),
    };
  });

  const deliverables = (state.deliverables || []).map((d) => ({
    file_id: d.file_id,
    name: d.original_name || d.category,
    url: d.internal_url,
  }));

  // ── Pulsante principale contestuale (uno solo) ───────────────────────────
  let primary = null;
  if (!state.has_script) {
    primary = {
      label: busy === "script" ? "Andrea sta scrivendo lo script…" : "Genera lo script della masterclass",
      onClick: generateScript,
      disabled: busy === "script",
      hint: "Dal tuo posizionamento, Andrea prepara lo script in 7 blocchi. Tu validi direzione e tono.",
    };
  } else if (v.ready_for_review) {
    primary = {
      label: busy === "approve" ? "Approvo…" : "Approva il video — tutto ok!",
      onClick: approveVideo,
      disabled: busy === "approve",
      hint: "Guarda il video qui sotto e approva il risultato finale se ti rappresenta.",
    };
  } else if (v.approved) {
    primary = { label: "Workspace completato ✓", onClick: onBack, disabled: false,
                hint: "La masterclass è pronta. Passa al prossimo workspace." };
  } else if (v.submitted) {
    primary = { label: "Video in lavorazione…", onClick: () => {}, disabled: true,
                hint: "Il team sta montando il video. Ti avvisiamo quando è pronto." };
  } else {
    primary = {
      label: "Leggi lo script e registra →",
      onClick: openScript,
      disabled: false,
      hint: "Prossimo passo: registrare la masterclass.",
    };
  }

  // ── Extra: visore script + blocco video ──────────────────────────────────
  const extra = (
    <>
      {scriptOpen && (
        <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-slate-900">Il tuo script</span>
            <button onClick={() => setScriptOpen(false)} className="text-[12px] text-slate-400 hover:text-slate-600">Chiudi</button>
          </div>
          {scriptData ? (
            <div className="text-[13px] text-slate-700 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
              {(scriptData.script_sections || scriptData.sezioni || []).map((s, i) => (
                <div key={i} className="mb-3">
                  <div className="font-semibold text-slate-900">{s.title || s.blocco}</div>
                  <div>{s.content || s.cosa_dire}</div>
                </div>
              )) }
              {!(scriptData.script_sections || scriptData.sezioni) && (scriptData.script || "Script non disponibile.")}
            </div>
          ) : (
            <div className="text-[13px] text-slate-400">Carico lo script…</div>
          )}
        </div>
      )}

      {v.ready_for_review && v.embed_url && (
        <div className="border border-slate-200 rounded-xl p-4 mb-6">
          <div className="text-[13px] font-semibold text-slate-900 mb-2">Il tuo video, pronto da approvare</div>
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              title="Masterclass"
              src={v.embed_url}
              className="absolute inset-0 w-full h-full rounded-lg"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );

  // ── Upload slot (attivo dopo lo script, finché non inviato) ───────────────
  const uploadSlot = state.has_script && !v.submitted ? (
    <div>
      <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${busy === "video" ? "opacity-60 pointer-events-none" : "border-slate-300 hover:border-yellow-400"}`}>
        <input type="file" accept="video/*" className="hidden" disabled={busy === "video"}
               onChange={(e) => handleUpload(e.target.files?.[0])} />
        <div className="text-3xl mb-1">⬆️</div>
        <div className="text-[14px] text-slate-600">Trascina qui il video grezzo, o <span className="text-blue-600">scegli un file</span></div>
        <div className="text-[12px] text-slate-400 mt-1">MP4 o MOV · anche grezzo, ci pensiamo noi al montaggio</div>
      </label>
      {busy === "video" && (
        <div className="mt-3">
          <div className="bg-slate-200 rounded h-2 overflow-hidden">
            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[12px] text-slate-500 mt-1">Upload {progress}%{statusMsg ? ` — ${statusMsg}` : ""}</p>
        </div>
      )}
    </div>
  ) : v.submitted && !v.ready_for_review && !v.approved ? (
    <div className="border border-green-200 bg-green-50 rounded-xl p-4 text-center text-[14px] text-green-700">
      ✓ Video ricevuto — il team sta lavorando al montaggio. Ti avvisiamo quando è pronto da approvare.
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {onBack && (
        <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-slate-800 mb-3">← Torna ai workspace</button>
      )}
      <WorkspaceShell
        index={state.workspace_index || 1}
        total={state.workspace_total || 5}
        title={state.title}
        progress={state.progress || 0}
        agent={agent}
        intro={state.intro}
        objective={state.objective}
        aiTasks={aiTasks}
        partnerTasks={state.partner_tasks || []}
        extra={extra}
        uploadSlot={uploadSlot}
        deliverables={deliverables}
        primary={primary}
      />
      {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
    </div>
  );
}
