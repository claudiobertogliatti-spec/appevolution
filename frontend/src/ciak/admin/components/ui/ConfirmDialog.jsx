/**
 * ConfirmDialog — conferma in pagina, non window.confirm().
 *
 * Perche' esiste: l'admin aveva 31 confirm() e 50 alert() del browser. Un
 * confirm() nativo non dice cosa succede, non porta il nome dell'oggetto, e si
 * rende diverso su ogni sistema. Qui la conferma mostra il verbo esatto
 * ("Elimina Alfredo Vasi") e, se l'azione e' distruttiva, il bottone e' rosso —
 * il colore di stato, mai il navy del brand, che e' riservato alle azioni normali.
 *
 * Accessibile: role="dialog", aria-modal, chiusura con Esc, focus sul bottone
 * di conferma all'apertura.
 */
import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmCls = destructive
    ? "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-400"
    : "bg-slate-900 text-yellow-400 hover:bg-slate-800 focus-visible:outline-yellow-400";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm text-slate-600">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 ${confirmCls}`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
