/**
 * Ciak Admin — Video Review: eliminare una card e "pulisci errori" (azioni
 * distruttive) non partono da confirm() del browser ma da conferme in pagina.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { VideoReview } from "./VideoReview";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn(), apiGet: jest.fn(), apiPost: jest.fn() }));

const VIDEOS = [
  { partner_id: "p1", partner_name: "ACME", type: "masterclass", status: "ready_for_review" },
  { partner_id: "p2", partner_name: "ERRSRL", type: "masterclass", status: "error" },
];

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    if (opts?.method === "POST") return Promise.resolve({ ok: true });
    if (String(url).includes("/video-review")) return Promise.resolve({ ok: true, json: async () => ({ videos: VIDEOS }) });
    return Promise.resolve({ ok: true, json: async () => ({ revisions: [] }) });
  });
});

test("eliminare una card apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  render(<VideoReview onAuthExpired={() => {}} />);
  await screen.findByText("ACME");
  const card = screen.getByText("ACME").closest(".rounded-2xl");
  fireEvent.click(within(card).getByRole("button", { name: "Elimina" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/card/i);
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/video-review/p1",
      expect.objectContaining({ method: "DELETE" })
    )
  );
  spy.mockRestore();
});

test("pulisci errori conferma in pagina e chiama il cleanup", async () => {
  render(<VideoReview onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: /Pulisci errori/ });
  fireEvent.click(screen.getByRole("button", { name: /Pulisci errori/ }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina in errore" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/video-review/cleanup-errors",
      { method: "POST" }
    )
  );
});
