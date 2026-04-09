import { useState, useEffect } from "react";
import {
  ArrowRight, Check, Upload, Clock, CheckCircle2, Film,
  AlertCircle, ChevronDown, ChevronRight, BookOpen, ThumbsUp,
  RefreshCw, Loader2, FileText, Gift, Download, List, Eye
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

/* ═══════════════════════════════════════════════════════════
   FASE 1 — REVISIONE OUTLINE
   ═══════════════════════════════════════════════════════════ */

function OutlineReview({ outline, onApprove, isApproving, isAdmin }) {
  const [expandedModules, setExpandedModules] = useState(
    isAdmin ? (outline?.moduli || []).map((_, i) => i) : [0]
  );

  const toggleModule = (idx) =>
    setExpandedModules((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );

  const moduli = outline?.moduli || [];

  return (
    <div className="space-y-4" data-testid="outline-review">
      {/* Titolo corso */}
      <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #ECEDEF" }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#8B8680" }}>
          Titolo del corso
        </div>
        <h2 className="text-xl font-black mb-1" style={{ color: "#1E2128" }}>
          {outline?.corsoTitolo || "Titolo non definito"}
        </h2>
        {outline?.durataStimata && (
          <p className="text-sm" style={{ color: "#5F6572" }}>
            Durata stimata: <strong>{outline.durataStimata}</strong>
          </p>
        )}
      </div>

      {/* Moduli */}
      <div className="space-y-3">
        {moduli.map((modulo, idx) => {
          const isExp = expandedModules.includes(idx);
          const lezioni = modulo.lezioni || [];
          return (
            <div
              key={idx}
              data-testid={`outline-module-${idx}`}
              className="rounded-2xl bg-white overflow-hidden"
              style={{ border: `1px solid ${isExp ? "#F2C41840" : "#ECEDEF"}` }}
            >
              {/* Module header */}
              <button
                onClick={() => toggleModule(idx)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-all"
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: "#F2C418", color: "#1E2128" }}
                >
                  {modulo.numero || idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: "#1E2128" }}>
                    {modulo.titolo}
                  </div>
                  {modulo.obiettivo && (
                    <div className="text-xs mt-0.5" style={{ color: "#5F6572" }}>
                      {modulo.obiettivo}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#F5F3EE", color: "#8B8680" }}>
                  {lezioni.length} lezioni
                </span>
                {isExp ? (
                  <ChevronDown className="w-4 h-4" style={{ color: "#8B8680" }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: "#8B8680" }} />
                )}
              </button>

              {/* Lezioni */}
              {isExp && (
                <div className="px-5 pb-5 space-y-2">
                  {lezioni.map((lezione, li) => (
                    <div
                      key={li}
                      className="rounded-xl p-4"
                      style={{ background: "#FAFAF7", border: "1px solid #F0EDE8" }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#E8E4DC", color: "#5F6572" }}>
                          {lezione.numero || `${modulo.numero || idx + 1}.${li + 1}`}
                        </span>
                        <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
                          {lezione.titolo}
                        </span>
                        {lezione.durata && (
                          <span className="ml-auto text-xs" style={{ color: "#9CA3AF" }}>
                            {lezione.durata}
                          </span>
                        )}
                      </div>
                      {lezione.contenuto && lezione.contenuto.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {lezione.contenuto.map((arg, ai) => (
                            <span
                              key={ai}
                              className="text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: "#F2C41815", color: "#92700C", border: "1px solid #F2C41830" }}
                            >
                              {arg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bonus & Risorse */}
      {(outline?.bonus || outline?.risorse) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {outline?.bonus && (
            <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #ECEDEF" }}>
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Bonus inclusi</span>
              </div>
              <ul className="space-y-1.5">
                {(Array.isArray(outline.bonus) ? outline.bonus : [outline.bonus]).map((b, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#5F6572" }}>
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
                    {typeof b === "string" ? b : b.titolo || b.title || JSON.stringify(b)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outline?.risorse && (
            <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #ECEDEF" }}>
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-4 h-4" style={{ color: "#3B82F6" }} />
                <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Risorse scaricabili</span>
              </div>
              <ul className="space-y-1.5">
                {(Array.isArray(outline.risorse) ? outline.risorse : [outline.risorse]).map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#5F6572" }}>
                    <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
                    {typeof r === "string" ? r : r.titolo || r.title || JSON.stringify(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Riepilogo */}
      <div className="rounded-2xl p-5" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
        <div className="flex items-center gap-2 mb-2">
          <List className="w-4 h-4" style={{ color: "#92700C" }} />
          <span className="text-sm font-bold" style={{ color: "#92700C" }}>Riepilogo struttura</span>
        </div>
        <div className="flex gap-6 text-sm" style={{ color: "#5F6572" }}>
          <span><strong>{moduli.length}</strong> moduli</span>
          <span><strong>{moduli.reduce((s, m) => s + (m.lezioni?.length || 0), 0)}</strong> lezioni</span>
          {outline?.durataStimata && <span>Durata: <strong>{outline.durataStimata}</strong></span>}
        </div>
      </div>

      {/* Bottone conferma */}
      {!isAdmin && (
        <button
          data-testid="approve-outline-btn"
          onClick={onApprove}
          disabled={isApproving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "#34C77B", color: "white" }}
        >
          {isApproving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Salvataggio...</>
          ) : (
            <><ThumbsUp className="w-5 h-5" /> Confermo la struttura — procedi alla registrazione</>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FASE 2 — REGISTRAZIONE (existing)
   ═══════════════════════════════════════════════════════════ */

function RecordingTips() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5 mb-6">
      <h3 className="font-bold text-sm mb-3" style={{ color: "#1E2128" }}>
        Consigli per la registrazione
      </h3>
      <ul className="space-y-2 text-sm" style={{ color: "#5F6572" }}>
        <li className="flex items-start gap-2"><span className="mt-1">•</span><span>Ambiente silenzioso con buona illuminazione</span></li>
        <li className="flex items-start gap-2"><span className="mt-1">•</span><span>Guarda in camera come se parlassi a un amico</span></li>
        <li className="flex items-start gap-2"><span className="mt-1">•</span><span>Video tra 5 e 15 minuti per massimizzare l'engagement</span></li>
        <li className="flex items-start gap-2"><span className="mt-1">•</span><span>Non cercare la perfezione — l'autenticita' e' piu' importante</span></li>
      </ul>
    </div>
  );
}

function LessonCard({ lesson, status, onUpload }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsUploading(false);
    onUpload(lesson.id || lesson.numero);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: status === "approved" ? "#EAFAF1" : status === "uploaded" ? "#FFF8DC" : "#FAFAF7",
        border: `1px solid ${status === "approved" ? "#34C77B40" : status === "uploaded" ? "#F2C41840" : "#ECEDEF"}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: status === "approved" ? "#34C77B" : status === "uploaded" ? "#F2C418" : "#ECEDEF",
          color: status === "approved" || status === "uploaded" ? "white" : "#9CA3AF",
        }}
      >
        {status === "approved" ? <Check className="w-4 h-4" /> : status === "uploaded" ? <Clock className="w-4 h-4" /> : <Film className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: "#1E2128" }}>
          {lesson.titolo || lesson.title}
        </div>
        <div className="text-xs" style={{ color: "#9CA3AF" }}>
          {lesson.durata || lesson.duration || "5-15 min"}
        </div>
      </div>
      {status === "approved" ? (
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#34C77B20", color: "#2D9F6F" }}>
          Approvato
        </span>
      ) : status === "uploaded" ? (
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#FFF0B3", color: "#92700C" }}>
          In revisione
        </span>
      ) : (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
          style={{ background: "#F2C418", color: "#1E2128" }}
          data-testid={`upload-lesson-${lesson.numero || lesson.id}`}
        >
          {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {isUploading ? "Caricamento..." : "Carica video"}
        </button>
      )}
    </div>
  );
}

function RecordingPhase({ outline, lessonStatuses, onUploadLesson, isAdmin }) {
  const [expandedModules, setExpandedModules] = useState(
    isAdmin ? (outline?.moduli || []).map((_, i) => i) : [0]
  );
  const moduli = outline?.moduli || [];
  const allLessons = moduli.flatMap((m) => m.lezioni || []);
  const totalLessons = allLessons.length;
  const uploaded = Object.values(lessonStatuses).filter((s) => s === "uploaded" || s === "approved").length;
  const approved = Object.values(lessonStatuses).filter((s) => s === "approved").length;

  const toggleModule = (idx) =>
    setExpandedModules((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));

  return (
    <div data-testid="recording-phase">
      {/* Progress */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Progresso registrazione</span>
          <span className="text-sm" style={{ color: "#5F6572" }}>{uploaded} di {totalLessons} video caricati</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "#ECEDEF" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalLessons > 0 ? (uploaded / totalLessons) * 100 : 0}%`,
              background: approved === totalLessons ? "#34C77B" : "linear-gradient(90deg, #F2C418, #FADA5E)",
            }}
          />
        </div>
      </div>

      <RecordingTips />

      {/* Modules */}
      <div className="space-y-3">
        {moduli.map((modulo, idx) => {
          const isExp = expandedModules.includes(idx);
          return (
            <div key={idx} className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
              <button
                onClick={() => toggleModule(idx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "#F2C418", color: "#1E2128" }}>
                  {modulo.numero || idx + 1}
                </span>
                <span className="flex-1 text-sm font-bold" style={{ color: "#1E2128" }}>
                  {modulo.titolo}
                </span>
                {isExp ? <ChevronDown className="w-4 h-4" style={{ color: "#8B8680" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#8B8680" }} />}
              </button>
              {isExp && (
                <div className="px-4 pb-4 space-y-2">
                  {(modulo.lezioni || []).map((lezione, li) => (
                    <LessonCard
                      key={li}
                      lesson={lezione}
                      status={lessonStatuses[lezione.numero || `${modulo.numero || idx + 1}.${li + 1}`]}
                      onUpload={onUploadLesson}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

export function VideocorsoPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [phase, setPhase] = useState("loading"); // loading | outline | recording | completed
  const [outline, setOutline] = useState(null);
  const [lessonStatuses, setLessonStatuses] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState(null);

  const partnerId = partner?.id;

  // Load outline
  useEffect(() => {
    if (!partnerId) { setPhase("outline"); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/stefania/course-builder/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.outline) {
            setOutline(data.outline);
            setPhase(data.status === "approved" ? "recording" : "outline");
          } else {
            // Nessun outline: mostra outline vuoto con struttura placeholder
            setOutline(null);
            setPhase("outline");
          }
        } else {
          setPhase("outline");
        }
      } catch (e) {
        setError(e.message);
        setPhase("outline");
      }
    })();
  }, [partnerId]);

  const handleApproveOutline = async () => {
    setIsApproving(true);
    try {
      await fetch(`${API}/api/stefania/course-builder/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          outline: outline,
          status: "approved",
        }),
      });
      setPhase("recording");
    } catch (e) {
      setError(e.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleUploadLesson = (lessonId) => {
    setLessonStatuses((prev) => ({ ...prev, [lessonId]: "uploaded" }));
    setTimeout(() => {
      setLessonStatuses((prev) => ({ ...prev, [lessonId]: "approved" }));
    }, 3000);
  };

  // Check completion
  const allLessons = (outline?.moduli || []).flatMap((m) => m.lezioni || []);
  const totalLessons = allLessons.length;
  const uploadedCount = Object.values(lessonStatuses).filter((s) => s === "uploaded" || s === "approved").length;
  const isCompleted = totalLessons > 0 && uploadedCount === totalLessons;

  if (isCompleted && phase !== "completed") setPhase("completed");

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2" style={{ color: "#1E2128" }}>
            Creazione del tuo Videocorso
          </h1>
          <p className="text-sm" style={{ color: "#5F6572" }}>
            {phase === "outline"
              ? "Rivedi e conferma la struttura del corso prima di registrare"
              : phase === "recording"
              ? "Registra le lezioni seguendo la struttura approvata"
              : "Caricamento..."}
          </p>
        </div>

        {/* Phase indicator */}
        <div className="flex gap-2 mb-6">
          {["Struttura", "Registrazione"].map((label, i) => {
            const active = (i === 0 && phase === "outline") || (i === 1 && (phase === "recording" || phase === "completed"));
            const done = (i === 0 && (phase === "recording" || phase === "completed")) || (i === 1 && phase === "completed");
            return (
              <div key={i} className="flex items-center gap-2 flex-1 py-2 px-3 rounded-lg"
                style={{ background: done ? "#EAFAF1" : active ? "#FFF8E1" : "#F5F3EE", border: `1px solid ${done ? "#34C77B40" : active ? "#F2C41840" : "#E8E4DC"}` }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: done ? "#34C77B" : active ? "#F2C418" : "#E8E4DC", color: done || active ? "#fff" : "#8B8680" }}>
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="text-xs font-bold" style={{ color: done ? "#2D9F6F" : active ? "#92700C" : "#8B8680" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Admin badge */}
        {isAdmin && phase === "outline" && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
              Vista Admin — Outline completo
            </span>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* FASE 1: Outline review */}
        {phase === "outline" && (
          outline ? (
            <OutlineReview outline={outline} onApprove={handleApproveOutline} isApproving={isApproving} isAdmin={isAdmin} />
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ background: "#FFF8E1", border: "1px solid #F2C41830" }}>
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#92700C" }} />
              <h3 className="font-bold text-base mb-2" style={{ color: "#1E2128" }}>
                Struttura corso non ancora generata
              </h3>
              <p className="text-sm" style={{ color: "#5F6572" }}>
                La struttura del videocorso viene creata nella fase di Posizionamento.
                <br />Completa prima lo Step 1 per generare l'outline del tuo corso.
              </p>
            </div>
          )
        )}

        {/* FASE 2: Recording */}
        {phase === "recording" && outline && (
          <RecordingPhase
            outline={outline}
            lessonStatuses={lessonStatuses}
            onUploadLesson={handleUploadLesson}
            isAdmin={isAdmin}
          />
        )}

        {/* COMPLETATO */}
        {phase === "completed" && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-white" />
            <h3 className="font-bold text-lg text-white mb-2">Videocorso completato!</h3>
            <p className="text-sm text-white/80 mb-4">
              Tutte le lezioni sono state caricate e approvate. Prosegui con la creazione del Funnel.
            </p>
            <button
              onClick={() => { if (onComplete) onComplete(); onNavigate("funnel"); }}
              className="px-6 py-3 rounded-xl font-bold bg-white hover:scale-105 transition-all"
              style={{ color: "#2D9F6F" }}
            >
              Prosegui al Funnel <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideocorsoPage;
