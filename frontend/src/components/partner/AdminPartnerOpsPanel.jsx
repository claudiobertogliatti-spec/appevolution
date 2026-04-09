import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Check, Circle, Clock, Lock,
  RefreshCw, PanelRightOpen, PanelRightClose, AlertCircle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  not_started: { label: "Non iniziato", color: "#9CA3AF", bg: "#F3F4F6", icon: Circle },
  in_progress: { label: "In corso", color: "#D4A017", bg: "#FFF6D6", icon: Clock },
  completed: { label: "Completato", color: "#34C77B", bg: "#F0FDF4", icon: Check },
};

const MACRO_ORDER = ["posizionamento", "masterclass", "videocorso", "funnel", "lancio"];
const MACRO_LABELS = {
  posizionamento: "Posizionamento",
  masterclass: "Masterclass",
  videocorso: "Videocorso",
  funnel: "Funnel",
  lancio: "Lancio",
};

function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-bold"
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: small ? 10 : 11,
        padding: small ? "2px 6px" : "3px 8px",
      }}
    >
      <Icon style={{ width: small ? 10 : 12, height: small ? 10 : 12 }} />
      {cfg.label}
    </span>
  );
}

function MicroStepRow({ microId, micro, macroStep, onUpdate, loading }) {
  const statuses = ["not_started", "in_progress", "completed"];
  const currentIdx = statuses.indexOf(micro.status || "not_started");

  const cycleStatus = () => {
    const nextIdx = (currentIdx + 1) % statuses.length;
    onUpdate(macroStep, microId, statuses[nextIdx]);
  };

  const cfg = STATUS_CONFIG[micro.status || "not_started"];

  return (
    <button
      data-testid={`micro-${macroStep}-${microId}`}
      onClick={cycleStatus}
      disabled={loading}
      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-all"
      style={{
        background: micro.status === "completed" ? "#F0FDF4" : micro.status === "in_progress" ? "#FFFBEB" : "transparent",
        border: `1px solid ${micro.status === "completed" ? "#BBF7D0" : micro.status === "in_progress" ? "#FDE68A" : "#E5E7EB"}`,
        opacity: loading ? 0.6 : 1,
        cursor: loading ? "wait" : "pointer",
      }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.color, transition: "all 0.2s" }}
      >
        {micro.status === "completed" && <Check className="w-3 h-3 text-white" />}
        {micro.status === "in_progress" && <Clock className="w-3 h-3 text-white" />}
        {micro.status === "not_started" && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span
        className="flex-1 text-sm font-medium"
        style={{
          color: micro.status === "completed" ? "#2D9F6F" : "#374151",
          textDecoration: micro.status === "completed" ? "line-through" : "none",
        }}
      >
        {micro.label || microId}
      </span>
    </button>
  );
}

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
      if (res.status === 404) {
        setError("demo");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProgress(data);
      // Auto-expand first in_progress step
      if (!expandedStep) {
        for (const stepId of MACRO_ORDER) {
          if (data.progress?.[stepId]?.status === "in_progress") {
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
  }, [partnerId, token, expandedStep]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

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
      setProgress(prev => ({
        ...prev,
        phase: data.new_phase,
        progress: data.progress,
      }));
      if (onPhaseChanged && data.new_phase !== progress?.phase) {
        onPhaseChanged(data.new_phase);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  if (collapsed) {
    return (
      <div
        data-testid="admin-ops-panel-collapsed"
        className="flex flex-col items-center py-4 gap-4 h-full"
        style={{
          width: 48,
          minWidth: 48,
          background: "#1A1F24",
          borderLeft: "1px solid #2D333B",
        }}
      >
        <button
          data-testid="ops-panel-expand"
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg transition-all hover:bg-white/10"
          title="Apri pannello operativo"
        >
          <PanelRightOpen className="w-5 h-5" style={{ color: "#FFD24D" }} />
        </button>
        <div className="writing-mode-vertical text-xs font-bold" style={{ color: "#6B7280", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          PANNELLO OPS
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="admin-ops-panel"
      className="flex flex-col h-full"
      style={{
        width: 320,
        minWidth: 320,
        background: "#1A1F24",
        borderLeft: "1px solid #2D333B",
        color: "#E5E7EB",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: 62, borderBottom: "1px solid #2D333B" }}>
        <div>
          <div className="text-xs font-black uppercase tracking-wider" style={{ color: "#FFD24D" }}>
            Pannello Operativo
          </div>
          <div className="text-sm font-bold truncate" style={{ color: "#E5E7EB", maxWidth: 200 }}>
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
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "#6B7280" }} />
          </button>
          <button
            data-testid="ops-panel-collapse"
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            title="Chiudi pannello"
          >
            <PanelRightClose className="w-4 h-4" style={{ color: "#6B7280" }} />
          </button>
        </div>
      </div>

      {/* Phase badge */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #2D333B" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "#6B7280" }}>Fase attuale</span>
          <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: "#FFD24D", color: "#1A1F24" }}>
            {progress?.phase || partner?.phase || "—"}
          </span>
        </div>
      </div>

      {error === "demo" && (
        <div className="px-4 py-3 text-xs" style={{ background: "#2D333B", color: "#9CA3AF" }}>
          <p className="font-bold mb-1" style={{ color: "#FFD24D" }}>Partner di anteprima</p>
          <p>Seleziona un partner reale dalla lista Partner per gestire il progresso operativo.</p>
        </div>
      )}
      {error && error !== "demo" && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs" style={{ background: "#7F1D1D", color: "#FCA5A5" }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Macro steps accordion */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {MACRO_ORDER.map((stepId, i) => {
          const stepData = progress?.progress?.[stepId] || { status: "not_started", micro_steps: {} };
          const isExpanded = expandedStep === stepId;
          const macroStatus = stepData.status || "not_started";
          const microSteps = stepData.micro_steps || {};
          const totalMicro = Object.keys(microSteps).length;
          const completedMicro = Object.values(microSteps).filter(m => m.status === "completed").length;

          return (
            <div key={stepId} className="rounded-xl overflow-hidden" style={{ background: "#2D333B" }}>
              {/* Macro header */}
              <button
                data-testid={`ops-macro-${stepId}`}
                onClick={() => setExpandedStep(isExpanded ? null : stepId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{
                    background: macroStatus === "completed" ? "#34C77B" : macroStatus === "in_progress" ? "#FFD24D" : "#4B5563",
                    color: macroStatus === "completed" || macroStatus === "in_progress" ? "#1A1F24" : "#9CA3AF",
                  }}
                >
                  {macroStatus === "completed" ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: "#E5E7EB" }}>
                    {MACRO_LABELS[stepId]}
                  </div>
                  <div className="text-xs" style={{ color: "#6B7280" }}>
                    {completedMicro}/{totalMicro} completati
                  </div>
                </div>
                <StatusBadge status={macroStatus} small />
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />
                  : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />
                }
              </button>

              {/* Micro steps */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  {Object.entries(microSteps).map(([microId, micro]) => (
                    <MicroStepRow
                      key={microId}
                      microId={microId}
                      micro={micro}
                      macroStep={stepId}
                      onUpdate={handleUpdateMicroStep}
                      loading={updatingKey === `${stepId}-${microId}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #2D333B" }}>
        <p className="text-xs" style={{ color: "#4B5563" }}>
          Clicca su un micro-step per cambiare stato. La fase si aggiorna automaticamente.
        </p>
      </div>
    </div>
  );
}
