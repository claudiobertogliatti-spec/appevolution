/**
 * Anteprima Interattiva dal Vivo: Pagina Rinnovo & Continuità (Post-12 Mesi Protocollo EVO) Area Partner CIAK.
 * Sfondo Bianco Puro (#FFFFFF) con layout ad ampia visibilità (max-w-[1500px] / max-w-[1400px]).
 */
import React from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { ContinuaScalarePage } from "../partner/sections/ContinuaScalarePage";
import { Home, Map, FolderOpen, Users, Sparkles, RefreshCw } from "lucide-react";

export function CiakPartnerRinnovoDemo() {
  return (
    <>
      <CiakHeader />

      <main className="bg-white min-h-screen font-[Poppins,system-ui,sans-serif] text-slate-900 border-t border-slate-100">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 py-8 px-4 sm:px-8">
          
          {/* SIDEBAR CON LE 2 SEZIONI DI CLAUDIO */}
          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block mb-3">
                  Navigazione Principale
                </span>
                <nav className="space-y-1.5">
                  <a href="/partner-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Home className="h-4 w-4 text-slate-500" />
                    <span>Home</span>
                  </a>
                  <a href="/percorso-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Map className="h-4 w-4 text-slate-500" />
                    <span>Percorso</span>
                  </a>
                  <a href="/materiali-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <FolderOpen className="h-4 w-4 text-slate-500" />
                    <span>Materiali</span>
                  </a>
                  <a href="/team-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span>Team</span>
                  </a>
                </nav>
              </div>

              <div className="pt-5 border-t border-slate-200">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  Crescita & Rinnovo
                </span>
                <nav className="space-y-1.5">
                  <a href="/servizi-extra-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs transition">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    <span>Servizi Extra</span>
                  </a>
                  <a href="/rinnovo-demo" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm">
                    <RefreshCw className="h-4 w-4 text-slate-950" />
                    <span>Rinnovo</span>
                  </a>
                </nav>
              </div>

              {/* PROFILE CARD */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-900 text-yellow-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                  MR
                </div>
                <div className="overflow-hidden">
                  <span className="font-extrabold text-xs text-slate-900 block truncate">Dott. Mario Rossi</span>
                  <span className="text-[11px] text-slate-500 block truncate">Posturologia Integrata</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN PAGE CONTENT */}
          <div className="min-w-0">
            <ContinuaScalarePage partnerId="demo_mario_rossi" />
          </div>

        </div>
      </main>

      <CiakFooter />
    </>
  );
}
