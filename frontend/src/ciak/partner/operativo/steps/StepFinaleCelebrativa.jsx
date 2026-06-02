import React from "react";

/**
 * Schermata celebrativa che appare la prima volta dopo che il partner
 * ha completato lo step 13. Persiste per 1 sessione (sessionStorage), poi
 * il container monta OperativoContinuo.
 */
export default function StepFinaleCelebrativa({ onDismissCelebrazione }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-10 md:p-14 text-center">
      <div className="text-6xl mb-5">🎬</div>
      <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
        Ce l'hai fatta.
      </h2>
      <p className="text-lg text-slate-900 mb-2">
        Il tuo modello digitale è online e pronto a vendere.
      </p>
      <p className="text-base text-slate-500 mb-10">
        È stato più semplice di quanto pensavi.
      </p>
      <div className="bg-slate-900 rounded-md p-6 max-w-md mx-auto text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-400 mb-2">
          Questa è la prima parte
        </p>
        <p className="text-sm text-white leading-relaxed">
          Sei online in 21 giorni. Ora inizia il percorso che ti rende il
          riferimento del tuo mercato: autorevolezza, community, crescita sui dati.
          È il lavoro dei prossimi mesi — e non lo fai da solo.
        </p>
      </div>
      <div className="border-t border-gray-200 pt-8 mt-10 max-w-md mx-auto">
        <p className="text-sm text-slate-900 italic">Grazie a te per la fiducia.</p>
        <p className="text-xs text-slate-500 mt-1">
          — Claudio Bertogliatti e il team Evolution PRO
        </p>
      </div>
      <button
        type="button"
        onClick={onDismissCelebrazione}
        className="mt-10 bg-yellow-400 text-slate-900 font-semibold px-6 py-2.5 rounded-md text-sm hover:bg-yellow-500 transition"
      >
        Iniziamo a crescere →
      </button>
    </div>
  );
}
