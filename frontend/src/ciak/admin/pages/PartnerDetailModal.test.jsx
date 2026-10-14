/**
 * Ciak Admin — header operativo della scheda partner (T17a).
 *
 * La scheda apre su "cosa manca e chi ci lavora": situazione, prossimo risultato,
 * responsabile, scadenza, prossima azione, blocco. I dati operativi vengono da
 * /delivery-audit (prop `audit`) — la stessa fonte della pagina Audit Delivery —
 * e NON sono ricalcolati o inventati: dove mancano, "—".
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { PartnerOpHeader, PartnerDetailModal } from "./PartnerDetailModal";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({
  adminFetch: jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })),
  // coda delle domande all'assistente, nella Panoramica (le risposte si impostano in beforeEach: CRA resetta i mock)
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));
beforeEach(() => {
  apiGet.mockResolvedValue({ righe: [], da_rispondere: 0 });
  apiPost.mockResolvedValue({ success: true });
});
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../components/CompitiPartner", () => ({
  CompitiPartner: ({ partnerId }) => <div data-testid="compiti-partner">{partnerId}</div>,
}));
jest.mock("../components/CommentiPannello", () => ({ CommentiPannello: () => <div data-testid="commenti-partner" /> }));
jest.mock("../components/PercorsoEvoPanel", () => ({
  PercorsoEvoPanel: () => <div data-testid="percorso-panel" />,
}));

const PARTNER = { name: "Daniele Andolfi", contract_end: "2026-12-31" };

test("con l'item audit mostra prossima azione, responsabile, blocco e scadenza reali", () => {
  render(
    <PartnerOpHeader
      partner={PARTNER}
      phase="F3"
      piano={{ prossima_scadenza: "2026-09-15" }}
      audit={{ current_step: "Funnel", owner: "Antonella", blocked: true, next_action: "Sollecita revisione video" }}
      onOpenJourney={() => {}}
    />
  );
  const h = screen.getByTestId("partner-op-header");
  expect(h.textContent).toMatch(/Funnel/); // situazione = current_step
  expect(h.textContent).toMatch(/Funnel online e testato/); // risultato dell'atto Valida (F3)
  expect(h.textContent).toMatch(/Antonella/); // responsabile
  expect(h.textContent).toMatch(/Sollecita revisione video/); // prossima azione
  expect(h.textContent).toMatch(/Fermo/); // blocco
  expect(h.textContent).toMatch(/15\/09\/2026/); // scadenza dal piano
});

test("senza audit non inventa nulla: azione/blocco a vuoto, situazione dall'atto", () => {
  render(<PartnerOpHeader partner={PARTNER} phase="F1" piano={null} audit={null} onOpenJourney={() => {}} />);
  const h = screen.getByTestId("partner-op-header");
  expect(h.textContent).toMatch(/Esamina/); // attoEvo(F1)
  expect(h.textContent).toMatch(/Nessuna azione in coda/);
  expect(h.textContent).toMatch(/Nessun blocco/);
  expect(h.textContent).toMatch(/31\/12\/2026/); // scadenza dal contract_end (campo reale)
});

test("il bottone porta ai materiali del partner", () => {
  const onOpen = jest.fn();
  render(<PartnerOpHeader partner={PARTNER} phase="F2" piano={null} audit={null} onOpenJourney={onOpen} />);
  fireEvent.click(screen.getByRole("button", { name: /apri i materiali/i }));
  expect(onOpen).toHaveBeenCalled();
});

// ─── T17b: retab del modale ────────────────────────────────────────────────
// Il retab riorganizza i pannelli, NON riscrive la logica: ogni funzione di
// editing dev'essere ancora raggiungibile.
const MODAL_PARTNER = { id: "9", name: "Test Partner", email: "t@x.it", phase: "F3" };

test("il retab espone i 6 tab, apre sulla Panoramica e conserva le funzioni di editing", () => {
  render(<PartnerDetailModal partner={MODAL_PARTNER} isOpen onClose={() => {}} />);
  ["panoramica", "percorso", "materiali", "documenti", "pagamenti", "impostazioni"].forEach((id) =>
    expect(screen.getByTestId(`tab-${id}`)).toBeTruthy()
  );
  // Apre sulla Panoramica.
  expect(screen.getByTestId("tab-content-panoramica")).toBeTruthy();
  // Percorso EVO promosso a tab dedicato.
  fireEvent.click(screen.getByTestId("tab-percorso"));
  expect(screen.getByTestId("percorso-panel")).toBeTruthy();
  expect(screen.getByTestId("compiti-partner")).toBeTruthy();
  // Impostazioni conserva l'editing (nicchia, id tecnici, salva, elimina).
  fireEvent.click(screen.getByTestId("tab-impostazioni"));
  expect(screen.getByTestId("input-nicchia")).toBeTruthy();
  expect(screen.getByTestId("input-systeme-subdomain")).toBeTruthy();
  expect(screen.getByTestId("save-profile-btn")).toBeTruthy();
  expect(screen.getByTestId("delete-partner-btn")).toBeTruthy();
});

test("la Panoramica mostra la coda delle domande all'assistente del partner", async () => {
  apiGet.mockResolvedValue({
    da_rispondere: 1,
    righe: [{ id: "r1", at: "2026-10-12T09:00:00+00:00", domanda: "Quanto sono le royalty?", passato_al_team: true, gestita: false, motivo: "argomento_delicato" }],
  });
  render(<PartnerDetailModal partner={MODAL_PARTNER} isOpen onClose={() => {}} />);
  expect(await screen.findByText("«Quanto sono le royalty?»")).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith("/partner/9/assistente");
  fireEvent.click(screen.getByRole("button", { name: "Fatto, ho risposto" }));
  await screen.findByText("«Quanto sono le royalty?»");
  expect(apiPost).toHaveBeenCalledWith("/partner/9/assistente/r1/gestita", {});
});
