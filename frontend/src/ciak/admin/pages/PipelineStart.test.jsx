/**
 * Ciak Admin — Clienti Start: pipeline e scheda cliente.
 * Cio' che deve essere vero a colpo d'occhio: per ogni cliente a che punto e' il
 * pacchetto, di chi e' la mossa, se e' fermo; un clic apre il suo account, e nella scheda ogni materiale
 * ha UN pulsante giusto per il suo stato (mai "Approva" su qualcosa che non esiste).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PipelineStart } from "./PipelineStart";
import { SchedaStart } from "./SchedaStart";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));

const MAT = (stati) =>
  ["positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d", "partnership_readiness"].map(
    (type, i) => ({ type, step_id: `s${i}`, titolo: `Materiale ${i + 1}`, stato: stati[i] || "da_fare" }),
  );

const LINDA = {
  client_id: "c1",
  nome: "Linda Pavia",
  email: "linda@x.it",
  stage: "da_approvare",
  prossima_azione: "Leggi e approva: Materiale 1",
  approvati: 0,
  totale: 6,
  materiali: MAT(["da_approvare"]),
  prossima_scadenza: { tappa: 1, titolo: "Posizionamento e brand", data_promessa: "08/10/2026", giorni: 1, urgenza: "imminente" },
  ultimo_movimento: { quando: "2026-10-10T08:00:00+00:00", giorni: 1, da_acquisto: false },
  fermo: false,
};
const ANNA = { ...LINDA, client_id: "c2", nome: "Anna Rossi", email: "anna@x.it", stage: "attesa_cliente",
  prossima_azione: "Aspetta le risposte del cliente", prossima_scadenza: null,
  ultimo_movimento: { quando: "2026-10-01T10:00:00+00:00", giorni: 10, da_acquisto: true }, fermo: true };

const PIPELINE = {
  totale: 2,
  colonne: [
    { id: "attesa_cliente", titolo: "Aspetta il cliente", clienti: [ANNA] },
    { id: "da_preparare", titolo: "Da preparare", clienti: [] },
    { id: "da_approvare", titolo: "Da approvare", clienti: [LINDA] },
    { id: "completato", titolo: "Completato", clienti: [] },
  ],
};

const BOZZE = {
  client_id: "c1",
  risposte: {},
  marchio_scelto: {},
  items: [
    { type: "positioning", generato: true, approval_status: "pending_review", contenuto: { frase: "Aiuto le neomamme" } },
    { type: "brand_kit", generato: false },
    { type: "social_profiles", generato: false, generation_status: "errore", generation_error: "boom" },
    { type: "showcase", generato: true, approval_status: "approved", contenuto: {} },
    { type: "content_plan_90d", generato: false, generation_status: "in_corso" },
    { type: "partnership_readiness", generato: false },
  ],
};

beforeEach(() => {
  jest.resetAllMocks();
  apiGet.mockImplementation((path) => Promise.resolve(path === "/start/pipeline" ? PIPELINE : BOZZE));
  apiPost.mockResolvedValue({ success: true });
});

test("una riga per cliente: pacchetto, di chi e' la mossa, ultimo movimento, fermo", async () => {
  render(<MemoryRouter><PipelineStart /></MemoryRouter>);
  expect(await screen.findByText("Linda Pavia")).toBeInTheDocument();
  for (const f of ["Cliente", "Pacchetto", "Prossima mossa", "Ultimo movimento"]) {
    expect(screen.getByRole("columnheader", { name: f })).toBeInTheDocument();
  }
  const linda = screen.getByText("Linda Pavia").closest("tr");
  expect(within(linda).getByText("Tocca a te")).toBeInTheDocument();
  expect(within(linda).getByText("Leggi e approva: Materiale 1")).toBeInTheDocument();
  expect(within(linda).getByText("ieri")).toBeInTheDocument();
  expect(within(linda).queryByText("Fermo")).not.toBeInTheDocument();
  // il pacchetto e' a parole, non solo a colori: 6 materiali con il loro stato
  expect(within(linda).getByText("Materiale 1: Da approvare")).toBeInTheDocument();
  expect(within(linda).getByText("Materiale 2: Da fare")).toBeInTheDocument();
  expect(within(linda).getByText(/0 di 6/)).toBeInTheDocument();
  const anna = screen.getByText("Anna Rossi").closest("tr");
  expect(within(anna).getByText("Tocca al cliente")).toBeInTheDocument();
  expect(within(anna).getByText("Fermo")).toBeInTheDocument();
  expect(within(anna).getByText(/Nessun movimento dall'acquisto/)).toBeInTheDocument();
  // chi aspetta te viene prima di chi aspetta il cliente
  const nomi = screen.getAllByRole("row").slice(1).map((r) => r.textContent);
  expect(nomi[0]).toMatch(/Linda Pavia/);
});

test("filtri con i conteggi (anche Fermi), e ricerca per nome", async () => {
  render(<MemoryRouter><PipelineStart /></MemoryRouter>);
  await screen.findByText("Linda Pavia");
  expect(screen.getByRole("button", { name: /Tutti 2/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Fermi 1/ }));
  expect(screen.queryByText("Linda Pavia")).not.toBeInTheDocument();
  expect(screen.getByText("Anna Rossi")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Da approvare 1/ }));
  expect(screen.queryByText("Anna Rossi")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tutti/ }));
  fireEvent.change(screen.getByPlaceholderText("Cerca per nome o email"), { target: { value: "anna" } });
  expect(screen.queryByText("Linda Pavia")).not.toBeInTheDocument();
  expect(screen.getByText("Anna Rossi")).toBeInTheDocument();
});

test("un clic sulla riga apre l'account del cliente", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/start"]}>
      <Routes>
        <Route path="/admin/start" element={<PipelineStart />} />
        <Route path="/admin/start/:clientId" element={<div>SCHEDA</div>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click((await screen.findByText("Linda Pavia")).closest("tr"));
  expect(await screen.findByText("SCHEDA")).toBeInTheDocument();
});

function scheda() {
  return render(
    <MemoryRouter initialEntries={["/admin/start/c1"]}>
      <Routes><Route path="/admin/start/:clientId" element={<SchedaStart />} /></Routes>
    </MemoryRouter>,
  );
}

test("scheda: un solo pulsante giusto per stato di ogni materiale", async () => {
  scheda();
  await screen.findByText("Cosa fare adesso");
  expect(screen.getAllByRole("button", { name: "Approva" })).toHaveLength(1); // solo la bozza da approvare
  expect(screen.getAllByRole("button", { name: "Genera bozza" })).toHaveLength(2); // brand_kit e readiness
  expect(screen.getAllByRole("button", { name: "Riprova" })).toHaveLength(1); // profili in errore
  expect(screen.getByText("In generazione…")).toBeInTheDocument();
  expect(screen.getByText("Approvato · il cliente lo vede")).toBeInTheDocument();
});

test("scheda: approvare chiama l'endpoint del solo materiale e mostra l'esito subito", async () => {
  scheda();
  fireEvent.click(await screen.findByRole("button", { name: "Approva" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/start/c1/deliverable/approva", { tipo: "positioning" }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Approvato: ora il cliente lo vede.");
});

test("scheda: cliente non Start attivo non mostra pulsanti ma un messaggio", async () => {
  apiGet.mockImplementation((path) => Promise.resolve(path === "/start/pipeline" ? { totale: 0, colonne: [] } : BOZZE));
  scheda();
  expect(await screen.findByText(/non risulta tra i clienti Start/)).toBeInTheDocument();
});
