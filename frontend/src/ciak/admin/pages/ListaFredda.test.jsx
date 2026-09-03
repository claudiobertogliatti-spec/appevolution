/**
 * Ciak Admin — Lista Fredda: rimuovere un contatto dall'archivio freddo non
 * parte da un confirm() del browser ma da una conferma in pagina, con toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ListaFredda } from "./ListaFredda";
import { adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const LEADS = [{ email: "fred@x.it" }];

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    if (String(url).includes("/stats")) return Promise.resolve({ json: async () => ({}) });
    return Promise.resolve({ json: async () => ({ leads: LEADS }) });
  });
});

test("eliminare un contatto apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<ListaFredda onAuthExpired={() => {}} />);
  await screen.findByText("fred@x.it");
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/fred@x\.it/);
  spy.mockRestore();
});

test("confermando l'eliminazione chiama la DELETE e conferma con un toast", async () => {
  render(<ListaFredda onAuthExpired={() => {}} />);
  await screen.findByText("fred@x.it");
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/lista-fredda/leads/fred%40x.it",
      { method: "DELETE" }
    )
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
