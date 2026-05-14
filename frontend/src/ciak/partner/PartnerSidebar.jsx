/**
 * Ciak Partner — Sidebar di navigazione (palette Ciak slate/yellow).
 * Costruita fresca per Ciak (la sidebar Evolution non era riusabile 1:1).
 */
import { NavLink } from "react-router-dom";
import { STEPS } from "./stepConfig";

export function PartnerSidebar({ user, currentStep, onLogout }) {
  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm transition ${
      isActive
        ? "bg-slate-800 text-yellow-400 font-medium"
        : "text-slate-300 hover:bg-slate-800/60"
    }`;

  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0 min-h-screen">
      <div className="px-6 py-5 border-b border-slate-800">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Ciak</p>
        <p className="text-sm text-slate-400 mt-0.5">Area Partner</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink to="/partner" end className={linkClass}>
          Dashboard
        </NavLink>

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Il percorso
        </p>
        {STEPS.map((step) => {
          const locked = currentStep != null && step.num > currentStep;
          return (
            <NavLink
              key={step.id}
              to={`/partner/${step.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-slate-800 text-yellow-400 font-medium"
                    : locked
                    ? "text-slate-600"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`
              }
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                  currentStep != null && step.num < currentStep
                    ? "bg-emerald-500 text-white"
                    : currentStep === step.num
                    ? "bg-yellow-400 text-slate-900"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {step.num}
              </span>
              {step.title}
            </NavLink>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Supporto
        </p>
        <NavLink to="/partner/supporto" className={linkClass}>
          Aiuto e contatti
        </NavLink>
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <p className="px-3 text-sm text-slate-300">{user?.name}</p>
        <p className="px-3 text-xs text-slate-500 mb-2">Partner Evolution PRO</p>
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800/60 transition"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
