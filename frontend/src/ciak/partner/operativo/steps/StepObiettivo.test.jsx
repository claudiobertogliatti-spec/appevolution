import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StepObiettivo from "./StepObiettivo";

// jsdom non implementa il canvas 2D: stub per evitare errori nel useEffect.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
});

test("mostra il ritmo per l'obiettivo di default (5.000€ → 52/sett)", () => {
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" />);
  expect(screen.getByTestId("perWeek").textContent).toBe("52");
});

test("cambiando obiettivo a 10.000€ il ritmo diventa 104", () => {
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" />);
  fireEvent.click(screen.getByRole("button", { name: /10\.000/ }));
  expect(screen.getByTestId("perWeek").textContent).toBe("104");
});

test("il CTA salva obiettivo e ritmo via onComplete", () => {
  const onComplete = jest.fn();
  render(<StepObiettivo step={{ macro_phase: "esamina", data: {} }} partnerName="Mario" onComplete={onComplete} />);
  fireEvent.click(screen.getByRole("button", { name: /Fissa l'obiettivo/ }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  const arg = onComplete.mock.calls[0][0];
  expect(arg.goal).toBe(5000);
  expect(arg.perWeek).toBe(52);
  expect(arg.params).toEqual({ price: 297, conv: 15, show: 50 });
});
