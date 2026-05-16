/**
 * Ciak Admin — Partner setup pending.
 *
 * Lista partner che hanno ricevuto un magic link di setup password ma non
 * l'hanno ancora consumato. Permette di:
 *   - Vedere chi è in attesa di completare il setup
 *   - Copiare il magic link e mandarlo manualmente (es. via WhatsApp) se
 *     l'email Systeme non è arrivata
 *   - Identificare token scaduti (richiedono rigenerazione manuale via DB)
 *
 * Backend: GET /api/admin/ciak/partner-setup-pending
 */
import { useEffect, useState } from "react";
import { apiGet } from "../api";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function isExpired(iso) {
  if (!iso) return false;
  try {
    return new Date(iso) < new Date();
  } catch { return false; }
}

function CopyButton({ value, label = "Copia link" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback per browser senza clipboard API (raro)
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={copy}
      className="text-xs font-medium px-3 py-1 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
    >
      {copied ? "Copiato ✓" : label}
    </button>
  );
}

export function PartnerSetupPending({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [includeConsumed, setIncludeConsumed] = useState(false);

  const load = () => {
    apiGet("/partner-setup-pending", { include_consumed: includeConsumed })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  };
  useEffect(load, [onAuthExpired, includeConsumed]);

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Partner — Setup password pending</h1>
      <p className="text-slate-500 mb-6">
        Magic link inviati ai partner post-pagamento. Se un partner non riceve l'email Systeme,
        copia qui il link e mandaglielo manualmente.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Totale
          </p>
          <p className="text-3xl font-semibold text-slate-900">{data.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            In attesa
          </p>
          <p className="text-3xl font-semibold text-yellow-500">{data.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Completati
          </p>
          <p className="text-3xl font-semibold text-emerald-600">{data.consumed}</p>
        </div>
      </div>

      <label className="inline-flex items-center text-sm text-slate-700 mb-4">
        <input
          type="checkbox"
          checked={includeConsumed}
          onChange={(e) => setIncludeConsumed(e.target.checked)}
          className="mr-2"
        />
        Mostra anche partner che hanno già completato il setup
      </label>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
              <th className="px-5 py-3 font-semibold">Partner</th>
              <th className="px-5 py-3 font-semibold">Creato</th>
              <th className="px-5 py-3 font-semibold">Scadenza</th>
              <th className="px-5 py-3 font-semibold">Stato</th>
              <th className="px-5 py-3 font-semibold text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nessun partner in attesa di setup.
                </td>
              </tr>
            )}
            {data.items.map((p) => {
              const expired = p.status === "pending" && isExpired(p.expires_at);
              return (
                <tr key={p.partner_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{p.nome || "—"}</div>
                    <div className="text-slate-500 text-xs">{p.email}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(p.created_at)}</td>
                  <td className={`px-5 py-3 text-xs ${expired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                    {fmtDate(p.expires_at)}
                    {expired && " (scaduto)"}
                  </td>
                  <td className="px-5 py-3">
                    {p.status === "consumed" ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Completato {p.consumed_at ? `· ${fmtDate(p.consumed_at)}` : ""}
                      </span>
                    ) : expired ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                        Scaduto — contatta partner
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                        In attesa
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {p.setup_url && p.status === "pending" && !expired && (
                      <CopyButton value={p.setup_url} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-slate-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Come funziona</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Quando un cliente paga la Partnership €2.790, il backend genera un magic
          link (token unico, scadenza 7 giorni) e lo propaga a Systeme.io tramite
          tag <code className="bg-white px-1 rounded">partner_setup_pending</code> +
          custom field <code className="bg-white px-1 rounded">partner_setup_url</code>.
          Il workflow Systeme manda l'email "Imposta la tua password" con il link.
          Se l'email Systeme non arriva (workflow disattivato, deliverability), usa
          il pulsante "Copia link" sopra e mandalo al partner manualmente.
        </p>
      </div>
    </div>
  );
}
