const PHASES = [
  {
    id: "esamina",
    label: "Esamina",
    title: "Fondamenta del progetto",
    bonusTitle: "Mappa del tuo Posizionamento",
    stepIds: ["02-discovery-video", "01-contratto", "burocrazia", "03-brand-kit", "la-tua-storia", "04-posizionamento"],
  },
  {
    id: "valida",
    label: "Valida",
    title: "Sistema pronto al lancio",
    bonusTitle: "Checklist Lancio del tuo Modello Digitale",
    stepIds: [
      "05-script-masterclass",
      "06-outline-lezioni",
      "07-registra-masterclass",
      "08-registra-lezioni",
      "09-funnel-asset",
      "10-funnel-team-work",
      "11-calendario-30gg",
      "12-prezzo-webinar",
      "13-lancio",
    ],
  },
  {
    id: "golive",
    label: "Go Live",
    title: "Il modello digitale e online",
    bonusTitle: "Piano 90 Giorni per Crescere",
    stepIds: ["13-lancio"],
  },
];

function isDone(step) {
  return step?.status === "done" || step?.completed_at;
}

export function buildRewardPhases(state, partnerId, apiPhases = null) {
  const steps = state?.steps || [];
  const byId = Object.fromEntries(steps.map((step) => [step.step_id, step]));
  const apiById = Object.fromEntries((apiPhases || []).map((phase) => [phase.id, phase]));

  return PHASES.map((phase) => {
    const api = apiById[phase.id];
    let unlocked = false;
    if (api) {
      unlocked = !!api.unlocked;
    } else if (phase.id === "golive") {
      const launch = byId["13-lancio"];
      unlocked = !!(isDone(launch) && (launch?.data?.launched_at || launch?.completed_at));
    } else {
      unlocked = phase.stepIds.every((id) => isDone(byId[id]));
    }

    return {
      ...phase,
      unlocked,
      days: api?.days || null,
      certificateUrl: api?.certificate_url || (unlocked ? `/api/partner-rewards/${partnerId}/certificate/${phase.id}` : null),
      bonusUrl: api?.bonus_url || (unlocked ? `/api/partner-rewards/${partnerId}/bonus/${phase.id}` : null),
      bonusTitle: api?.bonus_title || phase.bonusTitle,
    };
  });
}

export function nextLockedReward(phases) {
  return phases.find((phase) => !phase.unlocked) || phases[phases.length - 1];
}

