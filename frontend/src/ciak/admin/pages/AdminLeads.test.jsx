/**
 * Ciak Admin — Leads & Pipeline: l'eliminazione di un lead non parte da un
 * confirm() del browser ma da una conferma in pagina, e l'esito passa da un toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
// react-router-dom non si risolve in jest in locale (dist/main.js manca): mock virtuale.
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn(), adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { AdminLeads } from "./AdminLeads";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

const LEADS = [{ email: "mario@x.it" }];

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: LEADS, total: 1 });
});

test("eliminare un lead apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<AdminLeads onAuthExpired={() => {}} />);
  await screen.findByText("mario@x.it");
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/mario@x\.it/);
  spy.mockRestore();
});

test("confermando l'eliminazione chiama la DELETE per email e conferma con un toast", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  render(<AdminLeads onAuthExpired={() => {}} />);
  await screen.findByText("mario@x.it");
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/lead?email=mario%40x.it",
      { method: "DELETE" }
    )
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
