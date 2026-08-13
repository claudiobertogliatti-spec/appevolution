const test = require("node:test");
const assert = require("node:assert/strict");

const {
  blueprintThankYouState,
} = require("./blueprintThankYouState.cjs");
const {
  progressMilestones,
  shouldEmitMasterclassEvent,
} = require("./masterclassTracking.cjs");
const {
  goLivePromise,
} = require("../partner/operativo/goLivePromise.cjs");

test("Blueprint non conferma senza session_id", () => {
  assert.equal(blueprintThankYouState({ sessionId: "" }).kind, "missing");
});

test("Blueprint conferma solo payment_status paid", () => {
  assert.equal(
    blueprintThankYouState({ sessionId: "cs_1", paymentStatus: "unpaid" }).kind,
    "unpaid"
  );
  assert.equal(
    blueprintThankYouState({ sessionId: "cs_1", paymentStatus: "paid" }).kind,
    "paid"
  );
});

test("Blueprint distingue verifica ed errore", () => {
  assert.equal(blueprintThankYouState({ sessionId: "cs_1" }).kind, "verifying");
  assert.equal(
    blueprintThankYouState({ sessionId: "cs_1", error: true }).kind,
    "error"
  );
});

test("Masterclass produce le soglie attraversate senza duplicati", () => {
  assert.deepEqual(progressMilestones(10, 52, new Set()), [25, 50]);
  assert.deepEqual(progressMilestones(52, 80, new Set([25, 50])), [75]);
  assert.deepEqual(progressMilestones(80, 100, new Set([25, 50, 75])), [100]);
});

test("Masterclass accetta solo eventi canonici non ancora emessi", () => {
  const emitted = new Set(["video_started"]);
  assert.equal(shouldEmitMasterclassEvent("video_started", emitted), false);
  assert.equal(shouldEmitMasterclassEvent("cta_clicked", emitted), true);
  assert.equal(shouldEmitMasterclassEvent("evento_inventato", emitted), false);
});

test("Go live e un obiettivo condizionato e si pausa su step bloccato", () => {
  const model = goLivePromise({
    startDate: "2026-08-01T00:00:00Z",
    now: "2026-08-10T00:00:00Z",
    stepStatus: "blocked",
  });
  assert.equal(model.label, "Obiettivo go live: 21 giorni operativi");
  assert.equal(model.paused, true);
  assert.match(model.message, /in pausa/i);
});

test("Go live non promette incassi e dichiara le condizioni", () => {
  const model = goLivePromise({
    startDate: "2026-08-01T00:00:00Z",
    now: "2026-08-10T00:00:00Z",
    stepStatus: "in_progress",
  });
  assert.doesNotMatch(model.message, /incass/i);
  assert.match(model.message, /materiali e approvazioni/i);
  assert.equal(model.paused, false);
});
