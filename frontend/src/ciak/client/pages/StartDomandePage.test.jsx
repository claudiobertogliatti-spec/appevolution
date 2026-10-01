/**
 * Le domande di Ciak Start: una alla volta, si salvano da sole, e quando sono
 * tutte inviate il team lo sa. Il cliente non resta mai senza un passo da fare.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({ Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a> }),
  { virtual: true }
);
jest.mock("../api", () => ({
  clientGet: jest.fn(),
  clientPut: jest.fn(),
}));

import { StartDomandePage } from "./StartDomandePage";
import { clientGet, clientPut } from "../api";
import { START_DOMANDE } from "../startDomande";

const DASH = { start: { consegne: ["08/10/2026", "15/10/2026", "22/10/2026"] } };

beforeEach(() => {
  jest.clearAllMocks();
  clientPut.mockResolvedValue({ success: true });
});

const scrivi = (valore) =>
  fireEvent.change(screen.getByRole("textbox"), { target: { value: valore } });

test("parte dalla prima domanda e Avanti si sblocca solo con una risposta vera", async () => {
  clientGet.mockResolvedValue({ answers: {}, completato_at: null });
  render(<StartDomandePage dashboard={DASH} />);
  expect(await screen.findByText(START_DOMANDE[0].domanda)).toBeTruthy();
  expect(screen.getByText(/Domanda 1 di 8/)).toBeTruthy();
  const avanti = screen.getByRole("button", { name: "Avanti" });
  expect(avanti.disabled).toBe(true);
  scrivi("ok");
  expect(avanti.disabled).toBe(true);
  scrivi("Donne dopo i quaranta anni");
  expect(avanti.disabled).toBe(false);
});

test("Avanti salva la risposta e passa alla domanda dopo", async () => {
  clientGet.mockResolvedValue({ answers: {}, completato_at: null });
  render(<StartDomandePage dashboard={DASH} />);
  await screen.findByText(START_DOMANDE[0].domanda);
  scrivi("Donne dopo i quaranta anni");
  fireEvent.click(screen.getByRole("button", { name: "Avanti" }));
  expect(await screen.findByText(START_DOMANDE[1].domanda)).toBeTruthy();
  expect(clientPut).toHaveBeenCalledWith("/start/risposte", {
    answers: { nicchia: "Donne dopo i quaranta anni" },
  });
});

test("riprende dalla prima domanda senza risposta", async () => {
  clientGet.mockResolvedValue({
    answers: { nicchia: "Donne dopo i quaranta anni", momento_di_vita: "Hanno provato da sole" },
    completato_at: null,
  });
  render(<StartDomandePage dashboard={DASH} />);
  expect(await screen.findByText(START_DOMANDE[2].domanda)).toBeTruthy();
  expect(screen.getByText(/Domanda 3 di 8/)).toBeTruthy();
});

test("all'ultima domanda invia tutto e ringrazia con la data della prima tappa", async () => {
  const tutte = Object.fromEntries(START_DOMANDE.map((d) => [d.id, `Risposta per ${d.id}`]));
  const quasi = { ...tutte };
  delete quasi.prezzo_e_formato;
  clientGet.mockResolvedValue({ answers: quasi, completato_at: null });
  render(<StartDomandePage dashboard={DASH} />);
  expect(await screen.findByText(START_DOMANDE[7].domanda)).toBeTruthy();
  scrivi("Percorso di otto incontri");
  fireEvent.click(screen.getByRole("button", { name: "Invia le risposte" }));
  await waitFor(() =>
    expect(clientPut).toHaveBeenLastCalledWith("/start/risposte", {
      answers: { ...quasi, prezzo_e_formato: "Percorso di otto incontri" },
      completato: true,
    })
  );
  expect(await screen.findByText("Grazie, abbiamo le tue risposte")).toBeTruthy();
  expect(screen.getByText(/entro il 08\/10\/2026/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Torna al tuo percorso" }).getAttribute("href")).toBe("/cliente/start");
});

test("se il server dice che manca una risposta, riapre quella domanda", async () => {
  const tutte = Object.fromEntries(START_DOMANDE.map((d) => [d.id, `Risposta per ${d.id}`]));
  clientGet.mockResolvedValue({ answers: tutte, completato_at: null });
  const err = Object.assign(new Error("Manca ancora qualche risposta."), { mancanti: ["promessa"] });
  clientPut.mockRejectedValueOnce(err);
  render(<StartDomandePage dashboard={DASH} />);
  await screen.findByText(START_DOMANDE[7].domanda);
  fireEvent.click(screen.getByRole("button", { name: "Invia le risposte" }));
  expect(await screen.findByText(START_DOMANDE[2].domanda)).toBeTruthy();
  expect(screen.getByText(/Manca ancora una risposta/)).toBeTruthy();
});

test("chi ha gia' inviato vede il ringraziamento e puo' cambiare una risposta", async () => {
  clientGet.mockResolvedValue({ answers: { nicchia: "Donne dopo i quaranta anni" }, completato_at: "2026-10-02T10:00:00+00:00" });
  render(<StartDomandePage dashboard={DASH} />);
  expect(await screen.findByTestId("domande-inviate")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voglio cambiare una risposta" }));
  expect(await screen.findByText(START_DOMANDE[0].domanda)).toBeTruthy();
});

test("se il salvataggio fallisce lo dice e non cambia domanda", async () => {
  clientGet.mockResolvedValue({ answers: {}, completato_at: null });
  clientPut.mockRejectedValue(new Error("rete"));
  render(<StartDomandePage dashboard={DASH} />);
  await screen.findByText(START_DOMANDE[0].domanda);
  scrivi("Donne dopo i quaranta anni");
  fireEvent.click(screen.getByRole("button", { name: "Avanti" }));
  expect(await screen.findByText(/Non sono riuscito a salvare/)).toBeTruthy();
  expect(screen.getByText(START_DOMANDE[0].domanda)).toBeTruthy();
});
