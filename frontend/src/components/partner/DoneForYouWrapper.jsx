import { useState, useEffect } from "react";
import {
  Loader2, Check, Clock, Eye, Palette, ArrowRight,
  Sparkles, Shield, Settings
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

const STATUS_CONFIG = {
  in_lavorazione: {
    label: "In lavorazione",
    color: "#F2C418",
    bgColor: "#FFF8E1",
    borderColor: "#F2C41840",
    icon: Settings,
    message: "Il team Evolution PRO sta lavorando a questo step per te.",
  },
  in_revisione: {
    label: "In revisione",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    borderColor: "#3B82F640",
    icon: Eye,
    message: "Il team sta rivedendo e perfezionando il contenuto prima della consegna.",
  },
  pronto: {
    label: "Pronto per te",
    color: "#34C77B",
    bgColor: "#F0FDF4",
    borderColor: "#34C77B40",
    icon: Check,
    message: "Il contenuto e pronto. Rivedi e approva per proseguire.",
  },
  approvato: {
    label: "Approvato",
    color: "#34C77B",
    bgColor: "#F0FDF4",
    borderColor: "#34C77B40",
    icon: Check,
    message: "Step completato con successo.",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.in_lavorazione;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
      data-testid={`status-badge-${status}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATO 1 — IN PREPARAZIONE (in_lavorazione / in_revisione)
   ═══════════════════════════════════════════════════════════════════════════ */

function PreparazioneView({ status, stepTitle, stepIcon: StepIcon, notes }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.in_lavorazione;
  const isRevisione = status === "in_revisione";

  return (
    <div className="max-w-xl mx-auto text-center py-8" data-testid="dfy-preparazione">
      {/* Animated icon */}
      <div className="relative mx-auto mb-6" style={{ width: 80, height: 80 }}>
        <div
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{ background: cfg.bgColor, border: `2px solid ${cfg.borderColor}` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {StepIcon ? (
            <StepIcon className="w-8 h-8" style={{ color: cfg.color }} />
          ) : (
            <cfg.icon className="w-8 h-8" style={{ color: cfg.color }} />
          )}
        </div>
      </div>

      <StatusBadge status={status} />

      <h2 className="text-xl font-black mt-4 mb-2" style={{ color: "#1E2128" }}>
        {stepTitle || "Step in preparazione"}
      </h2>

      <p className="text-sm leading-relaxed mb-6" style={{ color: "#5F6572" }}>
        {cfg.message}
      </p>

      {/* Done-for-you core message */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "#1E2128" }}
      >
        <Sparkles className="w-6 h-6 mx-auto mb-3" style={{ color: "#F2C418" }} />
        <p className="text-sm font-bold text-white mb-1">
          Non devi costruire nulla.
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
          Il sistema e il team Evolution PRO costruiscono tutto per te.
          Quando sara pronto, ti basta approvare.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-1">
          <div
            className="w-8 h-1.5 rounded-full"
            style={{ background: "#F2C418" }}
          />
          <div
            className="w-8 h-1.5 rounded-full"
            style={{ background: isRevisione ? "#3B82F6" : "#E5E7EB" }}
          />
          <div
            className="w-8 h-1.5 rounded-full"
            style={{ background: "#E5E7EB" }}
          />
        </div>
        <span className="text-xs font-bold" style={{ color: "#9CA3AF" }}>
          {isRevisione ? "2/3" : "1/3"}
        </span>
      </div>

      {notes && (
        <div
          className="mt-5 rounded-xl p-4 text-left text-xs"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF", color: "#5F6572" }}
        >
          <span className="font-bold" style={{ color: "#1E2128" }}>Nota dal team: </span>
          {notes}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATO 2 — PRONTO (contenuto + Approva / Personalizza)
   ═══════════════════════════════════════════════════════════════════════════ */

function ProntoView({ stepTitle, children, onApprove, isApproving }) {
  return (
    <div data-testid="dfy-pronto">
      {/* Banner */}
      <div
        className="rounded-2xl p-4 mb-5 flex items-center gap-3"
        style={{ background: "#F0FDF4", border: "2px solid #BBF7D0" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#34C77B20" }}
        >
          <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: "#166534" }}>
            {stepTitle || "Contenuto"} pronto per te
          </p>
          <p className="text-xs" style={{ color: "#15803D" }}>
            Il team ha preparato tutto. Rivedi il contenuto e approva.
          </p>
        </div>
        <StatusBadge status="pronto" />
      </div>

      {/* Content slot */}
      {children}

      {/* Action buttons */}
      <div className="flex gap-3 mt-6" data-testid="dfy-pronto-actions">
        <button
          onClick={onApprove}
          disabled={isApproving}
          data-testid="dfy-approve-btn"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#34C77B", color: "white", boxShadow: "0 4px 16px #34C77B40" }}
        >
          {isApproving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {isApproving ? "Approvazione..." : "APPROVA"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATO 3 — APPROVATO
   ═══════════════════════════════════════════════════════════════════════════ */

function ApprovatoView({ stepTitle, nextStepLabel, onContinue }) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      data-testid="dfy-approvato"
      style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(255,255,255,0.2)" }}
      >
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">
        {stepTitle || "Step"} approvato!
      </h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Ottimo! Il team procedera con il prossimo step del tuo percorso.
      </p>
      {nextStepLabel && onContinue && (
        <button
          onClick={onContinue}
          data-testid="dfy-continue-btn"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
          style={{ background: "white", color: "#2D9F6F" }}
        >
          {nextStepLabel} <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN WRAPPER — useDoneForYou hook
   ═══════════════════════════════════════════════════════════════════════════ */

export function useDoneForYou(partnerId, stepId) {
  const [stepStatus, setStepStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!partnerId) { setIsLoading(false); return; }
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/partner-journey/step-status/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          const steps = data?.data?.steps || {};
          setStepStatus(steps[stepId] || { status: "in_lavorazione" });
        }
      } catch (e) {
        console.error("Error loading step status:", e);
        setStepStatus({ status: "in_lavorazione" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId, stepId]);

  const approve = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`${API}/api/partner-journey/step-status/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, step_id: stepId }),
      });
      if (res.ok) {
        setStepStatus(prev => ({ ...prev, status: "approvato" }));
      }
    } catch (e) {
      console.error("Error approving step:", e);
    } finally {
      setIsApproving(false);
    }
  };

  return {
    status: stepStatus?.status || "in_lavorazione",
    content: stepStatus?.content || null,
    notes: stepStatus?.notes || null,
    isLoading,
    isApproving,
    approve,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT WRAPPER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function DoneForYouWrapper({
  partnerId,
  stepId,
  stepTitle,
  stepIcon,
  nextStepLabel,
  onContinue,
  isAdmin,
  children,         // Contenuto da mostrare quando "pronto"
  adminChildren,    // Contenuto admin-only (sempre visibile per admin)
}) {
  const { status, content, notes, isLoading, isApproving, approve } = useDoneForYou(partnerId, stepId);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  // Admin vede sempre tutto
  if (isAdmin) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
            Vista Admin
          </span>
          <StatusBadge status={status} />
        </div>
        {adminChildren || children}
        {status === "approvato" && (
          <div className="mt-6">
            <ApprovatoView
              stepTitle={stepTitle}
              nextStepLabel={nextStepLabel}
              onContinue={onContinue}
            />
          </div>
        )}
      </div>
    );
  }

  // Partner views by status
  if (status === "approvato") {
    return (
      <div>
        {children}
        <div className="mt-6">
          <ApprovatoView
            stepTitle={stepTitle}
            nextStepLabel={nextStepLabel}
            onContinue={onContinue}
          />
        </div>
      </div>
    );
  }

  if (status === "pronto") {
    return (
      <ProntoView
        stepTitle={stepTitle}
        onApprove={approve}
        isApproving={isApproving}
      >
        {children}
      </ProntoView>
    );
  }

  // in_lavorazione or in_revisione
  return (
    <PreparazioneView
      status={status}
      stepTitle={stepTitle}
      stepIcon={stepIcon}
      notes={notes}
    />
  );
}

export { StatusBadge, PreparazioneView, ProntoView, ApprovatoView };
export default DoneForYouWrapper;
