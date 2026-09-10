/**
 * Ciak Admin — Trattative (audit #7): un'unica pagina a tab sullo stesso
 * endpoint /pipeline-blueprint. Segue il pattern del repo: react-router-dom
 * mockato (niente MemoryRouter → niente errore TextEncoder in jsdom).
 */
import { fireEvent, render, screen } from "@testing-library/react";

let mockParams = new URLSearchParams();
const mockSetParams = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [mockParams, mockSetParams],
}), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn(), adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { TrattativePipeline, STADI_TRATTATIVE } from "./TrattativePipeline";
import { apiGet } from "../api";

// /pipeline-blueprint: due contatti in due stadi diversi.
const DATA = {
  columns: [
    { id: "acquistato", label: "Blueprint", count: 1, items: [{ nome: "Bianchi Blue", email: "blue@x.it" }] },
    { id: "call_fatta", label: "Call fatta", count: 1, items: [{ nome: "Rossi Call", email: "call@x.it" }] },
  ],
  total: 2,
};

beforeEach(() => {
  mockParams = new URLSearchParams();
  mockSetParams.mockReset();
  apiGet.mockReset();
  apiGet.mockResolvedValue(DATA);
});

test("un solo titolo 'Trattative', cinque tab, di default (Tutte) tutti gli stadi", async () => {
  render(<TrattativePipeline />);
  const h1 = await screen.findAllByRole("heading", { level: 1 });
  expect(h1).toHaveLength(1); // niente doppio h1
  expect(h1[0].textContent).toBe("Trattative");
  ["Tutte", "Blueprint", "Call", "In trattativa", "OK"].forEach((l) =>
    expect(screen.getByRole("tab", { name: l })).toBeTruthy()
  );
  expect(await screen.findByText("Bianchi Blue")).toBeTruthy();
  expect(screen.getByText("Rossi Call")).toBeTruthy();
});

test("cliccare un tab persiste lo stadio in URL (?stadio=)", () => {
  render(<TrattativePipeline />);
  fireEvent.click(screen.getByRole("tab", { name: "Blueprint" }));
  expect(mockSetParams).toHaveBeenCalledWith({ stadio: "blueprint" }, { replace: true });
  fireEvent.click(screen.getByRole("tab", { name: "Tutte" }));
  expect(mockSetParams).toHaveBeenCalledWith({}, { replace: true });
});

test("con ?stadio=blueprint la vista isola lo stadio acquistato (lockedStages)", async () => {
  mockParams = new URLSearchParams("stadio=blueprint");
  render(<TrattativePipeline />);
  expect(await screen.findByText("Bianchi Blue")).toBeTruthy();
  expect(screen.queryByText("Rossi Call")).toBeNull();
});

test("il mapping tab→stadi copre Blueprint/Call/In trattativa/OK senza inventare stadi", () => {
  const byId = Object.fromEntries(STADI_TRATTATIVE.map((s) => [s.id, s.lockedStages]));
  expect(byId.tutte).toBeUndefined(); // Tutte = nessun filtro
  expect(byId.blueprint).toEqual(["acquistato"]);
  expect(byId.call).toEqual(["call_prenotata", "call_fatta"]);
  expect(byId.trattativa).toEqual(["in_trattativa"]);
  expect(byId.ok).toEqual(["contratto_pagato"]);
});
