import React, { useState, useEffect, useCallback } from "react";
import WorkspaceShell from "./WorkspaceShell";
import { API } from "../../../utils/api-config";
import { uploadVideoResumable } from "../../lib/gcsResumableUpload";
import { AGENTS } from "./agents";

/**
 * WORKSPACE 2 — "Organizziamo il tuo Corso" (Fase Valida, agente Andrea).
 *
 * Riusa i motori esistenti:
 *   - struttura: POST /api/partner-journey/videocorso/generate-course
 *   - approva struttura: POST /api/partner-journey/videocorso/approve-course
 *   - 4 task AI nuove: POST /api/partner-journey/workspace/{id}/corso/generate/{task}
 *   - lezioni: flusso GCS resumable (video_type=videocorso, lesson_id) + /video/confirm-upload
 *   - approva lezione: POST /api/partner-journey/videocorso/approve-lesson
 * Stato aggregato: GET /api/partner-journey/workspace/{id}/corso
 */
export default function Workspace2Corso({ partnerId, onBack }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [structOpen, setStructOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(null);

  const agent = AGENTS?.ANDREA || { name: "Andrea", initial: "A" };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/corso`);
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

  const generateCourse = async () => {
    setBusy("course");
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/videocorso/generate-course`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, durata: "medio", include_bonus: true, contenuti_pronti: false }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Completa prima Posizionamento e Masterclass.");
      }
      await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  const approveCourse = async () => {
    setBusy("approve-course");
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/videocorso/approve-course?partner_id=${encodeURIComponent(partnerId)}`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  const generateTask = async (taskId) => {
    setBusy(taskId);
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/corso/generate/${taskId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Errore nella generazione.");
      }
      const data = await r.json();
      if (data.state) setState(data.state); else await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  const nextLessonId = () => {
    const ids = (state?.lessons || []).map((l) => l.lesson_id);
    let max = 0;
    ids.forEach((id) => { const m = /lez-(\d+)/.exec(id || ""); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return `lez-${max + 1}`;
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy("upload");
    setErr(null);
    setProgress(0);
    setStatusMsg(null);
    const lessonId = nextLessonId();
    const lessonTitle = `Lezione ${(state?.lessons_uploaded || 0) + 1}`;
    try {
      const { gcs_path } = await uploadVideoResumable({
        api: API,
        sessionBody: {
          partner_id: partnerId, video_type: "videocorso", lesson_id: lessonId,
          filename: file.name, content_type: file.type || "video/mp4",
        },
        file, onProgress: setProgress, onStatus: setStatusMsg,
      });
      const conf = await fetch(`${API}/api/partner-journey/video/confirm-upload`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, video_type: "videocorso", lesson_id: lessonId, lesson_title: lessonTitle, gcs_path }),
      });
      if (!conf.ok) throw new Error(`Conferma fallita (HTTP ${conf.status})`);
      await load();
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(null); setProgress(0); setStatusMsg(null); }
  };

  const approveLesson = async (lessonId) => {
    setBusy(`approve-${lessonId}`);
    setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/videocorso/approve-lesson?partner_id=${encodeURIComponent(partnerId)}&lesson_id=${encodeURIComponent(lessonId)}`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(null); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-[Poppins,system-ui,sans-serif]">Carico il workspace…</div>;
  if (!state) return <div className="p-8 text-center text-red-600 font-[Poppins,system-ui,sans-serif]">Errore: {err || "stato non disponibile"}</div>;

  const aiTasks = (state.ai_tasks || []).map((t) => {
    const generable = ["script_lez", "testi", "materiali", "regia_lez"].includes(t.id);
    const inFlight = busy === t.id;
    return { ...t, status: inFlight ? "in_elaborazione" : t.status, generable, onGenerate: () => generateTask(t.id) };
  });

  const deliverables = (state.deliverables || []).map((d) => ({
    file_id: d.file_id, name: d.original_name || d.category, url: d.internal_url,
  }));

  const cd = state.course_data;
  const allRecorded = state.lessons_planned > 0 && state.lessons_uploaded >= state.lessons_planned;

  let primary = null;
  if (!state.has_course) {
    primary = { label: busy === "course" ? "Andrea sta costruendo il corso…" : "Genera la struttura del corso",
                onClick: generateCourse, disabled: busy === "course",
                hint: "Dalla masterclass e dal posizionamento, Andrea costruisce moduli e lezioni." };
  } else if (!state.course_approved) {
    primary = { label: busy === "approve-course" ? "Approvo…" : "Approva la struttura del corso",
                onClick: approveCourse, disabled: busy === "approve-course",
                hint: "Controlla moduli e lezioni qui sotto, poi approva." };
  } else if (!allRecorded) {
    primary = { label: "Carica le tue lezioni qui sotto", onClick: () => {}, disabled: true,
                hint: `Registra e carica ogni lezione (${state.lessons_uploaded}/${state.lessons_planned || "?"}).` };
  } else {
    primary = { label: "Workspace completato ✓", onClick: onBack, disabled: false,
                hint: "Il corso è pronto. Passa al prossimo workspace." };
  }

  const extra = (
    <>
      {/* Visore struttura corso */}
      {cd && (
        <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-slate-900">{cd.titolo || "Struttura del corso"}</span>
            <button onClick={() => setStructOpen(!structOpen)} className="text-[12px] text-slate-400 hover:text-slate-600">{structOpen ? "Comprimi" : "Vedi tutto"}</button>
          </div>
          <div className={`text-[13px] text-slate-700 leading-relaxed ${structOpen ? "" : "max-h-44 overflow-hidden"}`}>
            {(cd.moduli || []).map((m, i) => (
              <div key={i} className="mb-2">
                <div className="font-semibold text-slate-900">Modulo {m.numero}: {m.titolo}</div>
                <ul className="ml-4 list-disc">
                  {(m.lezioni || []).map((l, j) => (<li key={j}>{l.numero} · {l.titolo} <span className="text-slate-400">{l.durata}</span></li>))}
                </ul>
              </div>
            ))}
            {cd.bonus?.length > 0 && <div className="mt-2"><span className="font-semibold">Bonus:</span> {cd.bonus.join(" · ")}</div>}
          </div>
        </div>
      )}

      {/* Lezioni caricate */}
      {state.course_approved && (state.lessons || []).length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 mb-6">
          <div className="text-[13px] font-semibold text-slate-900 mb-2">Le tue lezioni</div>
          {state.lessons.map((l) => (
            <div key={l.lesson_id} className="flex items-center gap-2 py-1.5 text-[13px] border-b border-slate-100 last:border-0">
              <span className="flex-1">{l.title}</span>
              {l.approved ? (
                <span className="text-green-600 text-[12px]">✓ approvata</span>
              ) : l.ready_for_review ? (
                <button onClick={() => approveLesson(l.lesson_id)} disabled={busy === `approve-${l.lesson_id}`}
                        className="text-[12px] px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-40">
                  {busy === `approve-${l.lesson_id}` ? "…" : "Approva"}
                </button>
              ) : (
                <span className="text-slate-400 text-[12px]">in lavorazione</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const uploadSlot = state.course_approved ? (
    <div>
      <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${busy === "upload" ? "opacity-60 pointer-events-none" : "border-slate-300 hover:border-yellow-400"}`}>
        <input type="file" accept="video/*" className="hidden" disabled={busy === "upload"} onChange={(e) => handleUpload(e.target.files?.[0])} />
        <div className="text-2xl mb-1">⬆️</div>
        <div className="text-[14px] text-slate-600">Carica la prossima lezione, o <span className="text-blue-600">scegli un file</span></div>
        <div className="text-[12px] text-slate-400 mt-1">Una lezione alla volta · MP4 o MOV grezzo, ci pensiamo noi al montaggio</div>
      </label>
      {busy === "upload" && (
        <div className="mt-3">
          <div className="bg-slate-200 rounded h-2 overflow-hidden"><div className="bg-yellow-400 h-full transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-[12px] text-slate-500 mt-1">Upload {progress}%{statusMsg ? ` — ${statusMsg}` : ""}</p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {onBack && <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-slate-800 mb-3">← Torna ai workspace</button>}
      <WorkspaceShell
        index={state.workspace_index || 2}
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
