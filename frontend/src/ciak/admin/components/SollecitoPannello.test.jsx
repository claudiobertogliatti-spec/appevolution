/**
 * Pannello sollecito: la bozza non parte da sola, l'invio porta `approvato: true`,
 * gli errori si leggono come sono, la bozza senza AI lo dice.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SollecitoPannello, messaggioErrore } from "./SollecitoPannello";
import { apiPost } from "../api";

jest.mock("../api", () => ({ apiPost: jest.fn() }));

const BOZZA = {
  email: "a@x.it",
  nome: "Anna",
  da_ai: true,
  bozza: { subject: "Come va?", body: "Ciao Anna, volevo sapere come stai andando.\n\nClaudio" },
  fatti: ["La proposta è stata inviata 6 giorni fa."],
};

const apri = (props = {}) => render(
  <SollecitoPannello email="a@x.it" nome="Anna" onClose={jest.fn()} onInviato={jest.fn()} onAuthExpired={jest.fn()} {...props} />
);

beforeEach(() => apiPost.mockReset());

test("carica la bozza senza inviare nulla e mostra i fatti di Marco", async () => {
  apiPost.mockResolvedValueOnce(BOZZA);
  apri();
  expect(await screen.findByDisplayValue("Come va?")).toBeTruthy();
  expect(screen.getByText("La proposta è stata inviata 6 giorni fa.")).toBeTruthy();
  expect(apiPost).toHaveBeenCalledTimes(1);
  expect(apiPost).toHaveBeenCalledWith("/solleciti/bozza", { email: "a@x.it" });
});

test("l'invio manda quello che hai modificato, con l'approvazione esplicita", async () => {
  apiPost.mockResolvedValueOnce(BOZZA).mockResolvedValueOnce({ success: true });
  const onInviato = jest.fn();
  const onClose = jest.fn();
  apri({ onInviato, onClose });
  const oggetto = await screen.findByLabelText("Oggetto");
  fireEvent.change(oggetto, { target: { value: "Due righe per te" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia a a@x.it" }));
  await waitFor(() => expect(onInviato).toHaveBeenCalledWith("a@x.it"));
  expect(apiPost).toHaveBeenLastCalledWith("/solleciti/invia", {
    email: "a@x.it",
    subject: "Due righe per te",
    body: BOZZA.bozza.body,
    approvato: true,
  });
  expect(onClose).toHaveBeenCalled();
});

test("«Non inviare» chiude senza chiamare l'invio", async () => {
  apiPost.mockResolvedValueOnce(BOZZA);
  const onClose = jest.fn();
  apri({ onClose });
  await screen.findByDisplayValue("Come va?");
  fireEvent.click(screen.getByRole("button", { name: "Non inviare" }));
  expect(onClose).toHaveBeenCalled();
  expect(apiPost).toHaveBeenCalledTimes(1);
});

test("senza AI lo dice chiaramente", async () => {
  apiPost.mockResolvedValueOnce({ ...BOZZA, da_ai: false });
  apri();
  expect(await screen.findByText(/bozza base, senza AI/)).toBeTruthy();
});

test("un errore dell'invio si legge e il pannello resta aperto", async () => {
  apiPost
    .mockResolvedValueOnce(BOZZA)
    .mockRejectedValueOnce(new Error('Errore 409: {"detail":"Gli hai già scritto il 2026-10-11: aspetta almeno 24 ore."}'));
  const onClose = jest.fn();
  apri({ onClose });
  await screen.findByDisplayValue("Come va?");
  fireEvent.click(screen.getByRole("button", { name: "Invia a a@x.it" }));
  expect(await screen.findByText(/Gli hai già scritto il 2026-10-11/)).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});

test("se la bozza non si può preparare lo dice", async () => {
  apiPost.mockRejectedValueOnce(new Error('Errore 404: {"detail":"Non conosco questa persona."}'));
  apri();
  expect(await screen.findByText("Non conosco questa persona.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Invia a/ })).toBeNull();
});

test("messaggioErrore: dettaglio se c'è, altrimenti frase generica", () => {
  expect(messaggioErrore(new Error('Errore 502: {"detail":"Email non partita: x"}'))).toBe("Email non partita: x");
  expect(messaggioErrore(new Error("boom"))).toMatch(/Riprova/);
});
