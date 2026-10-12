import { render, screen, waitFor } from "@testing-library/react";
import { CronologiaLead } from "./CronologiaLead";
import { apiGet } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), SCOPE_DENIED_DETAIL: "scope" }));
jest.mock("./PassoPannello", () => ({
  PassoPannello: () => <div>PANNELLO</div>,
  dataIt: (d) => d.split("-").reverse().join("/"),
  oggiISO: () => "2026-10-12",
}));

const mostra = () => render(<CronologiaLead email="a@x.it" nome="Anna" onAuthExpired={jest.fn()} />);

test("mostra gli eventi veri e dice cosa non c'è", async () => {
  apiGet.mockResolvedValue({
    eventi: [{ at: "2026-10-09T10:00:00+00:00", titolo: "Sollecito inviato", dettaglio: "Come va?", autore: "c@x.it" }],
    passo: { testo: "Richiamo Anna", scadenza: "2026-10-20" },
  });
  mostra();
  expect(await screen.findByText("Sollecito inviato")).toBeTruthy();
  expect(screen.getByText(/Richiamo Anna/)).toBeTruthy();
  expect(screen.getByText(/Telefonate e messaggi fatti altrove non ci sono/)).toBeTruthy();
});

test("senza passo: «Manca il prossimo passo»", async () => {
  apiGet.mockResolvedValue({ eventi: [], passo: null });
  mostra();
  expect(await screen.findByText("Manca il prossimo passo.")).toBeTruthy();
  expect(screen.getByText("Nessun evento registrato.")).toBeTruthy();
});

test("passo scaduto in rosso con «scaduto il»", async () => {
  apiGet.mockResolvedValue({ eventi: [], passo: { testo: "Richiamo", scadenza: "2026-10-10" } });
  mostra();
  expect(await screen.findByText(/scaduto il 10\/10\/2026/)).toBeTruthy();
});

test("risposta non valida o errore: lo dice, non inventa", async () => {
  apiGet.mockRejectedValue(new Error("Errore 500"));
  mostra();
  expect(await screen.findByText(/Cronologia non disponibile/)).toBeTruthy();
});

test("404 = nessun evento, non un errore", async () => {
  apiGet.mockRejectedValue(new Error("Errore 404: {}"));
  mostra();
  expect(await screen.findByText("Nessun evento registrato.")).toBeTruthy();
});

test("account senza accesso: la sezione non compare", async () => {
  apiGet.mockRejectedValue(new Error("scope"));
  const { container } = mostra();
  await waitFor(() => expect(container.textContent).toBe(""));
});
