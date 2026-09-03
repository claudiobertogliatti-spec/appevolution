/**
 * Ciak Admin — Amministrazione: obiettivo, cassa del mese, posizioni.
 *
 * Il dato esiste dall'1/9 ma nessuna schermata lo mostrava: per segnare una
 * rata incassata serviva uno script con token. Le tre cose che devono essere
 * vere senza cliccare: quanto manca all'obiettivo, cosa scade nel mese e in che
 * ordine, quanto resta da recuperare. E l'unica azione che tiene onesti i
 * numeri (segnare l'esito di una rata) deve chiedere conferma con nome e
 * importo, non con un confirm() del browser.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Amministrazione } from "./Amministrazione";
import { apiGet, apiPatch } from "../api";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
}));

const OBIETTIVO = {
  titolo: "€10.000 entro il 30/9",
  target: 10000,
  incassato: 375,
  gap: 9625,
  giorni_rimasti: 27,
  ritmo_necessario: 356.48,
  proiezione_al_ritmo_attuale: 703,
  valore_leve_vive: 4927,
  leve_coprono_il_gap: false,
  scoperto: 4698,
  leve_ferme: [
    { nome: "Andrea Fredi", valore: 1700, giorni_fermi: 27, dipende_da: "una consegna nostra" },
  ],
  leve_vive: [
    { nome: "Rosanna", valore: 1850, stato: "aperta", dipende_da: "solo una call" },
    { nome: "Andrea Fredi", valore: 1700, stato: "aperta", dipende_da: "una consegna nostra" },
  ],
};

const RIEPILOGO = {
  mese: "2026-09",
  previsto_nel_mese: 559,
  gia_incassato_nel_mese: 0,
  rate_nel_mese: 2,
  scade_oggi: [],
  in_ritardo: [],
  importo_in_ritardo: 0,
  crediti_aperti: 3,
  a_condizione: [{ nome: "Luigi Calafiore", importo: 930, condizione: "a meta' percorso" }],
  residuo_totale: 3549,
  ricorrente_nel_mese: 199,
  sospese_dal_sollecito: [],
};

const LISTA = {
  totale: 4,
  crediti: [
    {
      id: "calafiore",
      nome: "Luigi Calafiore",
      importo_totale: 1860,
      causale: "Partnership",
      stato: "aperto",
      tipo: "credito",
      rate: [
        { numero: 1, importo: 930, condizione: "a meta' percorso", stato: "attesa", stato_effettivo: "attesa" },
        { numero: 2, importo: 930, condizione: "a lancio avvenuto", stato: "attesa", stato_effettivo: "attesa" },
      ],
    },
    {
      id: "depalma",
      nome: "Annamaria Depalma",
      importo_totale: 1560,
      causale: "Chiusura bonaria",
      stato: "in_piano",
      tipo: "credito",
      documento: "Accordo Bonario.pdf",
      rate: [
        { numero: 1, importo: 360, scadenza: "2026-09-15", stato: "attesa", stato_effettivo: "attesa" },
        { numero: 2, importo: 240, scadenza: "2026-10-15", stato: "attesa", stato_effettivo: "attesa" },
      ],
    },
    {
      id: "eva",
      nome: "Eva Gugliucciello",
      importo_totale: 398,
      causale: "Mensilita'",
      stato: "aperto",
      tipo: "ricorrente",
      rate: [
        { numero: 1, importo: 199, scadenza: "2026-09-10", stato: "attesa", stato_effettivo: "attesa" },
        { numero: 2, importo: 199, scadenza: "2026-10-10", stato: "attesa", stato_effettivo: "attesa" },
      ],
    },
    {
      id: "tornello",
      nome: "Mariantonietta Tornello",
      importo_totale: 129,
      causale: "Mensilita'",
      stato: "aperto",
      tipo: "credito",
      non_sollecitare: true,
      rate: [{ numero: 1, importo: 129, scadenza: "2026-08-10", stato: "attesa", stato_effettivo: "da_verificare" }],
    },
  ],
};

function mockApi() {
  apiGet.mockImplementation(async (path) => {
    if (path === "/obiettivo/10k-settembre") return OBIETTIVO;
    if (path === "/crediti/riepilogo") return RIEPILOGO;
    if (path === "/crediti") return LISTA;
    throw new Error(`path inatteso ${path}`);
  });
  apiPatch.mockResolvedValue({ success: true });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi();
});

test("in cima dice quanto e' entrato, quanto manca e in quanti giorni", async () => {
  render(<Amministrazione />);
  const hero = await screen.findByTestId("obiettivo-hero");
  expect(within(hero).getByText("€ 375")).toBeTruthy();
  expect(within(hero).getByText(/mancano/i).textContent).toMatch(/€ 9\.625/);
  expect(within(hero).getByText(/27 giorni/i)).toBeTruthy();
  expect(within(hero).getByText(/€ 703/)).toBeTruthy();
});

test("senza abbastanza storia la proiezione non e' un numero inventato", async () => {
  apiGet.mockImplementation(async (path) => {
    if (path === "/obiettivo/10k-settembre") return { ...OBIETTIVO, proiezione_al_ritmo_attuale: null };
    if (path === "/crediti/riepilogo") return RIEPILOGO;
    return LISTA;
  });
  render(<Amministrazione />);
  const hero = await screen.findByTestId("obiettivo-hero");
  expect(within(hero).getByText(/ancora presto per dirlo/i)).toBeTruthy();
});

test("le leve ferme stanno in alto con i giorni di fermo", async () => {
  render(<Amministrazione />);
  const leve = await screen.findByTestId("leve");
  const righe = within(leve).getAllByTestId("leva");
  expect(righe[0].textContent).toMatch(/Andrea Fredi/);
  expect(righe[0].textContent).toMatch(/ferma da 27 giorni/i);
  expect(righe[1].textContent).toMatch(/Rosanna/);
});

test("le rate del mese sono in ordine di data e le rate a condizione stanno a parte", async () => {
  render(<Amministrazione />);
  const cal = await screen.findByTestId("cassa-mese");
  const righe = within(cal).getAllByTestId("rata-row");
  expect(righe).toHaveLength(2);
  expect(righe[0].textContent).toMatch(/10\/09/);
  expect(righe[0].textContent).toMatch(/Eva Gugliucciello/);
  expect(righe[1].textContent).toMatch(/15\/09/);
  expect(righe[1].textContent).toMatch(/Annamaria Depalma/);
  expect(within(cal).getByText(/a meta' percorso/)).toBeTruthy();
});

test("segnare una rata incassata chiede conferma con nome e importo, poi scrive e ricarica", async () => {
  render(<Amministrazione />);
  const cal = await screen.findByTestId("cassa-mese");
  const depalma = within(cal).getAllByTestId("rata-row")[1];
  fireEvent.click(within(depalma).getByRole("button", { name: /incassata/i }));

  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Annamaria Depalma/);
  expect(dialog.textContent).toMatch(/€ 360/);
  expect(apiPatch).not.toHaveBeenCalled();

  const letture = apiGet.mock.calls.length;
  fireEvent.click(within(dialog).getByRole("button", { name: /conferma/i }));
  await waitFor(() =>
    expect(apiPatch).toHaveBeenCalledWith("/crediti/depalma/rate/1", { stato: "incassata" })
  );
  await waitFor(() => expect(apiGet.mock.calls.length).toBeGreaterThan(letture));
});

test("una posizione sospesa dal sollecito si vede ma non invita a chiamare", async () => {
  render(<Amministrazione />);
  const pos = await screen.findByTestId("posizioni");
  const riga = within(pos).getAllByRole("row").find((r) => /Tornello/.test(r.textContent));
  expect(riga.textContent).toMatch(/sospesa dal sollecito/i);
  expect(within(riga).queryByRole("button")).toBeNull();
  expect(within(pos).getByText(/€ 3\.549/)).toBeTruthy();
});

test("un movimento su una leva scrive la data da solo, senza chiedere altro", async () => {
  render(<Amministrazione />);
  const leve = await screen.findByTestId("leve");
  const rosanna = within(leve).getAllByTestId("leva").find((r) => /Rosanna/.test(r.textContent));
  fireEvent.click(within(rosanna).getByRole("button", { name: /movimento/i }));
  await waitFor(() =>
    expect(apiPatch).toHaveBeenCalledWith("/obiettivo/10k-settembre/leva/Rosanna", {})
  );
});
