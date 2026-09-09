/**
 * Ciak Admin — tabella partner: l'eliminazione non parte da un confirm() del
 * browser, e la colonna Contratto non spaccia una data di migrazione per firma.
 *
 * Il rischio da coprire: il cestino era a un clic piu' un confirm() nativo, e la
 * colonna mostrava "2026-02-12" (la data della migrazione) come se fosse un
 * contratto firmato. Due modi diversi di ingannare chi guarda in fretta.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PartnerHub } from "./PartnerHub";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
  getToken: () => "tok",
  getAdminUser: () => ({ name: "Claudio" }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("./PartnerDetailModal", () => ({
  PartnerDetailModal: ({ partner, isOpen, initialTab }) =>
    isOpen ? <div data-testid="pdm">{(partner && partner.name) || ""}|{initialTab}</div> : null,
}));

const PARTNERS = [
  { id: "1", name: "Alfredo Vasi", stato: "quarantena", phase: "F2", contract: "2026-02-12" },
  { id: "2", name: "Arianna Aceto", stato: "attivo", phase: "F9", contract_signed: true, contratto_firmato_at: "2026-03-05T00:00:00Z" },
];

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: PARTNERS });
  localStorage.setItem("ciak_admin_partner_view", "tabella");
  window.history.replaceState({}, "", "/");
});

async function renderTable() {
  render(<PartnerHub />);
  await screen.findByText("Alfredo Vasi");
}

test("una data di migrazione non viene mostrata come contratto firmato", async () => {
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  // La bare date "2026-02-12" non deve comparire in colonna Contratto.
  expect(riga.textContent).not.toMatch(/2026-02-12/);
  // Il partner con firma vera mostra "Firmato".
  const rigaFirmato = screen.getByText("Arianna Aceto").closest("tr");
  expect(rigaFirmato.textContent).toMatch(/Firmato/);
});

test("eliminare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  fireEvent.click(within(riga).getByRole("button", { name: /elimina/i }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Alfredo Vasi/);
  spy.mockRestore();
});

test("confermando l'eliminazione chiama la DELETE e conferma con un toast", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  fireEvent.click(within(riga).getByRole("button", { name: /elimina/i }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/ciak/partner/1", { method: "DELETE" })
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

test("un errore nel cambio stato passa da un toast, non da un window.alert", async () => {
  const spy = jest.spyOn(window, "alert");
  adminFetch.mockResolvedValue({ ok: false, text: async () => "" });
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  fireEvent.change(within(riga).getByRole("combobox"), { target: { value: "sospeso" } });
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

// ─── T17: colonne operative + deep-link ────────────────────────────────────

// Le colonne "Prossima azione / Responsabile / Blocco" non sono inventate: vengono
// da /delivery-audit, la stessa fonte della pagina Audit Delivery.
function mockOperational(auditItems, overrides = {}) {
  apiGet.mockImplementation((path) => {
    if (path === "/partners") return Promise.resolve({ items: PARTNERS });
    if (path === "/delivery-audit") return Promise.resolve({ items: auditItems });
    if (path === "/partner-alignment/overrides") return Promise.resolve({ overrides });
    return Promise.resolve({});
  });
}

test("la tabella mostra prossima azione/responsabile/blocco da delivery-audit", async () => {
  mockOperational([
    { id: "1", next_action: "Sollecita revisione video", owner: "Antonella", blocked: true, macro_label: "Valida", current_step: "Funnel" },
  ]);
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  expect(riga.textContent).toMatch(/Sollecita revisione video/);
  expect(riga.textContent).toMatch(/Antonella/);
  expect(riga.textContent).toMatch(/Fermo/); // pill blocco
  // Un partner assente dall'audit non inventa una prossima azione.
  const riga2 = screen.getByText("Arianna Aceto").closest("tr");
  expect(riga2.textContent).not.toMatch(/Sollecita revisione video/);
});

test("l'override Regia vince sul next_action automatico (una fonte sola)", async () => {
  mockOperational(
    [{ id: "1", next_action: "Auto: manda promemoria", owner: "Andrea", blocked: false }],
    { "1": { alignment_next_step: "Regia: chiama tu il partner", alignment_owner: "Claudio" } }
  );
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  expect(riga.textContent).toMatch(/Regia: chiama tu il partner/);
  expect(riga.textContent).toMatch(/Claudio/);
  expect(riga.textContent).not.toMatch(/Auto: manda promemoria/);
});

test("aprire una scheda scrive il deep-link ?partner=<id> nell'URL", async () => {
  await renderTable();
  const riga = screen.getByText("Alfredo Vasi").closest("tr");
  fireEvent.click(riga);
  expect(window.location.search).toMatch(/partner=1/);
  expect(window.location.search).toMatch(/tab=panoramica/);
});

test("un URL ?partner=<id>&tab=<tab> riapre la stessa scheda al caricamento", async () => {
  window.history.replaceState({}, "", "/?partner=2&tab=materiali");
  render(<PartnerHub />);
  const pdm = await screen.findByTestId("pdm");
  expect(pdm.textContent).toMatch(/Arianna Aceto/);
  expect(pdm.textContent).toMatch(/materiali/);
});
