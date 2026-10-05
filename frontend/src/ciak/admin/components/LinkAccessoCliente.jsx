import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "../api";

/**
 * Pulsante "Link di accesso": crea un link d'accesso nuovo per un cliente Ciak e lo
 * mostra da copiare. NON invia nessuna mail (verso hotmail i messaggi del sistema
 * finiscono spesso in spam): si genera, si copia, lo si manda a mano.
 *
 * Serve ogni volta che il cliente non riesce a entrare: mail non arrivata, link
 * scaduto, link sbagliato. Sta in Clienti Ciak e nella scheda del lead, cosi' si
 * trova da dove si e' gia'. I link gia' emessi restano validi.
 */
export default function LinkAccessoCliente({ client, onAuthExpired, className = "", label = "Link di accesso" }) {
  const [creando, setCreando] = useState(false);
  const [aperto, setAperto] = useState(null);
  const [copiato, setCopiato] = useState(false);

  const crea = async () => {
    if (!client?.id || creando) return;
    setCreando(true);
    try {
      const res = await adminFetch(`/api/admin/ciak/clients/${client.id}/link-accesso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: client.email }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let detail = text;
        try { detail = JSON.parse(text).detail || text; } catch { /* testo semplice */ }
        throw new Error(detail ? String(detail).slice(0, 200) : `Errore ${res.status}`);
      }
      const r = await res.json();
      setCopiato(false);
      setAperto({ link: r.link, scadeIl: r.scade_il });
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error(e.message || "Non sono riuscito a creare il link.");
    } finally {
      setCreando(false);
    }
  };

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(aperto.link);
      setCopiato(true);
    } catch {
      toast.error("Non riesco a copiare da solo: selezionalo e copialo a mano.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={crea}
        disabled={!client?.id || creando}
        title="Crea un link d'accesso nuovo da mandare tu. Non invia nessuna mail."
        className={className}
      >
        {creando ? "Creo il link..." : label}
      </button>

      {aperto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => setAperto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-accesso-titolo"
            className="w-full max-w-lg rounded-xl bg-white p-6 text-left shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="link-accesso-titolo" className="text-lg font-semibold text-slate-900">
              Link di accesso per {client.name || client.email}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Nessuna mail è partita. Copia il link e mandalo tu. Vale 30 giorni
              {aperto.scadeIl ? ` (fino al ${new Date(aperto.scadeIl).toLocaleDateString("it-IT")})` : ""} e
              si può usare più volte. I link già inviati restano validi.
            </p>
            <label htmlFor="link-accesso-testo" className="sr-only">Link di accesso</label>
            <input
              id="link-accesso-testo"
              readOnly
              value={aperto.link}
              onFocus={(e) => e.target.select()}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAperto(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={copia}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800"
              >
                {copiato ? "Copiato" : "Copia il link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
