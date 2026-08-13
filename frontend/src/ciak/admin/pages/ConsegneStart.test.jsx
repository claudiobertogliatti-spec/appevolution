/**
 * Ciak Admin — Consegne Start: cosa deve leggersi senza cliccare.
 *
 * La pagina esiste perche' l'email di attivazione promette tre date che nessuno
 * ricordava. Quindi le due cose che devono essere vere a colpo d'occhio sono:
 * quante tappe sono scadute, e quale cliente e' il primo della coda. Se per
 * saperlo bisogna leggere tutte le righe, la pagina non serve a niente.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsegneStart } from "./ConsegneStart";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const REPORT = {
  totale_clienti: 1,
  totale_tappe: 3,
  scadute: 1,
  entro_48_ore: 0,
  consegnate: 0,
  generato_at: "2026-08-13T09:00:00+00:00",
  items: [
    {
      client_id: "client-1",
      email: "cinzia@example.it",
      nome: "Cinzia Lissi",
      tappa: 1,
      titolo: "Posizionamento e brand",
      contenuto: "Direzione di posizionamento e basi del brand",
      data_promessa: "10/08/2026",
      scadenza_interna: "08/08/2026",
      giorni: -3,
      giorni_ritardo: 3,
      giorni_interni: -5,
      stato: "da_fare",
      urgenza: "scaduta",
      riferimento: null,
      nota: null,
    },
    {
      client_id: "client-1",
      email: "cinzia@example.it",
      nome: "Cinzia Lissi",
      tappa: 2,
      titolo: "Profili social e sito vetrina",
      contenuto: "Sistemazione dei profili social e sito vetrina semplice",
      data_promessa: "17/08/2026",
      scadenza_interna: "15/08/2026",
      giorni: 4,
      giorni_ritardo: 0,
      giorni_interni: 2,
      stato: "da_fare",
      urgenza: "in_corso",
      riferimento: null,
      nota: null,
    },
    {
      client_id: "client-1",
      email: "cinzia@example.it",
      nome: "Cinzia Lissi",
      tappa: 3,
      titolo: "Strategia contenuti e calendario 90 giorni",
      contenuto: "Strategia contenuti e calendario editoriale a 90 giorni",
      data_promessa: "24/08/2026",
      scadenza_interna: "22/08/2026",
      giorni: 11,
      giorni_ritardo: 0,
      giorni_interni: 9,
      stato: "da_fare",
      urgenza: "in_corso",
      riferimento: null,
      nota: null,
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

test("il ritardo si legge come numero, non come data da calcolare a mente", async () => {
  apiGet.mockResolvedValue(REPORT);
  render(<ConsegneStart />);

  expect(await screen.findByText("Posizionamento e brand")).toBeTruthy();
  expect(screen.getByText("−3")).toBeTruthy();
  expect(screen.getByText("giorni di ritardo")).toBeTruthy();
  expect(screen.getByText("Scaduta")).toBeTruthy();
});

test("mostra la data promessa al cliente accanto a quella interna", async () => {
  apiGet.mockResolvedValue(REPORT);
  render(<ConsegneStart />);

  await screen.findByText("Posizionamento e brand");
  expect(
    screen.getByText(
      (_, el) =>
        el?.textContent ===
        "Promessa al cliente: 10/08/2026 · sulla tua scrivania entro il 08/08/2026"
    )
  ).toBeTruthy();
});

test("segnare una tappa consegnata invia riferimento e nota", async () => {
  apiGet.mockResolvedValue(REPORT);
  apiPost.mockResolvedValue({ success: true });
  render(<ConsegneStart />);

  await screen.findByText("Posizionamento e brand");
  fireEvent.click(screen.getAllByText("Segna consegnata")[0]);
  fireEvent.change(screen.getByPlaceholderText("Link al documento consegnato, o dove sta"), {
    target: { value: "https://drive.google.com/file/xyz" },
  });
  fireEvent.click(screen.getByText("Conferma consegna"));

  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/start/consegne/segna", {
      client_id: "client-1",
      tappa: 1,
      stato: "consegnata",
      riferimento: "https://drive.google.com/file/xyz",
      nota: null,
    })
  );
});

test("una tappa gia' consegnata non offre di riconsegnarla", async () => {
  apiGet.mockResolvedValue({
    ...REPORT,
    scadute: 0,
    consegnate: 1,
    items: [
      {
        ...REPORT.items[0],
        stato: "consegnata",
        urgenza: "chiusa",
        riferimento: "https://drive.google.com/file/xyz",
      },
    ],
    totale_tappe: 1,
  });
  render(<ConsegneStart />);

  await screen.findByText("Posizionamento e brand");
  expect(screen.queryByText("Segna consegnata")).toBeNull();
  // "Consegnata" compare due volte di proposito: nel badge di urgenza e nella
  // riga di stato. Basta che ci sia, non che sia unica.
  expect(screen.getAllByText("Consegnata").length).toBeGreaterThan(0);
  expect(screen.getByText(/drive\.google\.com/)).toBeTruthy();
});

test("senza clienti Start lo dice, invece di mostrare una lista vuota ambigua", async () => {
  apiGet.mockResolvedValue({
    totale_clienti: 0,
    totale_tappe: 0,
    scadute: 0,
    entro_48_ore: 0,
    consegnate: 0,
    items: [],
  });
  render(<ConsegneStart />);

  expect(await screen.findByText("Nessun cliente Ciak Start attivo.")).toBeTruthy();
});
