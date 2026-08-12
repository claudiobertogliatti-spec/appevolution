import { activeAgentForStep, groupJourneySteps } from "./journeyPresentation";

describe("journeyPresentation", () => {
  it("raggruppa venti step nelle sole tre macro-fasi canoniche", () => {
    const steps = Array.from({ length: 20 }, (_, index) => ({
      step_id: `step-${index + 1}`,
      code: `F-${index + 1}`,
    }));
    const phases = [
      { id: "esamina", step_ids: steps.slice(0, 7).map((step) => step.step_id) },
      { id: "valida", step_ids: steps.slice(7, 19).map((step) => step.step_id) },
      { id: "ottimizza", step_ids: [steps[19].step_id] },
    ];
    const grouped = groupJourneySteps(steps, phases);
    expect(grouped.map((phase) => phase.id)).toEqual(["esamina", "valida", "ottimizza"]);
    expect(grouped.flatMap((phase) => phase.steps).map((step) => step.code)).toEqual(
      Array.from({ length: 20 }, (_, index) => `F-${index + 1}`)
    );
  });

  it("usa l'owner dello step per cambiare agente dentro Valida", () => {
    expect(activeAgentForStep({ owner: "ANDREA" }).name).toBe("Andrea");
    expect(activeAgentForStep({ owner: "GAIA" }).name).toBe("Gaia");
    expect(activeAgentForStep({ owner: "MARCO" }).name).toBe("Marco");
  });
});
