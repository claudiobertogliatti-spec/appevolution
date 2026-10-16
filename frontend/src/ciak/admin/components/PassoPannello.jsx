/**
 * Pannello «Prossimo passo»: cosa fai e entro quando. Una sola riga di testo e una data
 * (da oggi in poi). Se c'è già un passo aperto, «Segna come fatto» lo chiude.
 * Il server rifiuta date passate e testi vuoti: l'errore si legge qui.
 */
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { apiPost } from "../api";
import { messaggioErrore } from "./SollecitoPannello";

export const oggiISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const dataIt = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

export function PassoPannello({ email, nome, passo, onClose, onSalvato, onFatto, onAuthExpired }) {
  const [testo, setTesto] = useState(passo?.testo || "");
  const [scadenza, setScadenza] = useState(passo?.scadenza && passo.scadenza >= oggiISO() ? passo.scadenza : "");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState(null);
  const authRef = useRef(onAuthExpired);
  authRef.current = onAuthExpired;

  const esegui = async (fn) => {
    setBusy(true);
    setErrore(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return authRef.current?.();
      setErrore(messaggioErrore(e));
      setBusy(false);
    }
  };

  const salva = () => esegui(async () => {
    const r = await apiPost("/prossimi-passi", { email, testo, scadenza });
    onSalvato?.(r.passo);
  });
  const fatto = () => esegui(async () => {
    await apiPost("/prossimi-passi/fatto", { email });
    onFatto?.(email);
  });

  const pronto = testo.trim().length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(scadenza);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6" onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="passo-titolo" className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="passo-titolo" className="text-xl font-semibold text-slate-900">Prossimo passo per {nome}</h2>
            <p className="text-sm text-slate-500">Cosa fai e quando. Ogni trattativa ne ha uno.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Chiudi" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <label htmlFor="passo-testo" className="mt-5 block text-sm font-semibold text-slate-900">Cosa fai</label>
        <input
          id="passo-testo"
          value={testo}
          maxLength={300}
          autoFocus
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Es. Richiamo per il contratto"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
        />

        <label htmlFor="passo-data" className="mt-4 block text-sm font-semibold text-slate-900">Entro quando</label>
        <input
          id="passo-data"
          type="date"
          min={oggiISO()}
          value={scadenza}
          onChange={(e) => setScadenza(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
        />

        {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {passo?.testo ? (
            <button type="button" onClick={fatto} disabled={busy} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50">
              Segna come fatto
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50">
              Annulla
            </button>
            <button type="button" onClick={salva} disabled={!pronto || busy} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
              {busy ? "Salvo…" : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PassoPannello;
