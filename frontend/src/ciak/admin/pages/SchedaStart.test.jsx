/**
 * Scheda cliente Start: stesso impianto della scheda partner (schede in alto).
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SchedaStart } from "./SchedaStart";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));

const RIGA = {
  client_id: "c1", nome: "Linda Pavia", email: "linda@x.it", stage: "da_approvare",
  approvati: 3, totale: 6, prossima_azione: "Leggi e approva: La pagina web", prossima_scadenza: null,
  ultimo_movimento: { giorni: 0 }, fermo: false,
  materiali: [
    { type: "positioning", titolo: "Chi sei e cosa offri" },
    { type: "showcase", titolo: "La pagina web" },
  ],
};
const BOZZE = {
  risposte: {}, marchio_scelto: {}, domande: { mancanti: [], dal_team: {}, proposte: {} },
  items: [
    { type: "positioning", generato: true, approval_status: "approved", approvato_da: "ciak-automatico", contenuto: {} },
    { type: "showcase", generato: true, approval_status: "pending_review", contenuto: {} },
  ],
};

beforeEach(() => {
  apiGet.mockImplementation((p) => Promise.resolve(p === "/start/pipeline" ? { colonne: [{ id: "da_approvare", clienti: [RIGA] }] } : BOZZE));
  apiPost.mockResolvedValue({ link: "https://www.ciak.io/cliente/accesso?token=abc", scade_il: "2026-11-11T08:00:00+00:00" });
});

const monta = (url = "/admin/start/c1") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/admin/start/:clientId" element={<SchedaStart />} /></Routes>
    </MemoryRouter>
  );

test("ha le schede come la scheda partner e parte dalla Panoramica", async () => {
  monta();
  expect(await screen.findByText("Cosa fare adesso")).toBeTruthy();
  for (const id of ["panoramica", "percorso", "materiali", "documenti", "impostazioni"]) {
    expect(screen.getByTestId(`scheda-${id}`)).toBeTruthy();
  }
  expect(screen.queryByTestId("scheda-pagamenti")).toBeNull();
  expect(screen.queryByText("I 6 materiali, in ordine")).toBeNull();
});

test("Percorso mostra i 6 materiali con Approva sito e dominio", async () => {
  monta();
  fireEvent.click(await screen.findByTestId("scheda-percorso"));
  expect(screen.getByText("I 6 materiali, in ordine")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Approva sito e dominio" })).toBeTruthy();
  expect(screen.getByText(/Approvato in automatico/)).toBeTruthy();
});

test("la scheda si apre da link diretto (?scheda=percorso)", async () => {
  monta("/admin/start/c1?scheda=percorso");
  expect(await screen.findByText("I 6 materiali, in ordine")).toBeTruthy();
  expect(screen.queryByText("Cosa fare adesso")).toBeNull();
});

test("Impostazioni: genera un link nuovo solo su richiesta, con l'email del cliente", async () => {
  monta();
  fireEvent.click(await screen.findByTestId("scheda-impostazioni"));
  expect(apiPost).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Genera un link nuovo" }));
  await waitFor(() => expect(screen.getByTestId("link-generato").textContent).toContain("token=abc"));
  expect(apiPost).toHaveBeenCalledWith("/clients/c1/link-accesso", { email: "linda@x.it" });
});
