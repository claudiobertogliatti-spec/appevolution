import { render, screen, within } from "@testing-library/react";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });
jest.mock("../repartoMetrics", () => ({ useRepartoMetrics: jest.fn() }));
// I blocchi "Oggi" hanno il loro test (OggiBlocks.test.jsx): qui basta sapere che ci sono.
jest.mock("../components/OggiBlocks", () => ({ OggiBlocks: () => <div data-testid="oggi-blocks" /> }));

import { AdminHome } from "./AdminHome";
import { useRepartoMetrics } from "../repartoMetrics";

const LOADED = {
  acquisizione: { "Nuovi lead 7 giorni": "18" },
  vendite: { "Proposte inviate": "5" },
  delivery: { "Partner attivi": "12", "Output da approvare": "3", "Fermi oltre soglia": "1" },
  "back-office": { "Incassi mese": "€6.480 su €10.000", "In ritardo": "2 · €480" },
};

test("mostra i 5 reparti verso le loro home", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio Bertogliatti" }} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ciao Claudio");
  const wanted = ["/admin/direzione", "/admin/reparto/acquisizione", "/admin/reparto/vendite", "/admin/reparto/delivery", "/admin/reparto/back-office"];
  const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
  wanted.forEach((h) => expect(hrefs).toContain(h));
});

test("mostra i numeri reali dalle fonti esistenti", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  expect(screen.getByText("€6.480 su €10.000")).toBeTruthy(); // cassa (Direzione)
  expect(screen.getByText("18")).toBeTruthy();                // nuovi lead
  expect(screen.getByText("12")).toBeTruthy();                // partner attivi
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

test("la home apre con i blocchi Oggi, prima dei numeri per reparto", () => {
  useRepartoMetrics.mockImplementation((id) => LOADED[id] || {});
  render(<AdminHome user={{ name: "Claudio" }} />);
  const oggi = screen.getByTestId("oggi-blocks");
  const reparti = screen.getByText("Numeri per reparto");
  // 4 = DOCUMENT_POSITION_FOLLOWING: "Numeri per reparto" viene dopo Oggi
  expect(oggi.compareDocumentPosition(reparti) & 4).toBeTruthy();
});

test("in caricamento non inventa numeri né urgenze", () => {
  useRepartoMetrics.mockImplementation(() => ({})); // hook non ancora popolato
  render(<AdminHome user={{ name: "Claudio" }} />);
  expect(screen.getByText(/Controllo cosa richiede attenzione/)).toBeTruthy();
  expect(screen.queryByText("Output da approvare")).toBeNull();
  expect(screen.getAllByText("…").length).toBeGreaterThan(0); // segnaposto, non zeri finti
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
  expect(screen.getByText("Dato non disponibile")).toBeTruthy();
  expect(screen.queryByText("Nessuna urgenza in evidenza.")).toBeNull();
});
