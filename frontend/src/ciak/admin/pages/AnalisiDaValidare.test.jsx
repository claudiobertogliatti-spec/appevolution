/**
 * Ciak Admin — Analisi da validare: "Valida e invia" spedisce un'email al
 * cliente (azione sensibile). Non deve partire da un confirm() del browser ma
 * da una conferma in pagina che porta l'email del destinatario.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AnalisiDaValidare } from "./AnalisiDaValidare";
import { apiGet, apiPost, apiPut } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn() }));

const CODA = {
  items: [{ session_token: "tok1", email: "cli@x.it", analisi_definitiva: { capitoli: {} } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue(CODA);
  apiPut.mockResolvedValue({});
  apiPost.mockResolvedValue({ message: "ok" });
});

async function openDetail() {
  render(<AnalisiDaValidare />);
  const row = await screen.findByText("cli@x.it");
  fireEvent.click(row.closest("button"));
  // Vista dettaglio: il titolo porta l'email.
  await screen.findByRole("button", { name: "Valida e invia" });
}

test("validare e inviare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await openDetail();
  fireEvent.click(screen.getByRole("button", { name: "Valida e invia" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/cli@x\.it/);
  spy.mockRestore();
});

test("confermando chiama valida-invia per il token dell'analisi", async () => {
  await openDetail();
  fireEvent.click(screen.getByRole("button", { name: "Valida e invia" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Valida e invia" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/analisi/tok1/valida-invia", {})
  );
});
