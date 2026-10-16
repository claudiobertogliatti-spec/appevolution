import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PassoPannello, oggiISO } from "./PassoPannello";
import { apiPost } from "../api";

jest.mock("../api", () => ({ apiPost: jest.fn() }));

const apri = (props = {}) => render(
  <PassoPannello email="a@x.it" nome="Anna" onClose={jest.fn()} onSalvato={jest.fn()} onFatto={jest.fn()} onAuthExpired={jest.fn()} {...props} />
);

beforeEach(() => apiPost.mockReset());

test("Salva è spento finché mancano testo e data", () => {
  apri();
  expect(screen.getByRole("button", { name: "Salva" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Cosa fai"), { target: { value: "Richiamo Anna" } });
  expect(screen.getByRole("button", { name: "Salva" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Entro quando"), { target: { value: oggiISO() } });
  expect(screen.getByRole("button", { name: "Salva" }).disabled).toBe(false);
});

test("salva testo e data e chiude", async () => {
  apiPost.mockResolvedValueOnce({ success: true, passo: { testo: "Richiamo Anna" } });
  const onSalvato = jest.fn();
  const onClose = jest.fn();
  apri({ onSalvato, onClose });
  fireEvent.change(screen.getByLabelText("Cosa fai"), { target: { value: "Richiamo Anna" } });
  fireEvent.change(screen.getByLabelText("Entro quando"), { target: { value: oggiISO() } });
  fireEvent.click(screen.getByRole("button", { name: "Salva" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(apiPost).toHaveBeenCalledWith("/prossimi-passi", { email: "a@x.it", testo: "Richiamo Anna", scadenza: oggiISO() });
  expect(onSalvato).toHaveBeenCalled();
});

test("«Segna come fatto» c'è solo con un passo aperto e lo chiude", async () => {
  apiPost.mockResolvedValueOnce({ success: true });
  const onFatto = jest.fn();
  apri({ passo: { testo: "Richiamo Anna", scadenza: "2030-01-01" }, onFatto });
  fireEvent.click(screen.getByRole("button", { name: "Segna come fatto" }));
  await waitFor(() => expect(onFatto).toHaveBeenCalledWith("a@x.it"));
  expect(apiPost).toHaveBeenCalledWith("/prossimi-passi/fatto", { email: "a@x.it" });
});

test("senza passo aperto non offre «Segna come fatto»", () => {
  apri();
  expect(screen.queryByRole("button", { name: "Segna come fatto" })).toBeNull();
});

test("un errore del server si legge e il pannello resta aperto", async () => {
  apiPost.mockRejectedValueOnce(new Error('Errore 422: {"detail":"La data è già passata"}'));
  const onClose = jest.fn();
  apri({ passo: { testo: "Richiamo Anna", scadenza: "2030-01-01" }, onClose });
  fireEvent.click(screen.getByRole("button", { name: "Salva" }));
  expect(await screen.findByText("La data è già passata")).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});
