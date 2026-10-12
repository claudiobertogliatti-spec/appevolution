/**
 * Ciak Admin — Home "Regia" (lancia-reparti, stile app bancaria/Poste).
 *
 * Pagina d'ingresso di /admin: striscia "Richiede attenzione", blocchi "Oggi" e
 * accessi alle collaboratrici. I reparti NON sono ripetuti qui: stanno nella sidebar.
 *
 * La striscia legge le fonti già esistenti (useRepartoMetrics → endpoint admin).
 * Stati distinti e onesti: caricamento, dato non disponibile, zero, valore reale.
 * Nessuna cifra inventata.
 *
 * Brand lockato: Poppins, slate + giallo.
 */
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useRepartoMetrics } from "../repartoMetrics";
import { OggiBlocks } from "../components/OggiBlocks";
import { OggiCallStrip } from "../components/OggiCallStrip";
import { OggiStart } from "../components/OggiStart";

// Primo intero da un valore tipo "3", "2 · €480" → numero; "Nessuna"/"—"/null → null.
function numFrom(v) {
  if (v == null) return null;
  const m = String(v).match(/^\s*(\d[\d.]*)/);
  return m ? parseInt(m[1].replace(/\./g, ""), 10) : null;
}
const stateOf = (obj) => obj?.__status || (obj && Object.keys(obj).length > 0 ? "ready" : "loading");
const isLoaded = (obj) => stateOf(obj) !== "loading";
const isAvailable = (obj) => ["ready", "partial"].includes(stateOf(obj));
const hasSource = (obj, key) => isAvailable(obj) && !(obj.__failedKeys || []).includes(key);
// valore metrica: null = ancora in caricamento; altrimenti la stringa reale (anche "—").
const metric = (obj, label) => stateOf(obj) === "loading"
  ? null
  : stateOf(obj) === "error" ? "Dato non disponibile" : (obj[label] ?? "—");

export function AdminHome({ user, onAuthExpired }) {
  const nome = (user?.name || "").trim().split(/\s+/)[0] || "Claudio";
  const del = useRepartoMetrics("delivery");
  const bo = useRepartoMetrics("back-office");

  // Striscia "richiede attenzione": solo voci realmente > 0, dalle stesse fonti.
  // I partner fermi NON stanno piu' qui: li conta il blocco "Oggi" (che esclude gli
  // account di prova), e due numeri diversi sulla stessa pagina confondono.
  const attnReady = isLoaded(del) && isLoaded(bo);
  const attnAvailable = hasSource(del, "da") && hasSource(bo, "cred");
  const attn = [];
  const approv = numFrom(metric(del, "Output da approvare"));
  if (approv) attn.push({ tone: "danger", to: "/admin/reparto/delivery", label: "Output da approvare", n: approv });
  const ritardo = metric(bo, "In ritardo");
  const ritN = numFrom(ritardo);
  if (ritN) attn.push({ tone: "warn", to: "/admin/reparto/back-office", label: "Rate in ritardo", n: ritN });

  const toneCls = {
    danger: "border-red-200 bg-red-50 text-red-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className="p-5 sm:p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Ciao {nome}</h1>
        <p className="text-slate-500 mt-2">Cosa fare oggi, in ordine. I reparti sono nel menu a sinistra.</p>
      </div>

      {/* 1. Quante call oggi e a che ora: sempre in vista, non in un riquadro chiuso */}
      <OggiCallStrip onAuthExpired={onAuthExpired} />

      {/* Richiede attenzione (soldi e approvazioni) */}
      <div className="mb-8" aria-label="Richiede la tua attenzione">
        {!attnReady ? (
          <p className="text-sm text-slate-400">Controllo cosa richiede attenzione…</p>
        ) : !attnAvailable ? (
          <p className="text-sm text-slate-500">Dati sulle urgenze non disponibili.</p>
        ) : attn.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna urgenza in evidenza.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <span className="text-sm font-semibold text-slate-500 self-center mr-1">Richiede attenzione:</span>
            {attn.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-shadow hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${toneCls[a.tone]}`}
              >
                <AlertTriangle className="w-4 h-4" aria-hidden />
                {a.label}
                <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-white/70 text-xs font-bold">{a.n}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Oggi: quattro riquadri apribili — Call, Trattative, Clienti, Partner */}
      <OggiBlocks onAuthExpired={onAuthExpired} clienti={<OggiStart onAuthExpired={onAuthExpired} />} />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Le tue collaboratrici</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { slug: "mariangela", nome: "Mariangela", area: "Acquisizione e Vendite" },
            { slug: "antonella", nome: "Antonella", area: "Delivery" },
          ].map((c) => (
            <Link
              key={c.slug}
              to={`/admin/persona/${c.slug}`}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 text-yellow-400 font-semibold flex-shrink-0" aria-hidden>{c.nome[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{c.nome}</span>
                <span className="block text-sm text-slate-500">{c.area}</span>
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminHome;
