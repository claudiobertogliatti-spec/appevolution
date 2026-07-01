import { NavLink } from "react-router-dom";
import {
  Home,
  Map,
  FolderOpen,
  Users,
  Send,
  Sparkles,
  TrendingUp,
  LogOut,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { AGENTS } from "./operativo/agents";

const MAIN_NAV = [
  { to: "/partner", end: true, label: "Home", icon: Home },
  { to: "/partner/metodo-evo", label: "Metodo EVO", icon: Map },
  { to: "/partner/materiali", label: "Materiali", icon: FolderOpen },
  { to: "/partner/team-ciak", label: "Il team Ciak.io", icon: Users },
  { to: "/partner/telegram", label: "Gruppo Telegram", icon: Send },
];

const BUSINESS_NAV = [
  { to: "/partner/servizi-extra", label: "Servizi extra", icon: Sparkles },
  { to: "/partner/continua-scalare", label: "Continua a scalare", icon: TrendingUp },
];

const TEAM_PREVIEW = [
  { id: "STEFANIA", role: "Coordina" },
  { id: "VALENTINA", role: "Esamina" },
  { id: "ANDREA", role: "Valida" },
];

function navClass({ isActive }) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
    isActive
      ? "bg-blue-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
  }`;
}

function businessClass({ isActive }) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
    isActive
      ? "bg-blue-600 text-white"
      : "bg-white text-slate-700 border border-slate-200 hover:border-blue-200 hover:text-blue-700"
  }`;
}

function AgentMini({ item }) {
  const agent = AGENTS[item.id];
  if (!agent) return null;
  return (
    <NavLink
      to="/partner/team-ciak"
      className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-blue-50 transition"
    >
      <img
        src={agent.avatar}
        alt={agent.name}
        className="w-9 h-9 rounded-lg object-cover bg-slate-100"
      />
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-slate-900 truncate">{agent.name}</p>
        <p className="text-[10px] text-slate-500 truncate">{item.role}</p>
      </div>
    </NavLink>
  );
}

export function PartnerSidebar({ user, onLogout }) {
  return (
    <aside className="w-72 flex-shrink-0 min-h-screen bg-gray-100 p-3">
      <div className="h-full bg-white border border-yellow-300 rounded-xl shadow-[0_0_28px_rgba(250,204,21,0.22)] flex flex-col overflow-hidden">
        <div className="px-5 py-5 border-b border-slate-100">
          <img src="/ciak/logo.webp" alt="Ciak.io" className="h-9 w-auto object-contain" />
          <p className="text-xs font-semibold text-slate-500 mt-3">Protocollo EVO · 12 mesi</p>
          <p className="text-[12px] leading-relaxed text-slate-500 mt-1">
            Hai un percorso completo: costruzione, lancio e accompagnamento.
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Il team Ciak.io
              </p>
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              {TEAM_PREVIEW.map((item) => (
                <AgentMini key={item.id} item={item} />
              ))}
            </div>
            <NavLink
              to="/partner/team-ciak"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-800"
            >
              Scrivi al team <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="mt-5 space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Crescita
            </p>
            {BUSINESS_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={businessClass}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-[13px] font-semibold text-slate-900">Vuoi accelerare?</p>
            <p className="text-[12px] text-slate-600 leading-relaxed mt-1">
              I servizi extra servono quando vuoi andare più veloce su ads, video, copy o automazioni.
            </p>
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || "Partner"}</p>
          <p className="text-xs text-slate-500 mb-3">Accompagnato da Evolution PRO</p>
          <button
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </div>
    </aside>
  );
}
