import { useState } from "react";
import ApprovazioniQueue from "./ApprovazioniQueue";

/**
 * Drawer laterale per l'approvazione dei materiali partner in coda (aperto da
 * Oggi). Chrome del drawer; la coda vera è in ApprovazioniQueue, condivisa con
 * la pagina pages/Approvazioni.
 *
 * Props:
 *  - open: boolean
 *  - onClose(): void
 *  - onChange?(newCount: number): void   notifica al parent il count corrente
 */
export default function ApprovazioniMaterialiPanel({ open, onClose, onChange }) {
  const [count, setCount] = useState(0);

  const handleChange = (n) => {
    setCount(n);
    if (onChange) onChange(n);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">Approvazioni materiali</div>
            <div className="text-xs text-slate-500">{count} in attesa</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-2xl leading-none"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        <ApprovazioniQueue active={open} onChange={handleChange} />
      </aside>
    </>
  );
}
