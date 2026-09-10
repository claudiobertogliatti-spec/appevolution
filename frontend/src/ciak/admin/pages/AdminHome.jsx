/**
 * Ciak Admin — Home "Regia" (lancia-reparti, stile app bancaria/Poste).
 *
 * Pagina d'ingresso di /admin: entri e vedi le grandi categorie (i 5 reparti),
 * ognuna con un'etichetta chiara, una frase piana e UN numero reale. In cima, la
 * striscia "Richiede attenzione" (come i movimenti in evidenza di una banca).
 *
 * I numeri vengono dalle fonti già esistenti (useRepartoMetrics → endpoint admin).
 * Stati distinti e onesti: caricamento (…), dato non disponibile (—/Da attivare),
 * zero (0/Nessuna), valore reale. Nessuna cifra inventata. La Direzione non ha un
 * endpoint metriche dedicato: la sua tessera mostra la cassa reale (da Back office).
 *
 * Brand lockato: Poppins, slate + giallo. Riusa lo stile delle card di RepartoLanding.
 */
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CreditCard, LayoutDashboard, Megaphone, Users, AlertTriangle } from "lucide-react";
import { useRepartoMetrics } from "../repartoMetrics";

// Primo intero da un valore tipo "3", "2 · €480" → numero; "Nessuna"/"—"/null → null.
function numFrom(v) {
  if (v == null) return null;
  const m = String(v).match(/^\s*(\d[\d.]*)/);
  return m ? parseInt(m[1].replace(/\./g, ""), 10) : null;
}
const isLoaded = (obj) => obj && Object.keys(obj).length > 0;
// valore metrica: null = ancora in caricamento; altrimenti la stringa reale (anche "—").
const metric = (obj, label) => (isLoaded(obj) ? (obj[label] ?? "—") : null);

export function AdminHome({ user }) {
  const nome = (user?.name || "").trim().split(/\s+/)[0] || "Claudio";
  const acq = useRepartoMetrics("acquisizione");
  const ven = useRepartoMetrics("vendite");
  const del = useRepartoMetrics("delivery");
  const bo = useRepartoMetrics("back-office");

  const tiles = [
    { id: "direzione", label: "Direzione", to: "/admin/direzione", Icon: LayoutDashboard,
      desc: "Decisioni, cassa e andamento dei reparti.", sl: "Cassa del mese", sv: metric(bo, "Incassi mese") },
    { id: "acquisizione", label: "Acquisizione", to: "/admin/reparto/acquisizione", Icon: Megaphone,
      desc: "Trova e scalda nuovi contatti fino al Blueprint.", sl: "Nuovi lead · 7 giorni", sv: metric(acq, "Nuovi lead 7 giorni") },
    { id: "vendite", label: "Vendite", to: "/admin/reparto/vendite", Icon: BarChart3,
      desc: "Dal Blueprint alla firma: call, trattative, chiusura.", sl: "Proposte inviate", sv: metric(ven, "Proposte inviate") },
    { id: "delivery", label: "Delivery", to: "/admin/reparto/delivery", Icon: Users,
      desc: "Segui i partner fino al live: materiali, video, risultati.", sl: "Partner attivi", sv: metric(del, "Partner attivi") },
    { id: "back-office", label: "Back office", to: "/admin/reparto/back-office", Icon: CreditCard,
      desc: "Soldi, contratti e collaboratori.", sl: "Scade oggi", sv: metric(bo, "Scade oggi") },
  ];

  // Striscia "richiede attenzione": solo voci realmente > 0, dalle stesse fonti.
  const attnReady = isLoaded(del) && isLoaded(bo);
  const attn = [];
  const approv = numFrom(metric(del, "Output da approvare"));
  if (approv) attn.push({ tone: "danger", to: "/admin/reparto/delivery", label: "Output da approvare", n: approv });
  const fermi = numFrom(metric(del, "Fermi oltre soglia"));
  if (fermi) attn.push({ tone: "danger", to: "/admin/reparto/delivery", label: "Partner fermi", n: fermi });
  const ritardo = metric(bo, "In ritardo");
  const ritN = numFrom(ritardo);
  if (ritN) attn.push({ tone: "warn", to: "/admin/reparto/back-office", label: "Rate in ritardo", n: ritN });

  const toneCls = {
    danger: "border-red-200 bg-red-50 text-red-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Ciao {nome}</h1>
        <p className="text-slate-500 mt-2">La regia del tuo business, in ordine. Scegli un reparto.</p>
      </div>

      {/* Richiede attenzione */}
      <div className="mb-8" aria-label="Richiede la tua attenzione">
        {!attnReady ? (
          <p className="text-sm text-slate-400">Controllo cosa richiede attenzione…</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {tiles.map(({ id, label, to, Icon, desc, sl, sv }) => (
          <Link
            key={id}
            to={to}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          >
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-yellow-400 flex-shrink-0">
              <Icon className="w-6 h-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="block text-xl font-semibold text-slate-900">{label}</span>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" aria-hidden />
              </span>
              <span className="block text-base text-slate-500 mt-1 leading-snug">{desc}</span>
              <span className="block text-sm text-slate-600 mt-3">
                {sl}: {sv === null
                  ? <span className="text-slate-400">…</span>
                  : <b className="text-slate-900 font-semibold">{sv}</b>}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default AdminHome;
