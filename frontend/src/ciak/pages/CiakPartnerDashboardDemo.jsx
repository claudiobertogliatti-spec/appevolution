/**
 * Area Partner CIAK — Dashboard Home Operativa (Identica a ciak.io/partner).
 */
import React from "react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import GuidedHome from "../partner/operativo/GuidedHome";

export function CiakPartnerDashboardDemo() {
  const demoState = {
    current_step: {
      step_id: "esamina_1",
      macro_phase: "esamina",
      title: "Benvenuto",
      completed: false,
    },
    completed_count: 1,
    total_steps: 17,
    steps: [
      { step_id: "esamina_1", macro_phase: "esamina", title: "Benvenuto", completed: false },
    ],
  };

  return (
    <>
      <CiakHeader />

      <main className="bg-slate-50 min-h-screen font-[Poppins,system-ui,sans-serif] text-slate-900 border-t border-slate-100 py-6 sm:py-8">
        <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-8">
          
          {/* BANNER GESTIONE ADMIN (Stile ciak.io/partner) */}
          <div className="mb-6 bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-sm">
            <span>Vista Admin — stai ispezionando: Luigi Calafiore</span>
            <div className="flex items-center gap-3">
              <span className="cursor-pointer hover:underline">Cambia partner</span>
              <span className="bg-slate-950 text-white px-3 py-1 rounded-lg font-extrabold cursor-pointer hover:bg-slate-800 transition">
                ← Torna all'Admin
              </span>
            </div>
          </div>

          <GuidedHome
            state={demoState}
            partnerId="demo_luigi_calafiore"
            partnerName="Luigi Calafiore"
            onOpenStep={(stepId) => alert(`Apri il prossimo passo: ${stepId}`)}
            onAsk={() => alert("Apri chat per fare una domanda live al team")}
            onReplayWelcome={() => alert("Riproduci introduzione completa")}
          />
        </div>
      </main>

      <CiakFooter />
    </>
  );
}

export default CiakPartnerDashboardDemo;
