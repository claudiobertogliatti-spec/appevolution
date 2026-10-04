import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn() }));

import { OggiBlocks } from "./OggiBlocks";
import { apiGet } from "../api";

// Dati sporchi come in produzione: account di prova, partner finto, un cliente Start
// (Paola) rimasto "call fatta", email in maiuscolo.
const ieri = (n) => new Date(Date.now() - n * 86400000).toISOString();
const PIPELINE = {
  columns: [
    { id: "call_prenotata", items: [{ email: "elena@x.it", nome: "elena rizzo", stage_since: ieri(11) }] },
    { id: "call_fatta", items: [
      { email: "chiara@x.it", nome: "Chiara Ferri", stage_since: ieri(19) },
      { email: "PAOLA@X.IT", nome: "Paola Neri", stage_since: ieri(19) },
      { email: "nico@x.it", nome: "Nico", stage_since: ieri(1) },
    ] },
    { id: "in_trattativa", items: [
      { email: "qa+ciaktest@example.com", nome: "Test Ciak", stage_since: ieri(0) },
      { email: "sandro@x.it", nome: "Sandro", stage_since: ieri(0) },
    ] },
  ],
};
const AUDIT = {
  items: [
    { id: "p1", name: "Dario Fontana", email: "dario@x.it", owner: "Team", stale: true, step_updated_at: ieri(30), macro_label: "Valida", next_action: "Pubblicare il funnel" },
    { id: "p2", name: "Irene Costa", email: "irene@x.it", owner: "Partner", stale: true, step_updated_at: ieri(12), macro_label: "Valida", next_action: "Registrare il video" },
    { id: "p3", name: "Mario Rossi", email: "mario@x.it", owner: "Partner", stale: true, macro_label: "Esamina" },
    { id: "p4", name: "Paola Neri", email: "paola@x.it", owner: "Team", step_updated_at: ieri(1), macro_label: "Esamina" },
  ],
};

const rispondi = ({ pipeline = PIPELINE, audit = AUDIT } = {}) =>
  apiGet.mockImplementation((path) => {
    const v = path === "/pipeline-blueprint" ? pipeline : audit;
    return v instanceof Error ? Promise.reject(v) : Promise.resolve(v);
  });

beforeEach(() => apiGet.mockReset());

// I titoli compaiono subito: i dati arrivano dopo. Si aspetta che finisca il caricamento.
const caricato = () => waitFor(() => expect(screen.queryAllByText("Caricamento…")).toHaveLength(0));

test("mostra le quattro domande del mattino con numeri veri, senza prova e senza doppioni", async () => {
  rispondi();
  render(<OggiBlocks />);
  await caricato();
  const riepilogo = screen.getByLabelText("Riepilogo di oggi");
  // call: 1 prenotata + 2 fatte (Paola e' gia' partner → fuori) = 3
  expect(within(riepilogo).getByText("Call da gestire").nextSibling.textContent).toBe("3");
  // trattative: Test Ciak escluso → solo Sandro
  expect(within(riepilogo).getByText("Trattative in corso").nextSibling.textContent).toBe("1");
  // partner: Mario Rossi (finto) escluso → 3
  expect(within(riepilogo).getByText("Partner in EVO").nextSibling.textContent).toBe("3");
  // tocca a te: Dario e Paola
  expect(within(riepilogo).getByText("Tocca a te").nextSibling.textContent).toBe("2");
});

test("le call fatte mettono in cima chi aspetta da piu' giorni", async () => {
  rispondi();
  render(<OggiBlocks />);
  await caricato();
  const blocco = screen.getByRole("heading", { name: "Call" }).closest("section");
  expect(within(blocco).getByText("Ferma da 19 giorni")).toBeTruthy();
  const nomi = within(blocco).getAllByRole("link").map((a) => a.textContent);
  expect(nomi.indexOf("Chiara Ferri")).toBeLessThan(nomi.indexOf("Nico"));
  expect(nomi).not.toContain("Paola Neri");
});

test("una call senza data lo dice, non finge un orario", async () => {
  rispondi();
  render(<OggiBlocks />);
  expect(await screen.findByText(/Senza data · da 11 giorni/)).toBeTruthy();
  // detto una volta sola: niente seconda riga "Data non registrata" a ripeterlo
  expect(screen.queryByText("Data non registrata")).toBeNull();
});

test("i nomi sporchi del database si leggono bene", async () => {
  rispondi();
  render(<OggiBlocks />);
  expect(await screen.findByText("Elena Rizzo")).toBeTruthy();
  expect(screen.queryByText("elena rizzo")).toBeNull();
});

test("una call con data passata dice cosa fare, non solo la data", async () => {
  rispondi({ pipeline: { columns: [{ id: "call_prenotata", items: [
    { email: "p@x.it", nome: "Passata", call_starts_at: "2020-01-01T09:00:00Z", stage_since: ieri(5) },
  ] }] } });
  render(<OggiBlocks />);
  expect(await screen.findByText("Data passata")).toBeTruthy();
  expect(screen.getByText(/aggiorna lo stato/)).toBeTruthy();
});

test("ogni riga apre il contatto giusto, con l'email codificata", async () => {
  rispondi();
  render(<OggiBlocks />);
  const link = await screen.findByRole("link", { name: "Chiara Ferri" });
  expect(link.getAttribute("href")).toBe("/admin/leads/chiara%40x.it");
});

test("dichiara cosa non ha contato", async () => {
  rispondi();
  render(<OggiBlocks />);
  expect(await screen.findByText(/2 account di prova \(Mario Rossi, Test Ciak\)/)).toBeTruthy();
  expect(screen.getByText(/1 contatto è già partner/)).toBeTruthy();
});

test("delivery: prima chi aspetta te, poi il partner, con il motivo del fermo", async () => {
  rispondi();
  render(<OggiBlocks />);
  await caricato();
  const blocco = screen.getByRole("heading", { name: "Urgenze di delivery" }).closest("section");
  expect(within(blocco).getByText("Fermo da 30 giorni")).toBeTruthy();
  expect(within(blocco).getByText("In moto")).toBeTruthy();
  const titoli = within(blocco).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(titoli[0]).toMatch(/^Tocca a te/);
  expect(titoli[1]).toMatch(/^Aspettiamo il partner/);
  expect(within(blocco).getByText(/Pubblicare il funnel/)).toBeTruthy();
});

test("se una fonte non risponde, i suoi blocchi lo dicono e gli altri restano", async () => {
  rispondi({ audit: new Error("boom") });
  render(<OggiBlocks />);
  const delivery = (await screen.findByRole("heading", { name: "Urgenze di delivery" })).closest("section");
  await waitFor(() => expect(within(delivery).getByText(/Dato non disponibile/)).toBeTruthy());
  // le call (altra fonte) sono comunque visibili
  expect(screen.getByText("Chiara Ferri")).toBeTruthy();
  // e il riepilogo non finge uno zero per i partner
  const riepilogo = screen.getByLabelText("Riepilogo di oggi");
  expect(within(riepilogo).getByText("Partner in EVO").nextSibling.textContent).toBe("…");
});

test("'Riprova' ricarica entrambe le fonti", async () => {
  rispondi({ audit: new Error("boom") });
  render(<OggiBlocks />);
  const delivery = (await screen.findByRole("heading", { name: "Urgenze di delivery" })).closest("section");
  await waitFor(() => within(delivery).getByText(/Dato non disponibile/));
  const chiamate = apiGet.mock.calls.length;
  rispondi();
  fireEvent.click(within(delivery).getByRole("button", { name: "Riprova" }));
  await waitFor(() => expect(within(delivery).getByText("Dario Fontana")).toBeTruthy());
  expect(apiGet.mock.calls.length).toBeGreaterThan(chiamate);
});

test("token scaduto: avvisa l'app invece di mostrare errori muti", async () => {
  const onAuthExpired = jest.fn();
  rispondi({ pipeline: new Error("AUTH_EXPIRED"), audit: new Error("AUTH_EXPIRED") });
  render(<OggiBlocks onAuthExpired={onAuthExpired} />);
  await waitFor(() => expect(onAuthExpired).toHaveBeenCalled());
});

test("se i giorni non si conoscono l'etichetta e' solo la parola, mai 'Fermo —'", async () => {
  rispondi({ audit: { items: [
    { id: "p1", name: "Senza Data", email: "s@x.it", owner: "Partner", stale: true, macro_label: "Valida" },
  ] } });
  render(<OggiBlocks />);
  await caricato();
  expect(screen.getByText("Fermo")).toBeTruthy();
  expect(screen.queryByText(/Fermo —/)).toBeNull();
});

test("in caricamento non inventa numeri", () => {
  apiGet.mockImplementation(() => new Promise(() => {})); // non risponde mai
  render(<OggiBlocks />);
  const riepilogo = screen.getByLabelText("Riepilogo di oggi");
  expect(within(riepilogo).getByText("Call da gestire").nextSibling.textContent).toBe("…");
  expect(screen.getAllByText("Caricamento…").length).toBeGreaterThan(0);
});
