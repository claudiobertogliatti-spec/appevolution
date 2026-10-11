/**
 * Il marchio di Ciak Start = il brand kit EVO (Step03BrandKit riusato): tre colori,
 * voce, parole, ecc. Logo e foto facoltativi, invio ai servizi Start, mai il PDF partner.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({ Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a> }),
  { virtual: true }
);
jest.mock("../api", () => ({
  clientGet: jest.fn(),
  clientPut: jest.fn(),
  getClientToken: jest.fn(() => "tok"),
}));

import { StartMarchioPage } from "./StartMarchioPage";
import { clientGet, clientPut } from "../api";

const DASH = { client: { id: "c1", name: "Linda Pavia" } };
const VOCE = "Parlo in modo semplice e diretto, con esempi concreti e senza parole complicate, come in una consulenza.";

beforeEach(() => {
  jest.clearAllMocks();
  clientGet.mockResolvedValue({ valori: {}, completato_at: null });
  clientPut.mockImplementation(async (_p, body) => ({ success: true, valori: body.valori || {} }));
});

const invia = () => screen.findByRole("button", { name: "Invia le mie scelte" });

async function compila() {
  fireEvent.change(await screen.findByPlaceholderText("Scrivi qui, con parole tue…"), { target: { value: VOCE } });
  ["calma", "ascolto", "metodo"].forEach((p, i) =>
    fireEvent.change(screen.getByPlaceholderText(`Parola ${i + 1}`), { target: { value: p } })
  );
}

test("e' il form del brand kit EVO, con logo e foto facoltativi", async () => {
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText("Il tuo marchio")).toBeTruthy();
  expect(screen.getByText(/Logo, se ce l'hai/)).toBeTruthy();
  expect(screen.getByText(/Una tua foto, se vuoi/)).toBeTruthy();
  expect(screen.getByText("La voce del tuo Brand")).toBeTruthy();
  expect(screen.getByText("Le parole da evitare", { exact: false })).toBeTruthy();
});

test("si invia solo con voce lunga come in EVO e almeno tre parole, senza logo ne' foto", async () => {
  render(<StartMarchioPage dashboard={DASH} />);
  expect((await invia()).disabled).toBe(true);
  await compila();
  expect((await invia()).disabled).toBe(false);
});

test("l'invio va ai servizi Start con completato=true e poi ringrazia", async () => {
  render(<StartMarchioPage dashboard={DASH} />);
  await compila();
  fireEvent.click(await invia());
  await waitFor(() => expect(clientPut).toHaveBeenCalledWith(
    "/start/marchio",
    expect.objectContaining({ completato: true, valori: expect.objectContaining({ tone_of_voice: VOCE, parole_chiave: ["calma", "ascolto", "metodo"] }) })
  ));
  expect(await screen.findByTestId("marchio-inviato")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Torna al tuo percorso" }).getAttribute("href")).toBe("/cliente/start");
});

test("chi aveva gia' inviato vede il ringraziamento e puo' cambiare, ritrovando le sue scelte", async () => {
  clientGet.mockResolvedValue({
    valori: { colors: ["#0F2A4A", "#5B7C99", "#D9A441"], tone_of_voice: VOCE, parole_chiave: ["calma", "ascolto", "metodo"] },
    completato_at: "2026-10-02T10:00:00+00:00",
  });
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByTestId("marchio-inviato")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voglio cambiare qualcosa" }));
  expect(await screen.findByDisplayValue(VOCE)).toBeTruthy();
  expect(screen.getByDisplayValue("calma")).toBeTruthy();
});

test("se l'invio fallisce lo dice e resta sul form", async () => {
  clientPut.mockRejectedValue(new Error("rete"));
  render(<StartMarchioPage dashboard={DASH} />);
  await compila();
  fireEvent.click(await invia());
  expect(await screen.findByText(/Non sono riuscito a inviare/)).toBeTruthy();
  expect(screen.queryByTestId("marchio-inviato")).toBeNull();
});

test("mentre scrive si salva da solo, a pezzi, senza inviare", async () => {
  jest.useFakeTimers();
  try {
    render(<StartMarchioPage dashboard={DASH} />);
    const campo = await screen.findByPlaceholderText("Scrivi qui, con parole tue…");
    fireEvent.change(campo, { target: { value: "Parlo semplice" } });
    expect(clientPut).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(700); });
    expect(clientPut).toHaveBeenCalledWith("/start/marchio", { valori: { tone_of_voice: "Parlo semplice" } });
  } finally {
    jest.useRealTimers();
  }
});

test("errore di caricamento: messaggio semplice", async () => {
  clientGet.mockRejectedValue(new Error("500"));
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText(/Non riesco a caricare questa pagina/)).toBeTruthy();
});
