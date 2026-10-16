import { render, screen, within } from "@testing-library/react";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });
jest.mock("../repartoMetrics", () => ({ useRepartoMetrics: jest.fn() }));
// I blocchi "Oggi" hanno il loro test (OggiBlocks.test.jsx): qui basta sapere che ci sono.
jest.mock("../components/OggiCallStrip", () => ({ OggiCallStrip: () => <div data-testid="oggi-call-strip" /> }));
jest.mock("../components/OggiBlocks", () => ({ OggiBlocks: () => <div data-testid="oggi-blocks" /> }));

import { AdminHome } from "./AdminHome";
import { useRepartoMetrics } from "../repartoMetrics";

const LOADED = {
  acquisizione: { "Nuovi lead 7 giorni": "18" },
  vendite: { "Proposte inviate": "5" },
  delivery: { "Partner attivi": "12", "Output da approvare": "3", "Fermi oltre soglia": "1" },
  "back-office": { "Incassi mese": "€6.480 su €10.000", "In ritardo": "2 · €480" },
};

test("saluta per nome e non ripete i reparti della sidebar", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio Bertogliatti" }} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ciao Claudio");
  expect(screen.queryByText("Numeri per reparto")).toBeNull();
  // le card dei reparti avevano queste frasi: non ci sono piu'
  expect(screen.queryByText(/Decisioni, cassa e andamento dei reparti/)).toBeNull();
  expect(screen.queryByText(/Trova e scalda nuovi contatti/)).toBeNull();
  expect(screen.queryByText("Cassa del mese")).toBeNull();
});

test("restano gli accessi alle collaboratrici", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
  expect(hrefs).toContain("/admin/persona/mariangela");
  expect(hrefs).toContain("/admin/persona/antonella");
});

test("la striscia attenzione elenca solo le voci reali > 0", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  const region = screen.getByLabelText("Richiede la tua attenzione");
  expect(within(region).getByText("Output da approvare")).toBeTruthy();
  expect(within(region).getByText("Rate in ritardo")).toBeTruthy();
});

test("i partner fermi li conta solo il blocco Oggi: la striscia non li ripete", () => {
  // "Fermi oltre soglia" = 1 nelle metriche di reparto (che includono gli account di
  // prova): se comparisse anche qui, la pagina mostrerebbe due numeri diversi.
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  const region = screen.getByLabelText("Richiede la tua attenzione");
  expect(within(region).queryByText("Partner fermi")).toBeNull();
});

test("in caricamento non inventa numeri né urgenze", () => {
  useRepartoMetrics.mockImplementation(() => ({})); // hook non ancora popolato
  render(<AdminHome user={{ name: "Claudio" }} />);
  expect(screen.getByText(/Controllo cosa richiede attenzione/)).toBeTruthy();
  expect(screen.queryByText("Output da approvare")).toBeNull();
});

test("zero urgenze = messaggio calmo, non una lista vuota ambigua", () => {
  useRepartoMetrics.mockImplementation((id) => ({
    delivery: { "Partner attivi": "12", "Output da approvare": "0", "Fermi oltre soglia": "0" },
    "back-office": { "Incassi mese": "€0 su €10.000", "In ritardo": "Nessuna" },
  }[id] || { "x": "y" }));
  render(<AdminHome user={{ name: "Claudio" }} />);
  expect(screen.getByText("Nessuna urgenza in evidenza.")).toBeTruthy();
});

test("un errore delle fonti non viene presentato come zero o dato valido", () => {
  useRepartoMetrics.mockImplementation((id) => id === "delivery"
    ? { __status: "error", "Partner attivi": "—" }
    : id === "back-office" ? { __status: "ready", "In ritardo": "Nessuna" } : { __status: "ready" });
  render(<AdminHome user={{ name: "Claudio" }} />);
  expect(screen.getByText("Dati sulle urgenze non disponibili.")).toBeTruthy();
  expect(screen.queryByText("Nessuna urgenza in evidenza.")).toBeNull();
});

test("le call di oggi stanno in cima, prima della striscia attenzione e dei riquadri", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  const strip = screen.getByTestId("oggi-call-strip");
  const attenzione = screen.getByLabelText("Richiede la tua attenzione");
  const blocchi = screen.getByTestId("oggi-blocks");
  expect(strip.compareDocumentPosition(attenzione) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(strip.compareDocumentPosition(blocchi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
