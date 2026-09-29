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
  blueprint: { stato: "pronto", generato_at: "2026-09-29T10:00:00+00:00" },
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

test("invio registrato: il bottone sparisce e compare il riepilogo verde", async () => {
  apiGet.mockResolvedValue({
    ...LEAD,
    latest_diagnostic: { current_state: "call_done" },
    blueprint: { stato: "pronto", consegna_inviata_at: "2026-09-29T14:31:19+00:00" },
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText(/Blueprint inviato al cliente il/i)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /invia il Blueprint/i })).toBeNull();
});

test("call fatta ma Blueprint mai inviato: si può ancora inviare a mano", async () => {
  apiGet.mockResolvedValue({
    ...LEAD,
    latest_diagnostic: { current_state: "call_done" },
    blueprint: { stato: "pronto" },
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText(/Blueprint non ancora inviato/i)).toBeTruthy();
  const btn = screen.getByRole("button", { name: "Invia il Blueprint al cliente" });
  expect(btn.disabled).toBe(false);
  expect(screen.queryByText(/Blueprint inviato al cliente il/i)).toBeNull();
});

test("senza Blueprint pronto l'invio al cliente è bloccato", async () => {
  apiGet.mockResolvedValue({ ...LEAD, blueprint: { stato: "mancante" } });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Ho fatto la call di consegna/i });
  expect(trigger.disabled).toBe(true);
  expect(screen.getByText(/Prima genera il Blueprint/i)).toBeTruthy();
});

test('"Genera Blueprint" chiama solo la generazione, nessun invio al cliente', async () => {
  apiGet.mockResolvedValue({ ...LEAD, blueprint: { stato: "mancante" } });
  adminFetch.mockResolvedValue({ ok: true, json: async () => ({ stato: "pronto" }) });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Genera Blueprint" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/ciak/client/admin/blueprint/genera",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "mario@x.it", force: false }) })
    )
  );
  expect(adminFetch).not.toHaveBeenCalledWith("/api/ciak/client/admin/consegna-blueprint", expect.anything());
});

test("errore di generazione: il motivo reale è visibile", async () => {
  apiGet.mockResolvedValue({ ...LEAD, blueprint: { stato: "errore", errore: "Anthropic API error: credit balance too low" } });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText(/credit balance too low/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Riprova a generare" })).toBeTruthy();
});

test("Blueprint inviato prima del salvataggio: mostra 'Già inviato' e il PDF spedito", async () => {
  apiGet.mockResolvedValue({
    ...LEAD,
    latest_diagnostic: { current_state: "call_done" },
    blueprint: { stato: "inviato_prima", consegna_inviata_at: "2026-09-29T14:31:19+00:00", pdf_url: "https://cdn.test/bp.pdf" },
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText("Già inviato")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Apri il PDF inviato" }).getAttribute("href")).toBe("https://cdn.test/bp.pdf");
  expect(screen.queryByRole("button", { name: "Genera Blueprint" })).toBeNull();
});
