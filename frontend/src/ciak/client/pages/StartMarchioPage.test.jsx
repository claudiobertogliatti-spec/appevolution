/**
 * Il marchio di Ciak Start: scelte semplici fra opzioni pronte, un passo alla
 * volta. Logo e foto sono facoltativi. Niente codici colore da scrivere.
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

const OPZIONI = {
  palette: [
    { id: "sicuro", nome: "Sicuro e professionale", descrizione: "Blu profondo e un tocco di oro.", colori: ["#0F2A4A", "#5B7C99", "#D9A441"] },
    { id: "caldo", nome: "Caldo e accogliente", descrizione: "Marrone e terracotta.", colori: ["#5A2E1E", "#B5651D", "#E8B98A"] },
  ],
  font: [
    { id: "moderno", nome: "Moderno", famiglia: "Poppins", descrizione: "Pulito e chiaro." },
    { id: "classico", nome: "Classico", famiglia: "Lora", descrizione: "Con le grazie." },
  ],
  toni: [
    { id: "semplice", nome: "Semplice e diretto" },
    { id: "caldo", nome: "Caldo e rassicurante" },
  ],
};
const DASH = { client: { id: "c1", name: "Linda Pavia" } };

beforeEach(() => {
  jest.clearAllMocks();
  clientGet.mockResolvedValue({ opzioni: OPZIONI, valori: {}, completato_at: null });
  clientPut.mockImplementation(async (_p, body) => ({ success: true, valori: body.valori || {} }));
});

const avanti = () => screen.getByRole("button", { name: /avanti/i });

test("si sceglie fra colori pronti, senza scrivere codici, e Avanti si sblocca solo dopo la scelta", async () => {
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText("Quali colori ti somigliano di più?")).toBeTruthy();
  expect(screen.getByText("Sicuro e professionale")).toBeTruthy();
  expect(screen.queryByPlaceholderText(/#/)).toBeNull();
  expect(avanti().disabled).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: /Caldo e accogliente/ }));
  await waitFor(() => expect(clientPut).toHaveBeenCalledWith("/start/marchio", { valori: { palette_id: "caldo" } }));
  expect(avanti().disabled).toBe(false);
});

test("le lettere si vedono con il nome del cliente e la scelta si salva", async () => {
  clientGet.mockResolvedValue({ opzioni: OPZIONI, valori: { palette_id: "sicuro" }, completato_at: null });
  render(<StartMarchioPage dashboard={DASH} />);
  // La palette c'e' gia': si riprende dalle lettere.
  expect(await screen.findByText("Quali lettere vuoi usare per il tuo nome?")).toBeTruthy();
  expect(screen.getAllByText("Linda Pavia").length).toBe(2);
  fireEvent.click(screen.getAllByRole("radio")[1]);
  await waitFor(() => expect(clientPut).toHaveBeenCalledWith("/start/marchio", { valori: { font_id: "classico" } }));
});

test("giro completo: logo e foto sono facoltativi e alla fine invia", async () => {
  clientGet.mockResolvedValue({
    opzioni: OPZIONI,
    valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo", parole_chiave: ["calma", "ascolto", "metodo"] },
    completato_at: null,
  });
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText("Una tua foto")).toBeTruthy(); // ha scelto tutto: riparte dall'ultima
  fireEvent.click(screen.getByRole("button", { name: "Indietro" }));
  expect(await screen.findByText("Hai già un logo?")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Non ce l'ho, avanti" }));
  expect(await screen.findByText("Una tua foto")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Invia le mie scelte" }));
  expect(await screen.findByText("Grazie, abbiamo le tue scelte")).toBeTruthy();
  expect(clientPut).toHaveBeenLastCalledWith("/start/marchio", { valori: {}, completato: true });
});

test("servono tre parole per andare avanti", async () => {
  clientGet.mockResolvedValue({
    opzioni: OPZIONI,
    valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo", parole_chiave: ["calma", "ascolto"] },
    completato_at: null,
  });
  render(<StartMarchioPage dashboard={DASH} />);
  await screen.findByText("Tre parole che descrivono il tuo lavoro");
  expect(avanti().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Parola 3"), { target: { value: "metodo" } });
  expect(avanti().disabled).toBe(false);
});

test("carica il logo e lo salva come indirizzo, senza dire nulla al team per ogni file", async () => {
  clientGet.mockResolvedValue({
    opzioni: OPZIONI,
    valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo", parole_chiave: ["calma", "ascolto", "metodo"] },
    completato_at: null,
  });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ url: "https://cdn.example.com/logo.png" }) });
  const { container } = render(<StartMarchioPage dashboard={DASH} />);
  await screen.findByText("Una tua foto");
  fireEvent.click(screen.getByRole("button", { name: "Indietro" }));
  await screen.findByText("Hai già un logo?");
  const file = new File(["x"], "logo.png", { type: "image/png" });
  fireEvent.change(container.querySelector("input[type=file]"), { target: { files: [file] } });
  await waitFor(() => expect(clientPut).toHaveBeenCalledWith("/start/marchio", { valori: { logo_url: "https://cdn.example.com/logo.png" } }));
  expect(global.fetch.mock.calls[0][0]).toBe("/api/partner-journey/operativo/upload/c1?notify=false");
});

test("se il server dice che manca una scelta, riapre quel passo", async () => {
  clientGet.mockResolvedValue({
    opzioni: OPZIONI,
    valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo", parole_chiave: ["calma", "ascolto", "metodo"] },
    completato_at: null,
  });
  clientPut.mockImplementation(async (_p, body) => {
    if (body.completato) throw Object.assign(new Error("Manca"), { mancanti: ["font_id"] });
    return { success: true, valori: body.valori || {} };
  });
  render(<StartMarchioPage dashboard={DASH} />);
  await screen.findByText("Una tua foto");
  fireEvent.click(screen.getByRole("button", { name: "Invia le mie scelte" }));
  expect(await screen.findByText("Quali lettere vuoi usare per il tuo nome?")).toBeTruthy();
  expect(screen.getByText(/Manca ancora una scelta/)).toBeTruthy();
});

test("chi ha già inviato vede il ringraziamento e può cambiare", async () => {
  clientGet.mockResolvedValue({ opzioni: OPZIONI, valori: { palette_id: "sicuro" }, completato_at: "2026-10-02T10:00:00+00:00" });
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByTestId("marchio-inviato")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voglio cambiare qualcosa" }));
  expect(await screen.findByText("Quali colori ti somigliano di più?")).toBeTruthy();
});

test("riprende dalla prima scelta mancante, non dalla prima schermata", async () => {
  clientGet.mockResolvedValue({ opzioni: OPZIONI, valori: { palette_id: "sicuro", font_id: "moderno" }, completato_at: null });
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText("Come vuoi parlare alle persone?")).toBeTruthy();
});

test("se ha scelto tutto ma non ha inviato riparte dall'ultima schermata", async () => {
  clientGet.mockResolvedValue({
    opzioni: OPZIONI,
    valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo", parole_chiave: ["calma", "ascolto", "metodo"] },
    completato_at: null,
  });
  render(<StartMarchioPage dashboard={DASH} />);
  expect(await screen.findByText("Una tua foto")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Invia le mie scelte" })).toBeTruthy();
});

describe("le tre parole si salvano mentre scrive", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("dopo un secondo di pausa, senza premere Avanti", async () => {
    clientGet.mockResolvedValue({
      opzioni: OPZIONI,
      valori: { palette_id: "sicuro", font_id: "moderno", tono_id: "caldo" },
      completato_at: null,
    });
    render(<StartMarchioPage dashboard={DASH} />);
    await screen.findByText("Tre parole che descrivono il tuo lavoro");
    fireEvent.change(screen.getByLabelText("Parola 1"), { target: { value: "calma" } });
    expect(clientPut).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(clientPut).toHaveBeenCalledWith("/start/marchio", { valori: { parole_chiave: ["calma", "", ""] } });
  });
});
