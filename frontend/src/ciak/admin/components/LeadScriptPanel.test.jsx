/**
 * Scheda lead — blocco "Scrivi": copia il testo dallo Script e registra cosa è partito.
 * Non invia nulla: l'unica scrittura è POST /leads/{id}/tocco (e PATCH origine).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LeadScriptPanel } from "./LeadScriptPanel";
import { adminFetch, getAdminUser } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn(), getAdminUser: jest.fn() }));

const LEAD = { id: "L1", display_name: "Giulia Esempio", niche_detected: "coaching", status: "discovered", origine: "ex_cliente", touches: [] };

beforeEach(() => {
  jest.clearAllMocks();
  getAdminUser.mockReturnValue({ admin_type: "mariangela" });
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
  adminFetch.mockImplementation(async (url, opts) => {
    if (url.endsWith("/tocco")) {
      const b = JSON.parse(opts.body);
      return { ok: true, json: async () => ({
        ok: true, status: "contacted", next_followup: "2026-10-10", last_contacted_at: "2026-10-05T10:00:00Z",
        touch: { channel: b.channel, via: "manuale", message: b.message, by: b.sender, at: "2026-10-05T10:00:00Z", systeme: false },
      }) };
    }
    return { ok: true, json: async () => ({}) };
  });
});

const testo = () => screen.getByLabelText("Testo del messaggio").value;

test("il testo si compila da solo: messaggio dell'origine, nome, settore, firma di chi è collegato", () => {
  render(<LeadScriptPanel lead={LEAD} />);
  expect(screen.getByRole("combobox", { name: "Messaggio" }).value).toBe("risveglio_ex");
  expect(testo()).toMatch(/^Buongiorno Giulia,/);
  expect(testo()).toMatch(/sono Mariangela di Evolution Pro/);
  expect(testo().trim().endsWith("Mariangela\nEvolution Pro")).toBe(true);
});

test("cambiare chi scrive cambia nome e firma, non il resto del testo", () => {
  render(<LeadScriptPanel lead={LEAD} />);
  fireEvent.click(screen.getByRole("button", { name: "Claudio" }));
  expect(testo()).toMatch(/sono Claudio di Evolution Pro/);
  expect(testo().trim().endsWith("Claudio Bertogliatti\nEvolution Pro")).toBe(true);
});

test("fuori da LinkedIn propone la versione breve", () => {
  render(<LeadScriptPanel lead={LEAD} />);
  fireEvent.click(screen.getByRole("button", { name: "Instagram / Facebook" }));
  expect(screen.getByRole("combobox", { name: "Messaggio" }).value).toBe("breve");
});

test("con un segnaposto da completare (testo 3, [contesto]) avvisa e blocca 'segna come inviato'", () => {
  render(<LeadScriptPanel lead={{ ...LEAD, origine: "rete" }} />);
  expect(screen.getByRole("alert").textContent).toMatch(/\[contesto\]/);
  expect(screen.getByRole("button", { name: /Copia e segna come inviato/ })).toBeDisabled();
  // completato a mano: si sblocca
  fireEvent.change(screen.getByLabelText("Testo del messaggio"), { target: { value: testo().replace("[contesto]", "un corso di formazione") } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: /Copia e segna come inviato/ })).not.toBeDisabled();
});

test("'Copia e segna come inviato': copia, registra il tocco con canale/messaggio/mittente, mostra cronologia e promemoria", async () => {
  const onChanged = jest.fn();
  render(<LeadScriptPanel lead={LEAD} onChanged={onChanged} />);
  fireEvent.click(screen.getByRole("button", { name: /Copia e segna come inviato/ }));
  await screen.findByText(/segnato come inviato/);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/^Buongiorno Giulia/));
  const call = adminFetch.mock.calls.find(([u]) => u.endsWith("/tocco"));
  expect(call[0]).toBe("/api/admin/ciak/leads/L1/tocco");
  expect(call[1].method).toBe("POST");
  expect(JSON.parse(call[1].body)).toEqual({ channel: "linkedin", message: "risveglio_ex", sender: "Mariangela" });
  expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "contacted", next_followup: "2026-10-10" }));
  expect(screen.getByText(/Inviato: Ex cliente con analisi/)).toBeTruthy();
  expect(screen.getByText(/Messaggio di seguito da mandare/)).toBeTruthy();
  // il messaggio proposto adesso è il seguito
  expect(screen.getByRole("combobox", { name: "Messaggio" }).value).toBe("seguito");
});

test("'Copia' da sola non registra niente", async () => {
  render(<LeadScriptPanel lead={LEAD} />);
  fireEvent.click(screen.getByRole("button", { name: "Copia" }));
  await screen.findByText(/Testo copiato/);
  expect(adminFetch).not.toHaveBeenCalled();
});

test("se la registrazione fallisce lo dice e non mostra un invio che non c'è", async () => {
  adminFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: "Lead non trovato" }) });
  render(<LeadScriptPanel lead={LEAD} />);
  fireEvent.click(screen.getByRole("button", { name: /Copia e segna come inviato/ }));
  await screen.findByText("Lead non trovato");
  expect(screen.getByText("Ancora nessun contatto registrato.")).toBeTruthy();
  expect(screen.queryByText(/Messaggio di seguito da mandare/)).toBeNull();
});

test("cambiare l'origine la salva sul lead e cambia il messaggio consigliato", async () => {
  render(<LeadScriptPanel lead={{ ...LEAD, origine: "" }} />);
  expect(screen.getByRole("combobox", { name: "Messaggio" }).value).toBe("breve");
  fireEvent.change(screen.getByLabelText("Origine"), { target: { value: "setter" } });
  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith("/api/discovery/leads/L1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ origine: "setter" }) })));
  expect(screen.getByRole("combobox", { name: "Messaggio" }).value).toBe("risveglio_setter");
});

test("la cronologia mostra chi, dove e quando, anche per i tocchi vecchi via email", () => {
  render(<LeadScriptPanel lead={{ ...LEAD, touches: [
    { channel: "email", via: "smtp_brevo", subject: "Un'idea per te", at: "2026-09-20T10:00:00Z", by: "admin" },
    { channel: "linkedin", via: "manuale", message: "profilo_trovato", by: "Mariangela", at: "2026-09-28T10:00:00Z" },
  ] }} />);
  const lista = screen.getByTestId("lead-script-panel").querySelector("ul");
  const righe = within(lista).getAllByRole("listitem");
  expect(righe).toHaveLength(2);
  expect(righe[0].textContent).toMatch(/Profilo trovato.*Mariangela · LinkedIn/);
  expect(righe[1].textContent).toMatch(/Un'idea per te.*Email/);
});
