/**
 * Ciak Admin — Monitor pipeline video: riavviare la pipeline di un job non parte
 * da un confirm() del browser ma da una conferma in pagina, col nome del job.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import VideoPipelineMonitor from "./VideoPipelineMonitor";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

const ROW = { partner_id: "p1", partner_name: "ACME", type: "masterclass", status: "error_encoding" };

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "POST" || opts?.method === "DELETE") return Promise.resolve({ ok: true });
    if (String(url).includes("/api/celery/status")) return Promise.resolve({ json: async () => ({}) });
    return Promise.resolve({ ok: true, json: async () => ({ videos: [ROW] }) });
  });
});

async function renderMonitor() {
  render(<VideoPipelineMonitor onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: "Riavvia" });
}

test("riavviare la pipeline apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderMonitor();
  fireEvent.click(screen.getByRole("button", { name: "Riavvia" }));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/masterclass di ACME/i);
  spy.mockRestore();
});

test("confermando chiama il retrigger-video del job", async () => {
  await renderMonitor();
  fireEvent.click(screen.getByRole("button", { name: "Riavvia" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riavvia" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/partner/p1/retrigger-video?video_type=masterclass",
      { method: "POST" }
    )
  );
});

test("Elimina apre una conferma in pagina, poi chiama DELETE con type/lesson_id e toglie la riga", async () => {
  const LESSON = { partner_id: "p2", partner_name: "BETA", type: "videocorso", lesson_id: "m1_l2", status: "da_revisionare" };
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    if (String(url).includes("/api/celery/status")) return Promise.resolve({ json: async () => ({}) });
    return Promise.resolve({ ok: true, json: async () => ({ videos: [ROW, LESSON] }) });
  });
  const spy = jest.spyOn(window, "confirm");
  render(<VideoPipelineMonitor onAuthExpired={() => {}} />);
  await screen.findByText("BETA");
  fireEvent.click(screen.getAllByRole("button", { name: "Elimina" })[1]);
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/lezione m1_l2 di BETA/i);
  expect(adminFetch).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "DELETE" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/video-review/p2",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ type: "videocorso", lesson_id: "m1_l2" }) })
    )
  );
  await waitFor(() => expect(screen.queryByText("BETA")).toBeNull());
  expect(screen.getByText("ACME")).toBeTruthy();
  spy.mockRestore();
});
