/**
 * Ciak Admin — Consegne mancate: stati della pagina.
 *
 * La pagina esiste perche' un cliente poteva pagare 2.790 EUR e restare senza
 * account senza che nessuno se ne accorgesse. Quindi i due stati che contano
 * sono: "c'e' qualcosa da sistemare, e si vede subito" e "non c'e' niente, ed
 * e' detto esplicitamente" — un elenco vuoto ambiguo sarebbe lo stesso
 * fallimento invisibile, spostato di un livello.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsegneMancate } from "./ConsegneMancate";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const REPORT = {
  totale: 2,
  per_tipo: { partnership_finalizzazione: 1, analisi_non_consegnata: 1 },
  importo_a_rischio_eur: 2817,
  items: [
    {
      tipo: "partnership_finalizzazione",
      severity: "critica",
      titolo: "Partnership pagata, onboarding incompleto",
      email: "mario@example.com",
      nome: "Mario Bianchi",
      importo_eur: 2790,
      pagato_da_ore: 26,
      effetti_falliti: ["account"],
      effetti_incompleti: ["journey"],
      errori: { account: "RuntimeError" },
      riferimento: "tok…",
      retriable: true,
      azione: "Rilancia la finalizzazione.",
    },
    {
      tipo: "analisi_non_consegnata",
      severity: "alta",
      titolo: "Analisi Blueprint non consegnata (invio fallito)",
      email: "lucia@example.com",
      nome: null,
      importo_eur: 27,
      pagato_da_ore: 5,
      errore: "SMTP non configurato",
      riferimento: "ses…",
      retriable: false,
      azione: "Verifica SMTP, poi rigenera.",
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

test("mostra importo a rischio, gravita' e passaggi non riusciti", async () => {
  apiGet.mockResolvedValue(REPORT);
  render(<ConsegneMancate />);

  expect(await screen.findByText("Partnership pagata, onboarding incompleto")).toBeTruthy();
  // email e nome sono due nodi di testo adiacenti nello stesso <p>:
  // si verifica il contenuto del paragrafo, non il singolo nodo.
  expect(
    screen.getByText(
      (_, el) => el?.textContent === "mario@example.com · Mario Bianchi"
    )
  ).toBeTruthy();
  expect(screen.getByText(/account, journey/)).toBeTruthy();
  expect(screen.getByText("SMTP non configurato")).toBeTruthy();
  // L'importo a rischio e' la cifra per cui questa pagina esiste.
  // Il separatore delle migliaia dipende dall'ICU: pieno nel browser, ridotto
  // in Node. Si verifica la cifra, non la formattazione della locale.
  expect(screen.getByText(/2\.?817\s*€/)).toBeTruthy();
  expect(screen.getByText("Critica")).toBeTruthy();
});

test("lo stato vuoto dice esplicitamente che non c'e' nulla da fare", async () => {
  apiGet.mockResolvedValue({ totale: 0, per_tipo: {}, importo_a_rischio_eur: 0, items: [] });
  render(<ConsegneMancate />);

  expect(await screen.findByText("Nessuna consegna mancata.")).toBeTruthy();
});

test("il retry compare solo dove e' davvero possibile", async () => {
  apiGet.mockResolvedValue(REPORT);
  render(<ConsegneMancate />);

  await screen.findByText("Partnership pagata, onboarding incompleto");
  // Due voci, un solo bottone: l'analisi non e' ritentabile da qui.
  expect(screen.getAllByRole("button", { name: "Riprova consegna" })).toHaveLength(1);
});

test("il retry richiama il backend e ricarica la lista", async () => {
  apiGet.mockResolvedValue(REPORT);
  apiPost.mockResolvedValue({ success: true });
  render(<ConsegneMancate />);

  fireEvent.click(await screen.findByRole("button", { name: "Riprova consegna" }));

  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/consegne-mancate/retry-partnership", {
      email: "mario@example.com",
    })
  );
  expect(await screen.findByText(/consegna completata/)).toBeTruthy();
  expect(apiGet).toHaveBeenCalledTimes(2);
});

test("un retry fallito lo dice, non resta muto", async () => {
  apiGet.mockResolvedValue(REPORT);
  apiPost.mockRejectedValue(new Error("Systeme irraggiungibile"));
  render(<ConsegneMancate />);

  fireEvent.click(await screen.findByRole("button", { name: "Riprova consegna" }));

  expect(await screen.findByText(/Systeme irraggiungibile/)).toBeTruthy();
});

test("un errore di caricamento non lascia la pagina in bianco", async () => {
  apiGet.mockRejectedValue(new Error("backend giu'"));
  render(<ConsegneMancate />);

  expect(await screen.findByText(/backend giu'/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Riprova" })).toBeTruthy();
});
