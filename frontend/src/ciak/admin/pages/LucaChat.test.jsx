/**
 * Ciak Admin — chat Luca: cancellare la cronologia (distruttivo) non parte da
 * un confirm() del browser ma da una conferma in pagina.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LucaChat } from "./LucaChat";
import { adminFetch } from "../api";

jest.mock("../api", () => ({
  adminFetch: jest.fn(),
  getAdminUser: () => ({ name: "Claudio" }),
}));

// jsdom non implementa scrollIntoView: l'auto-scroll della chat lo invoca.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({});
    return Promise.resolve({ json: async () => ({ messages: [] }) });
  });
});

test("cancellare la cronologia apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<LucaChat onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Cancella cronologia/i });
  fireEvent.click(trigger);
  expect(spy).not.toHaveBeenCalled();
  expect((await screen.findByRole("dialog")).textContent).toMatch(/cronologia/i);
  spy.mockRestore();
});

test("confermando chiama la DELETE della cronologia di Luca", async () => {
  render(<LucaChat onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Cancella cronologia/i });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancella" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/luca/history", { method: "DELETE" })
  );
});
