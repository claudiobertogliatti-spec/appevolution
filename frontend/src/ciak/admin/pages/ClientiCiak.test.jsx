/**
 * Ciak Admin — attivazione manuale di Ciak Start.
 *
 * Il rischio da coprire non e' "il form invia": e' che l'admin creda di aver
 * consegnato l'accesso quando l'email non e' partita. Un esito verde in quel
 * caso e' peggio di nessun esito — il cliente ha pagato e nessuno lo sa.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientiCiak } from "./ClientiCiak";
import { adminFetch, apiGet, apiPost } from "../api";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  adminFetch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: [], count: 0 });
});

async function compilaEInvia({ email = "ko@example.it" } = {}) {
  render(<ClientiCiak />);
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  fireEvent.change(screen.getByPlaceholderText("nome@esempio.it"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: /attiva e manda l'accesso/i }));
}

test("conferma l'attivazione solo quando l'email di accesso e' partita davvero", async () => {
  apiPost.mockResolvedValue({
    success: true,
    client_id: "client-1",
    created: true,
    already_active: false,
    access_sent: true,
    recovery_open: false,
  });

  await compilaEInvia();

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/start/attiva", {
    email: "ko@example.it",
    name: null,
    riferimento: null,
  }));
  expect(await screen.findByText(/account creato ora/i)).toBeTruthy();
  expect(screen.getByText(/link di accesso partita/i)).toBeTruthy();
});

test("quando l'email non parte lo dice, invece di dare per consegnato", async () => {
  apiPost.mockResolvedValue({
    success: true,
    client_id: "client-1",
    created: false,
    already_active: false,
    access_sent: false,
    recovery_open: true,
  });

  await compilaEInvia();

  expect(await screen.findByText(/non è partita/i)).toBeTruthy();
  expect(screen.getByText(/Consegne mancate/i)).toBeTruthy();
  expect(screen.queryByText(/link di accesso partita/i)).toBeNull();
});


describe("link di accesso da mandare a mano", () => {
  const LINDA = { id: "c1", email: "linda@example.it", name: "Linda Pavia", access_level: "cliente_start" };

  async function apri() {
    apiGet.mockResolvedValue({ items: [LINDA], count: 1 });
    render(<MemoryRouter><ClientiCiak /></MemoryRouter>);
    return screen.findByRole("button", { name: "Link di accesso" });
  }

  test("crea il link, lo mostra e dice chiaramente che non e' partita nessuna mail", async () => {
    adminFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, link: "https://www.ciak.io/cliente/accesso?token=ABC", scade_il: "2026-11-01T09:00:00+00:00" }),
    });
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
    fireEvent.click(await apri());

    await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/clients/c1/link-accesso",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "linda@example.it" }) }),
    ));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toMatch(/Nessuna mail è partita/);
    expect(dialogo.textContent).toMatch(/30 giorni/);
    expect(screen.getByLabelText("Link di accesso").value).toBe("https://www.ciak.io/cliente/accesso?token=ABC");

    fireEvent.click(screen.getByRole("button", { name: "Copia il link" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://www.ciak.io/cliente/accesso?token=ABC"));
    expect(await screen.findByRole("button", { name: "Copiato" })).toBeTruthy();
  });

  test("se il server rifiuta, non mostra nessun link", async () => {
    adminFetch.mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ detail: "L'email non combacia col cliente: nessun link creato" }) });
    fireEvent.click(await apri());
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
