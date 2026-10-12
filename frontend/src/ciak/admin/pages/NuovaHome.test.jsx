/**
 * Nuova home «Oggi»: frase con numeri veri, stati onesti, nessun pulsante finto.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NuovaHome } from "./NuovaHome";
import { useOggiShared } from "../components/OggiShared";
import { apiGet } from "../api";

jest.mock("../components/OggiShared", () => ({ useOggiShared: jest.fn() }));
jest.mock("../components/OggiStart", () => ({ OggiStart: () => <div>CLIENTI-START</div> }));
jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
jest.mock("../components/PassoPannello", () => ({ PassoPannello: ({ email }) => <div>PASSO-{email}</div>, dataIt: (d) => d.split("-").reverse().join("/") }));
jest.mock("../components/SollecitoPannello", () => ({ SollecitoPannello: ({ email }) => <div>PANNELLO-{email}</div> }));
jest.mock("../components/ChiediALuca", () => ({ ChiediALuca: () => <div>CHIEDI-A-LUCA</div> }));

// CRA azzera le implementazioni dei mock a ogni test: si rimette qui.
beforeEach(() => apiGet.mockResolvedValue({ items: [] }));

const vivo = ({ oggi = {}, calls = {} } = {}) => ({
  oggi: {
    src: { pipeline: {}, audit: {} },
    model: {
      trattative: [
        { email: "a@x.it", nome: "Chiara Ferri", giorni: 14, tone: "critical" },
        { email: "b@x.it", nome: "Sandro Moretti", giorni: 8, tone: "warning" },
        { email: "c@x.it", nome: "Recente", giorni: 2, tone: "neutral" },
      ],
      partner: { tocca: [{ id: "p1", nome: "Dario Fontana", fermo: true, giorni: 30, azione: "Pubblicare il funnel" }] },
    },
    reload: jest.fn(),
    ...oggi,
  },
  calls: {
    dati: { calls: [
      { email: "e@x.it", nome: "Elena Rizzo", starts_at: "2026-10-12T08:30:00Z", session_token: "t1" },
      { email: "n@x.it", nome: "Nico Bruni", starts_at: "2026-10-12T13:00:00Z", session_token: "t2" },
    ] },
    carica: jest.fn(),
    ...calls,
  },
});

const mostra = () => render(<MemoryRouter><NuovaHome user={{ name: "Claudio Bertogliatti" }} /></MemoryRouter>);

test("saluto e frase con i numeri veri; chi è sotto soglia non entra", () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("Buongiorno, Claudio.")).toBeTruthy();
  expect(screen.getByText("Hai 2 call oggi, 2 trattative da sollecitare e 1 partner che aspetta te.")).toBeTruthy();
  expect(screen.getByText("Chiara Ferri")).toBeTruthy();
  expect(screen.queryByText("Recente")).toBeNull();
});

test("le call hanno l'orario di Roma e il link al report", () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("10:30")).toBeTruthy();
  expect(screen.getByText("15:00")).toBeTruthy();
  const link = screen.getAllByRole("link", { name: "Apri il report" })[0];
  expect(link.getAttribute("href")).toBe("/admin/leads/e%40x.it");
});

test("non scrive «senza risposta»: il dato è da quanto è in trattativa", () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("In trattativa da 14 giorni")).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/senza risposta/i);
});

test("ogni trattativa da sollecitare ha «Prepara il sollecito»; il pannello si apre solo al clic", () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  const tasti = screen.getAllByRole("button", { name: "Prepara il sollecito" });
  expect(tasti).toHaveLength(2);
  expect(screen.queryByText(/PANNELLO-/)).toBeNull();
  fireEvent.click(tasti[0]);
  expect(screen.getByText("PANNELLO-a@x.it")).toBeTruthy();
});

test("c'è la barra «Chiedi a Luca»", () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("CHIEDI-A-LUCA")).toBeTruthy();
});

test("trattative non leggibili: lo dice, non mostra zero", () => {
  useOggiShared.mockReturnValue(vivo({ oggi: { src: { pipeline: null, audit: {} }, model: { trattative: null, partner: { tocca: [] } } } }));
  mostra();
  expect(screen.getByText(/Non riesco a leggere le trattative/)).toBeTruthy();
  expect(screen.getAllByText(/Dato non disponibile/).length).toBeGreaterThan(0);
});

test("call non leggibili: lo dice, non dice «nessuna call»", () => {
  useOggiShared.mockReturnValue(vivo({ calls: { dati: null } }));
  mostra();
  expect(screen.getByText(/Non riesco a leggere le call/)).toBeTruthy();
  expect(screen.queryByText("Nessuna call oggi.")).toBeNull();
});

test("in caricamento non mostra numeri", () => {
  useOggiShared.mockReturnValue({
    oggi: { src: { pipeline: undefined, audit: undefined }, model: { trattative: null, partner: null }, reload: jest.fn() },
    calls: { dati: undefined, carica: jest.fn() },
  });
  mostra();
  expect(screen.getByText("Controllo cosa c'è da fare…")).toBeTruthy();
});

test("fuori dal provider non si rompe", () => {
  useOggiShared.mockReturnValue(null);
  mostra();
  expect(screen.getByText(/solo dal tuo account/)).toBeTruthy();
});

test("senza prossimo passo lo dice e permette di impostarlo", async () => {
  useOggiShared.mockReturnValue(vivo());
  mostra();
  const imposta = await screen.findAllByRole("button", { name: "Imposta" });
  expect(imposta).toHaveLength(2);
  fireEvent.click(imposta[0]);
  expect(screen.getByText("PASSO-a@x.it")).toBeTruthy();
});

test("con un passo scaduto lo mostra in evidenza; se i passi non si leggono non dice «manca»", async () => {
  apiGet.mockImplementation((path) =>
    path === "/prossimi-passi"
      ? Promise.resolve({ items: [{ email: "a@x.it", testo: "Richiamo per il contratto", scadenza: "2026-10-10", stato_scadenza: "scaduto" }] })
      : Promise.resolve({ items: [] }));
  useOggiShared.mockReturnValue(vivo());
  const { unmount } = mostra();
  expect(await screen.findByText(/Richiamo per il contratto · scaduto il 10\/10\/2026/)).toBeTruthy();
  unmount();

  apiGet.mockImplementation((path) => (path === "/prossimi-passi" ? Promise.reject(new Error("x")) : Promise.resolve({ items: [] })));
  mostra();
  await screen.findByText("Chiara Ferri");
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByText(/Manca il prossimo passo/)).toBeNull();
});
