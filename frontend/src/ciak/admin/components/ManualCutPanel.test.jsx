import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ManualCutPanel, parseClock, fmtClock } from "./ManualCutPanel";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const VIDEO = { partner_id: "p1", lesson_id: "lez-1", type: "videocorso", status: "ready_for_review", final_duration_s: 221 };

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
});

test("parseClock capisce min:sec e secondi, e rifiuta il punto come separatore", () => {
  expect(parseClock("1:14")).toBe(74);
  expect(parseClock("0:57")).toBe(57);
  expect(parseClock("57")).toBe(57);
  expect(parseClock(" 12:05 ")).toBe(725);
  expect(parseClock("1:14.5")).toBeNull();        // niente decimali
  expect(parseClock("1.14")).toBeNull();          // ambiguo: 1,14 s o 1:14? meglio chiedere
  expect(parseClock("0:75")).toBeNull();           // secondi oltre 59 con i minuti
  expect(parseClock("abc")).toBeNull();
  expect(parseClock("")).toBeNull();
  expect(fmtClock(74)).toBe("1:14");
});

function fill(from, to) {
  fireEvent.change(screen.getByLabelText(/Da \(min:sec\)/), { target: { value: from } });
  fireEvent.change(screen.getByLabelText(/A \(min:sec\)/), { target: { value: to } });
  fireEvent.click(screen.getByRole("button", { name: /Aggiungi/ }));
}

test("aggiunge un intervallo e, dopo la conferma, lo invia in secondi", async () => {
  render(<ManualCutPanel video={VIDEO} onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Taglia un passaggio/ }));
  fill("0:57", "1:14");
  expect(screen.getByText(/0:57 → 1:14 \(17 s\)/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Applica il taglio \(17 s\)/ }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Applica il taglio" }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(1));
  const [url, opts] = adminFetch.mock.calls[0];
  expect(url).toBe("/api/admin/video-review/p1/cut");
  expect(JSON.parse(opts.body)).toEqual({ type: "videocorso", lesson_id: "lez-1", ranges: [{ start_s: 57, end_s: 74 }] });
});

test("tempi con il punto, invertiti o oltre la durata mostrano un messaggio e non aggiungono nulla", () => {
  render(<ManualCutPanel video={VIDEO} onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Taglia un passaggio/ }));
  fill("0.57", "1.14");
  expect(screen.getByRole("alert").textContent).toMatch(/min:sec/);
  fill("1:14", "0:57");
  expect(screen.getByRole("alert").textContent).toMatch(/dopo il primo/);
  fill("3:00", "9:00");
  expect(screen.getByRole("alert").textContent).toMatch(/oltre la fine/);
  expect(screen.queryByRole("list", { name: /Intervalli/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Applica il taglio/ }).disabled).toBe(true);
});

test("un intervallo si può togliere dalla lista prima di applicare", () => {
  render(<ManualCutPanel video={VIDEO} onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Taglia un passaggio/ }));
  fill("0:10", "0:20");
  fill("1:00", "1:10");
  fireEvent.click(screen.getByRole("button", { name: /Togli l'intervallo 0:10/ }));
  expect(screen.queryByText(/0:10 → 0:20/)).toBeNull();
  expect(screen.getByText(/1:00 → 1:10/)).toBeTruthy();
});

test("l'errore del server resta visibile e non svuota gli intervalli", async () => {
  adminFetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ detail: "C'è già un taglio in corso su questa lezione" }) });
  render(<ManualCutPanel video={VIDEO} onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Taglia un passaggio/ }));
  fill("0:57", "1:14");
  fireEvent.click(screen.getByRole("button", { name: /Applica il taglio/ }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Applica il taglio" }));
  await screen.findByText(/già un taglio in corso/);
  expect(screen.getByText(/0:57 → 1:14/)).toBeTruthy();
});
