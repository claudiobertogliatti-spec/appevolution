/**
 * Ciak Admin — scheda lead: consegna Blueprint (conferma call) e stato post-call.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
jest.mock(
  "react-router-dom",
  () => ({ useParams: () => ({ email: "mario%40x.it" }), useNavigate: () => jest.fn() }),
  { virtual: true }
);
jest.mock("../api", () => ({ apiGet: jest.fn(), adminFetch: jest.fn() }));

import { AdminLeadDetail } from "./AdminLeadDetail";
import { apiGet, adminFetch } from "../api";

const LEAD = {
  email: "mario@x.it",
  lead: { nome: "Mario" },
  diagnostics: [{ id: "d1" }],
  checkpoints: [],
  latest_diagnostic: null,
  qualified_for_proposta: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue(LEAD);
});

test('"Ho fatto la call di consegna" consegna il Blueprint via admin/consegna-blueprint', async () => {
  adminFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, client_id: "c1", magic_link: "https://ciak.io/cliente/accesso?token=tk" }),
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Ho fatto la call di consegna/i });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/mario@x\.it/);
  fireEvent.click(within(dialog).getByRole("button", { name: "Invia il Blueprint" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/ciak/client/admin/consegna-blueprint",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "mario@x.it" }),
      })
    )
  );
  // il link d'accesso restituito viene mostrato all'admin (findByText lancia se assente)
  expect(await screen.findByText(/token=tk/)).toBeTruthy();
});

test("a call_done il bottone di consegna sparisce e mostra 'Blueprint consegnato'", async () => {
  apiGet.mockResolvedValue({
    ...LEAD,
    latest_diagnostic: { current_state: "call_done" },
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText(/Blueprint consegnato/i)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Ho fatto la call di consegna/i })).toBeNull();
});
