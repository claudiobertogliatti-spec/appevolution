/**
 * Ciak Admin — Motore Acquisizione (LeadManager): eliminare un lead non parte
 * da un confirm() del browser ma da una conferma in pagina, con toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LeadManager } from "./LeadManager";
import { adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const LEADS = [
  { id: "9", display_name: "Studio Rossi", email: "studio@x.it", niche_detected: "Coaching", score_total: 80, source: "instagram" },
];

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    return Promise.resolve({ ok: true, json: async () => ({ leads: LEADS, total: 1 }) });
  });
});

test("eliminare un lead apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText("Studio Rossi");
  fireEvent.click(screen.getByRole("button", { name: /Elimina Studio Rossi/i }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Studio Rossi/);
  spy.mockRestore();
});

test("confermando chiama la DELETE per id e conferma con un toast", async () => {
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText("Studio Rossi");
  fireEvent.click(screen.getByRole("button", { name: /Elimina Studio Rossi/i }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/discovery/leads/9", { method: "DELETE" })
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

test('Nuovo lead apre direttamente il form manuale e conserva il salvataggio esistente', async () => {
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText('Studio Rossi');
  fireEvent.click(screen.getByRole('button', { name: 'Nuovo lead' }));
  expect(screen.queryByText('Formato CSV atteso:')).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Email', exact: true }), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi lead' }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith('/api/discovery/import', expect.objectContaining({ method: 'POST' })));
  const call = adminFetch.mock.calls.find(([url]) => url === '/api/discovery/import');
  expect(JSON.parse(call[1].body)).toMatchObject({ auto_score: false, leads: [{ email: 'test@example.com', source: 'manual' }] });
});

test('Importa lista apre CSV anche dopo aver chiuso il form manuale; cambio tab resta disponibile', async () => {
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText('Studio Rossi');
  fireEvent.click(screen.getByRole('button', { name: 'Nuovo lead' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chiudi inserimento lead' }));
  fireEvent.click(screen.getByRole('button', { name: 'Importa lista', exact: true }));
  expect(screen.getByText('Formato CSV atteso:')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Inserimento manuale' }));
  expect(screen.getByRole('button', { name: 'Aggiungi lead' })).toBeTruthy();
  expect(adminFetch.mock.calls.some(([, opts]) => opts?.method === 'POST')).toBe(false);
});

test('Ricerca automatica apre Google Places senza avviare ricerche', async () => {
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText('Studio Rossi');
  fireEvent.click(screen.getByRole('button', { name: 'Ricerca automatica' }));
  expect(screen.getByRole('button', { name: 'Avvia ricerca su Google Attività' })).toBeTruthy();
  expect(adminFetch.mock.calls.some(([url]) => url.includes('search-places'))).toBe(false);
});
