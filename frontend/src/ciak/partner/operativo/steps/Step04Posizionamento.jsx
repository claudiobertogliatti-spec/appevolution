import React, { useState } from "react";
import StepBase from "./StepBase";
import Questionario from "../Questionario";
import { POSIZIONAMENTO_QUESTIONS } from "../questionari/posizionamentoQuestions";
import { API } from "../../../../utils/api-config";
import axios from "axios";

/**
 * Step "Il tuo posizionamento" (Esamina, Valentina).
 * Motore Questionario (una domanda alla volta, linguaggio semplice) sulle 20
 * chiavi storiche. Al termine genera il documento PDF via l'endpoint esistente
 * /api/partner/posizionamento/finalize e lo salva in I Miei File. Niente coda
 * di approvazione (Fase 1).
 */
export default function Step04Posizionamento({ step, partnerId, partnerName, onComplete, onSaveDraft, onAsk }) {
  const saved = step?.data?.answers || {};
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "approved" || step?.approval_status === "pending_review"
  );

  const finalize = async (answers) => {
    setSubmitting(true);
    setError(null);
    try {
      if (onSaveDraft) await onSaveDraft({ answers });
      const r = await axios.post(`${API}/api/partner/posizionamento/finalize`, { partner_id: partnerId });
      setDone(true);
      if (onComplete) onComplete({ answers, approval_status: r.data?.approval_status });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(detail || "Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase step={step} title="Il tuo posizionamento è pronto" secondaryNote="">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Documento generato</div>
          <p className="text-sm text-slate-600">
            Da queste risposte abbiamo creato il documento del tuo posizionamento. Lo trovi in
            <strong> Materiali</strong>. È la base di offerta, messaggio,
            pagine e funnel.
          </p>
        </div>
      </StepBase>
    );
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-3">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Il tuo posizionamento</h2>
        <p className="text-sm text-slate-600 leading-relaxed mt-2">
          Mettiamo a fuoco chi sei, a chi parli e perché scelgono te. Da qui nascono offerta,
          messaggio, nome del metodo, pagine di vendita, funnel e contenuti. Si fa una volta, serve a tutto.
        </p>
      </div>

      <Questionario
        questions={POSIZIONAMENTO_QUESTIONS}
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
        <p className="text-sm text-slate-500 mt-3 text-center">Sto generando il documento del tuo posizionamento…</p>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
