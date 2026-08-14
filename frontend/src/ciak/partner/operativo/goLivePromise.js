export function goLivePromise({ startDate, now = new Date().toISOString(), stepStatus } = {}) {
  const paused = stepStatus === "blocked";
  let currentDay = null;
  let remaining = null;

  if (startDate) {
    const start = new Date(startDate);
    const today = new Date(now);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(today.getTime())) {
      currentDay = Math.max(Math.floor((today.getTime() - start.getTime()) / 86400000) + 1, 1);
      remaining = Math.max(21 - currentDay, 0);
    }
  }

  return {
    label: "Obiettivo go live: 21 giorni operativi",
    paused,
    currentDay,
    remaining,
    progress: currentDay ? Math.min((currentDay / 21) * 100, 100) : 0,
    message: paused
      ? "Obiettivo in pausa: risolviamo il blocco indicato nello step corrente, poi aggiorniamo la previsione."
      : "Obiettivo raggiungibile se materiali e approvazioni arrivano nei tempi concordati. La data si aggiorna con l'avanzamento reale.",
  };
}
