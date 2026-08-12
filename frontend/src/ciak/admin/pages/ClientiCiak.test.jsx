/**
 * Ciak Admin — attivazione manuale di Ciak Start.
 *
 * Il rischio da coprire non e' "il form invia": e' che l'admin creda di aver
 * consegnato l'accesso quando l'email non e' partita. Un esito verde in quel
 * caso e' peggio di nessun esito — il cliente ha pagato e nessuno lo sa.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientiCiak } from "./ClientiCiak";
import { apiGet, apiPost } from "../api";

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
    amount_cents: 49900,
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
