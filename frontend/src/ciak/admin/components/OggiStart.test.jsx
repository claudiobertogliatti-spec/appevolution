/**
 * Home "Oggi" — blocco Clienti Start. Deve dire cosa tocca a te, in ordine, e
 * non inventare mai uno "0" quando la fonte non risponde.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OggiStart } from "./OggiStart";
import { buildOggiStart } from "../oggiModel";
import { apiGet } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn() }));

const C = (over) => ({
  client_id: "c1", nome: "Linda Pavia", email: "l@x.it", prossima_azione: "Leggi e approva: Il tuo marchio",
  approvati: 1, totale: 6, prossima_scadenza: { tappa: 1, titolo: "t", data_promessa: "08/10/2026", giorni: 1, urgenza: "imminente" },
  ...over,
});
const PIPE = {
  totale: 4,
  colonne: [
    { id: "attesa_cliente", clienti: [C({ client_id: "c3", nome: "Anna Rossi", prossima_azione: "Aspetta le risposte del cliente", prossima_scadenza: null })] },
    { id: "da_preparare", clienti: [C({ client_id: "c2", nome: "giulia verdi", prossima_azione: "Prepara le bozze", prossima_scadenza: { tappa: 2, titolo: "t", data_promessa: "20/10/2026", giorni: 12, urgenza: "in_corso" } })] },
    { id: "da_approvare", clienti: [C({}), C({ client_id: "c9", nome: "Mario Rossi", email: "m+ciaktest@x.it" })] },
    { id: "completato", clienti: [] },
  ],
};

test("buildOggiStart: da approvare, da preparare, scadenze e prova esclusa", () => {
  const m = buildOggiStart(PIPE);
  expect(m.daApprovare.map((r) => r.nome)).toEqual(["Linda Pavia"]); // Mario Rossi e' di prova
  expect(m.daPreparare.map((r) => r.nome)).toEqual(["Giulia Verdi"]); // nome ripulito
  expect(m.aspettano).toHaveLength(1);
  expect(m.inScadenza.map((r) => r.nome)).toEqual(["Linda Pavia"]); // solo giorni <= 2
  expect(m.esclusi).toEqual(["Mario Rossi"]);
});

test("buildOggiStart: fonte assente non diventa uno zero", () => {
  expect(buildOggiStart(null)).toBeNull();
  expect(buildOggiStart({})).toBeNull();
});

test("mostra cosa tocca a te e linka l'account del cliente", async () => {
  apiGet.mockResolvedValue(PIPE);
  render(<MemoryRouter><OggiStart /></MemoryRouter>);
  const link = await screen.findByRole("link", { name: "Linda Pavia" });
  expect(link).toHaveAttribute("href", "/admin/start/c1");
  expect(screen.getByText("Leggi e approva: Il tuo marchio")).toBeInTheDocument();
  expect(screen.getByText(/1 cliente deve ancora inviare/)).toBeInTheDocument();
  expect(screen.getByText(/ha una consegna in scadenza/)).toBeInTheDocument();
});

test("fonte che non risponde: 'Dato non disponibile' con Riprova, non 'nessuna bozza'", async () => {
  apiGet.mockRejectedValue(new Error("500"));
  render(<MemoryRouter><OggiStart /></MemoryRouter>);
  expect(await screen.findByText(/Dato non disponibile/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();
  expect(screen.queryByText("Nessuna bozza in attesa di te.")).not.toBeInTheDocument();
});

test("tutto vuoto: lo dice con parole chiare", async () => {
  apiGet.mockResolvedValue({ totale: 0, colonne: [{ id: "attesa_cliente", clienti: [] }, { id: "da_preparare", clienti: [] }, { id: "da_approvare", clienti: [] }] });
  render(<MemoryRouter><OggiStart /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Nessuna bozza in attesa di te.")).toBeInTheDocument());
  expect(screen.getByText("Niente da preparare.")).toBeInTheDocument();
});
