/** Coda lezioni (Antonella): oggi, controlli obbligatori, esiti, errori. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CodaLezioni, CONTROLLI, formatDurata } from "./CodaLezioni";
import { apiGet, apiPost, apiPut } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const COMPITO = {
  chiave: "p1|l1|2", partner_id: "p1", partner_nome: "Giulia Bianchi", lesson_id: "l1", titolo: "Intro",
  output_version: 2, durata_s: 600, minuti: 20, link_video: "https://www.ciak.io/v/1", snippet_systeme: "<iframe/>",
  partner_approvato: false,
};
const DATI = {
  oggi: "2026-10-12",
  config: { minuti_settimana: 300, rapporto_visione: 1.5, minuti_fissi: 5 },
  stime_iniziali: true,
  consegne: [{ partner_id: "p1", partner_nome: "Giulia Bianchi", lezioni: [COMPITO], minuti: 20, durata_s: 600, pronta_entro: "2026-10-18" }],
  piano: { settimane: [{ inizio: "2026-10-12", fine: "2026-10-18", budget: 300, usati: 20, compiti: [COMPITO] }], non_pianificati: [], avvisi: [] },
  da_correggere: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue(DATI);
  apiPost.mockResolvedValue({ success: true });
  apiPut.mockResolvedValue({ config: DATI.config });
});

test("mostra la lezione di oggi con il tempo e le stime dichiarate", async () => {
  render(<CodaLezioni />);
  expect(await screen.findByText("Intro")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Questa settimana" })).toBeTruthy();
  expect(screen.getByText(/circa 20 di 300 minuti/)).toBeTruthy();
  expect(screen.getByText(/stime iniziali/)).toBeTruthy();
});

test("«Caricata e verificata» resta spenta finche non sono spuntati tutti i controlli", async () => {
  render(<CodaLezioni />);
  const btn = await screen.findByRole("button", { name: /Caricata e verificata/ });
  expect(btn.disabled).toBe(true);
  CONTROLLI.forEach(([, label]) => fireEvent.click(screen.getByLabelText(label)));
  expect(btn.disabled).toBe(true); // senza minuti non si invia: servono per la fatturazione
  fireEvent.change(screen.getByLabelText(/Minuti che ci hai messo/), { target: { value: "22" } });
  expect(btn.disabled).toBe(false);
  fireEvent.click(btn);
  await waitFor(() => expect(apiPost).toHaveBeenCalled());
  const [path, body] = apiPost.mock.calls[0];
  expect(path).toBe("/coda/esito");
  expect(body).toMatchObject({ partner_id: "p1", lesson_id: "l1", output_version: 2, esito: "verificata", minuti_reali: 22 });
  await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2)); // ricarica la coda
});

test("«Da correggere» chiede la nota e la manda", async () => {
  render(<CodaLezioni />);
  fireEvent.click(await screen.findByRole("button", { name: /Da correggere/ }));
  const invia = screen.getByRole("button", { name: /Segnala per la correzione/ });
  expect(invia.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Cosa non va/), { target: { value: "Taglio brusco a 3:20" } });
  expect(invia.disabled).toBe(true); // mancano i minuti
  fireEvent.change(screen.getByLabelText(/Minuti che ci hai messo/), { target: { value: "8" } });
  fireEvent.click(invia);
  await waitFor(() => expect(apiPost).toHaveBeenCalled());
  expect(apiPost.mock.calls[0][1]).toMatchObject({ esito: "da_correggere", note: "Taglio brusco a 3:20", minuti_reali: 8 });
});

test("senza lezioni dice che non c'e' niente da fare", async () => {
  apiGet.mockResolvedValue({ ...DATI, consegne: [], piano: { settimane: [], non_pianificati: [], avvisi: [] } });
  render(<CodaLezioni />);
  expect(await screen.findByText("Niente da fare")).toBeTruthy();
});

test("mostra gli avvisi del piano", async () => {
  apiGet.mockResolvedValue({ ...DATI, piano: { ...DATI.piano, avvisi: ["«Lunga» richiede circa 90 minuti"] } });
  render(<CodaLezioni />);
  expect((await screen.findByRole("alert")).textContent).toMatch(/90 minuti/);
});

test("errore di caricamento: messaggio e Riprova; sessione scaduta chiama onAuthExpired", async () => {
  apiGet.mockRejectedValueOnce(new Error("Errore 500"));
  render(<CodaLezioni />);
  expect(await screen.findByText("Non riesco a caricare la coda.")).toBeTruthy();
  apiGet.mockResolvedValueOnce(DATI);
  fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
  expect(await screen.findByText("Intro")).toBeTruthy();
  const scaduta = jest.fn();
  apiGet.mockRejectedValueOnce(new Error("AUTH_EXPIRED"));
  render(<CodaLezioni onAuthExpired={scaduta} />);
  await waitFor(() => expect(scaduta).toHaveBeenCalled());
});

test("formatDurata", () => {
  expect(formatDurata(600)).toBe("10 min");
  expect(formatDurata(10)).toBe("meno di 1 min");
});

test("avvisa quando ci sono gia' altri compiti nella settimana", async () => {
  apiGet.mockResolvedValue({ ...DATI, tetto_settimana_min: 300, altri_minuti_settimana: 270 });
  render(<CodaLezioni />);
  expect((await screen.findByText(/270 minuti di altri compiti/)).textContent).toMatch(/300 minuti \(5 ore\)/);
});
