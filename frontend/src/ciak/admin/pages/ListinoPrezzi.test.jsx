/**
 * Ciak Admin — Listino & prezzi: mostra i prezzi ufficiali dalla SSOT
 * (pricing.js) e segnala i valori stale. Sola lettura.
 */
import { render, screen } from "@testing-library/react";
jest.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }), { virtual: true });

import { ListinoPrezzi } from "./ListinoPrezzi";

test("mostra i prezzi ufficiali del percorso dalla SSOT", () => {
  render(<ListinoPrezzi />);
  expect(screen.getByText("390 €")).toBeTruthy();
  expect(screen.getByText("2.990 €")).toBeTruthy();
  expect(screen.getByText("2.600 €")).toBeTruthy();
  expect(screen.getByText("GRATIS")).toBeTruthy();
});

test("segnala i prezzi stale come non validi", () => {
  render(<ListinoPrezzi />);
  expect(screen.getByText("499 €")).toBeTruthy();
  expect(screen.getByText("2.790 €")).toBeTruthy();
});
