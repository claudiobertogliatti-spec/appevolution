import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Check, ArrowRight, Loader2, Eye, Upload, Youtube, Video,
  ChevronDown, ChevronRight, Gift, BookOpen, AlertCircle, RefreshCw
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

// ─────────────────────────────────────────────────────────────────────
// LessonRow — gestisce intera lifecycle di una singola lezione
//   stati: idle | queued/cleaning/transcribing/cutting_fillers (in lavorazione)
//          ready_for_review | approved | error
// ─────────────────────────────────────────────────────────────────────

const STATUS_PILL = {
  idle:               { label: "Da caricare",          bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  queued:             { label: "In coda",              bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  downloading:        { label: "In elaborazione",      bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  cleaning:           { label: "Pulizia audio",        bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  transcribing:       { label: "Trascrizione",         bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  cutting_fillers:    { label: "Tagli",                bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  uploading_youtube:  { label: "Upload YouTube",       bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  ready_for_review:   { label: "Da approvare",         bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  approved:           { label: "Approvata",            bg: "#DCFCE7", color: "#16A34A", border: "#BBF7D0" },
  error:              { label: "Errore",               bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" },
  error_youtube:      { label: "Errore upload",        bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" },
};

function StatusPill({ status }) {
  const cfg = STATUS_PILL[status] || STATUS_PILL.idle;
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function LessonRow({ lessonId, modulo, lezione, lessonState, partnerId, isAdmin, onRefresh }) {
  const [driveUrl, setDriveUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showReplaceUrl, setShowReplaceUrl] = useState(false);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [replacing, setReplacing] = useState(false);

  const status = lessonState?.pipeline_status || lessonState?.status || "idle";
  const youtubeId = lessonState?.video_youtube_id;
  const youtubeUrl = lessonState?.video_youtube_url;
  const approved = lessonState?.video_approved || status === "approved";
  const inProgress = ["queued", "downloading", "cleaning", "transcribing", "cutting_fillers", "uploading_youtube"].includes(status);
  const ready = status === "ready_for_review";
  const hasError = status === "error" || status === "error_youtube";

  const submitDrive = async () => {
    if (!driveUrl.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/partner-journey/videocorso/submit-video-link`, {
        partner_id: partnerId,
        lesson_id: lessonId,
        video_url: driveUrl.trim(),
      });
      setDriveUrl("");
      await onRefresh();
    } catch (e) {
      window.alert(`Errore invio: ${e.response?.data?.detail || e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const approveLesson = async () => {
    setApproving(true);
    try {
      await axios.post(`${API}/api/partner-journey/videocorso/approve-lesson?partner_id=${partnerId}&lesson_id=${lessonId}`);
      await onRefresh();
    } catch (e) {
      window.alert(`Errore approvazione: ${e.response?.data?.detail || e.message}`);
    } finally {
      setApproving(false);
    }
  };

  const replaceYoutubeUrl = async () => {
    if (!replaceUrl.trim()) return;
    setReplacing(true);
    try {
      await axios.post(`${API}/api/partner-journey/videocorso/set-lesson-youtube-url`, {
        partner_id: partnerId,
        lesson_id: lessonId,
        youtube_url: replaceUrl.trim(),
      });
      setReplaceUrl("");
      setShowReplaceUrl(false);
      await onRefresh();
    } catch (e) {
      window.alert(`Errore: ${e.response?.data?.detail || e.message}`);
    } finally {
      setReplacing(false);
    }
  };

  const number = `${modulo.numero || "?"}.${lezione.numero || "?"}`;

  return (
    <div className="rounded-xl p-4" style={{ background: "white", border: "1px solid #ECEDEF" }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 flex-shrink-0" style={{ background: "#E8E4DC", color: "#5F6572" }}>
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold mb-1" style={{ color: "#1E2128" }}>{lezione.titolo}</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            {lessonState?.video_final_duration_s && (
              <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
                {Math.floor(lessonState.video_final_duration_s / 60)}:{String(lessonState.video_final_duration_s % 60).padStart(2, "0")} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* IDLE / no upload — form invio link Drive */}
      {(!status || status === "idle" || status === "error") && (
        <div className="mt-3 space-y-2">
          {hasError && (
            <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#B91C1C" }} />
              <div className="text-xs" style={{ color: "#991B1B" }}>
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
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#FAFAF7", border: "1px solid #E5E7EB", color: "#1E2128" }}
            />
            <button
              onClick={submitDrive}
              disabled={!driveUrl.trim() || submitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "#1E2128", color: "#FFD24D" }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Invia
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            Carica il video grezzo su Drive (condivisione "Chiunque con il link"), poi incolla qui l'URL.
          </p>
        </div>
      )}

      {/* IN PROGRESS */}
      {inProgress && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#1E40AF" }} />
          <div className="text-xs" style={{ color: "#1E40AF" }}>
            Il team sta editando il tuo video — ti avviseremo quando è pronto per la revisione.
          </div>
        </div>
      )}

      {/* READY FOR REVIEW — anteprima YouTube + approva */}
      {ready && youtubeId && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E5E2DD" }}>
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "#22C55E", color: "white" }}
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approva lezione
          </button>

          {/* Admin tools: sostituisci URL YouTube manualmente (post-editing) */}
          {isAdmin && !showReplaceUrl && (
            <button
              onClick={() => setShowReplaceUrl(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "#F0F9FF", color: "#0369A1", border: "1px solid #BAE6FD" }}
            >
              <Video className="w-3.5 h-3.5" />
              [Admin] Sostituisci con URL YouTube manuale
            </button>
          )}
          {isAdmin && showReplaceUrl && (
            <div className="p-3 rounded-lg space-y-2" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={replaceUrl}
                  onChange={(e) => setReplaceUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
                  style={{ background: "white", border: "1px solid #BAE6FD" }}
                />
                <button
                  onClick={replaceYoutubeUrl}
                  disabled={!replaceUrl.trim() || replacing}
                  className="px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                  style={{ background: "#0369A1", color: "white" }}
                >
                  {replacing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Imposta"}
                </button>
                <button
                  onClick={() => { setShowReplaceUrl(false); setReplaceUrl(""); }}
                  className="px-2 py-1.5 rounded text-xs"
                  style={{ background: "white", color: "#0369A1", border: "1px solid #BAE6FD" }}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* APPROVED */}
      {approved && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
          <div className="text-xs flex-1" style={{ color: "#15803D" }}>
            Lezione approvata
          </div>
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold underline" style={{ color: "#15803D" }}>
              <Youtube className="w-3 h-3" /> Vedi
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ModuleCard — espandibile, contiene tutte le lezioni del modulo
// ─────────────────────────────────────────────────────────────────────

function ModuleCard({ modulo, idx, isExpanded, onToggle, lessonsStatus, partnerId, isAdmin, onRefresh }) {
  const lezioni = modulo.lezioni || [];
  const completedCount = lezioni.filter((lez) => {
    const lid = `m${modulo.numero || idx + 1}_l${lez.numero || ""}`;
    const ls = lessonsStatus[lid];
    return ls?.video_approved || ls?.pipeline_status === "approved";
  }).length;
  const uploadedCount = lezioni.filter((lez) => {
    const lid = `m${modulo.numero || idx + 1}_l${lez.numero || ""}`;
    const ls = lessonsStatus[lid];
    return ls?.video_raw_url;
  }).length;
  const allComplete = completedCount === lezioni.length && lezioni.length > 0;

  return (
    <div className="rounded-2xl bg-white overflow-hidden"
      style={{ border: `1px solid ${allComplete ? "#22C55E40" : isExpanded ? "#FFD24D40" : "#ECEDEF"}` }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-all">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: allComplete ? "#22C55E" : "#FFD24D", color: allComplete ? "white" : "#1E2128" }}>
          {allComplete ? <Check className="w-4 h-4" /> : (modulo.numero || idx + 1)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#1E2128" }}>{modulo.titolo}</div>
          {modulo.obiettivo && (
            <div className="text-xs mt-0.5" style={{ color: "#5F6572" }}>{modulo.obiettivo}</div>
          )}
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: allComplete ? "#DCFCE7" : "#F5F3EE",
            color: allComplete ? "#16A34A" : "#8B8680"
          }}>
          {completedCount}/{lezioni.length} approvate
        </span>
        {isExpanded ? <ChevronDown className="w-4 h-4" style={{ color: "#8B8680" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#8B8680" }} />}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 space-y-3" style={{ background: "#FAFAF7" }}>
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
                isAdmin={isAdmin}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// VideocorsoPage — entry point
// ─────────────────────────────────────────────────────────────────────

export function VideocorsoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [courseData, setCourseData] = useState(null);
  const [lessonsStatus, setLessonsStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState([0]);
  const partnerId = partner?.id;

  const load = useCallback(async () => {
    if (!partnerId) { setIsLoading(false); return; }
    try {
      const res = await axios.get(`${API}/api/partner-journey/videocorso/${partnerId}`);
      const data = res.data;
      if (data.course_data) {
        setCourseData(data.course_data);
        setExpandedModules((data.course_data.moduli || []).map((_, i) => i));
      }
      setLessonsStatus(data.lessons_status || {});
    } catch (e) {
      console.error("Error loading videocorso:", e);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  // Refresh periodico se ci sono lezioni in elaborazione
  useEffect(() => {
    const inProgress = Object.values(lessonsStatus).some((ls) =>
      ["queued", "downloading", "cleaning", "transcribing", "cutting_fillers", "uploading_youtube"]
        .includes(ls?.pipeline_status)
    );
    if (!inProgress) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [lessonsStatus, load]);

  const toggleModule = (idx) => {
    setExpandedModules(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
      </div>
    );
  }

  // Stats globali
  const moduli = courseData?.moduli || [];
  const totalLezioni = moduli.reduce((acc, m) => acc + (m.lezioni?.length || 0), 0);
  const uploadedLezioni = moduli.reduce((acc, m) => acc + (m.lezioni || []).filter((lez) => {
    const lid = `m${m.numero}_l${lez.numero}`;
    return lessonsStatus[lid]?.video_raw_url;
  }).length, 0);
  const approvedLezioni = moduli.reduce((acc, m) => acc + (m.lezioni || []).filter((lez) => {
    const lid = `m${m.numero}_l${lez.numero}`;
    const s = lessonsStatus[lid];
    return s?.video_approved || s?.pipeline_status === "approved";
  }).length, 0);
  const allReady = approvedLezioni === totalLezioni && totalLezioni > 0;
  const totalBonus = (courseData?.bonus || []).length;

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* HERO */}
        <div className="mb-6" data-testid="videocorso-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Il tuo Videocorso
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Carica il video grezzo di ogni lezione (link Drive). Il team lo edita e te lo
            ripropone qui per l'approvazione finale.
          </p>
        </div>

        {/* PROGRESS HEADER */}
        {courseData && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: "#1E2128" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#FFD24D" }}>
                  Progress globale
                </div>
                <h3 className="text-lg font-black text-white">{courseData.titolo_corso || "Videocorso"}</h3>
                {courseData.sottotitolo && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{courseData.sottotitolo}</p>
                )}
              </div>
              <button
                onClick={load}
                className="p-2 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.1)" }}
                title="Aggiorna stato"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="text-2xl font-black text-white">{moduli.length}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Moduli</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="text-2xl font-black" style={{ color: uploadedLezioni === totalLezioni ? "#22C55E" : "#FFD24D" }}>
                  {uploadedLezioni}/{totalLezioni}
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Caricate</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="text-2xl font-black" style={{ color: allReady ? "#22C55E" : "#FFD24D" }}>
                  {approvedLezioni}/{totalLezioni}
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Approvate</div>
              </div>
            </div>
            {allReady && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid #22C55E" }}>
                <Check className="w-4 h-4" style={{ color: "#22C55E" }} />
                <span className="text-xs font-bold" style={{ color: "#22C55E" }}>Videocorso completo!</span>
              </div>
            )}
          </div>
        )}

        {/* CONTENT */}
        {!courseData ? (
          <div className="text-center py-12 text-sm" style={{ color: "#9CA3AF" }}>
            Il team sta preparando la struttura del tuo videocorso.
          </div>
        ) : (
          <div className="space-y-3" data-testid="videocorso-output">
            {moduli.map((modulo, idx) => (
              <ModuleCard
                key={idx}
                modulo={modulo}
                idx={idx}
                isExpanded={expandedModules.includes(idx)}
                onToggle={() => toggleModule(idx)}
                lessonsStatus={lessonsStatus}
                partnerId={partnerId}
                isAdmin={isAdmin}
                onRefresh={load}
              />
            ))}

            {/* Bonus inclusi (read-only per ora — upload bonus in commit successivo) */}
            {courseData.bonus && courseData.bonus.length > 0 && (
              <div className="bg-white rounded-2xl border p-5 mt-5" style={{ borderColor: "#ECEDEF" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B5CF6" }}>
                    Bonus inclusi ({totalBonus})
                  </span>
                </div>
                <ul className="space-y-2">
                  {courseData.bonus.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                      <span>{typeof b === "string" ? b : (b.titolo || JSON.stringify(b))}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] mt-3 italic" style={{ color: "#9CA3AF" }}>
                  L'upload dei file bonus sarà disponibile a breve.
                </p>
              </div>
            )}

            {/* CTA prossimo step quando tutto approvato */}
            {allReady && (
              <button
                onClick={() => onNavigate("funnel")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90 mt-3"
                style={{ background: "#1E2128", color: "#FFD24D" }}
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

export default VideocorsoPage;
