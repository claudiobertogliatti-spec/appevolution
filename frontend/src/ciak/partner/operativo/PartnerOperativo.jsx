import React, { lazy, Suspense, useState } from "react";
import { useJourneyState } from "./hooks/useJourneyState";
import ProgressBar from "./ProgressBar";
import AgentVoiceNarrante from "./AgentVoiceNarrante";
import AgentDrawer from "./AgentDrawer";

// Step components lazy-loaded — implementati in Phase 4
const STEP_COMPONENTS = {
  "01-contratto":            lazy(() => import("./steps/Step01Contratto")),
  "02-discovery-video":      lazy(() => import("./steps/Step02DiscoveryVideo")),
  "03-brand-kit":            lazy(() => import("./steps/Step03BrandKit")),
  "04-posizionamento":       lazy(() => import("./steps/Step04Posizionamento")),
  "05-script-masterclass":   lazy(() => import("./steps/Step05ScriptMasterclass")),
  "06-outline-lezioni":      lazy(() => import("./steps/Step06OutlineLezioni")),
  "07-registra-masterclass": lazy(() => import("./steps/Step07RegistraMasterclass")),
  "08-registra-lezioni":     lazy(() => import("./steps/Step08RegistraLezioni")),
  "09-funnel-asset":         lazy(() => import("./steps/Step09FunnelAsset")),
  "10-funnel-team-work":     lazy(() => import("./steps/Step10FunnelTeamWork")),
  "11-calendario-30gg":      lazy(() => import("./steps/Step11Calendario")),
  "12-prezzo-webinar":       lazy(() => import("./steps/Step12PrezzoWebinar")),
  "13-lancio":               lazy(() => import("./steps/Step13Lancio")),
};

const FinaleCelebrativa = lazy(() => import("./steps/StepFinaleCelebrativa"));
const OperativoContinuo = lazy(() => import("./steps/OperativoContinuo"));

/**
 * Container Operativo Stefania (Sub-progetto A — sostituisce home partner).
 * Layout: progress bar + Stefania voce narrante + componente step dinamico.
 * Drawer chat si apre al click "Chiedi →".
 */
export default function PartnerOperativo({ partnerId }) {
  const { state, loading, error, completeStep, saveDraft, refresh } = useJourneyState(partnerId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingStepId, setViewingStepId] = useState(null); // se !== null: partner sta modificando step già done

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-[Poppins,system-ui,sans-serif] text-slate-500">
        Carico il tuo operativo...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-[Poppins,system-ui,sans-serif]">
        <div className="bg-white border border-gray-200 rounded-md p-6 text-center max-w-md">
          <p className="text-red-600 mb-2 font-semibold">Errore caricamento operativo</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }
  if (!state) return null;

  const current = state.current_step;
  const allDone = state.completed_count === state.total_steps;
  const celebrazioneShown = typeof window !== "undefined" && sessionStorage.getItem(`celebrazione-vista-${partnerId}`);
  const justCompleted = allDone && !celebrazioneShown;

  // Step da mostrare: o quello in viewing (modifica step done), o quello current
  const stepToShow = viewingStepId
    ? state.steps.find((s) => s.step_id === viewingStepId)
    : current;

  let StepComponent = null;
  if (justCompleted) {
    StepComponent = FinaleCelebrativa;
  } else if (allDone) {
    StepComponent = OperativoContinuo;
  } else if (stepToShow) {
    StepComponent = STEP_COMPONENTS[stepToShow.step_id];
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[Poppins,system-ui,sans-serif] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <ProgressBar
          macroPhases={state.macro_phases}
          steps={state.steps}
          currentStepId={stepToShow?.step_id}
          avvio={state.avvio}
        />

        {!allDone && stepToShow && (
          <AgentVoiceNarrante
            currentStepId={stepToShow.step_id}
            stepLabel={stepToShow.label}
            stepNumber={stepToShow.step_number}
            totalSteps={state.total_steps}
            onAsk={() => setDrawerOpen(true)}
          />
        )}

        <div className="mt-4">
          {StepComponent ? (
            <Suspense fallback={<div className="text-slate-500 p-8 text-center">Carico step...</div>}>
              <StepComponent
                step={stepToShow}
                partnerId={partnerId}
                onSaveDraft={(d) => stepToShow && saveDraft(stepToShow.step_id, d)}
                onComplete={async (d) => {
                  if (!stepToShow) return;
                  await completeStep(stepToShow.step_id, d);
                  setViewingStepId(null);
                }}
                onDismissCelebrazione={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(`celebrazione-vista-${partnerId}`, "1");
                  }
                  refresh();
                }}
              />
            </Suspense>
          ) : (
            <div className="bg-white border border-gray-200 rounded-md p-8 text-slate-500 text-center">
              Step "{stepToShow?.step_id}" non ancora implementato.
            </div>
          )}
        </div>
      </div>

      <AgentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        partnerId={partnerId}
        currentStep={stepToShow}
      />
    </div>
  );
}
