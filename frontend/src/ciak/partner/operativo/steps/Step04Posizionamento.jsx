import React, { useState } from "react";
import StepBase from "./StepBase";

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

export default function Step04Posizionamento({ step, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});

  const update = (k, v) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    onSaveDraft({ answers: next });
  };

  const canComplete = QUESTIONS.every((q) => (answers[q.key] || "").trim().length > 5);

  return (
    <StepBase
      eyebrow="Step 4 — Posizionamento"
      title="Rispondi a 8 domande"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ answers })}
      secondaryNote="Sono le fondamenta del tuo messaggio. Rispondi con onestà — almeno 5 caratteri per domanda."
    >
      <div className="space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">{q.label}</label>
            <textarea
              value={answers[q.key] || ""}
              onChange={(e) => update(q.key, e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y"
            />
          </div>
        ))}
      </div>
    </StepBase>
  );
}
