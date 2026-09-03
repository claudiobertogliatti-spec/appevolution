/**
 * Ciak Admin — Quarantena Partner: la riattivazione non parte da un confirm()
 * del browser ma da una conferma in pagina, e l'esito passa da un toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QuarantenaPartner } from "./QuarantenaPartner";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const PARTNERS = [
  { id: "1", name: "Alfredo Vasi", quarantena_tipo: "richiesta", quarantena_motivo: "Pausa concordata" },
];

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: PARTNERS });
});

test("riattivare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<QuarantenaPartner />);
  await screen.findByText("Alfredo Vasi");
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Alfredo Vasi/);
  spy.mockRestore();
});

test("confermando la riattivazione chiama lo stato attivo e conferma con un toast", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  render(<QuarantenaPartner />);
  await screen.findByText("Alfredo Vasi");
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riattiva" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/partner/1/stato",
      expect.objectContaining({ method: "POST" })
    )
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
