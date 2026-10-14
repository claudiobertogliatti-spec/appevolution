import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompetitorAnalisi } from "./CompetitorAnalisi";
import { apiPost } from "../api";

jest.mock("../api", () => ({ apiPost: jest.fn(), SCOPE_DENIED_DETAIL: "scope_denied" }));

const TESTO = "Smetti di fare corsi che nessuno finisce. Ecco perche' i tuoi clienti mollano a meta'.";
const ESITO = { gancio: "Apre con un divieto", struttura: ["problema", "soluzione"], perche_ha_funzionato: ["ipotesi uno"],
  da_non_copiare: "il suo caso", adattamento: "Dal tuo percorso", brief_reel: "Un reel sul perché i clienti mollano.",
  metriche: { tasso_interazione_pct: 5.5 } };

beforeEach(() => apiPost.mockReset());

test("«Analizza» è spento col testo corto; poi manda i dati e mostra analisi, ipotesi ed il tasso calcolato", async () => {
  apiPost.mockResolvedValue(ESITO);
  render(<CompetitorAnalisi />);
  expect(screen.getByRole("button", { name: "Analizza" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Testo o trascrizione del video"), { target: { value: TESTO } });
  fireEvent.change(screen.getByLabelText(/Visualizzazioni/), { target: { value: "10000" } });
  fireEvent.click(screen.getByRole("button", { name: "Analizza" }));
  expect(await screen.findByText("Apre con un divieto")).toBeTruthy();
  expect(apiPost).toHaveBeenCalledWith("/competitor/analisi", expect.objectContaining({ piattaforma: "Instagram", testo: TESTO, views: "10000", likes: null }));
  expect(screen.getByText(/ipotesi dal testo/)).toBeTruthy();
  expect(screen.getByText(/5.5%/)).toBeTruthy();
});

test("«Usa per un reel» passa il brief", async () => {
  apiPost.mockResolvedValue(ESITO);
  const usa = jest.fn();
  render(<CompetitorAnalisi onUsaBrief={usa} />);
  fireEvent.change(screen.getByLabelText("Testo o trascrizione del video"), { target: { value: TESTO } });
  fireEvent.click(screen.getByRole("button", { name: "Analizza" }));
  fireEvent.click(await screen.findByRole("button", { name: "Usa per un reel" }));
  expect(usa).toHaveBeenCalledWith("Un reel sul perché i clienti mollano.");
});

test("sparisce se il server nega l'accesso", async () => {
  apiPost.mockRejectedValue(new Error('Errore 403: {"detail":"scope_denied"}'));
  const { container } = render(<CompetitorAnalisi />);
  fireEvent.change(screen.getByLabelText("Testo o trascrizione del video"), { target: { value: TESTO } });
  fireEvent.click(screen.getByRole("button", { name: "Analizza" }));
  await waitFor(() => expect(container.firstChild).toBeNull());
});
