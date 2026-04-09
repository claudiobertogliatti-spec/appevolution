import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronRight, Check, Circle, Clock, Lock,
  RefreshCw, PanelRightOpen, PanelRightClose, AlertCircle,
  StickyNote, Save, X, MessageSquare
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_META = {
  not_started: { label: "Non iniziato", color: "#6B7280", bg: "#374151", icon: Circle, ring: "#4B5563" },
  in_progress: { label: "In corso", color: "#FBBF24", bg: "#78350F", icon: Clock, ring: "#D97706" },
  completed:   { label: "Completato", color: "#34D399", bg: "#064E3B", icon: Check, ring: "#059669" },
};

const MACRO_ORDER = ["posizionamento", "masterclass", "videocorso", "funnel", "lancio"];
const MACRO_META = {
  posizionamento: { label: "Posizionamento", emoji: "1" },
  masterclass:    { label: "Masterclass", emoji: "2" },
  videocorso:     { label: "Videocorso", emoji: "3" },
  funnel:         { label: "Funnel", emoji: "4" },
  lancio:         { label: "Lancio", emoji: "5" },
};

/* ─── Note Inline Editor ─────────────────────────────────── */
function NoteEditor({ value, onSave, loading }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value || ""); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (!editing) {
    return (
      <button
        data-testid="note-toggle"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-[11px] mt-1 transition-all rounded px-1.5 py-0.5"
        style={{
          color: value ? "#D1D5DB" : "#4B5563",
          background: value ? "#1F2937" : "transparent",
        }}
        title={value || "Aggiungi nota"}
      >
        {value ? (
          <>
            <MessageSquare className="w-3 h-3 flex-shrink-0" style={{ color: "#FBBF24" }} />
            <span className="truncate max-w-[180px]">{value}</span>
          </>
        ) : (
          <>
            <StickyNote className="w-3 h-3" />
            <span>+ nota</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <input
        ref={inputRef}
        data-testid="note-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value || ""); setEditing(false); }
        }}
        className="flex-1 text-[11px] px-2 py-1 rounded border-0 outline-none"
        style={{ background: "#111827", color: "#E5E7EB" }}
        placeholder="Scrivi nota..."
        disabled={loading}
      />
      <button
        data-testid="note-save"
        onClick={() => { onSave(draft); setEditing(false); }}
        disabled={loading}
        className="p-1 rounded hover:bg-white/10"
      >
        <Save className="w-3 h-3" style={{ color: "#34D399" }} />
      </button>
      <button
        data-testid="note-cancel"
        onClick={() => { setDraft(value || ""); setEditing(false); }}
        className="p-1 rounded hover:bg-white/10"
      >
        <X className="w-3 h-3" style={{ color: "#6B7280" }} />
      </button>
    </div>
  );
}

/* ─── Single Micro Step Row ──────────────────────────────── */
function MicroStepRow({ microId, micro, macroStep, configOrder, onUpdate, onSaveNote, loading }) {
  const statuses = ["not_started", "in_progress", "completed"];
  const currentStatus = micro.status || "not_started";
  const currentIdx = statuses.indexOf(currentStatus);
  const meta = STATUS_META[currentStatus];

  const cycleStatus = () => {
    const nextIdx = (currentIdx + 1) % statuses.length;
    onUpdate(macroStep, microId, statuses[nextIdx]);
  };

  return (
    <div
      data-testid={`micro-${macroStep}-${microId}`}
      className="rounded-lg transition-all"
      style={{
        background: currentStatus === "completed" ? "#064E3B20" : currentStatus === "in_progress" ? "#78350F20" : "#111827",
        border: `1px solid ${meta.ring}40`,
      }}
    >
      <button
        onClick={cycleStatus}
        disabled={loading}
        className="w-full flex items-center gap-3 py-2.5 px-3 text-left transition-all"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? "wait" : "pointer" }}
      >
        {/* Status circle */}
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: meta.ring, border: `2px solid ${meta.color}` }}
        >
          {currentStatus === "completed" && <Check className="w-3 h-3 text-white" />}
          {currentStatus === "in_progress" && <Clock className="w-3 h-3 text-white" />}
        </span>

        {/* Label + order number */}
        <div className="flex-1 min-w-0">
          <span
            className="text-[13px] font-medium block"
            style={{
              color: currentStatus === "completed" ? "#6EE7B7" : currentStatus === "in_progress" ? "#FDE68A" : "#D1D5DB",
              textDecoration: currentStatus === "completed" ? "line-through" : "none",
              opacity: currentStatus === "completed" ? 0.7 : 1,
            }}
          >
            {micro.label || microId}
          </span>
        </div>

        {/* Status badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      </button>

      {/* Note area */}
      <div className="px-3 pb-2">
        <NoteEditor
          value={micro.note || ""}
          onSave={(text) => onSaveNote(macroStep, microId, text)}
          loading={loading}
        />
      </div>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────── */
export function AdminPartnerOpsPanel({ partner, token, onPhaseChanged }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);

  const partnerId = partner?.id;

  const fetchProgress = useCallback(async () => {
    if (!partnerId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) { setError("demo"); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress(data);
      // Auto-expand first in_progress or not_started step
      if (!expandedStep) {
        for (const stepId of MACRO_ORDER) {
          const st = data.progress?.[stepId]?.status;
          if (st === "in_progress" || st === "not_started") {
            setExpandedStep(stepId);
            break;
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [partnerId, token]);

  useEffect(() => {
    setExpandedStep(null);
    fetchProgress();
  }, [partnerId]);

  useEffect(() => {
    if (partnerId && token) fetchProgress();
  }, [fetchProgress]);

  /* ── Update micro-step status ── */
  const handleUpdateMicroStep = async (macroStep, microId, newStatus) => {
    if (!partnerId || !token) return;
    const key = `${macroStep}-${microId}`;
    setUpdatingKey(key);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ macro_step: macroStep, micro_step_id: microId, status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress(prev => ({ ...prev, phase: data.new_phase, progress: data.progress }));
      if (onPhaseChanged && data.new_phase !== progress?.phase) {
        onPhaseChanged(data.new_phase);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  /* ── Save note ── */
  const handleSaveNote = async (macroStep, microId, noteText) => {
    if (!partnerId || !token) return;
    const key = `note-${macroStep}-${microId}`;
    setUpdatingKey(key);
    try {
      const res = await fetch(`${API}/api/admin/partners/${partnerId}/progress/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ macro_step: macroStep, micro_step_id: microId, note: noteText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Update local state
      setProgress(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        const prog = { ...updated.progress };
        const macro = { ...prog[macroStep] };
        const micros = { ...macro.micro_steps };
        micros[microId] = { ...micros[microId], note: noteText };
        macro.micro_steps = micros;
        prog[macroStep] = macro;
        updated.progress = prog;
        return updated;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  /* ── Collapsed state ── */
  if (collapsed) {
    return (
      <div
        data-testid="admin-ops-panel-collapsed"
        className="flex flex-col items-center py-4 gap-4 h-full"
        style={{ width: 48, minWidth: 48, background: "#0F172A", borderLeft: "1px solid #1E293B" }}
      >
        <button
          data-testid="ops-panel-expand"
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg transition-all hover:bg-white/10"
          title="Apri pannello operativo"
        >
          <PanelRightOpen className="w-5 h-5" style={{ color: "#FBBF24" }} />
        </button>
        <div className="text-[10px] font-black tracking-widest" style={{ color: "#475569", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          OPS
        </div>
      </div>
    );
  }

  /* ── Compute totals ── */
  const totalMicro = MACRO_ORDER.reduce((sum, sid) => {
    const ms = progress?.progress?.[sid]?.micro_steps || {};
    return sum + Object.keys(ms).length;
  }, 0);
  const completedMicro = MACRO_ORDER.reduce((sum, sid) => {
    const ms = progress?.progress?.[sid]?.micro_steps || {};
    return sum + Object.values(ms).filter(m => m.status === "completed").length;
  }, 0);
  const globalPercent = totalMicro > 0 ? Math.round((completedMicro / totalMicro) * 100) : 0;

  return (
    <div
      data-testid="admin-ops-panel"
      className="flex flex-col h-full"
      style={{ width: 360, minWidth: 360, background: "#0F172A", borderLeft: "1px solid #1E293B", color: "#E5E7EB" }}
    >
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: 56, borderBottom: "1px solid #1E293B" }}>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FBBF24" }}>
            Pannello Operativo
          </div>
          <div className="text-sm font-bold truncate" style={{ color: "#F1F5F9", maxWidth: 220 }}>
            {partner?.name || "Partner"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            data-testid="ops-panel-refresh"
            onClick={fetchProgress}
            disabled={loading}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            title="Aggiorna"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "#64748B" }} />
          </button>
          <button
            data-testid="ops-panel-collapse"
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            title="Chiudi pannello"
          >
            <PanelRightClose className="w-4 h-4" style={{ color: "#64748B" }} />
          </button>
        </div>
      </div>

      {/* ═══ Phase + Global Progress ═══ */}
      <div className="px-4 py-3 flex-shrink-0 space-y-2" style={{ borderBottom: "1px solid #1E293B" }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Fase attuale</span>
          <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: "#FBBF24", color: "#0F172A" }}>
            {progress?.phase || partner?.phase || "--"}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: "#64748B" }}>Progresso globale</span>
            <span className="text-[11px] font-bold" style={{ color: globalPercent === 100 ? "#34D399" : "#FBBF24" }}>
              {completedMicro}/{totalMicro} ({globalPercent}%)
            </span>
          </div>
          <div className="w-full rounded-full" style={{ height: 4, background: "#1E293B" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(globalPercent, 2)}%`,
                background: globalPercent === 100 ? "#34D399" : "linear-gradient(90deg, #FBBF24, #F59E0B)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ═══ Error states ═══ */}
      {error === "demo" && (
        <div className="px-4 py-3 text-xs" style={{ background: "#1E293B", color: "#94A3B8" }}>
          <p className="font-bold mb-1" style={{ color: "#FBBF24" }}>Partner di anteprima</p>
          <p>Seleziona un partner reale dalla lista per gestire il progresso operativo.</p>
        </div>
      )}
      {error && error !== "demo" && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs" style={{ background: "#7F1D1D", color: "#FCA5A5" }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ═══ Macro Steps Accordion ═══ */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {MACRO_ORDER.map((stepId, idx) => {
          const stepData = progress?.progress?.[stepId] || { status: "not_started", micro_steps: {} };
          const isExpanded = expandedStep === stepId;
          const macroStatus = stepData.status || "not_started";
          const macroMeta = STATUS_META[macroStatus];
          const microSteps = stepData.micro_steps || {};
          const totalMs = Object.keys(microSteps).length;
          const completedMs = Object.values(microSteps).filter(m => m.status === "completed").length;
          const notesCount = Object.values(microSteps).filter(m => m.note).length;
          const macroPercent = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

          // Get ordered micro-steps from config
          const configMicros = progress?.config?.[stepId] || [];
          const orderedIds = configMicros.map(c => c.id);

          return (
            <div
              key={stepId}
              data-testid={`ops-macro-${stepId}`}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: isExpanded ? "#1E293B" : "#0F172A",
                border: `1px solid ${isExpanded ? macroMeta.ring + "60" : "#1E293B"}`,
              }}
            >
              {/* Macro header */}
              <button
                data-testid={`ops-macro-btn-${stepId}`}
                onClick={() => setExpandedStep(isExpanded ? null : stepId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{
                    background: macroStatus === "completed" ? "#059669" : macroStatus === "in_progress" ? "#D97706" : "#334155",
                    color: macroStatus === "not_started" ? "#64748B" : "#FFF",
                  }}
                >
                  {macroStatus === "completed" ? <Check className="w-4 h-4" /> : MACRO_META[stepId].emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>
                      {MACRO_META[stepId].label}
                    </span>
                    {notesCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1E293B", color: "#FBBF24" }}>
                        {notesCount} note
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 rounded-full" style={{ height: 3, background: "#334155", maxWidth: 80 }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(macroPercent, 3)}%`,
                          background: macroPercent === 100 ? "#34D399" : "#FBBF24",
                        }}
                      />
                    </div>
                    <span className="text-[10px]" style={{ color: "#64748B" }}>
                      {completedMs}/{totalMs}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: macroMeta.bg, color: macroMeta.color }}
                >
                  {macroMeta.label}
                </span>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#64748B" }} />
                  : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#64748B" }} />
                }
              </button>

              {/* Micro steps list */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  {orderedIds.map((microId) => {
                    const micro = microSteps[microId];
                    if (!micro) return null;
                    return (
                      <MicroStepRow
                        key={microId}
                        microId={microId}
                        micro={micro}
                        macroStep={stepId}
                        configOrder={orderedIds}
                        onUpdate={handleUpdateMicroStep}
                        onSaveNote={handleSaveNote}
                        loading={updatingKey === `${stepId}-${microId}` || updatingKey === `note-${stepId}-${microId}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Footer hint ═══ */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #1E293B" }}>
        <p className="text-[11px]" style={{ color: "#475569" }}>
          Clicca sullo stato per ciclare: non iniziato &rarr; in corso &rarr; completato. La fase si aggiorna automaticamente.
        </p>
      </div>
    </div>
  );
}
