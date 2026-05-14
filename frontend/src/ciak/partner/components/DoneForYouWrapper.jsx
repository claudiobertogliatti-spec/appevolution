/**
 * Ciak Partner — DoneForYouWrapper.
 *
 * Porting di components/partner/DoneForYouWrapper.jsx (Fase 2c migrazione).
 * Pattern "il team costruisce, tu rivedi e approvi" — usato dalle fasi F2/F4/F5.
 * Re-skin palette Ciak. Rimossa la vista admin (l'area partner Ciak è partner-only).
 *
 * Endpoint backend invariati:
 *  GET  /api/partner-journey/step-status/:partnerId
 *  POST /api/partner-journey/step-status/approve
 *
 * 3 stati: in_lavorazione / in_revisione → PreparazioneView,
 *          pronto → ProntoView (mostra children + Approva),
 *          approvato → ApprovatoView.
 */
import { useState, useEffect } from "react";
import { Loader2, Check, Clock, ArrowRight, Shield } from "lucide-react";
import { STEP_SLA } from "../stepConfig";

const STATUS_LABEL = {
  in_lavorazione: "In lavorazione",
  in_revisione: "In revisione",
  pronto: "Pronto per te",
  approvato: "Approvato",
};

function StatusBadge({ status }) {
  const isReady = status === "pronto" || status === "approvato";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isReady
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : status === "in_revisione"
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
      }`}
    >
      {STATUS_LABEL[status] || STATUS_LABEL.in_lavorazione}
    </span>
  );
}

function SlaBadge({ stepId }) {
  const sla = STEP_SLA[stepId];
  if (!sla) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/10 text-slate-900">
      <Clock className="w-3.5 h-3.5" />
      Entro {sla.sla}
    </span>
  );
}

function PreparazioneView({ status, stepTitle, stepId, notes }) {
  const isRevisione = status === "in_revisione";
  const slaTime = STEP_SLA[stepId]?.sla || "48h";
  return (
    <div className="max-w-xl mx-auto text-center py-8">
      <div className="flex items-center justify-center gap-2 mb-4">
        <StatusBadge status={status} />
        <SlaBadge stepId={stepId} />
      </div>
      <h2 className="text-xl font-semibold mb-3 text-slate-900">
        {stepTitle || "Step in preparazione"}
      </h2>
      <p className="text-sm leading-relaxed mb-6 text-slate-600">
        {isRevisione
          ? `Il team sta rivedendo e perfezionando il contenuto. Sarà pronto entro ${slaTime}.`
          : `Il team sta lavorando su questo step. Sarà pronto entro ${slaTime}.`}
      </p>
      <div className="rounded-2xl p-5 mb-6 bg-slate-900">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-yellow-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
            Processo garantito
          </span>
        </div>
        <p className="text-sm font-medium text-white mb-1">Non devi costruire nulla.</p>
        <p className="text-xs leading-relaxed text-slate-400">
          Il sistema e il team Evolution PRO costruiscono tutto per te. Quando sarà pronto, ti
          basterà approvare.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-medium text-white/90">Tempo stimato: {slaTime}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-1">
          <div className="w-8 h-1.5 rounded-full bg-yellow-400" />
          <div className={`w-8 h-1.5 rounded-full ${isRevisione ? "bg-blue-500" : "bg-gray-200"}`} />
          <div className="w-8 h-1.5 rounded-full bg-gray-200" />
        </div>
        <span className="text-xs font-medium text-slate-400">{isRevisione ? "2/3" : "1/3"}</span>
      </div>
      {notes && (
        <div className="mt-5 rounded-xl p-4 text-left text-xs bg-gray-50 border border-gray-200 text-slate-600">
          <span className="font-semibold text-slate-900">Nota dal team: </span>
          {notes}
        </div>
      )}
    </div>
  );
}

function ProntoView({ stepTitle, children, onApprove, isApproving }) {
  return (
    <div>
      <div className="rounded-2xl p-4 mb-5 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800">
            {stepTitle || "Contenuto"} pronto per te
          </p>
          <p className="text-xs text-emerald-700">
            Il team ha completato questo step. Rivedi il contenuto e approva per proseguire.
          </p>
        </div>
        <StatusBadge status="pronto" />
      </div>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition"
        >
          {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          {isApproving ? "Approvazione…" : "Approva"}
        </button>
      </div>
    </div>
  );
}

function ApprovatoView({ stepTitle, nextStepLabel, onContinue }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100">
        <Check className="w-4 h-4 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold flex-1 text-emerald-800">
        {stepTitle || "Step"} approvato
      </p>
      {nextStepLabel && onContinue && (
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition"
        >
          {nextStepLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function useDoneForYou(partnerId, stepId) {
  const [stepStatus, setStepStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/partner-journey/step-status/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          const steps = data?.data?.steps || {};
          setStepStatus(steps[stepId] || { status: "in_lavorazione" });
        } else {
          setStepStatus({ status: "in_lavorazione" });
        }
      } catch (e) {
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
      const res = await fetch(`/api/partner-journey/step-status/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, step_id: stepId, force: false }),
      });
      if (res.ok) setStepStatus((prev) => ({ ...prev, status: "approvato" }));
    } catch (e) {
      // best-effort
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

export function DoneForYouWrapper({
  partnerId,
  stepId,
  stepTitle,
  nextStepLabel,
  onContinue,
  children,
  afterContent,
}) {
  const { status, notes, isLoading, isApproving, approve } = useDoneForYou(partnerId, stepId);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (status === "approvato") {
    return (
      <div>
        {children}
        <div className="mt-4">
          <ApprovatoView
            stepTitle={stepTitle}
            nextStepLabel={nextStepLabel}
            onContinue={onContinue}
          />
        </div>
        {afterContent && <div className="mt-6">{afterContent}</div>}
      </div>
    );
  }

  if (status === "pronto") {
    return (
      <ProntoView stepTitle={stepTitle} onApprove={approve} isApproving={isApproving}>
        {children}
      </ProntoView>
    );
  }

  return <PreparazioneView status={status} stepTitle={stepTitle} stepId={stepId} notes={notes} />;
}

export { StatusBadge, SlaBadge };
export default DoneForYouWrapper;
