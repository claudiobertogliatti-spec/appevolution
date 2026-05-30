import React, { useState } from "react";

/**
 * Modal di rifiuto materiale partner.
 *
 * Props:
 *  - open: boolean
 *  - partnerName: string (nome partner mostrato nell'header)
 *  - onConfirm(note: string): Promise<void>  (rifiuto async; min 10 char trimmati)
 *  - onCancel(): void
 */
export default function RifiutaModal({ open, partnerName, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = note.trim().length >= 10;

  if (!open) return null;

  const confirm = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await onConfirm(note.trim());
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="font-bold text-slate-900 mb-1">Rifiuta documento</div>
        <div className="text-xs text-slate-500 mb-4">
          Partner: <strong>{partnerName}</strong>
        </div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cosa deve correggere? (min 10 caratteri)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          autoFocus
          disabled={submitting}
          placeholder="Es: Il target ICP non è abbastanza specifico. Restringi a un sotto-segmento (età, settore, ruolo)."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 resize-y mb-1"
        />
        <div className="text-xs text-slate-400 mb-4">{note.trim().length}/10 min</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Annulla
          </button>
          <button
            onClick={confirm}
            disabled={!valid || submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-lg"
          >
            {submitting ? "Invio..." : "Rifiuta e notifica partner"}
          </button>
        </div>
      </div>
    </div>
  );
}
