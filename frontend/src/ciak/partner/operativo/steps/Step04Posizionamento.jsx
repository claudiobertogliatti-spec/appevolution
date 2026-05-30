import React, { useState } from "react";
import StepBase from "./StepBase";
import { API } from "../../../../utils/api-config";
import axios from "axios";

const QUESTIONS = [
  { key: "nicchia",         label: "Qual è la nicchia precisa che vuoi servire?" },
  { key: "promessa",        label: "Qual è la promessa che fai al cliente in 1 frase?" },
  { key: "cliente_tipo",    label: "Descrivi il cliente tipo (età, ruolo, momento di vita)." },
  { key: "problema_chiave", label: "Qual è il problema principale che risolvi?" },
  { key: "trasformazione",  label: "Quale trasformazione concreta vede il cliente dopo 90 gg?" },
  { key: "differenza",      label: "In cosa sei diverso dagli altri nel settore?" },
  { key: "metodo_proprio",  label: "Hai un metodo proprio? Come si chiama?" },
  { key: "prova_sociale",   label: "Hai un caso/risultato concreto da raccontare? Quale?" },
];

export default function Step04Posizionamento({ step, partnerId, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(
    step?.approval_status === "pending_review" || step?.approval_status === "approved"
  );

  const update = (k, v) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    onSaveDraft && onSaveDraft({ answers: next });
  };

  const canComplete = QUESTIONS.every((q) => (answers[q.key] || "").trim().length > 5);

  const finalize = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Salva draft finale prima di finalizzare
      if (onSaveDraft) await onSaveDraft({ answers });
      const res = await axios.post(`${API}/api/partner/posizionamento/finalize`, {
        partner_id: partnerId,
      });
      setDone(true);
      // Notifica al wrapper così la mappa fasi si rinfresca
      if (onComplete) onComplete({ answers, approval_status: res.data.approval_status });
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(e.response.data?.detail || "Documento già approvato dal team.");
      } else {
        setError("Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StepBase
        eyebrow="Step 4 — Posizionamento"
        title="Documento inviato al team"
        ctaDisabled={true}
        onCta={() => {}}
        secondaryNote=""
      >
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="font-semibold text-slate-900 mb-1">✓ Documento generato</div>
          <p className="text-sm text-slate-600">
            Il team lo sta revisionando — di solito entro 24h.
            Nel frattempo puoi proseguire con lo step successivo.
            Lo trovi anche in <strong>I Miei File</strong>.
          </p>
        </div>
      </StepBase>
    );
  }

  return (
    <StepBase
      eyebrow="Step 4 — Posizionamento"
      title="Rispondi a 8 domande"
      ctaLabel={submitting ? "Sto generando il documento..." : "Genera Documento"}
      ctaDisabled={!canComplete || submitting}
      onCta={finalize}
      secondaryNote="Sono le fondamenta del tuo messaggio. Rispondi con onestà — almeno 5 caratteri per domanda."
    >
      {step?.approval_status === "rejected" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Il team ti ha chiesto di rivedere alcune risposte — trovi la nota nella chat di Valentina.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">{q.label}</label>
            <textarea
              value={answers[q.key] || ""}
              onChange={(e) => update(q.key, e.target.value)}
              rows={2}
              disabled={submitting}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y disabled:bg-gray-50"
            />
          </div>
        ))}
      </div>
    </StepBase>
  );
}
