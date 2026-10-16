import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgenteChat } from "./AgenteChat";
import { apiGet, apiPost, adminFetch } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), adminFetch: jest.fn() }));
jest.mock("./ui/ConfirmDialog", () => ({
  ConfirmDialog: ({ open, onConfirm }) => (open ? <button type="button" onClick={onConfirm}>conferma-cancella</button> : null),
}));

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); adminFetch.mockReset(); });

test.each([
  ["carlo", "Carlo", "/agenti/carlo", "Scrivi a Carlo"],
  ["marco", "Marco", "/agenti/marco", "Scrivi a Marco"],
  ["valentina", "Valentina", "/agenti/valentina", "Scrivi a Valentina"],
])("%s: saluta, chiama il suo percorso e mostra la risposta", async (id, nome, base, label) => {
  apiGet.mockResolvedValue({ messages: [] });
  apiPost.mockResolvedValue({ reply: "Parti da **Anna**." });
  render(<AgenteChat agente={id} />);
  expect(await screen.findByText(new RegExp(`sono ${nome}`))).toBeTruthy();
  expect(apiGet).toHaveBeenCalledWith(`${base}/history`);
  fireEvent.change(screen.getByLabelText(label), { target: { value: "A che punto siamo?" } });
  fireEvent.click(screen.getByRole("button", { name: `Invia a ${nome}` }));
  expect(await screen.findByText("Anna")).toBeTruthy();
  expect(apiPost).toHaveBeenCalledWith(`${base}/chat`, { message: "A che punto siamo?" });
});

test("cancellare la cronologia usa il percorso dell'agente", async () => {
  apiGet.mockResolvedValue({ messages: [{ role: "user", content: "x" }, { role: "assistant", content: "y" }] });
  adminFetch.mockResolvedValue({});
  render(<AgenteChat agente="marco" />);
  fireEvent.click(await screen.findByRole("button", { name: /Cancella/ }));
  fireEvent.click(await screen.findByText("conferma-cancella"));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith("/api/admin/ciak/agenti/marco/history", { method: "DELETE" }));
});
