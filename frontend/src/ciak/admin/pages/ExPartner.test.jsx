/**
 * Ciak Admin — Ex Partner: la riattivazione non parte da un confirm() del
 * browser ma da una conferma in pagina, e l'esito passa da un toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ExPartner } from "./ExPartner";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const PARTNERS = [{ id: "7", name: "Bruno Sale", phase: "F9" }];

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: PARTNERS });
});

test("riattivare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<ExPartner />);
  await screen.findByText("Bruno Sale");
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Bruno Sale/);
  spy.mockRestore();
});

test("confermando la riattivazione chiama lo stato attivo e conferma con un toast", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  render(<ExPartner />);
  await screen.findByText("Bruno Sale");
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riattiva" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/partner/7/stato",
      expect.objectContaining({ method: "POST" })
    )
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
