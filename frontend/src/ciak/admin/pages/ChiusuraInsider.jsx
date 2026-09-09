import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, ExternalLink, Link2 } from "lucide-react";
import { adminFetch } from "../api";

// La pagina di chiusura Insider usa lo STESSO token della proposta: si deriva
// dall'URL /proposta/:token (approccio già in produzione). Supporta anche un
// insider_url esplicito dal backend, se un giorno arriva.
const insiderLink = (p) =>
  (p && (p.insider_url || (p.url ? p.url.replace("/proposta/", "/insider/") : null))) || null;

/**
 * Chiusura Insider — il gesto di handoff post-call.
 *
 * Dopo la call, genera la pagina di chiusura Insider per un lead e restituisce
 * il link /insider/:token (stesso token della proposta) pronto da inviare,
 * copiato in un click. Riusa POST /api/proposta/admin/genera-cliente: nessun
 * nuovo flusso, nessun pagamento toccato.
 */
export function ChiusuraInsider({ onAuthExpired }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [owner, setOwner] = useState("Gaia");

  async function genera(e) {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) {
      setError("Inserisci l'email del lead.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await adminFetch("/api/proposta/admin/genera-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, diagnostic_session_id: null, owner }),
      });
      if (!response.ok) throw new Error(`Errore ${response.status}`);
      const json = await response.json();
      setResult(json);
      const link = insiderLink(json);
      if (link) {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }
    } catch (err) {
      if (err.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const link = insiderLink(result);

  return (
    <div className="p-10 max-w-3xl">
      <Link
        to="/admin/reparto/acquisizione-vendita"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Acquisizione e vendita
      </Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Acquisizione e vendita
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Chiusura Insider</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        Subito dopo la call: genera la pagina di chiusura personalizzata del lead
        (Start €390 · Partnership €2.990) e invia il link. È lo stesso token della
        proposta — nessun pagamento parte da qui.
      </p>

      <form onSubmit={genera} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <label htmlFor="lead-owner" className="block text-sm font-medium text-slate-700 mb-2">
          Responsabile
        </label>
        <select
          id="lead-owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="w-full sm:w-auto mb-4 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
        >
          {["Gaia", "Carlo", "Mariangela"].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label htmlFor="lead-email" className="block text-sm font-medium text-slate-700 mb-2">
          Email del lead
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm disabled:opacity-60"
          >
            {loading ? "Generazione…" : "Genera link Insider"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {link && (
        <div className="bg-slate-900 text-white rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 mb-2 inline-flex items-center gap-1.5">
            <Link2 className="w-4 h-4" /> Link Insider {result.status || ""} — da inviare al lead
          </p>
          <p className="text-sm text-slate-100 break-all font-mono mb-4">{link}</p>
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiato" : "Copia link"}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300"
            >
              <ExternalLink className="w-4 h-4" /> Apri pagina Insider
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
