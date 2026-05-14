/**
 * Ciak Partner — Fase 4: Videocorso.
 * Porting di components/partner/VideocorsoPage.jsx (Fase 2d).
 * Re-skin palette Ciak. Rimossi gli strumenti admin (area partner-only).
 *
 * Endpoint backend invariati:
 *  GET  /api/partner-journey/videocorso/:partnerId
 *  POST /api/partner-journey/videocorso/submit-video-link
 *  POST /api/partner-journey/videocorso/approve-lesson?partner_id=&lesson_id=
 *
 * Lifecycle lezione: idle → queued/cleaning/transcribing/cutting/uploading
 *  → ready_for_review → approved (oppure error). Polling 30s se in elaborazione.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, ArrowRight, Loader2, Upload, Youtube,
  ChevronDown, ChevronRight, Gift, AlertCircle, RefreshCw,
} from "lucide-react";

const STATUS_PILL = {
  idle: { label: "Da caricare", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  queued: { label: "In coda", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  downloading: { label: "In elaborazione", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cleaning: { label: "Pulizia audio", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  transcribing: { label: "Trascrizione", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cutting_fillers: { label: "Tagli", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  uploading_youtube: { label: "Upload YouTube", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ready_for_review: { label: "Da approvare", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "Approvata", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  error: { label: "Errore", cls: "bg-red-50 text-red-700 border-red-200" },
  error_youtube: { label: "Errore upload", cls: "bg-red-50 text-red-700 border-red-200" },
};

const IN_PROGRESS_STATES = [
  "queued", "downloading", "cleaning", "transcribing", "cutting_fillers", "uploading_youtube",
];

function StatusPill({ status }) {
  const cfg = STATUS_PILL[status] || STATUS_PILL.idle;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function LessonRow({ lessonId, modulo, lezione, lessonState, partnerId, onRefresh }) {
  const [driveUrl, setDriveUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const status = lessonState?.pipeline_status || lessonState?.status || "idle";
  const youtubeId = lessonState?.video_youtube_id;
  const youtubeUrl = lessonState?.video_youtube_url;
  const approved = lessonState?.video_approved || status === "approved";
  const inProgress = IN_PROGRESS_STATES.includes(status);
  const ready = status === "ready_for_review";
  const hasError = status === "error" || status === "error_youtube";
  const number = `${modulo.numero || "?"}.${lezione.numero || "?"}`;

  const submitDrive = async () => {
    if (!driveUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partner-journey/videocorso/submit-video-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, lesson_id: lessonId, video_url: driveUrl.trim() }),
      });
      if (!res.ok) throw new Error("submit");
      setDriveUrl("");
      await onRefresh();
    } catch (e) {
      window.alert("Errore nell'invio del link. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveLesson = async () => {
    setApproving(true);
    try {
      await fetch(
        `/api/partner-journey/videocorso/approve-lesson?partner_id=${partnerId}&lesson_id=${lessonId}`,
        { method: "POST" }
      );
      await onRefresh();
    } catch (e) {
      window.alert("Errore nell'approvazione. Riprova.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="rounded-xl p-4 bg-white border border-gray-200">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded mt-0.5 flex-shrink-0 bg-gray-100 text-slate-600">
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1 text-slate-900">{lezione.titolo}</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            {lessonState?.video_final_duration_s && (
              <span className="text-[11px] text-slate-400">
                {Math.floor(lessonState.video_final_duration_s / 60)}:
                {String(lessonState.video_final_duration_s % 60).padStart(2, "0")} min
              </span>
            )}
          </div>
        </div>
      </div>

      {(!status || status === "idle" || status === "error") && (
        <div className="mt-3 space-y-2">
          {hasError && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="text-xs text-red-700">
                Errore precedente — riprova caricando di nuovo il video.
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="Incolla link Google Drive del video grezzo…"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none bg-gray-50 border border-gray-200 text-slate-900"
            />
            <button
              onClick={submitDrive}
              disabled={!driveUrl.trim() || submitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Invia
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Carica il video grezzo su Drive (condivisione "Chiunque con il link"), poi incolla
            qui l'URL.
          </p>
        </div>
      )}

      {inProgress && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-blue-700" />
          <div className="text-xs text-blue-700">
            Il team sta editando il tuo video — ti avviseremo quando è pronto per la revisione.
          </div>
        </div>
      )}

      {ready && youtubeId && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={lezione.titolo}
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>
          <button
            onClick={approveLesson}
            disabled={approving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 bg-emerald-500 text-white hover:bg-emerald-600 transition"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approva lezione
          </button>
        </div>
      )}

      {approved && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
          <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <div className="text-xs flex-1 text-emerald-700">Lezione approvata</div>
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold underline text-emerald-700"
            >
              <Youtube className="w-3 h-3" /> Vedi
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ modulo, idx, isExpanded, onToggle, lessonsStatus, partnerId, onRefresh }) {
  const lezioni = modulo.lezioni || [];
  const completedCount = lezioni.filter((lez) => {
    const ls = lessonsStatus[`m${modulo.numero || idx + 1}_l${lez.numero || ""}`];
    return ls?.video_approved || ls?.pipeline_status === "approved";
  }).length;
  const allComplete = completedCount === lezioni.length && lezioni.length > 0;

  return (
    <div
      className={`rounded-2xl bg-white overflow-hidden border ${
        allComplete ? "border-emerald-300" : isExpanded ? "border-yellow-300" : "border-gray-200"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition"
      >
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
            allComplete ? "bg-emerald-500 text-white" : "bg-yellow-400 text-slate-900"
          }`}
        >
          {allComplete ? <Check className="w-4 h-4" /> : modulo.numero || idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">{modulo.titolo}</div>
          {modulo.obiettivo && (
            <div className="text-xs mt-0.5 text-slate-500">{modulo.obiettivo}</div>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            allComplete ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-slate-500"
          }`}
        >
          {completedCount}/{lezioni.length} approvate
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-3 bg-gray-50">
          {lezioni.map((lezione, li) => {
            const lid = `m${modulo.numero || idx + 1}_l${lezione.numero || li + 1}`;
            return (
              <LessonRow
                key={lid}
                lessonId={lid}
                modulo={modulo}
                lezione={lezione}
                lessonState={lessonsStatus[lid]}
                partnerId={partnerId}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function F4Videocorso({ partnerId }) {
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [lessonsStatus, setLessonsStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState([0]);

  const load = useCallback(async () => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/partner-journey/videocorso/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course_data) {
          setCourseData(data.course_data);
          setExpandedModules((data.course_data.moduli || []).map((_, i) => i));
        }
        setLessonsStatus(data.lessons_status || {});
      }
    } catch (e) {
      // best-effort
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const inProgress = Object.values(lessonsStatus).some((ls) =>
      IN_PROGRESS_STATES.includes(ls?.pipeline_status)
    );
    if (!inProgress) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [lessonsStatus, load]);

  const toggleModule = (idx) =>
    setExpandedModules((p) => (p.includes(idx) ? p.filter((i) => i !== idx) : [...p, idx]));

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const moduli = courseData?.moduli || [];
  const totalLezioni = moduli.reduce((acc, m) => acc + (m.lezioni?.length || 0), 0);
  const uploadedLezioni = moduli.reduce(
    (acc, m) =>
      acc +
      (m.lezioni || []).filter((lez) => lessonsStatus[`m${m.numero}_l${lez.numero}`]?.video_raw_url)
        .length,
    0
  );
  const approvedLezioni = moduli.reduce(
    (acc, m) =>
      acc +
      (m.lezioni || []).filter((lez) => {
        const s = lessonsStatus[`m${m.numero}_l${lez.numero}`];
        return s?.video_approved || s?.pipeline_status === "approved";
      }).length,
    0
  );
  const allReady = approvedLezioni === totalLezioni && totalLezioni > 0;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-3 text-slate-900">Il tuo Videocorso</h1>
          <p className="text-base leading-relaxed text-slate-600">
            Carica il video grezzo di ogni lezione (link Drive). Il team lo edita e te lo
            ripropone qui per l'approvazione finale.
          </p>
        </div>

        {courseData && (
          <div className="rounded-2xl p-5 mb-5 bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-yellow-400">
                  Progress globale
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {courseData.titolo_corso || "Videocorso"}
                </h3>
                {courseData.sottotitolo && (
                  <p className="text-xs mt-0.5 text-slate-400">{courseData.sottotitolo}</p>
                )}
              </div>
              <button
                onClick={load}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                title="Aggiorna stato"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-3 text-center bg-white/5">
                <div className="text-2xl font-semibold text-white">{moduli.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Moduli</div>
              </div>
              <div className="rounded-lg p-3 text-center bg-white/5">
                <div
                  className={`text-2xl font-semibold ${
                    uploadedLezioni === totalLezioni ? "text-emerald-400" : "text-yellow-400"
                  }`}
                >
                  {uploadedLezioni}/{totalLezioni}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Caricate</div>
              </div>
              <div className="rounded-lg p-3 text-center bg-white/5">
                <div
                  className={`text-2xl font-semibold ${
                    allReady ? "text-emerald-400" : "text-yellow-400"
                  }`}
                >
                  {approvedLezioni}/{totalLezioni}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Approvate</div>
              </div>
            </div>
            {allReady && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Videocorso completo</span>
              </div>
            )}
          </div>
        )}

        {!courseData ? (
          <div className="text-center py-12 text-sm text-slate-400">
            Il team sta preparando la struttura del tuo videocorso.
          </div>
        ) : (
          <div className="space-y-3">
            {moduli.map((modulo, idx) => (
              <ModuleCard
                key={idx}
                modulo={modulo}
                idx={idx}
                isExpanded={expandedModules.includes(idx)}
                onToggle={() => toggleModule(idx)}
                lessonsStatus={lessonsStatus}
                partnerId={partnerId}
                onRefresh={load}
              />
            ))}

            {courseData.bonus?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bonus inclusi ({courseData.bonus.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {courseData.bonus.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                      <span>{typeof b === "string" ? b : b.titolo || JSON.stringify(b)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {allReady && (
              <button
                onClick={() => navigate("/partner/funnel")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition mt-3"
              >
                Vai al Funnel <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
