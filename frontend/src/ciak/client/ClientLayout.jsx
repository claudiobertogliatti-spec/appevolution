import { NavLink } from "react-router-dom";
import {
  BookOpen, Home, LifeBuoy, LogOut, PlayCircle, Sparkles,
} from "lucide-react";
import { clearClientSession } from "./api";

const nav = [
  { to: "/cliente", end: true, label: "Home", icon: Home },
  { to: "/cliente/blueprint", label: "Blueprint", icon: BookOpen },
  { to: "/cliente/start", label: "Ciak Start", icon: Sparkles },
  { to: "/cliente/partnership", label: "Partnership", icon: PlayCircle },
];

function navClass({ isActive }) {
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50"
  }`;
}

export function ClientLayout({ client, children }) {
  const logout = () => {
    clearClientSession();
    window.location.href = "/cliente";
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[Poppins,system-ui,sans-serif] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <img src="/ciak/logo.webp" alt="Ciak.io" className="h-8 w-auto" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
              Il tuo percorso Ciak
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {client?.name || client?.email || "Cliente Ciak"}
            </p>
          </div>
          <button
            onClick={logout}
            aria-label="Esci"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
          <a
            href="mailto:assistenza@evolution-pro.it"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50"
          >
            <LifeBuoy className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Supporto</span>
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
