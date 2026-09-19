/**
 * Sotto-nav a tab del reparto Acquisizione (Home · Editoriale · ADS · Prospect · Pipeline).
 * Il tab attivo è passato via prop `active` (label) e reso non-cliccabile.
 */
import { Link } from "react-router-dom";

const TABS = [
  { label: "Home", to: "/admin/reparto/acquisizione" },
  { label: "Editoriale", to: "/admin/acquisizione-editoriale" },
  { label: "ADS", to: "/admin/acq-campagne-ads" },
  { label: "Prospect", to: "/admin/acquisizione-prospect" },
  { label: "Pipeline", to: "/admin/pipeline" },
];

export function AcquisizioneSubNav({ active }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600 px-2.5 whitespace-nowrap">
        Acquisizione
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

export default AcquisizioneSubNav;
