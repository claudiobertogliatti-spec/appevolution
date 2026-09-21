/**
 * Sotto-nav a tab del reparto Delivery: la Home (board a 5 colonne) + una pagina
 * per ogni fase EVO (Esamina · Valida · Ottimizza · Online · Bloccati) + le pagine
 * strumento già esistenti (Audit · Video · Motore).
 * Il tab attivo è passato via prop `active` (label) e reso non-cliccabile.
 * Speculare a Vendite/Acquisizione SubNav: stesso pattern e brand lock Ciak.
 */
import { Link } from "react-router-dom";

const TABS = [
  { label: "Home", to: "/admin/reparto/delivery" },
  { label: "Esamina", to: "/admin/delivery/esamina" },
  { label: "Valida", to: "/admin/delivery/valida" },
  { label: "Ottimizza", to: "/admin/delivery/ottimizza" },
  { label: "Online", to: "/admin/delivery/online" },
  { label: "Bloccati", to: "/admin/delivery/bloccati" },
  { label: "Audit", to: "/admin/delivery-audit" },
  { label: "Video", to: "/admin/video-review" },
  { label: "Motore", to: "/admin/motore-vendite-partner" },
];

export function DeliverySubNav({ active }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600 px-2.5 whitespace-nowrap">
        Delivery
      </span>
      <span className="w-px h-5 bg-slate-200 flex-shrink-0" />
      {TABS.map((t) =>
        t.label === active ? (
          <span
            key={t.label}
            aria-current="page"
            className="text-sm font-semibold text-white bg-slate-900 rounded-lg px-3.5 py-2 whitespace-nowrap"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.label}
            to={t.to}
            className="text-sm font-medium text-slate-600 rounded-lg px-3.5 py-2 whitespace-nowrap hover:bg-slate-100 transition"
          >
            {t.label}
          </Link>
        )
      )}
    </div>
  );
}

export default DeliverySubNav;
