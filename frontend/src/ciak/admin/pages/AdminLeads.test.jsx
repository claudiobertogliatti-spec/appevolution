/**
 * Ciak Admin — Leads & Pipeline: l'eliminazione di un lead non parte da un
 * confirm() del browser ma da una conferma in pagina, e l'esito passa da un toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
// react-router-dom non si risolve in jest in locale (dist/main.js manca): mock virtuale.
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), Link: ({ children }) => children }), { virtual: true });
jest.mock("../api", () => ({
  apiGet: jest.fn(),
  adminFetch: jest.fn(),
  isCommercialAccount: jest.fn(() => false),
  isPermissionDenied: jest.fn((m) => m === "Questa funzione non è abilitata per il tuo account."),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { AdminLeads } from "./AdminLeads";
import { apiGet, adminFetch, isCommercialAccount, isPermissionDenied } from "../api";
import { toast } from "sonner";

const LEADS = [{ email: "mario@x.it" }];

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue({ items: LEADS, total: 1 });
  // CRA azzera le implementazioni dei mock prima di ogni test (resetMocks).
  isPermissionDenied.mockImplementation((m) => m === "Questa funzione non è abilitata per il tuo account.");
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

test("account commerciale (Mariangela): il bottone Elimina non compare", async () => {
  isCommercialAccount.mockReturnValue(true);
  render(<AdminLeads onAuthExpired={() => {}} />);
  await screen.findByText("mario@x.it");
  expect(screen.queryByRole("button", { name: "Elimina" })).toBeNull();
  isCommercialAccount.mockReturnValue(false);
});

test("eliminazione negata dal backend per permesso: il toast dice il perché", async () => {
  adminFetch.mockRejectedValue(new Error("Questa funzione non è abilitata per il tuo account."));
  render(<AdminLeads onAuthExpired={() => {}} />);
  await screen.findByText("mario@x.it");
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Elimina" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Questa funzione non è abilitata per il tuo account."));
  expect(screen.queryByRole("dialog")).toBeNull();
});
