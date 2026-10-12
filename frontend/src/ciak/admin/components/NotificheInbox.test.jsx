import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificheInbox } from "./NotificheInbox";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));

const N = (o = {}) => ({ id: "n1", agente: "marco", titolo: "Marco ha risposto", anteprima: "Io richiamerei domani.", target_tipo: "lead", target_id: "a@x.it", letta_at: null, ...o });
const mostra = () => render(<MemoryRouter><NotificheInbox /></MemoryRouter>);

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); });

test("mostra le non lette con il conteggio e il link alla scheda", async () => {
  apiGet.mockResolvedValue({ items: [N(), N({ id: "n2", letta_at: "2026-10-12T10:00:00Z", titolo: "Luca ha risposto" })], non_lette: 1 });
  mostra();
  expect(await screen.findByText("Marco ha risposto")).toBeTruthy();
  expect(screen.queryByText("Luca ha risposto")).toBeNull();
  expect(screen.getByRole("link", { name: "Apri" }).getAttribute("href")).toBe("/admin/leads/a%40x.it");
});

test("«Segna tutte come lette» chiama il server e ricarica", async () => {
  apiGet.mockResolvedValueOnce({ items: [N()], non_lette: 1 }).mockResolvedValueOnce({ items: [N({ letta_at: "x" })], non_lette: 0 });
  apiPost.mockResolvedValue({ success: true });
  const { container } = mostra();
  fireEvent.click(await screen.findByText("Segna tutte come lette"));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/notifiche/letta", { tutte: true }));
  await waitFor(() => expect(container.textContent).toBe(""));
});

test("nessuna non letta: la sezione non compare; fonte rotta: lo dice", async () => {
  apiGet.mockResolvedValue({ items: [], non_lette: 0 });
  const a = mostra();
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  expect(a.container.textContent).toBe("");
  a.unmount();
  apiGet.mockRejectedValue(new Error("x"));
  mostra();
  expect(await screen.findByText(/Notifiche non disponibili/)).toBeTruthy();
});
