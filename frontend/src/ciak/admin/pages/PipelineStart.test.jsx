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

// La scheda ha le schede in alto (come quella del partner): si apre direttamente su quella da provare.
function scheda(tab = "panoramica") {
  return render(
    <MemoryRouter initialEntries={[tab === "panoramica" ? "/admin/start/c1" : `/admin/start/c1?scheda=${tab}`]}>
      <Routes><Route path="/admin/start/:clientId" element={<SchedaStart />} /></Routes>
    </MemoryRouter>,
  );
}

test("scheda: un solo pulsante giusto per stato di ogni materiale", async () => {
  scheda("percorso");
  await screen.findByText("I 6 materiali, in ordine");
  expect(screen.getAllByRole("button", { name: "Approva" })).toHaveLength(1); // solo la bozza da approvare
  expect(screen.getAllByRole("button", { name: "Genera bozza" })).toHaveLength(2); // brand_kit e readiness
  expect(screen.getAllByRole("button", { name: "Riprova" })).toHaveLength(1); // profili in errore
  expect(screen.getByText("In generazione…")).toBeInTheDocument();
  expect(screen.getByText("Approvato · il cliente lo vede")).toBeInTheDocument();
});

test("scheda: approvare chiama l'endpoint del solo materiale e mostra l'esito subito", async () => {
  scheda("percorso");
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

const RISPOSTE_8 = Object.fromEntries(
  ["nicchia", "momento_di_vita", "promessa", "trasformazione_90gg", "metodo_nome", "differenza_riconoscibile", "mercato_affollato", "prezzo_e_formato"]
    .map((k) => [k, `Risposta vera per ${k}`]),
);

test("scheda: dice chi ha approvato, ferma il testo di ripiego, e il sito si approva insieme al dominio", async () => {
  apiGet.mockImplementation((path) => Promise.resolve(path === "/start/pipeline" ? PIPELINE : {
    ...BOZZE,
    risposte: RISPOSTE_8,
    items: [
      { type: "positioning", generato: true, approval_status: "approved", approvato_da: "ciak-automatico", ripiego: false, contenuto: {} },
      { type: "brand_kit", generato: true, approval_status: "approved", approvato_da: "claudio@x.it", ripiego: false, contenuto: {} },
      { type: "social_profiles", generato: true, approval_status: "pending_review", ripiego: true, contenuto: {} },
      { type: "showcase", generato: true, approval_status: "pending_review", ripiego: false, contenuto: {} },
      { type: "content_plan_90d", generato: false },
      { type: "partnership_readiness", generato: false },
    ],
    domande: { inviate_at: null, riaperto_dal_team: false, dal_team: {}, proposte: {}, mancanti: [] },
  }));
  scheda("percorso");
  await screen.findByText("I 6 materiali, in ordine");
  expect(screen.getByText("Approvato in automatico · il cliente lo vede")).toBeInTheDocument();
  expect(screen.getByText("Approvato · il cliente lo vede")).toBeInTheDocument(); // quello approvato a mano
  expect(screen.getByText("Testo di ripiego · da rivedere")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approva sito e dominio" })).toBeInTheDocument();
  expect(screen.getByText(/Approvare vuol dire che il sito e' online sul suo dominio/)).toBeInTheDocument();
  expect(screen.getByText(/La sintesi automatica non e' riuscita/)).toBeInTheDocument();
});

test("scheda: le 20 domande mostrano chi ha scritto cosa, le proposte e quelle da scrivere", async () => {
  apiGet.mockImplementation((path) => Promise.resolve(path === "/start/pipeline" ? PIPELINE : {
    ...BOZZE,
    risposte: { ...RISPOSTE_8, desideri_avatar: "Capire quale strada professionale prendere" },
    marchio_scelto: { colors: ["#0F2A4A", "#5B7C99", "#D9A441"], palette_id: "sicuro", tone_of_voice: "Parlo in modo caldo", parole_chiave: ["autenticità"], brand_completed_at: "2026-10-06T07:32:41+00:00" },
    domande: {
      inviate_at: "2026-10-02T10:00:00+00:00", riaperto_dal_team: true,
      dal_team: { desideri_avatar: { da: "claudio@x.it", at: "2026-10-12T09:00:00+00:00" } },
      proposte: { paure_avatar: "Paura di non essere all'altezza" },
      mancanti: ["paure_avatar", "origin_story"],
    },
  }));
  scheda("materiali");
  await screen.findByText(/Le 20 domande/);
  expect(screen.getByText(/Le 20 domande · 9 su 20 · riaperte per le mancanti/)).toBeInTheDocument();
  expect(screen.getByText("Mancano 2 risposte")).toBeInTheDocument();
  expect(screen.getByText("1 inserite dal team")).toBeInTheDocument();
  expect(screen.getAllByText("Capire quale strada professionale prendere").length).toBeGreaterThan(0);
  expect(screen.getByText(/Inserita dal team il/)).toBeInTheDocument();
  expect(screen.getByText(/Proposta in attesa:/)).toBeInTheDocument();
  expect(screen.getAllByText("Da scrivere").length).toBeGreaterThan(0);
  // il marchio EVO: colori, voce, parole
  expect(screen.getByText(/Il marchio scelto · inviato il/)).toBeInTheDocument();
  expect(screen.getAllByText("#0F2A4A").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Parlo in modo caldo").length).toBeGreaterThan(0);
  expect(screen.getAllByText("autenticità").length).toBeGreaterThan(0);
});
