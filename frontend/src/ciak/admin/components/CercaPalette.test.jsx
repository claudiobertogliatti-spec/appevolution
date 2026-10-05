import { createRef } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

jest.mock("../api", () => ({ apiGet: jest.fn() }));

import { CercaPalette } from "./CercaPalette";
import { apiGet } from "../api";

const PAGINE = [
  { to: "/admin/trattative", label: "Trattative", desc: "Pipeline dopo il Blueprint", department: "Vendite" },
  { to: "/admin/fatture", label: "Fatture", desc: "Genera e scarica", department: "Back office" },
];

// Persone con dati sporchi: email gia' normalizzata dal backend, nome in maiuscolo.
const PERSONE = [
  { email: "rosa@x.it", nome: "ROSA NERI", tipo: "lead", label: "Lead", stato: "call_booked", ha_scheda: true, partner_id: null },
  { email: "rino@x.it", nome: "Rino Gialli", tipo: "cliente_start", label: "Cliente Ciak Start", stato: null, ha_scheda: true, partner_id: null },
  { email: "rita@x.it", nome: "Rita Blu", tipo: "partner", label: "Partner", stato: null, ha_scheda: false, partner_id: "p1" },
];

function monta(extra = {}) {
  const props = { open: true, onClose: jest.fn(), onSelect: jest.fn(), onAuthExpired: jest.fn(), pages: PAGINE, panelRef: createRef(), ...extra };
  render(<CercaPalette {...props} />);
  return props;
}

const scrivi = (testo) => fireEvent.change(screen.getByRole("combobox"), { target: { value: testo } });
const tasto = (key) => fireEvent.keyDown(screen.getByRole("combobox"), { key });

beforeEach(() => apiGet.mockReset());

test("chiusa non disegna niente e non chiama l'API", () => {
  const { container } = render(<CercaPalette open={false} pages={PAGINE} panelRef={createRef()} />);
  expect(container.firstChild).toBeNull();
  expect(apiGet).not.toHaveBeenCalled();
});

test("sotto le due lettere dice cosa scrivere e non cerca", async () => {
  monta();
  expect(screen.getByText(/almeno 2 lettere/)).toBeTruthy();
  scrivi("r");
  await new Promise((r) => setTimeout(r, 350));
  expect(apiGet).not.toHaveBeenCalled();
});

test("trova persone con ruolo e stato scritti per esteso", async () => {
  apiGet.mockResolvedValue({ items: PERSONE });
  monta();
  scrivi("ri");
  expect(await screen.findByText("ROSA NERI")).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith("/cerca", { q: "ri" });
  expect(screen.getByText("rosa@x.it · Call prenotata")).toBeTruthy();
  expect(screen.getByText("Cliente Ciak Start")).toBeTruthy();
  expect(screen.getByText("Partner")).toBeTruthy();
});

test("una sola chiamata per una digitazione veloce", async () => {
  apiGet.mockResolvedValue({ items: [] });
  monta();
  scrivi("ro"); scrivi("ros"); scrivi("rosa");
  await screen.findByText("Nessuna persona trovata.");
  expect(apiGet).toHaveBeenCalledTimes(1);
  expect(apiGet).toHaveBeenCalledWith("/cerca", { q: "rosa" });
});

test("Invio apre la prima riga e chiude; la persona porta alla sua scheda", async () => {
  apiGet.mockResolvedValue({ items: PERSONE });
  const p = monta();
  scrivi("ro");
  await screen.findByText("ROSA NERI");
  tasto("Enter");
  expect(p.onSelect).toHaveBeenCalledWith("/admin/leads/rosa%40x.it");
  expect(p.onClose).toHaveBeenCalled();
});

test("le frecce scorrono le righe e la selezione e' annunciata", async () => {
  apiGet.mockResolvedValue({ items: PERSONE });
  const p = monta();
  scrivi("ri");
  await screen.findByText("ROSA NERI");
  tasto("ArrowDown"); // prima riga
  tasto("ArrowDown"); // seconda
  const box = screen.getByRole("combobox");
  expect(box.getAttribute("aria-activedescendant")).toBe("cerca-opt-1");
  expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
  tasto("ArrowUp"); tasto("ArrowUp"); // torna in cima e gira all'ultima
  expect(box.getAttribute("aria-activedescendant")).toBe("cerca-opt-" + (screen.getAllByRole("option").length - 1));
  tasto("Enter");
  expect(p.onSelect).toHaveBeenCalledTimes(1);
});

test("un partner senza scheda lead apre la Pipeline Partner", async () => {
  apiGet.mockResolvedValue({ items: [PERSONE[2]] });
  const p = monta();
  scrivi("rita");
  fireEvent.click(await screen.findByText("Rita Blu"));
  expect(p.onSelect).toHaveBeenCalledWith("/admin/partner");
});

test("mostra anche le pagine che corrispondono, e solo quelle ricevute dal guscio", async () => {
  apiGet.mockResolvedValue({ items: [] });
  const p = monta();
  scrivi("fatt");
  expect(await screen.findByText("Fatture")).toBeTruthy();
  expect(screen.queryByText("Trattative")).toBeNull();
  fireEvent.click(screen.getByText("Fatture"));
  expect(p.onSelect).toHaveBeenCalledWith("/admin/fatture");
});

test("una pagina fuori dall'elenco del ruolo non compare mai", async () => {
  apiGet.mockResolvedValue({ items: [] });
  monta({ pages: [PAGINE[0]] }); // il ruolo non vede Fatture
  scrivi("fatture");
  await screen.findByText("Nessuna persona trovata.");
  expect(screen.queryByText("Fatture")).toBeNull();
});

test("nessun risultato lo dice", async () => {
  apiGet.mockResolvedValue({ items: [] });
  monta();
  scrivi("zzz");
  expect(await screen.findByText("Nessuna persona trovata.")).toBeTruthy();
});

test("ricerca non disponibile: messaggio chiaro, non un elenco vuoto muto", async () => {
  apiGet.mockRejectedValue(new Error("Errore 500"));
  monta();
  scrivi("ros");
  expect(await screen.findByText(/Ricerca non disponibile/)).toBeTruthy();
  expect(screen.queryByText("Nessuna persona trovata.")).toBeNull();
});

test("token scaduto: avvisa l'app", async () => {
  apiGet.mockRejectedValue(new Error("AUTH_EXPIRED"));
  const p = monta();
  scrivi("ros");
  await waitFor(() => expect(p.onAuthExpired).toHaveBeenCalled());
});

test("una risposta vecchia che arriva dopo non sovrascrive quella nuova", async () => {
  let rispondiVecchia;
  apiGet
    .mockImplementationOnce(() => new Promise((res) => { rispondiVecchia = res; }))
    .mockResolvedValueOnce({ items: [PERSONE[1]] });
  monta();
  scrivi("ro");
  await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));
  scrivi("rino");
  expect(await screen.findByText("Rino Gialli")).toBeTruthy();
  await act(async () => { rispondiVecchia({ items: [PERSONE[0]] }); });
  expect(screen.queryByText("ROSA NERI")).toBeNull();
  expect(screen.getByText("Rino Gialli")).toBeTruthy();
});

test("mentre cerca non restano righe del testo di prima (Invio non apre la persona sbagliata)", async () => {
  let rispondi;
  apiGet
    .mockResolvedValueOnce({ items: [PERSONE[0]] })
    .mockImplementationOnce(() => new Promise((res) => { rispondi = res; }));
  const p = monta();
  scrivi("ros");
  await screen.findByText("ROSA NERI");
  scrivi("rita");
  expect(await screen.findByText("Cerco…")).toBeTruthy();
  expect(screen.queryByText("ROSA NERI")).toBeNull();
  tasto("Enter");
  expect(p.onSelect).not.toHaveBeenCalled();
  await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2)); // la richiesta parte dopo l'attesa
  await act(async () => { rispondi({ items: [PERSONE[2]] }); });
  expect(await screen.findByText("Rita Blu")).toBeTruthy();
});

test("il pannello e' un dialogo con nome, per i lettori di schermo", () => {
  monta();
  expect(screen.getByRole("dialog", { name: "Cerca persone e pagine" }).getAttribute("aria-modal")).toBe("true");
});
