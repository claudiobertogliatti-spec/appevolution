import React, { lazy, Suspense, useState } from "react";
import { useJourneyState } from "./hooks/useJourneyState";
import ProgressBar from "./ProgressBar";
import PhaseAgentHeader from "./PhaseAgentHeader";
import GoLive21Banner from "./GoLive21Banner";
import AgentDrawer from "./AgentDrawer";
import JourneyMap from "./JourneyMap";
import Benvenuto from "./Benvenuto";

// Step components lazy-loaded — implementati in Phase 4
const STEP_COMPONENTS = {
  "01-contratto":            lazy(() => import("./steps/Step01Contratto")),
  "02-discovery-video":      lazy(() => import("./steps/Step02DiscoveryVideo")),
  "burocrazia":              lazy(() => import("./steps/StepBurocrazia")),
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
export default function PartnerOperativo({ partnerId, partnerName }) {
  const { state, loading, error, completeStep, saveDraft, refresh } = useJourneyState(partnerId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Benvenuto al primo accesso: mostrato una volta sola (flag in localStorage),
  // prima della mappa. Resta ri-apribile come passo "Conosciamoci".
  const [benvenutoSeen, setBenvenutoSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(`ciak_benvenuto_seen_${partnerId}`);
  });
  // se !== null: si apre direttamente quello step (modifica step già done, o
  // deep-link "Vai allo step" dalla scheda admin via localStorage).
  const [viewingStepId, setViewingStepId] = useState(() => {
    if (typeof window === "undefined") return null;
    const deepLink = localStorage.getItem("ciak_partner_initial_step");
    if (deepLink) localStorage.removeItem("ciak_partner_initial_step");
    return deepLink || null;
  });

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

  // Gate di benvenuto al primo accesso.
  if (!benvenutoSeen) {
    return (
      <Benvenuto
        partnerName={partnerName}
        onStart={() => {
          try {
            localStorage.setItem(`ciak_benvenuto_seen_${partnerId}`, "1");
          } catch (e) {
            /* localStorage non disponibile: prosegui comunque */
          }
          setBenvenutoSeen(true);
        }}
      />
    );
  }

  const current = state.current_step;
  const allDone = state.completed_count === state.total_steps;
  const celebrazioneShown = typeof window !== "undefined" && sessionStorage.getItem(`celebrazione-vista-${partnerId}`);
  const justCompleted = allDone && !celebrazioneShown;

  // Step da mostrare: o quello in viewing (modifica step done), o quello current
  const stepToShow = viewingStepId
    ? state.steps.find((s) => s.step_id === viewingStepId)
    : current;

  // Vista-mappa di default: il partner vede tutte le fasi a card.
  // Apre un singolo step solo quando clicca una card (viewingStepId).
  const inMap = !justCompleted && !allDone && !viewingStepId;

  const macroOfStep = state.macro_phases?.find((mp) => mp.id === stepToShow?.macro_phase);
  // Il passo "Conosciamoci" usa la schermata Benvenuto a piena pagina (hero proprio).
  const isBenvenuto = stepToShow?.step_id === "02-discovery-video";
  // La finestra grande d'agente (foto + chat) apre la fase Valida (Andrea).
  // L'onboarding di Esamina è il Benvenuto; gli altri step Esamina usano la barra compatta.
  const showFullWelcome = !!(
    stepToShow &&
    stepToShow.macro_phase === "valida" &&
    (macroOfStep?.step_ids || [])[0] === stepToShow.step_id
  );

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
        {!allDone && (
          <GoLive21Banner
            startDate={
              (state.steps?.find((s) => s.step_id === "01-contratto") || {}).completed_at ||
              (state.steps?.find((s) => s.step_id === "01-contratto") || {}).started_at ||
              null
            }
          />
        )}

        {inMap ? (
          <div className="mt-4">
            <JourneyMap
              state={state}
              partnerName={partnerName}
              onOpenStep={(id) => {
                setViewingStepId(id);
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        ) : (
          <>
            {!allDone && (
              <button
                onClick={() => setViewingStepId(null)}
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition"
              >
                ← Torna al percorso
              </button>
            )}

            <ProgressBar
              macroPhases={state.macro_phases}
              steps={state.steps}
              currentStepId={stepToShow?.step_id}
            />

            {!allDone && stepToShow && !isBenvenuto && (
              <PhaseAgentHeader
                macroPhaseId={stepToShow.macro_phase}
                partnerName={partnerName}
                onAsk={() => setDrawerOpen(true)}
                variant={showFullWelcome ? "full" : "compact"}
                onStart={() => {
                  if (typeof document !== "undefined") {
                    document
                      .getElementById("operativo-step")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              />
            )}

            <div className="mt-4" id="operativo-step">
              {StepComponent ? (
                <Suspense fallback={<div className="text-slate-500 p-8 text-center">Carico step...</div>}>
                  <StepComponent
                    step={stepToShow}
                    partnerId={partnerId}
                    partnerName={partnerName}
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
          </>
        )}
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
