/**
 * Ciak Admin — chat Simona: cancellare la cronologia (distruttivo) non parte da
 * un confirm() del browser ma da una conferma in pagina.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StefaniaAdmin } from "./StefaniaAdmin";
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
  render(<StefaniaAdmin onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Cancella cronologia/i });
  fireEvent.click(trigger);
  expect(spy).not.toHaveBeenCalled();
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toMatch(/cronologia/i);
  spy.mockRestore();
});

test("confermando chiama la DELETE della cronologia", async () => {
  render(<StefaniaAdmin onAuthExpired={() => {}} />);
  const trigger = await screen.findByRole("button", { name: /Cancella cronologia/i });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancella" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/stefania/history", { method: "DELETE" })
  );
});
