import React, { useEffect, useState, useCallback } from "react";
import { adminFetch } from "../api";
import RifiutaModal from "./RifiutaModal";

/**
 * Drawer laterale per l'approvazione dei materiali partner in coda.
 *
 * Backend:
 *  - GET  /api/admin/approvazioni/queue      → { total, items[] }
 *  - POST /api/admin/approvazioni/{id}/approve
 *  - POST /api/admin/approvazioni/{id}/reject  body: { note }
 *
 * Race condition: 409 (file già processato da altro admin) trattato in silenzio
 * — rimuoviamo la riga dalla UI senza errori bloccanti.
 *
 * Props:
 *  - open: boolean
 *  - onClose(): void
 *  - onChange?(newCount: number): void   notifica al parent il count corrente
 */
export default function ApprovazioniMaterialiPanel({ open, onClose, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(null); // {file_id, partner_name}

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch("/api/admin/approvazioni/queue");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(data.items || []);
      if (onChange) onChange(data.total || 0);
    } catch (e) {
      console.error("queue load failed", e);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const removeRow = useCallback(
    (fileId) => {
      setItems((xs) => {
        const next = xs.filter((x) => x.file_id !== fileId);
        if (onChange) onChange(next.length);
        return next;
      });
    },
    [onChange]
  );

  const approve = async (it) => {
    try {
      const r = await adminFetch(`/api/admin/approvazioni/${it.file_id}/approve`, {
        method: "POST",
      });
      if (r.status === 409) {
        removeRow(it.file_id);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      removeRow(it.file_id);
    } catch (e) {
      console.error("approve failed", e);
      alert("Errore approvazione");
    }
  };

  const reject = async (note) => {
    if (!rejecting) return;
    const fileId = rejecting.file_id;
    try {
      const r = await adminFetch(`/api/admin/approvazioni/${fileId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (r.status === 409) {
        removeRow(fileId);
        setRejecting(null);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      removeRow(fileId);
      setRejecting(null);
    } catch (e) {
      console.error("reject failed", e);
      alert("Errore rifiuto");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">Approvazioni materiali</div>
            <div className="text-xs text-slate-500">{items.length} in attesa</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-2xl leading-none"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {loading && <div className="p-6 text-sm text-slate-500">Caricamento...</div>}

        {!loading && items.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-500">
            Nessun materiale da approvare. 🎉
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.file_id} className="px-6 py-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs">
                  PDF
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">
                    {it.partner_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {it.category_label} · {it.age_human}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={it.internal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Apri PDF
                </a>
                <button
                  onClick={() => approve(it)}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Approva
                </button>
                <button
                  onClick={() =>
                    setRejecting({ file_id: it.file_id, partner_name: it.partner_name })
                  }
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg"
                >
                  Rifiuta
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <RifiutaModal
        open={!!rejecting}
        partnerName={rejecting?.partner_name || ""}
        onConfirm={reject}
        onCancel={() => setRejecting(null)}
      />
    </>
  );
}
