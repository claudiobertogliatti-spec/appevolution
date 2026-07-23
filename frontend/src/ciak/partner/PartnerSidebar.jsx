import { NavLink } from "react-router-dom";
import {
  Home,
  Map,
  FolderOpen,
  Users,
  Sparkles,
  RefreshCw,
  LogOut,
} from "lucide-react";

const MAIN_NAV = [
  { to: "/partner", end: true, label: "Home", icon: Home },
  { to: "/partner/metodo-evo", label: "Percorso", icon: Map },
  { to: "/partner/materiali", label: "Materiali", icon: FolderOpen },
  { to: "/partner/team-ciak", label: "Team", icon: Users },
];

const EXTRA_NAV = [
  { to: "/partner/servizi-extra", label: "Servizi Extra", icon: Sparkles },
  { to: "/partner/continua-scalare", label: "Rinnovo", icon: RefreshCw },
];

function navClass({ isActive }) {
  return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
    isActive
      ? "bg-slate-950 text-yellow-400 font-extrabold shadow-sm"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
  }`;
}

function extraClass({ isActive }) {
  return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
    isActive
      ? "bg-amber-400 text-slate-950 font-extrabold shadow-sm"
      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-950"
  }`;
}

export function PartnerSidebar({ user, onLogout }) {
  return (
    <aside className="w-64 flex-shrink-0 min-h-screen bg-slate-50 p-4 border-r border-slate-200 font-[Poppins,system-ui,sans-serif]">
      <div className="h-full flex flex-col justify-between">
        <div>
          {/* LOGO HEADER */}
          <div className="px-3 py-3 mb-6">
            <img src="/ciak/logo.webp" alt="Ciak.io" className="h-9 w-auto object-contain" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block mt-2">
              Protocollo EVO™
            </span>
          </div>

          {/* MAIN NAV GROUP */}
          <nav className="space-y-1.5">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* SEPARATOR & SECOND GROUP */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-2">
            {EXTRA_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={extraClass}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* FOOTER USER CARD */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-yellow-400 font-extrabold flex items-center justify-center text-xs shrink-0">
              {(user?.name || "Partner").slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-extrabold text-slate-900 truncate">{user?.name || "Partner CIAK"}</p>
              <p className="text-[11px] text-slate-500 truncate">Accademia Partner</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Esci dall'Area Partner
          </button>
        </div>
      </div>
    </aside>
  );
}
