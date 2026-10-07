/**
 * Ciak Admin — pagina Lead (tabella dei lead in gestione).
 * Cio' che deve essere vero: chi ha compilato il questionario si vede, ogni funzione
 * che esiste sul lead e' nel menu Azioni, e Modifica/Elimina fanno solo cio' che dicono.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { LeadHub } from "./LeadHub";
import { adminFetch, apiGet, errorDetail, getAdminUser } from "../api";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
  getAdminUser: jest.fn(() => null),
  errorDetail: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const L = (over) => ({
  email: "linda@x.it", nome: "Linda Pavia", fase: "questionario", giorni: 1, da: null, call_starts_at: null,
  nome_proprio: null, cognome: null, telefono: "333", ha_account: false, ...over,
});
const BOARD = {
  totale: 3, usciti: 2,
  colonne: [
    { id: "questionario", lead: [L({})] },
    { id: "call_fissata", lead: [] },
    { id: "call_fatta", lead: [
      L({ email: "d@x.it", nome: "Daria Neri", fase: "call_fatta", giorni: 9, ha_account: true }),
      L({ email: "g@x.it", nome: "Gino Blu", fase: "call_fatta", giorni: 20, nome_proprio: "Gino", cognome: "Blu" }),
    ] },
    { id: "trattativa", lead: [] },
  ],
};

function Scheda() {
  const { pathname, search } = useLocation();
  return <div>SCHEDA {pathname}{search}</div>;
}
const monta = () => render(
  <MemoryRouter initialEntries={["/admin/lead"]}>
    <Routes>
      <Route path="/admin/lead" element={<LeadHub />} />
      <Route path="/admin/leads/:email" element={<Scheda />} />
    </Routes>
  </MemoryRouter>,
);
const riga = (nome) => screen.getByText(nome).closest("tr");

beforeEach(() => {
  jest.clearAllMocks();
  getAdminUser.mockReturnValue(null);
  // CRA azzera le implementazioni dei mock a ogni test (resetMocks): si rimettono qui.
  errorDetail.mockImplementation(async (res) => res.detail || `Errore ${res.status}`);
  apiGet.mockResolvedValue(BOARD);
});

test("chi ha compilato il questionario si vede, con le fasi come colonne e il segno dove si trova", async () => {
  monta();
  expect(await screen.findByText("Linda Pavia")).toBeInTheDocument();
  for (const f of ["Questionario", "Call fissata", "Call fatta", "Trattativa"]) {
    expect(screen.getByRole("columnheader", { name: f })).toBeInTheDocument();
  }
  expect(within(riga("Linda Pavia")).getByText("da 1 giorno")).toBeInTheDocument();
  // chi e' alla call fatta ha le due fasi prima superate
  expect(within(riga("Daria Neri")).getAllByRole("img", { name: "Fase superata" })).toHaveLength(2);
  expect(apiGet).toHaveBeenCalledWith("/lead-gestione");
});

test("ordine: prima chi aspetta da piu' tempo; il resto in coda", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  const nomi = screen.getAllByRole("link").map((a) => a.textContent).filter((t) => ["Gino Blu", "Daria Neri", "Linda Pavia"].includes(t));
  expect(nomi).toEqual(["Gino Blu", "Daria Neri", "Linda Pavia"]);
});

test("filtri per fase con i conteggi e ricerca per nome o email", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  expect(screen.getByRole("button", { name: /Tutti 3/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Call fatta 2/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Questionario 1/ }));
  expect(screen.queryByText("Daria Neri")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tutti/ }));
  fireEvent.change(screen.getByPlaceholderText("Cerca per nome o email"), { target: { value: "gino" } });
  expect(screen.getByText("Gino Blu")).toBeInTheDocument();
  expect(screen.queryByText("Linda Pavia")).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Cerca per nome o email"), { target: { value: "zzz" } });
  expect(screen.getByText("Nessun lead corrisponde alla ricerca.")).toBeInTheDocument();
});

test("il menu Azioni ha tutte le funzioni e segna il passo consigliato per la fase", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  fireEvent.click(within(riga("Linda Pavia")).getByRole("button", { name: /Azioni su Linda Pavia/ }));
  const menu = screen.getByRole("menu");
  const voci = within(menu).getAllByRole("menuitem").map((v) => v.textContent.replace("Consigliato", ""));
  expect(voci).toEqual([
    "Questionario e risposte", "Genera il report e il Blueprint", "Conferma call fissata",
    "Ho fatto la call: invia il Blueprint", "Genera la Proposta Partnership", "Riporta a call fatta",
    "Modifica nome, cognome, email, telefono", "Elimina il lead",
  ]);
  // questionario -> consigliato: genera il Blueprint
  expect(within(screen.getByRole("menuitem", { name: /Genera il report/ })).getByText("Consigliato")).toBeInTheDocument();
});

test("una voce apre la scheda del lead gia' sulla sezione giusta", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  fireEvent.click(within(riga("Linda Pavia")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Genera il report/ }));
  expect(await screen.findByText("SCHEDA /admin/leads/linda%40x.it?vai=blueprint")).toBeInTheDocument();
});

test("Esc chiude il menu e il fuoco torna sul pulsante", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  const btn = within(riga("Linda Pavia")).getByRole("button", { name: /Azioni/ });
  fireEvent.click(btn);
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(btn).toHaveFocus();
});

test("Mariangela vede solo cio' che la scheda le lascia fare", async () => {
  getAdminUser.mockReturnValue({ admin_type: "mariangela" });
  monta();
  await screen.findByText("Linda Pavia");
  fireEvent.click(within(riga("Linda Pavia")).getByRole("button", { name: /Azioni/ }));
  expect(within(screen.getByRole("menu")).getAllByRole("menuitem").map((v) => v.textContent.replace("Consigliato", ""))).toEqual([
    "Questionario e risposte", "Conferma call fissata",
  ]);
});

test("Modifica: precompila, salva nome e cognome e manda l'email nuova solo se cambia", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  monta();
  await screen.findByText("Gino Blu");
  fireEvent.click(within(riga("Gino Blu")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Modifica/ }));
  const dlg = screen.getByRole("dialog");
  expect(within(dlg).getByLabelText("Nome")).toHaveValue("Gino");
  expect(within(dlg).getByLabelText("Cognome")).toHaveValue("Blu");
  expect(within(dlg).getByLabelText("Telefono")).toHaveValue("333");
  fireEvent.change(within(dlg).getByLabelText("Telefono"), { target: { value: "+39 347" } });
  fireEvent.click(within(dlg).getByRole("button", { name: "Salva le modifiche" }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalled());
  const [url, opts] = adminFetch.mock.calls[0];
  expect(url).toBe("/api/admin/ciak/lead");
  expect(opts.method).toBe("PATCH");
  expect(JSON.parse(opts.body)).toEqual({ email: "g@x.it", nome: "Gino", cognome: "Blu", phone: "+39 347" }); // niente nuova_email
  await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2)); // ricarica
});

test("Modifica: email cambiata va in nuova_email; un rifiuto del server si legge nella finestra", async () => {
  adminFetch.mockResolvedValue({ ok: false, status: 409, detail: "Ha gia' un account Ciak: l'email dell'account non si cambia da qui." });
  monta();
  await screen.findByText("Daria Neri");
  fireEvent.click(within(riga("Daria Neri")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Modifica/ }));
  const dlg = screen.getByRole("dialog");
  expect(within(dlg).getByLabelText("Nome")).toHaveValue("Daria Neri"); // nome intero: il cognome lo separa lui
  fireEvent.change(within(dlg).getByLabelText("Email"), { target: { value: "nuova@x.it" } });
  fireEvent.click(within(dlg).getByRole("button", { name: "Salva le modifiche" }));
  expect(await within(dlg).findByRole("alert")).toHaveTextContent("Ha gia' un account Ciak");
  expect(JSON.parse(adminFetch.mock.calls[0][1].body).nuova_email).toBe("nuova@x.it");
  expect(screen.getByRole("dialog")).toBeInTheDocument(); // resta aperta
});

test("Modifica: nome vuoto o email non valida non partono", async () => {
  monta();
  await screen.findByText("Linda Pavia");
  fireEvent.click(within(riga("Linda Pavia")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Modifica/ }));
  const dlg = screen.getByRole("dialog");
  fireEvent.change(within(dlg).getByLabelText("Email"), { target: { value: "boh" } });
  fireEvent.click(within(dlg).getByRole("button", { name: "Salva le modifiche" }));
  expect(within(dlg).getByRole("alert")).toHaveTextContent("L'email non è valida.");
  expect(adminFetch).not.toHaveBeenCalled();
});

test("Elimina: la casella dell'account compare solo se ha un account e parte spenta", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  monta();
  await screen.findByText("Daria Neri");
  // senza account: niente casella
  fireEvent.click(within(riga("Linda Pavia")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Elimina/ }));
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
  // con account: casella spenta; senza spuntarla l'account resta
  fireEvent.click(within(riga("Daria Neri")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Elimina/ }));
  const box = screen.getByRole("checkbox");
  expect(box).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Elimina il lead" }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(1));
  expect(adminFetch.mock.calls[0][0]).toBe("/api/admin/ciak/lead?email=d%40x.it&elimina_account=false");
  expect(adminFetch.mock.calls[0][1]).toEqual({ method: "DELETE" });
});

test("Elimina con la casella spuntata chiede anche l'account; un 409 si legge e non chiude", async () => {
  adminFetch.mockResolvedValue({ ok: false, status: 409, detail: "Ha gia' acquistato: l'account non si elimina da qui." });
  monta();
  await screen.findByText("Daria Neri");
  fireEvent.click(within(riga("Daria Neri")).getByRole("button", { name: /Azioni/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Elimina/ }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Elimina il lead" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Ha gia' acquistato");
  expect(adminFetch.mock.calls[0][0]).toContain("elimina_account=true");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("fonte che non risponde: 'Dato non disponibile' con Riprova, mai una tabella vuota finta", async () => {
  apiGet.mockRejectedValueOnce(new Error("500"));
  monta();
  expect(await screen.findByText("Dato non disponibile.")).toBeInTheDocument();
  apiGet.mockResolvedValue(BOARD);
  fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
  expect(await screen.findByText("Linda Pavia")).toBeInTheDocument();
});

test("nessun lead in gestione e conto di chi e' gia' uscito", async () => {
  apiGet.mockResolvedValue({ totale: 0, usciti: 1, colonne: [] });
  monta();
  expect(await screen.findByText("Nessun lead in gestione.")).toBeInTheDocument();
  expect(screen.getByText(/Oggi 1 è già uscito\./)).toBeInTheDocument();
});
