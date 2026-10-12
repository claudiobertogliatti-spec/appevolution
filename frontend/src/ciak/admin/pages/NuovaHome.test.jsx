/**
 * Nuova home «Oggi»: squadra con i volti, frase con numeri veri, stati onesti.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NuovaHome } from "./NuovaHome";
import { useOggiData } from "../components/OggiBlocks";

jest.mock("../components/OggiBlocks", () => ({ useOggiData: jest.fn() }));
jest.mock("../components/OggiCallStrip", () => ({ OggiCallStrip: () => <div>STRISCIA-CALL</div> }));
jest.mock("../components/OggiStart", () => ({ OggiStart: () => <div>CLIENTI-START</div> }));

const vivo = (extra = {}) => ({
  src: { pipeline: {}, audit: {} },
  model: {
    trattative: [
      { email: "a@x.it", nome: "Chiara Ferri", giorni: 14, tone: "critical" },
      { email: "b@x.it", nome: "Sandro Moretti", giorni: 8, tone: "warning" },
      { email: "c@x.it", nome: "Recente", giorni: 2, tone: "neutral" },
    ],
    partner: { tocca: [{ id: "p1", nome: "Dario Fontana", fermo: true, giorni: 30, azione: "Pubblicare il funnel" }] },
  },
  reload: jest.fn(),
  ...extra,
});

const mostra = () => render(<MemoryRouter><NuovaHome user={{ name: "Claudio Bertogliatti" }} /></MemoryRouter>);

test("saluto e frase con i numeri veri; chi è sotto soglia non entra", () => {
  useOggiData.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("Buongiorno, Claudio.")).toBeTruthy();
  expect(screen.getByText("Hai 2 trattative da sollecitare e 1 partner che aspetta te.")).toBeTruthy();
  expect(screen.getByText("Chiara Ferri")).toBeTruthy();
  expect(screen.queryByText("Recente")).toBeNull();
});

test("non scrive «senza risposta»: il dato è da quanto è in trattativa", () => {
  useOggiData.mockReturnValue(vivo());
  mostra();
  expect(screen.getByText("In trattativa da 14 giorni")).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/senza risposta/i);
});

test("non c'è nessun pulsante «Prepara il sollecito» finché non esiste", () => {
  useOggiData.mockReturnValue(vivo());
  mostra();
  expect(screen.queryByText(/Prepara il sollecito/)).toBeNull();
});

test("la squadra ha i sei volti con link ai reparti", () => {
  useOggiData.mockReturnValue(vivo());
  mostra();
  const nav = screen.getByRole("navigation", { name: "La tua squadra" });
  expect(nav.querySelectorAll("img").length).toBe(6);
  expect(nav.querySelector('a[href="/admin/reparto/vendite"]')).toBeTruthy();
  expect(nav.querySelector('a[href="/admin/direzione"]')).toBeTruthy();
});

test("trattative non leggibili: lo dice, non mostra zero", () => {
  useOggiData.mockReturnValue(vivo({ src: { pipeline: null, audit: {} }, model: { trattative: null, partner: { tocca: [] } } }));
  mostra();
  expect(screen.getByText(/Non riesco a leggere le trattative/)).toBeTruthy();
  expect(screen.getAllByText("Dato non disponibile.").length).toBeGreaterThan(0);
});

test("in caricamento non mostra numeri", () => {
  useOggiData.mockReturnValue({ src: { pipeline: undefined, audit: undefined }, model: { trattative: null, partner: null }, reload: jest.fn() });
  mostra();
  expect(screen.getByText("Controllo cosa c'è da fare…")).toBeTruthy();
});
