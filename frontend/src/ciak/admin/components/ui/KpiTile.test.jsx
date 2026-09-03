/**
 * KpiTile — la tessera KPI condivisa: l'accento (giallo) e i toni di stato
 * cadono sulla cifra, mai sul solo colore senza etichetta.
 */
import { render, screen } from "@testing-library/react";
import { KpiTile } from "./KpiTile";

test("mostra etichetta, valore e hint", () => {
  render(<KpiTile label="Incassi mese" value="€ 8.424" hint="Rate a registro" />);
  expect(screen.getByText("Incassi mese")).toBeTruthy();
  expect(screen.getByText("€ 8.424")).toBeTruthy();
  expect(screen.getByText("Rate a registro")).toBeTruthy();
});

// .closest("p") risale al <p> stilizzato: il plugin visual-edits avvolge il
// valore in uno <span> senza classi, quindi il className va letto sul <p>.
test("senza accento la cifra e' navy (slate-900)", () => {
  render(<KpiTile label="Totale" value="10" />);
  expect(screen.getByText("10").closest("p").className).toMatch(/text-slate-900/);
});

test("con accent la cifra e' gialla (la cifra-obiettivo)", () => {
  render(<KpiTile label="Obiettivo" value="€ 10.000" accent />);
  expect(screen.getByText("€ 10.000").closest("p").className).toMatch(/text-yellow-600/);
});

test("tone warn colora la cifra di ambra, non solo un pallino", () => {
  render(<KpiTile label="Scade oggi" value="€ 358" tone="warn" />);
  expect(screen.getByText("€ 358").closest("p").className).toMatch(/amber/);
});
