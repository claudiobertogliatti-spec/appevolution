/**
 * L'area del cliente Ciak Start, nella grafica dell'area partner: menu a sinistra,
 * "Oggi" col prossimo passo, il percorso, i materiali, l'assistenza.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("../api", () => ({
  clientGet: jest.fn(),
  clientPut: jest.fn(),
  getClientToken: jest.fn(() => "tok"),
  clearClientSession: jest.fn(),
}));
// Le pagine di lavoro hanno i loro test: qui basta sapere che stanno dentro l'area.
jest.mock("../pages/StartDomandePage", () => ({ StartDomandePage: () => <div>PAGINA-DOMANDE</div> }));
jest.mock("../pages/StartMarchioPage", () => ({ StartMarchioPage: () => <div>PAGINA-MARCHIO</div> }));
jest.mock("../pages/PartnershipEducationPage", () => ({ PartnershipEducationPage: () => <div>PAGINA-PARTNERSHIP</div> }));
jest.mock("../pages/SimulatorePage", () => ({ SimulatorePage: () => <div>PAGINA-SIMULATORE</div> }));

import StartArea from "./StartArea";
import { clientGet } from "../api";
import { START_DOMANDE } from "../startDomande";

const DASH = { client: { id: "c1", name: "Linda Pavia", email: "l@x.it" }, start: { consegne: ["08/10/2026", "15/10/2026", "22/10/2026"] } };
const TUTTE = Object.fromEntries(START_DOMANDE.map((d) => [d.id, `Risposta di prova per ${d.id}`]));

function dati({ risposte = { answers: {}, completato_at: null }, marchio = { valori: {}, completato_at: null }, items = [] } = {}) {
  clientGet.mockImplementation(async (path) => {
    if (path === "/start/risposte") return risposte;
    if (path === "/start/marchio") return marchio;
    if (path === "/start/deliverables") return { items };
    throw new Error("percorso inatteso " + path);
  });
}
const vai = (url = "/cliente") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/cliente/*" element={<StartArea dashboard={DASH} />} /></Routes>
    </MemoryRouter>
  );

beforeEach(() => jest.clearAllMocks());

test("il menu ha i quattro posti dell'area partner e il pulsante Chiedi aiuto", async () => {
  dati();
  vai();
  const menu = await screen.findByRole("navigation", { name: "Area cliente" });
  ["Oggi", "Il percorso", "I tuoi materiali", "Assistenza"].forEach((v) => expect(within(menu).getByText(v)).toBeTruthy());
  expect(screen.getByRole("link", { name: /Chiedi aiuto/ }).getAttribute("href")).toBe("/cliente/assistenza");
});

test("Oggi: all'inizio il prossimo passo sono le domande, con il saluto neutro e la barra a zero", async () => {
  dati();
  vai();
  expect(await screen.findByText("Ciao Linda.")).toBeTruthy();
  expect(await screen.findByText("Inizia le domande")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Inizia le domande/ }).getAttribute("href")).toBe("/cliente/start/domande");
  expect(screen.getByText("0 di 6 materiali pronti")).toBeTruthy();
  expect(screen.getByText("Tu rispondi. Noi prepariamo.")).toBeTruthy();
});

test("Oggi: con domande e marchio inviati e due materiali approvati, il passo e' usarli", async () => {
  dati({
    risposte: { answers: TUTTE, completato_at: "2026-10-02" },
    marchio: { valori: { colors: ["#112233", "#445566", "#778899"] }, completato_at: "2026-10-03" },
    items: [{ type: "positioning" }, { type: "brand_kit" }],
  });
  vai();
  expect(await screen.findByText("Hai 2 materiali pronti da usare")).toBeTruthy();
  expect(screen.getByText("2 di 6 materiali pronti")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Guarda i tuoi materiali/ }).getAttribute("href")).toBe("/cliente/materiali");
  expect(screen.getByText(/Tappa 2/)).toBeTruthy();
});

test("Oggi: se i dati non arrivano lo dice e permette di riprovare, senza inventare un passo", async () => {
  clientGet.mockRejectedValue(new Error("Errore 500"));
  vai();
  expect(await screen.findByText("Non riusciamo a caricare il tuo percorso.")).toBeTruthy();
  expect(screen.queryByText("Inizia le domande")).toBeNull();
  dati();
  fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
  expect(await screen.findByText("Inizia le domande")).toBeTruthy();
});

test("Il percorso: 8 voci, chi fa cosa, e solo i fatti sono 'Fatto'", async () => {
  dati({ risposte: { answers: TUTTE, completato_at: "2026-10-02" }, items: [] });
  vai("/cliente/percorso");
  expect(await screen.findByText("Il tuo percorso, un passo alla volta.")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("1 di 8 passaggi completati")).toBeTruthy());
  expect(screen.getByText("Quello che fai tu")).toBeTruthy();
  expect(screen.getByText("Quello che prepariamo noi")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Apri il passaggio/ }).getAttribute("href")).toBe("/cliente/start/marchio");
});

test("I tuoi materiali: senza materiali approvati spiega che arrivano uno alla volta", async () => {
  dati();
  vai("/cliente/materiali");
  expect(await screen.findByText("Non c'è ancora niente da vedere.")).toBeTruthy();
});

test("Assistenza: si scrive al team con un'email gia' avviata", async () => {
  dati();
  vai("/cliente/assistenza");
  const link = await screen.findByRole("link", { name: /Scrivi al team/ });
  expect(link.getAttribute("href")).toMatch(/^mailto:assistenza@evolution-pro\.it\?subject=/);
});

test("le pagine di lavoro (domande, marchio) stanno dentro l'area, agli indirizzi storici", async () => {
  dati();
  const a = vai("/cliente/start/domande");
  expect(await screen.findByText("PAGINA-DOMANDE")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Area cliente" })).toBeTruthy();
  a.unmount();
  vai("/cliente/start/marchio");
  expect(await screen.findByText("PAGINA-MARCHIO")).toBeTruthy();
});

test("il vecchio indirizzo /cliente/start porta a Oggi", async () => {
  dati();
  vai("/cliente/start");
  expect(await screen.findByText("Ciao Linda.")).toBeTruthy();
});
