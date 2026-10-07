/**
 * Ciak Admin — Clienti Start: pipeline e scheda cliente.
 * Cio' che deve essere vero a colpo d'occhio: ogni cliente e' nella colonna di chi
 * ha la prossima mossa, un clic apre il suo account, e nella scheda ogni materiale
 * ha UN pulsante giusto per il suo stato (mai "Approva" su qualcosa che non esiste).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
};
const ANNA = { ...LINDA, client_id: "c2", nome: "Anna Rossi", email: "anna@x.it", stage: "attesa_cliente",
  prossima_azione: "Aspetta le risposte del cliente", prossima_scadenza: null };

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

test("ogni cliente sta nella colonna di chi ha la prossima mossa e mostra cosa fare", async () => {
  render(<MemoryRouter><PipelineStart /></MemoryRouter>);
  expect(await screen.findByText("Linda Pavia")).toBeInTheDocument();
  expect(screen.getByText("Leggi e approva: Materiale 1")).toBeInTheDocument();
  expect(screen.getByText("Aspetta le risposte del cliente")).toBeInTheDocument();
  expect(screen.getAllByText("0 di 6 approvati")).toHaveLength(2);
});

test("la ricerca filtra per nome", async () => {
  render(<MemoryRouter><PipelineStart /></MemoryRouter>);
  await screen.findByText("Linda Pavia");
  fireEvent.change(screen.getByPlaceholderText("Cerca per nome o email"), { target: { value: "anna" } });
  expect(screen.queryByText("Linda Pavia")).not.toBeInTheDocument();
  expect(screen.getByText("Anna Rossi")).toBeInTheDocument();
});

test("un clic sulla card apre l'account del cliente", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/start"]}>
      <Routes>
        <Route path="/admin/start" element={<PipelineStart />} />
        <Route path="/admin/start/:clientId" element={<div>SCHEDA</div>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByText("Linda Pavia"));
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
