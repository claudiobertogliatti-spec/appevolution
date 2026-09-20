/**
 * Sotto-nav a tab del reparto Vendite (Home · Pipeline · Clienti · Listino).
 * Il tab attivo è passato via prop `active` (label) e reso non-cliccabile.
 * Speculare a AcquisizioneSubNav: stesso pattern e stesso brand lock Ciak.
 */
import { Link } from "react-router-dom";

const TABS = [
  { label: "Home", to: "/admin/reparto/vendite" },
  { label: "Pipeline", to: "/admin/trattative" },
  { label: "Clienti", to: "/admin/clienti-ciak" },
  { label: "Listino", to: "/admin/listino-prezzi" },
];

export function VenditeSubNav({ active }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600 px-2.5 whitespace-nowrap">
        Vendite
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

export default VenditeSubNav;
