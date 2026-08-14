import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Lock } from "lucide-react";
import { PianoOperativoWidget } from "../components/PianoOperativoWidget";
import { useJourneyState } from "../operativo/hooks/useJourneyState";
import { groupJourneySteps, hasMaterialOutput } from "../operativo/journeyPresentation";
import StepMaterialsModal from "./StepMaterialsModal";

const PHASE_COPY = {
  esamina: {
    headline: "Identità, posizionamento e fondamenta",
    description: "Mettiamo a fuoco chi sei, a chi parli e perché il mercato dovrebbe scegliere te.",
  },
  valida: {
    headline: "Produzione, sistema di vendita e lancio",
    description: "Trasformiamo il progetto in masterclass, corso e sistema di vendita verificato.",
  },
  ottimizza: {
    headline: "Dati reali e miglioramento continuo",
    description: "Dopo il lancio leggiamo i risultati e miglioriamo ciò che produce vendite.",
  },
};

function displayStatus(status) {
  if (status === "done") return { label: "✓ Completato", tone: "bg-emerald-100 text-emerald-900" };
  if (status === "in_progress") return { label: "▶ In corso", tone: "bg-yellow-100 text-slate-950 border border-yellow-300" };
  return { label: "🔒 In coda", tone: "bg-slate-200 text-slate-600" };
}

export function MetodoEvoPage({ partnerId }) {
  const { state } = useJourneyState(partnerId);
  const [selectedStep, setSelectedStep] = useState(null);
  const phases = useMemo(
    () => groupJourneySteps(state?.steps || [], state?.macro_phases || []),
    [state]
  );
  const totalSteps = state?.steps?.length || 20;
  const completedCount = state?.steps?.filter((step) => step.status === "done").length || 0;
  const progress = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-16">
      <header className="border-b border-slate-200 py-10 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">Protocollo EVO™ · F-1–F-20</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Il tuo percorso</h1>
            <p className="text-sm text-slate-600 mt-3 max-w-2xl">Tre macro-fasi, venti passaggi. Negli step che producono una consegna puoi rivedere e scaricare i materiali.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-[250px]">
            <div className="flex justify-between text-xs font-bold mb-2"><span>Avanzamento</span><span>{completedCount}/{totalSteps} · {progress}%</span></div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-10">
        <PianoOperativoWidget partnerId={partnerId} partnerName={state?.partner_name || "Partner CIAK"} />
        {phases.map((phase) => {
          const copy = PHASE_COPY[phase.id] || {};
          return (
            <section key={phase.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <p className="text-xs font-mono font-bold text-amber-600">MACRO-FASE {phase.number} · {phase.steps[0]?.code || "—"}–{phase.steps[phase.steps.length - 1]?.code || "—"}</p>
                  <h2 className="text-2xl font-extrabold mt-1">{phase.label} — {copy.headline}</h2>
                </div>
                <p className="text-sm text-slate-600 max-w-md">{copy.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
                {phase.steps.map((step) => {
                  const status = displayStatus(step.status);
                  const done = step.status === "done";
                  const active = step.status === "in_progress";
                  const canViewMaterials = done && hasMaterialOutput(step);
                  return (
                    <article key={step.step_id} className={`p-5 rounded-2xl border ${active ? "border-2 border-yellow-400" : "border-slate-200 bg-slate-50/60"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-mono font-bold text-slate-500">{step.code}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.tone}`}>{status.label}</span>
                      </div>
                      <h3 className="font-extrabold mt-3">{step.label}</h3>
                      <p className="text-xs text-slate-500 mt-1">Agente: {(step.owner || "STEFANIA").toLowerCase()}</p>
                      <div className="pt-4 mt-4 border-t border-slate-200">
                        {canViewMaterials ? (
                          <button type="button" onClick={() => setSelectedStep({ ...step, id: step.step_id, title: step.label })} className="inline-flex items-center gap-2 text-xs font-bold border border-slate-300 bg-white rounded-xl px-3 py-2 hover:bg-slate-100">
                            <Eye className="w-4 h-4 text-amber-600" /> Visualizza materiali
                          </button>
                        ) : active ? (
                          <Link to="/partner" className="inline-flex text-xs font-extrabold bg-yellow-400 rounded-xl px-4 py-2">Vai all’azione →</Link>
                        ) : !done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400"><Lock className="w-3.5 h-3.5" /> Sblocco automatico</span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
      {selectedStep && <StepMaterialsModal partnerId={partnerId} step={selectedStep} onClose={() => setSelectedStep(null)} />}
    </div>
  );
}

export default MetodoEvoPage;
