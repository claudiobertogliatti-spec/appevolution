import React, { useState } from "react";

/**
 * Motore questionario riutilizzabile (una domanda alla volta), guidato da un
 * registro di domande. Usato da "La tua storia" e (in seguito) dal Posizionamento.
 *
 * Props:
 *  - questions: [{ id, blocco, domanda, hint, esempio, tipo, minChar }]
 *  - partnerName, agentName, agentInitial
 *  - initial: risposte già salvate (oggetto { [id]: valore })
 *  - introTitle, introText: testo introduttivo (voce dell'agente) sulla prima schermata
 *  - onSaveDraft(answers), onComplete(answers), onAsk()
 */
export default function Questionario({
  questions,
  partnerName = "",
  agentName = "Valentina",
  agentInitial = "V",
  faseLabel = "Esamina",
  initial = {},
  onSaveDraft,
  onComplete,
  onAsk,
}) {
  const [answers, setAnswers] = useState(initial || {});
  const [cur, setCur] = useState(0);
  const TOTAL = questions.length;
  const q = questions[cur];
  const nome = (partnerName || "").split(" ")[0] || "";

  const val = answers[q.id] || "";
  const len = String(val).trim().length;
  const minChar = q.minChar || 1;
  const ok = len >= Math.max(minChar, 1);

  const setVal = (v) => {
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    if (onSaveDraft) onSaveDraft(next);
  };

  const goNext = () => {
    if (cur < TOTAL - 1) {
      setCur(cur + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (onComplete) {
      onComplete(answers);
    }
  };
  const goPrev = () => {
    if (cur > 0) setCur(cur - 1);
  };

  let validClass = "text-slate-400";
  let validText = "Scrivi qualche parola per continuare";
  if (ok) {
    validClass = "text-green-600";
    validText = "✓ Perfetto, puoi andare avanti";
  } else if (len > 0) {
    validText = "Ci sei quasi — aggiungi ancora un dettaglio";
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header avanzamento */}
      <div className="bg-slate-900 text-white px-5 py-4">
        <div className="flex justify-between items-center text-[13px] font-medium">
          <span>Domanda <b>{cur + 1}</b> di {TOTAL}</span>
          <span className="text-yellow-400 font-semibold">{q.blocco}</span>
        </div>
        <div className="h-2.5 bg-white/15 rounded-full mt-2.5 overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full transition-all duration-300" style={{ width: `${((cur + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      {/* Voce dell'agente */}
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-5 py-3.5">
        <div className="w-11 h-11 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-xl flex-shrink-0">
          {agentInitial}
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">{agentName} · Fase {faseLabel}</div>
          <div className="text-sm leading-snug text-slate-900">
            Una domanda alla volta. Non c'è risposta sbagliata: scrivi come parli.
          </div>
        </div>
      </div>

      {/* Corpo domanda */}
      <div className="px-5 pt-6 pb-3">
        <h2 className="text-xl font-bold text-slate-900 leading-snug">
          {cur === 0 && nome ? `${nome}, ` : ""}{q.domanda}
        </h2>
        {q.hint && <p className="text-[13px] text-slate-500 leading-relaxed mt-2">{q.hint}</p>}
        {q.esempio && (
          <p className="text-[12.5px] text-slate-400 leading-relaxed mt-1.5 whitespace-pre-line">
            Es: {q.esempio}
          </p>
        )}

        {q.tipo === "breve" ? (
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Scrivi qui, con parole tue…"
            className="w-full mt-4 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
          />
        ) : (
          <textarea
            value={val}
            rows={q.tipo === "elenco" ? 4 : 5}
            onChange={(e) => setVal(e.target.value)}
            placeholder={q.tipo === "elenco" ? "Uno per riga…" : "Scrivi qui, con parole tue…"}
            className="w-full mt-4 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 resize-y"
          />
        )}
        <div className={`text-xs mt-1.5 ${validClass}`}>{validText}</div>

        {/* Chat Valentina */}
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="mt-3 w-full flex items-center gap-2.5 bg-slate-900 rounded-lg pl-3.5 pr-1.5 py-2 text-left hover:bg-slate-800 transition"
          >
            <span className="text-yellow-400 text-lg">💬</span>
            <span className="flex-1 text-[13.5px] text-slate-200">Non sai cosa scrivere? Chiedi a {agentName}</span>
            <span className="flex-shrink-0 text-[12px] font-semibold text-slate-900 bg-yellow-400 rounded-md px-2.5 py-1.5">Apri chat</span>
          </button>
        )}
      </div>

      {/* Navigazione */}
      <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100">
        <button
          type="button"
          onClick={goPrev}
          disabled={cur === 0}
          className="text-[13.5px] font-semibold text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Indietro
        </button>
        <span className="text-xs text-slate-400 mr-auto">Bozza salvata in automatico</span>
        <button
          type="button"
          onClick={goNext}
          disabled={!ok}
          className="bg-yellow-400 text-slate-900 font-bold text-[14.5px] px-6 py-2.5 rounded-xl hover:bg-yellow-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {cur < TOTAL - 1 ? "Avanti →" : "Genera il documento →"}
        </button>
      </div>
    </div>
  );
}
