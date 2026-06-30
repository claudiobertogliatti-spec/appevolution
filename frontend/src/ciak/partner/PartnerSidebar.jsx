/**
 * Ciak Partner — Sidebar di navigazione (palette Ciak slate/yellow).
 *
 * Struttura:
 *  voci principali (Home, Workspace)
 *  + sezioni Evolution One collassabili (Accelera la crescita, Growth System).
 * Il webinar NON è qui: è dentro il processo di costruzione (fase Valida, step Prezzo + webinar).
 * Le fasi del journey si raggiungono dalla dashboard (sezione "A che punto sei").
 */
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, LayoutGrid,
  Rocket, Layers, ChevronDown, ChevronRight,
  MessageCircle,
} from "lucide-react";

const MAIN_NAV = [
  { to: "/partner", end: true, label: "Home", icon: Home },
  { to: "/partner/workspace", label: "Workspace", icon: LayoutGrid },
  { to: "/partner/supporto", label: "Team di supporto", icon: MessageCircle, helper: "Chat con il referente giusto" },
];

const ACCELERA_ITEMS = [
  { to: "/partner/accelera/acc-visibilita", label: "Visibilità" },
  { to: "/partner/accelera/acc-costanza", label: "Costanza" },
  { to: "/partner/accelera/acc-spinta-vendite", label: "Spinta Vendite" },
  { to: "/partner/accelera/acc-eventi-vendita", label: "Eventi Vendita" },
  { to: "/partner/accelera/acc-prodotti-digitali", label: "Prodotti Digitali" },
  { to: "/partner/accelera/acc-direzione", label: "Direzione" },
];

function linkClass({ isActive }) {
  return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
    isActive
      ? "bg-slate-800 text-yellow-400 font-medium"
      : "text-slate-300 hover:bg-slate-800/60"
  }`;
}

function supportLinkClass({ isActive }) {
  return `flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm transition border ${
    isActive
      ? "bg-yellow-400 text-slate-900 border-yellow-400 font-semibold"
      : "bg-slate-800/40 text-slate-200 border-slate-700 hover:bg-slate-800"
  }`;
}

function subLinkClass({ isActive }) {
  return `block px-3 py-1.5 rounded-lg text-sm transition ${
    isActive ? "bg-slate-800 text-yellow-400 font-medium" : "text-slate-400 hover:bg-slate-800/60"
  }`;
}

function Collapsible({ icon: Icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 transition"
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-yellow-400" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l border-slate-800 pl-3">{children}</div>}
    </div>
  );
}

export function PartnerSidebar({ user, onLogout }) {
  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0 min-h-screen">
      <div className="px-6 py-5 border-b border-slate-800">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Ciak</p>
        <p className="text-sm text-slate-400 mt-0.5">Area Partner</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={item.helper ? supportLinkClass : linkClass}
          >
            <item.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block leading-tight">{item.label}</span>
              {item.helper && (
                <span className="block text-[11px] font-normal opacity-75 mt-0.5 leading-snug">
                  {item.helper}
                </span>
              )}
            </span>
          </NavLink>
        ))}

        <div className="pt-3 mt-2 border-t border-slate-800 space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Evolution One
          </p>
          <Collapsible icon={Rocket} label="Accelera la crescita">
            {ACCELERA_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={subLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </Collapsible>

          <Collapsible icon={Layers} label="Evolution Growth System">
            <NavLink to="/partner/growth-system" className={subLinkClass}>
              I tre livelli
            </NavLink>
          </Collapsible>
        </div>
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
