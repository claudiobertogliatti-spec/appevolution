/**
 * Ciak Admin — Coda Acquisizione (outbound) + inserimento manuale lead.
 *
 * La coda pesca dai discovery lead (outbound); Mariangela/Claudio possono
 * inserire un lead a mano. Colonne da dati reali: passaggio ← stato, prossima
 * azione ← derivata dallo stato, responsabile ← owner, scadenza ← next_followup.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AcquisizioneQueue } from "./AcquisizioneQueue";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

const LEADS = [
  { id: "l1", display_name: "Mario Verdi", email: "m@x.it", status: "contacted", owner: "Mariangela", next_followup: "2026-09-20", updated_at: new Date().toISOString() },
  { id: "l2", display_name: "Anna Blu", email: "a@x.it", status: "scored", updated_at: new Date().toISOString() },
];

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "POST") return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    return Promise.resolve({ ok: true, json: async () => ({ leads: LEADS, total: LEADS.length }) });
  });
});

test("la coda mostra i lead outbound con passaggio, responsabile e scadenza reali", async () => {
  render(<AcquisizioneQueue />);
  const r1 = await screen.findByTestId("coda-row-l1");
  expect(r1.textContent).toMatch(/Mario Verdi/);
  expect(r1.textContent).toMatch(/Contattato/); // passaggio ← status
  expect(r1.textContent).toMatch(/Richiama o fai avanzare/); // prossima azione derivata
  expect(r1.textContent).toMatch(/Mariangela/); // owner reale
  expect(r1.textContent).toMatch(/20\/09\/2026/); // next_followup
  // Un lead senza owner/scadenza non inventa nulla.
  const r2 = screen.getByTestId("coda-row-l2");
  expect(r2.textContent).toMatch(/Valutato/);
});

test("inserire un nuovo lead fa POST /api/discovery/leads con source manual e owner", async () => {
  render(<AcquisizioneQueue />);
  await screen.findByTestId("coda-row-l1");
  fireEvent.click(screen.getByTestId("toggle-nuovo-lead"));
  const form = screen.getByTestId("nuovo-lead-form");
  fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Nuovo Tizio" } });
  fireEvent.click(screen.getByTestId("salva-lead"));
  await waitFor(() => {
    const post = adminFetch.mock.calls.find(([u, o]) => u === "/api/discovery/leads" && o?.method === "POST");
    expect(post).toBeTruthy();
    const body = JSON.parse(post[1].body);
    expect(body.source).toBe("manual");
    expect(body.display_name).toBe("Nuovo Tizio");
    expect(body.owner).toBe("Mariangela");
  });
});
