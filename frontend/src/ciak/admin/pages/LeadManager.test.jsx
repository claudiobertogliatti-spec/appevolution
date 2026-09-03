/**
 * Ciak Admin — Motore Acquisizione (LeadManager): eliminare un lead non parte
 * da un confirm() del browser ma da una conferma in pagina, con toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LeadManager } from "./LeadManager";
import { adminFetch } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const LEADS = [
  { id: "9", display_name: "Studio Rossi", email: "studio@x.it", niche_detected: "Coaching", score_total: 80, source: "instagram" },
];

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    return Promise.resolve({ json: async () => ({ leads: LEADS, total: 1 }) });
  });
});

test("eliminare un lead apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText("Studio Rossi");
  fireEvent.click(screen.getByRole("button", { name: /Elimina Studio Rossi/i }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/Studio Rossi/);
  spy.mockRestore();
});

test("confermando chiama la DELETE per id e conferma con un toast", async () => {
  render(<LeadManager onAuthExpired={() => {}} />);
  await screen.findByText("Studio Rossi");
  fireEvent.click(screen.getByRole("button", { name: /Elimina Studio Rossi/i }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/discovery/leads/9", { method: "DELETE" })
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
