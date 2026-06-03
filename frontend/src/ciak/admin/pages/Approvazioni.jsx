/**
 * Ciak Admin — Approvazioni materiali (pagina dedicata).
 *
 * Stessa coda del drawer aperto da Oggi, ma come voce di sidebar di primo
 * livello: è il ponte Step03 (brand-kit) / Step04 (posizionamento) → file
 * under_review → approva/rifiuta con nota. Corpo condiviso: ApprovazioniQueue.
 */
import { useState } from "react";
import ApprovazioniQueue from "../components/ApprovazioniQueue";

export function Approvazioni() {
  const [count, setCount] = useState(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Approvazioni materiali</h1>
      <p className="text-slate-500 mb-6">
        Materiali partner in attesa di revisione — brand kit, posizionamento e altri
        documenti generati nel percorso.
        {count != null && (
          <span className="font-medium text-slate-700"> {count} in attesa.</span>
        )}
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-2xl">
        <ApprovazioniQueue onChange={setCount} />
      </div>
    </div>
  );
}

export default Approvazioni;
