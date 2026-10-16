import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompitiPartner } from "./CompitiPartner";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), SCOPE_DENIED_DETAIL: "scope" }));
jest.mock("./PassoPannello", () => ({ dataIt: (d) => d.split("-").reverse().join("/"), oggiISO: () => "2026-10-12" }));

const C = { id: "c1", testo: "Sentire Dario per il funnel", scadenza: "2026-10-10", stato_scadenza: "scaduto" };

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); });

test("elenca i compiti del partner e segna lo scaduto", async () => {
  apiGet.mockResolvedValue({ items: [C] });
  render(<CompitiPartner partnerId="p1" />);
  expect(await screen.findByText("Sentire Dario per il funnel")).toBeTruthy();
  expect(screen.getByText(/scaduto il 10\/10\/2026/)).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith("/partner-attivita", { partner_id: "p1" });
});

test("«Fatto» chiude il compito e ricarica", async () => {
  apiGet.mockResolvedValueOnce({ items: [C] }).mockResolvedValueOnce({ items: [] });
  apiPost.mockResolvedValue({ success: true });
  render(<CompitiPartner partnerId="p1" />);
  fireEvent.click(await screen.findByRole("button", { name: /Segna come fatto/ }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/partner-attivita/fatto", { id: "c1" }));
  expect(await screen.findByText("Nessun compito aperto.")).toBeTruthy();
});

test("aggiunge un compito con data facoltativa", async () => {
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockResolvedValue({ success: true });
  render(<CompitiPartner partnerId="p1" />);
  await screen.findByText("Nessun compito aperto.");
  expect(screen.getByRole("button", { name: "Aggiungi" }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Nuovo compito"), { target: { value: "Chiamare il partner" } });
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/partner-attivita", { partner_id: "p1", testo: "Chiamare il partner", scadenza: null }));
});

test("errore del server letto com'è", async () => {
  apiGet.mockResolvedValue({ items: [] });
  apiPost.mockRejectedValue(new Error('Errore 422: {"detail":"La data è già passata"}'));
  render(<CompitiPartner partnerId="p1" />);
  await screen.findByText("Nessun compito aperto.");
  fireEvent.change(screen.getByLabelText("Nuovo compito"), { target: { value: "Chiamare il partner" } });
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
  expect(await screen.findByText("La data è già passata")).toBeTruthy();
});

test("fonte che non risponde: lo dice; account limitato: nulla", async () => {
  apiGet.mockRejectedValue(new Error("Errore 500"));
  const a = render(<CompitiPartner partnerId="p1" />);
  expect(await screen.findByText(/Compiti non disponibili/)).toBeTruthy();
  a.unmount();
  apiGet.mockRejectedValue(new Error("scope"));
  const b = render(<CompitiPartner partnerId="p1" />);
  await waitFor(() => expect(b.container.textContent).toBe(""));
});
