/**
 * Ciak Admin — scheda lead: consegna Blueprint (conferma call) e stato post-call.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
jest.mock(
  "react-router-dom",
  () => ({ useParams: () => ({ email: "mario%40x.it" }), useNavigate: () => jest.fn() }),
  { virtual: true }
);
jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
  isCommercialAccount: jest.fn(() => false),
  isPermissionDenied: jest.fn((m) => m === "Questa funzione non è abilitata per il tuo account."),
}));

import { AdminLeadDetail } from "./AdminLeadDetail";
import { apiGet, adminFetch, isCommercialAccount, isPermissionDenied } from "../api";

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
  // CRA azzera le implementazioni dei mock prima di ogni test (resetMocks).
  isPermissionDenied.mockImplementation((m) => m === "Questa funzione non è abilitata per il tuo account.");
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

test("ripristino a call fatta: passa dalla conferma e chiama l'endpoint dedicato", async () => {
  apiGet.mockResolvedValue({
    ...LEAD,
    latest_diagnostic: { current_state: "call_done" },
    blueprint: { stato: "inviato_prima", consegna_inviata_at: "2026-09-29T14:31:19+00:00" },
  });
  adminFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, incassi_tolti: { payments: 1, payment_transactions: 1 }, start_attivato_da: [], account_eliminato: { ciak_clients: 1 } }),
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /Riporta a: call fatta/i }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riporta a call fatta" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/lead/riporta-a-call-fatta",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "mario@x.it" }) })
    )
  );
  expect(await screen.findByText(/Tolti 2 record di incasso/)).toBeTruthy();
});

test("il ripristino non compare prima della call", async () => {
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: /Ho fatto la call di consegna/i });
  expect(screen.queryByRole("button", { name: /Riporta a: call fatta/i })).toBeNull();
});

test("account commerciale (Mariangela): niente genera, invio, proposta o ripristino", async () => {
  isCommercialAccount.mockReturnValue(true);
  apiGet.mockResolvedValue({
    ...LEAD,
    qualified_for_proposta: true,
    latest_diagnostic: { current_state: "call_done", scoring: { stato_finale: 3 } },
    blueprint: { stato: "mancante" },
  });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByText(/lo prepara Claudio prima della call/i)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Genera Blueprint/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /invia il Blueprint/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /Genera Proposta Partnership/i })).toBeNull();
  expect(screen.queryByText("Ripristino")).toBeNull();
  isCommercialAccount.mockReturnValue(false);
});

test("account commerciale con Blueprint pronto: può scaricarlo, non rigenerarlo", async () => {
  isCommercialAccount.mockReturnValue(true);
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect(await screen.findByRole("button", { name: /Scarica Blueprint PDF/i })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Rigenera" })).toBeNull();
  // Non le si chiede di "confermare la call": l'invio non è suo.
  expect(screen.getByText(/L'invio al cliente, dopo la call, lo fa Claudio/i)).toBeTruthy();
  expect(screen.queryByText(/quando confermi di aver fatto la call/i)).toBeNull();
  isCommercialAccount.mockReturnValue(false);
});

test("generazione negata per permesso: si legge il motivo, non 'può essere ancora in corso'", async () => {
  apiGet.mockResolvedValue({ ...LEAD, blueprint: { stato: "mancante" } });
  adminFetch.mockRejectedValue(new Error("Questa funzione non è abilitata per il tuo account."));
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Genera Blueprint" }));
  expect(await screen.findByText("Questa funzione non è abilitata per il tuo account.")).toBeTruthy();
  expect(screen.queryByText(/può essere ancora in corso/i)).toBeNull();
});

test("la scheda dice subito se e' un lead, un cliente Start o un partner", async () => {
  apiGet.mockResolvedValue({ ...LEAD, ruolo: { tipo: "cliente_start", label: "Cliente Ciak Start", dettaglio: "Ha pagato Ciak Start (390 €)." } });
  const { unmount } = render(<AdminLeadDetail onAuthExpired={() => {}} />);
  const badge = await screen.findByTestId("ruolo-contatto");
  expect(badge.textContent).toMatch(/Cliente Ciak Start/);
  expect(badge.textContent).toMatch(/Ha pagato/);
  unmount();

  apiGet.mockResolvedValue({ ...LEAD, ruolo: { tipo: "lead", label: "Lead", dettaglio: "Non ha ancora pagato nessuna offerta." } });
  render(<AdminLeadDetail onAuthExpired={() => {}} />);
  expect((await screen.findByTestId("ruolo-contatto")).textContent).toMatch(/^Lead/);
});
