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

describe("Account Ciak: chi ha comprato e chi ha solo il Blueprint gratuito", () => {
  const ITEMS = [
    { id: "a", email: "start@x.it", name: "Linda Start", access_level: "cliente_start", start_credit_amount: 39000 },
    { id: "b", email: "bp@x.it", name: "Lorenzo Blueprint", access_level: "cliente_blueprint" },
    { id: "c", email: "p@x.it", name: "Paola Partner", access_level: "partner" },
    { id: "d", email: "cr@x.it", name: "Carla Credito", access_level: "cliente_blueprint", start_credit_amount: 39000 },
  ];

  test("haComprato: Start, Partner, credito o acquisto Start; il solo Blueprint no", () => {
    const { haComprato } = require("./ClientiCiak");
    expect(haComprato(ITEMS[0])).toBe(true);
    expect(haComprato(ITEMS[2])).toBe(true);
    expect(haComprato(ITEMS[3])).toBe(true);
    expect(haComprato(ITEMS[1])).toBe(false);
    expect(haComprato({ access_level: "cliente_blueprint", start_credit_amount: 0 })).toBe(false);
    expect(haComprato({ access_level: "cliente_blueprint", start_purchased_at: "2026-10-01" })).toBe(true);
  });

  test("di default si vedono solo i clienti; i lead Blueprint stanno nella loro vista", async () => {
    apiGet.mockResolvedValue({ items: ITEMS, count: 4 });
    render(<MemoryRouter><ClientiCiak /></MemoryRouter>);
    expect(await screen.findByText("Linda Start")).toBeTruthy();
    expect(screen.getByText("Paola Partner")).toBeTruthy();
    expect(screen.getByText("Carla Credito")).toBeTruthy();
    expect(screen.queryByText("Lorenzo Blueprint")).toBeNull();
    expect(screen.getByRole("button", { name: /Hanno comprato 3/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Solo Blueprint 1/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Solo Blueprint/ }));
    expect(screen.getByText("Lorenzo Blueprint")).toBeTruthy();
    expect(screen.queryByText("Linda Start")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tutti 4/ }));
    expect(screen.getByText("Lorenzo Blueprint")).toBeTruthy();
    expect(screen.getByText("Linda Start")).toBeTruthy();
  });

  test("vista vuota: lo dice, non lascia una tabella bianca", async () => {
    apiGet.mockResolvedValue({ items: [ITEMS[1]], count: 1 });
    render(<MemoryRouter><ClientiCiak /></MemoryRouter>);
    expect(await screen.findByText("Nessun cliente ha ancora comprato.")).toBeTruthy();
  });
});
