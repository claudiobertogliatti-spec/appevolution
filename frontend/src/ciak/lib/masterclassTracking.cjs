const ALLOWED_EVENTS = new Set([
  "video_started",
  "video_25",
  "video_50",
  "video_75",
  "video_completed",
  "cta_shown",
  "cta_clicked",
]);

function progressMilestones(previousPercent, currentPercent, emitted = new Set()) {
  return [25, 50, 75, 100].filter(
    (threshold) =>
      previousPercent < threshold &&
      currentPercent >= threshold &&
      !emitted.has(threshold)
  );
}

function shouldEmitMasterclassEvent(eventName, emitted = new Set()) {
  return ALLOWED_EVENTS.has(eventName) && !emitted.has(eventName);
}

module.exports = { ALLOWED_EVENTS, progressMilestones, shouldEmitMasterclassEvent };
