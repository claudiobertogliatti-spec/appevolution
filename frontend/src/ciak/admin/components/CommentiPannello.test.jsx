import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentiPannello } from "./CommentiPannello";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), SCOPE_DENIED_DETAIL: "scope" }));

const UMANO = { id: "c1", autore: "claudio@x.it", autore_tipo: "umano", testo: "@Marco la richiamo?", creato_at: "2026-10-12T10:00:00+00:00" };
const AGENTE = { id: "c2", autore: "Marco", autore_tipo: "agente", agente: "marco", risposta_a: "c1", testo: "Io richiamerei domani.", creato_at: "2026-10-12T10:00:05+00:00" };

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); });

test("mostra il thread e marca la risposta dell'agente come AI", async () => {
  apiGet.mockResolvedValue({ items: [UMANO, AGENTE] });
  render(<CommentiPannello tipo="lead" id="a@x.it" />);
  expect(await screen.findByText("Io richiamerei domani.")).toBeTruthy();
  expect(screen.getByText("AI")).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith("/commenti", { target_tipo: "lead", target_id: "a@x.it" });
});

test("il chip @Marco inserisce la menzione e il commento parte con tipo e bersaglio", async () => {
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockResolvedValue({ success: true, risposte: [], non_riuscite: [], saltati: [] });
  render(<CommentiPannello tipo="partner" id="p1" />);
  await screen.findByText(/Nessun commento/);
  fireEvent.click(screen.getByRole("button", { name: "@Marco" }));
  const area = screen.getByLabelText("Scrivi un commento");
  expect(area.value).toBe("@Marco ");
  fireEvent.change(area, { target: { value: "@Marco com'è messo?" } });
  fireEvent.click(screen.getByRole("button", { name: /Commenta|sta rispondendo/ }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/commenti", { target_tipo: "partner", target_id: "p1", testo: "@Marco com'è messo?" }));
  await waitFor(() => expect(area.value).toBe(""));
});

test("se l'agente non riesce a rispondere lo dice senza inventare", async () => {
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockResolvedValue({ success: true, risposte: [], non_riuscite: ["Marco"], saltati: [] });
  render(<CommentiPannello tipo="lead" id="a@x.it" />);
  await screen.findByText(/Nessun commento/);
  fireEvent.change(screen.getByLabelText("Scrivi un commento"), { target: { value: "@Marco?" } });
  fireEvent.click(screen.getByRole("button", { name: /Commenta/ }));
  expect(await screen.findByText(/Marco non ha potuto rispondere ora/)).toBeTruthy();
});

test("errore del server letto com'è; fonte non disponibile; account limitato", async () => {
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockRejectedValue(new Error('Errore 404: {"detail":"Non conosco questo contatto."}'));
  const a = render(<CommentiPannello tipo="lead" id="a@x.it" />);
  await screen.findByText(/Nessun commento/);
  fireEvent.change(screen.getByLabelText("Scrivi un commento"), { target: { value: "ciao" } });
  fireEvent.click(screen.getByRole("button", { name: /Commenta/ }));
  expect(await screen.findByText("Non conosco questo contatto.")).toBeTruthy();
  a.unmount();

  apiGet.mockRejectedValue(new Error("Errore 500"));
  const b = render(<CommentiPannello tipo="lead" id="a@x.it" />);
  expect(await screen.findByText(/Commenti non disponibili/)).toBeTruthy();
  b.unmount();

  apiGet.mockRejectedValue(new Error("scope"));
  const c = render(<CommentiPannello tipo="lead" id="a@x.it" />);
  await waitFor(() => expect(c.container.textContent).toBe(""));
});
