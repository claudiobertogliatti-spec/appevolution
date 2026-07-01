import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";
import Questionario from "../Questionario";
import { STORIA_QUESTIONS } from "../questionari/storiaQuestions";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

/**
 * Step "La tua storia" (Esamina, Valentina).
 * Raccoglie le risposte col motore Questionario, poi genera il documento PDF
 * (salvato in I Miei File) tramite POST /api/partner/storia/finalize, con la
 * stessa logica di brand-kit e posizionamento (coda approvazione admin).
 */
export default function StepLaTuaStoria({ step, partnerId, partnerName, onComplete, onSaveDraft, onAsk }) {
  const saved = step?.data?.answers || {};
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "pending_review" || step?.approval_status === "approved"
  );
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    if (!partnerId) return;
    fetch(`${API}/api/partner/storia/document/${partnerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDoc(d))
      .catch(() => {});
  }, [partnerId]);

  const finalize = async (answers) => {
    setSubmitting(true);
    setError(null);
    try {
      if (onSaveDraft) await onSaveDraft({ answers });
      const r = await fetch(`${API}/api/partner/storia/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || `Errore ${r.status}`);
      }
      const data = await r.json();
      setDoc(data);
      setDone(true);
      if (onComplete) onComplete({ answers, approval_status: data.approval_status });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase step={step} title="La tua storia è pronta" secondaryNote="">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Documento generato</div>
          <p className="text-sm text-slate-600">
            Da queste risposte abbiamo creato il documento della tua storia. Lo trovi in
            <strong> Materiali</strong>. Puoi sempre rivederlo o rifarlo.
          </p>
        </div>
      </StepBase>
    );
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-3">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">La tua storia</h2>
        <p className="text-sm text-slate-600 leading-relaxed mt-2">
          Non è una biografia: raccogliamo i momenti veri che rendono il tuo racconto credibile e
          magnetico. Da qui il team crea la tua Hero Story, la pagina "Chi sono", gli script video,
          i contenuti e le email. Si racconta una volta, si usa ovunque.
        </p>
      </div>

      <Questionario
        questions={STORIA_QUESTIONS}
        partnerName={partnerName}
        agentName="Valentina"
        agentInitial="V"
        faseLabel="Esamina"
        initial={saved}
        onSaveDraft={(answers) => onSaveDraft && onSaveDraft({ answers })}
        onComplete={finalize}
        onAsk={onAsk}
      />

      {submitting && (
        <p className="text-sm text-slate-500 mt-3 text-center">Sto generando il documento della tua storia…</p>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
