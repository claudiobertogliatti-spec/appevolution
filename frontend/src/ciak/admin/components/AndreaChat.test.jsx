import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AndreaChat } from "./AndreaChat";
import { apiGet, apiPost, adminFetch } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), adminFetch: jest.fn() }));
jest.mock("./ui/ConfirmDialog", () => ({
  ConfirmDialog: ({ open, onConfirm }) => (open ? <button type="button" onClick={onConfirm}>conferma-cancella</button> : null),
}));

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); adminFetch.mockReset(); });

test("senza storico saluta e non inventa messaggi", async () => {
  apiGet.mockResolvedValue({ messages: [] });
  render(<AndreaChat />);
  expect(await screen.findByText(/sono Andrea/)).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith("/andrea/history");
  expect(screen.queryByRole("button", { name: /Cancella/ })).toBeNull();
});

test("mostra lo storico e manda un messaggio con la risposta di Andrea", async () => {
  apiGet.mockResolvedValue({ messages: [{ role: "user", content: "vecchia domanda" }, { role: "assistant", content: "vecchia risposta" }] });
  apiPost.mockResolvedValue({ reply: "Usa il caso di **Eva**." });
  render(<AndreaChat />);
  expect(await screen.findByText("vecchia risposta")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Scrivi ad Andrea"), { target: { value: "Che caso uso?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia ad Andrea" }));
  expect(await screen.findByText("Eva")).toBeTruthy();
  expect(apiPost).toHaveBeenCalledWith("/andrea/chat", { message: "Che caso uso?" });
});

test("un suggerimento manda subito la domanda", async () => {
  apiGet.mockResolvedValue({ messages: [] });
  apiPost.mockResolvedValue({ reply: "ok" });
  render(<AndreaChat />);
  fireEvent.click(await screen.findByRole("button", { name: "Quale caso studio posso usare?" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/andrea/chat", { message: "Quale caso studio posso usare?" }));
});

test("se Andrea non risponde lo dice e non aggiunge una risposta finta", async () => {
  apiGet.mockResolvedValue({ messages: [] });
  apiPost.mockRejectedValue(new Error('Errore 503: {"detail":"Andrea non può rispondere adesso. Riprova tra un momento."}'));
  render(<AndreaChat />);
  fireEvent.change(await screen.findByLabelText("Scrivi ad Andrea"), { target: { value: "ciao" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia ad Andrea" }));
  expect(await screen.findByText("Andrea non può rispondere adesso. Riprova tra un momento.")).toBeTruthy();
  expect(screen.queryByText("ok")).toBeNull();
});

test("«Cancella» chiede conferma, poi svuota la cronologia", async () => {
  apiGet.mockResolvedValue({ messages: [{ role: "user", content: "x" }, { role: "assistant", content: "y" }] });
  adminFetch.mockResolvedValue({ ok: true });
  render(<AndreaChat />);
  fireEvent.click(await screen.findByRole("button", { name: /Cancella/ }));
  expect(adminFetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("conferma-cancella"));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith("/api/admin/ciak/andrea/history", { method: "DELETE" }));
  expect(await screen.findByText(/sono Andrea/)).toBeTruthy();
});
