/**
 * Ciak Admin — Home "Regia" (lancia-reparti, stile app bancaria/Poste).
 *
 * Pagina d'ingresso di /admin: entri e vedi le grandi categorie (i 5 reparti),
 * ognuna con un'etichetta chiara e una frase piana. Da qui si entra nella home
 * del reparto. Nessun numero inventato: i segnali reali (attenzione, KPI) verranno
 * collegati alle fonti esistenti in un blocco successivo, distinguendo
 * caricamento/errore/zero — non si mostrano cifre finte.
 *
 * Riusa lo stile delle card di RepartoLanding (brand lockato: Poppins, slate + giallo).
 */
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CreditCard, LayoutDashboard, Megaphone, Users } from "lucide-react";

// Ogni voce punta alla home del reparto: Direzione ha una pagina dedicata
// (Cabina di Regia su /admin/direzione), gli altri la landing /admin/reparto/:id.
const REPARTI = [
  { id: "direzione", label: "Direzione", to: "/admin/direzione", Icon: LayoutDashboard, desc: "Decisioni, cassa e andamento dei reparti." },
  { id: "acquisizione", label: "Acquisizione", to: "/admin/reparto/acquisizione", Icon: Megaphone, desc: "Trova e scalda nuovi contatti fino al Blueprint." },
  { id: "vendite", label: "Vendite", to: "/admin/reparto/vendite", Icon: BarChart3, desc: "Dal Blueprint alla firma: call, trattative, chiusura." },
  { id: "delivery", label: "Delivery", to: "/admin/reparto/delivery", Icon: Users, desc: "Segui i partner fino al live: materiali, video, risultati." },
  { id: "back-office", label: "Back office", to: "/admin/reparto/back-office", Icon: CreditCard, desc: "Soldi, contratti e collaboratori." },
];

export function AdminHome({ user }) {
  const nome = (user?.name || "").trim().split(/\s+/)[0] || "Claudio";
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Ciao {nome}</h1>
        <p className="text-slate-500 mt-2">La regia del tuo business, in ordine. Scegli un reparto.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {REPARTI.map(({ id, label, to, Icon, desc }) => (
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
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default AdminHome;
