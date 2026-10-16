/**
 * Il rischio da coprire: che l'admin veda "chiuso" quando il passo non lo e'.
 * Il via finale e' disponibile solo a voci consegnate e viene dal server, non dal browser.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrimoProdottoPanel } from "./PrimoProdottoPanel";
import { apiGet, apiPost, apiPut } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const voce = (chiave, label, stato = "da_fare", valore = "") => ({ chiave, label, stato, valore, nota: "", aggiornata_il: null });
const base = (stati = {}) => ({
  stato_passo: "pending",
  voci: [
    voce("promessa", "Promessa", stati.promessa),
    voce("pagina_vendita", "Pagina di vendita", stati.pagina_vendita),
    voce("checkout", "Checkout", stati.checkout),
    voce("messaggio_lancio", "Messaggio di lancio", stati.messaggio_lancio),
  ],
  via_finale: null,
  mancanti: ["Promessa", "Pagina di vendita", "Checkout", "Messaggio di lancio"],
});

beforeEach(() => jest.clearAllMocks());

test("mostra le quattro voci e il via finale e' bloccato con l'elenco di cio' che manca", async () => {
  apiGet.mockResolvedValue(base());
  render(<PrimoProdottoPanel clientId="c1" />);
  expect(await screen.findByText("Pagina di vendita")).toBeTruthy();
  expect(screen.getByText("Messaggio di lancio")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Dai il via finale" }).disabled).toBe(true);
  expect(screen.getByTestId("via-finale-mancanti").textContent).toMatch(/mancano: Promessa, Pagina di vendita/);
});

test("salva una voce con stato e contenuto scelti dall'admin", async () => {
  apiGet.mockResolvedValue(base());
  apiPut.mockResolvedValue(base({ promessa: "in_lavorazione" }));
  render(<PrimoProdottoPanel clientId="c1" />);
  await screen.findByText("Promessa");
  const riga = screen.getByTestId("voce-promessa");
  fireEvent.change(riga.querySelector("select"), { target: { value: "in_lavorazione" } });
  fireEvent.change(screen.getByLabelText("Promessa: testo"), { target: { value: "Un risultato chiaro." } });
  fireEvent.click(riga.querySelector("button"));
  await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/start/c1/primo-prodotto/voce", {
    voce: "promessa", stato: "in_lavorazione", valore: "Un risultato chiaro.", nota: "",
  }));
});

test("con le voci consegnate il via finale parte e il server decide l'esito", async () => {
  const pronto = { ...base(), mancanti: [] };
  apiGet.mockResolvedValue(pronto);
  apiPost.mockResolvedValue({ ...pronto, via_finale: { da: "admin@x.it", il: "2026-10-16T10:00:00+00:00" } });
  render(<PrimoProdottoPanel clientId="c1" />);
  const bottone = await screen.findByRole("button", { name: "Dai il via finale" });
  expect(bottone.disabled).toBe(false);
  fireEvent.click(bottone);
  expect((await screen.findByTestId("via-finale-dato")).textContent).toMatch(/admin@x\.it/);
  expect(apiPost).toHaveBeenCalledWith("/start/c1/primo-prodotto/via-finale", {});
});

test("se il server rifiuta, non mostra il passo come chiuso", async () => {
  const pronto = { ...base(), mancanti: [] };
  apiGet.mockResolvedValue(pronto);
  apiPost.mockRejectedValue(new Error('Errore 409: {"detail":"Mancano ancora: Checkout."}'));
  render(<PrimoProdottoPanel clientId="c1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Dai il via finale" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalled());
  expect(screen.queryByTestId("via-finale-dato")).toBeNull();
});

test("se il cliente non ha Plus lo dice invece di restare vuoto", async () => {
  apiGet.mockRejectedValue(new Error('Errore 409: {"detail":"Il cliente non ha Start Plus"}'));
  render(<PrimoProdottoPanel clientId="c1" />);
  expect((await screen.findByRole("alert")).textContent).toBe("Il cliente non ha Start Plus");
});
