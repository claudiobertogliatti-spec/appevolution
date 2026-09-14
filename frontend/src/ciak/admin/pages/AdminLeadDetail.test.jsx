/**
 * Ciak Admin — scheda lead: "segna €27 pagato" e' un'azione sensibile
 * (registra purchased_67). Non deve partire da un confirm() del browser ma da
 * una conferma in pagina col nome del lead.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
jest.mock(
  "react-router-dom",
  () => ({ useParams: () => ({ email: "mario%40x.it" }), useNavigate: () => jest.fn() }),
  { virtual: true }
);
jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), adminFetch: jest.fn() }));

import { AdminLeadDetail } from "./AdminLeadDetail";
import { apiGet, apiPost, adminFetch } from "../api";

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
  apiPost.mockResolvedValue({ already_purchased: false });
});

test("segnare €27 pagato apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Segna 27 EUR come pagato/i });
  fireEvent.click(trigger);
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/mario@x\.it/);
  spy.mockRestore();
});

test("confermando registra l'acquisto via apiPost /lead/mark-purchased", async () => {
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Segna 27 EUR come pagato/i });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Segna pagato" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/lead/mark-purchased", { email: "mario@x.it" })
  );
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
