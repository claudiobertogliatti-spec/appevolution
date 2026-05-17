import React from "react";

/**
 * Schermata operativo continuo post-lancio. Placeholder v1.
 * Sostituirà la celebrazione dopo che il partner l'ha vista una volta.
 *
 * V2: qui andranno KPI vendite + next-best-action mensile generata da Stefania
 * (sub-progetto separato post-lancio).
 */
export default function OperativoContinuo() {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-8">
      <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
        Operativo continuo
      </span>
      <h2 className="text-2xl font-semibold text-slate-900 mt-2 mb-4 tracking-tight">
        Sei in produzione.
      </h2>
      <p className="text-base text-slate-900 mb-3">
        Da qui ci concentriamo su KPI vendite + next-best-action mensile.
      </p>
      <p className="text-sm text-slate-500 mb-6">
        Stefania ti suggerirà cosa fare ogni mese in base ai dati del tuo funnel.
      </p>
      <div className="bg-slate-50 border border-gray-200 rounded-md p-5 text-sm text-slate-700">
        <p className="font-semibold mb-2">🚧 Sezione in costruzione (v1)</p>
        <p>
          Stiamo costruendo dashboard KPI + suggerimenti AI per la fase post-lancio.
          Nel frattempo i tuoi vecchi strumenti restano disponibili sotto "Strumenti avanzati"
          nel menu in alto.
        </p>
      </div>
    </div>
  );
}
