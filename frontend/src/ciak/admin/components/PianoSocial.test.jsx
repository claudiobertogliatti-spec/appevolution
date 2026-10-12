import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PianoSocial, mesiDisponibili } from "./PianoSocial";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), SCOPE_DENIED_DETAIL: "scope_denied" }));

const V = (i, extra = {}) => ({ data: `2026-11-0${i}`, canale: "instagram", formato: "carosello", tema: `Tema ${i}`, brief: "Un brief lungo abbastanza", invito: "Vai", come_si_fa: "Editoriale", ...extra });
const BOZZA = { voci: [V(1), V(2, { formato: "reel", canale: "facebook" }), V(3)], scartate: 1 };

beforeEach(() => {
  apiGet.mockReset(); apiPost.mockReset();
  apiGet.mockResolvedValue({ piano: null });
});

test("mesiDisponibili dà il mese corrente e i due successivi", () => {
  expect(mesiDisponibili(new Date(2026, 10, 15)).map((m) => m[0])).toEqual(["2026-11", "2026-12", "2027-01"]);
});

test("propone, permette di togliere e modificare, e approva solo con il clic", async () => {
  apiPost.mockImplementation((p) => Promise.resolve(p === "/piano-social/bozza" ? BOZZA : { ok: true }));
  render(<PianoSocial />);
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("Obiettivo del mese"), { target: { value: "Portare persone sul sito" } });
  fireEvent.click(screen.getByRole("button", { name: "Proponi il piano" }));
  expect(await screen.findByText(/3 voci/)).toBeTruthy();
  expect(screen.getByText(/1 voci non valide/)).toBeTruthy();
  expect(apiPost).not.toHaveBeenCalledWith("/piano-social", expect.anything());
  fireEvent.change(screen.getByLabelText("Tema", { selector: "#pv-tema-0" }), { target: { value: "Tema nuovo" } });
  fireEvent.click(screen.getByRole("button", { name: "Approva il piano" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/piano-social", expect.objectContaining({
    approvato: true, destinazione: "", voci: expect.arrayContaining([expect.objectContaining({ tema: "Tema nuovo" })]),
  })));
});

test("con meno di 3 voci «Approva il piano» è spento", async () => {
  apiPost.mockResolvedValue(BOZZA);
  render(<PianoSocial />);
  fireEvent.change(screen.getByLabelText("Obiettivo del mese"), { target: { value: "Portare persone sul sito" } });
  fireEvent.click(screen.getByRole("button", { name: "Proponi il piano" }));
  await screen.findByText(/3 voci/);
  fireEvent.click(screen.getAllByRole("button", { name: "Togli" })[0]);
  expect(screen.getByRole("button", { name: "Approva il piano" }).disabled).toBe(true);
});

test("piano già approvato: mostra link, clic e «Crea il reel» solo per i reel", async () => {
  const usa = jest.fn();
  apiGet.mockResolvedValue({ piano: { approvato_da: "claudio@x.it", clic_totali: 7, voci: [
    { ...V(1), id: "a", clic: 5, robot: 0, link: "https://www.ciak.io/api/ciak/go/abc" },
    { ...V(2, { formato: "reel" }), id: "b", clic: 2, robot: 1, link: "https://www.ciak.io/api/ciak/go/def" }] } });
  render(<PianoSocial onUsaBrief={usa} />);
  expect(await screen.findByText(/7 clic in totale/)).toBeTruthy();
  expect(screen.getByText(/go\/abc/)).toBeTruthy();
  const bottoni = screen.getAllByRole("button", { name: "Crea il reel" });
  expect(bottoni).toHaveLength(1);
  fireEvent.click(bottoni[0]);
  expect(usa).toHaveBeenCalledWith("Un brief lungo abbastanza");
});

test("sparisce se il server nega l'accesso", async () => {
  apiGet.mockRejectedValue(new Error('Errore 403: {"detail":"scope_denied"}'));
  const { container } = render(<PianoSocial />);
  await waitFor(() => expect(container.firstChild).toBeNull());
});
