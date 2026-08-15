import { AGENTS } from "./agents";

const PHASE_ORDER = ["esamina", "valida", "ottimizza"];

const STEPS_WITHOUT_MATERIAL_OUTPUT = new Set([
  "02-discovery-video",
  "burocrazia",
  "la-tua-storia",
  "obiettivo",
]);

export function hasMaterialOutput(step) {
  return Boolean(step?.step_id) && !STEPS_WITHOUT_MATERIAL_OUTPUT.has(step.step_id);
}

export function groupJourneySteps(steps = [], macroPhases = []) {
  const stepById = new Map(steps.map((step) => [step.step_id, step]));
  const phaseById = new Map(macroPhases.map((phase) => [phase.id, phase]));

  return PHASE_ORDER.map((phaseId, index) => {
    const phase = phaseById.get(phaseId) || { id: phaseId, label: phaseId, step_ids: [] };
    return {
      ...phase,
      number: index + 1,
      steps: (phase.step_ids || []).map((stepId) => stepById.get(stepId)).filter(Boolean),
    };
  });
}

export function activeAgentForStep(step) {
  return AGENTS[step?.owner] || AGENTS.STEFANIA;
}
