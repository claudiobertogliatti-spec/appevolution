import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerAvvisi } from "./PartnerAvvisi";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
jest.mock("./PassoPannello", () => ({ dataIt: (d) => d.split("-").reverse().join("/") }));

const AVVISO = { partner_id: "p1", step_id: "03-brand-kit", partner_nome: "Dario Fontana", step_label: "Brand kit", prossimo: "Posizionamento" };
const COMPITO = { id: "c1", partner_nome: "Dario Fontana", testo: "Sentire per il funnel", scadenza: "2026-10-10", stato_scadenza: "scaduto" };

const rispondi = ({ avvisi, compiti }) =>
  apiGet.mockImplementation((p) => {
    const v = p === "/avvisi-percorso" ? avvisi : compiti;
    return v instanceof Error ? Promise.reject(v) : Promise.resolve({ items: v });
  });

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); });

test("avviso con il passo successivo e compito scaduto in evidenza", async () => {
  rispondi({ avvisi: [AVVISO], compiti: [COMPITO] });
  render(<PartnerAvvisi />);
  expect(await screen.findByText(/ha finito «Brand kit»/)).toBeTruthy();
  expect(screen.getByText(/Ora tocca a «Posizionamento»/)).toBeTruthy();
  expect(screen.getByText(/scaduto il 10\/10\/2026/)).toBeTruthy();
});

test("«Visto» e «Fatto» chiamano il server e ricaricano", async () => {
  rispondi({ avvisi: [AVVISO], compiti: [COMPITO] });
  apiPost.mockResolvedValue({ success: true });
  render(<PartnerAvvisi />);
  fireEvent.click(await screen.findByRole("button", { name: "Visto" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/avvisi-percorso/visto", { partner_id: "p1", step_id: "03-brand-kit" }));
  fireEvent.click(screen.getByRole("button", { name: /Segna come fatto/ }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/partner-attivita/fatto", { id: "c1" }));
});

test("liste vuote lo dicono; fonti non leggibili non diventano «vuoto»", async () => {
  rispondi({ avvisi: [], compiti: [] });
  const a = render(<PartnerAvvisi />);
  expect(await screen.findByText("Nessun passo completato di recente.")).toBeTruthy();
  expect(screen.getByText("Nessun compito aperto.")).toBeTruthy();
  a.unmount();
  rispondi({ avvisi: new Error("x"), compiti: new Error("x") });
  render(<PartnerAvvisi />);
  expect((await screen.findAllByText(/Dato non disponibile/)).length).toBe(2);
  expect(screen.queryByText("Nessun passo completato di recente.")).toBeNull();
});
