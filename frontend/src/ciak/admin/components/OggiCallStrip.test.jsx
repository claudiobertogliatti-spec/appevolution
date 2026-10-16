import { render, screen, waitFor, fireEvent } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn() }));

import { OggiCallStrip, fmtOraRoma } from "./OggiCallStrip";
import { apiGet } from "../api";

beforeEach(() => apiGet.mockReset());

test("l'orario e' sempre in ora di Roma (ottobre = UTC+2)", () => {
  expect(fmtOraRoma("2026-10-12T08:30:00Z")).toBe("10:30");
  expect(fmtOraRoma("2026-10-12T13:00:00+00:00")).toBe("15:00");
  expect(fmtOraRoma("non una data")).toBe("—");
  expect(fmtOraRoma(null)).toBe("—");
});

test("elenca le call di oggi con orario e nome, in ordine, e apre il Report", async () => {
  apiGet.mockResolvedValue({
    date: "2026-10-12", count: 2,
    calls: [
      { email: "a@x.it", nome: "Anna Rossi", starts_at: "2026-10-12T08:30:00Z", session_token: "t1" },
      { email: "b@x.it", nome: "Bruno Bianchi", starts_at: "2026-10-12T13:00:00Z", session_token: "t2" },
    ],
  });
  render(<OggiCallStrip />);
  expect(await screen.findByText("Oggi hai 2 call")).toBeTruthy();
  const righe = screen.getAllByRole("link").map((a) => a.textContent);
  expect(righe[0]).toContain("10:30");
  expect(righe[0]).toContain("Anna Rossi");
  expect(righe[1]).toContain("15:00");
  expect(screen.getAllByRole("link")[0].getAttribute("href")).toBe("/admin/leads/a%40x.it");
});

test("una sola call: singolare", async () => {
  apiGet.mockResolvedValue({ count: 1, calls: [{ email: "a@x.it", nome: "Anna", starts_at: "2026-10-12T08:30:00Z" }] });
  render(<OggiCallStrip />);
  expect(await screen.findByText("Oggi hai 1 call")).toBeTruthy();
});

test("zero call = lo dice; non e' lo stesso di 'dato non disponibile'", async () => {
  apiGet.mockResolvedValue({ date: "2026-10-12", count: 0, calls: [] });
  render(<OggiCallStrip />);
  expect(await screen.findByText("Nessuna call oggi")).toBeTruthy();
  expect(screen.queryByText(/Dato non disponibile/)).toBeNull();
});

test("se la fonte non risponde NON dice 'nessuna call' e permette di riprovare", async () => {
  apiGet.mockRejectedValueOnce(new Error("500"));
  render(<OggiCallStrip />);
  expect(await screen.findByText(/Dato non disponibile/)).toBeTruthy();
  expect(screen.queryByText("Nessuna call oggi")).toBeNull();
  apiGet.mockResolvedValueOnce({ count: 0, calls: [] });
  fireEvent.click(screen.getByText("Riprova"));
  await waitFor(() => expect(screen.getByText("Nessuna call oggi")).toBeTruthy());
});

test("risposta malformata = dato non disponibile, non zero", async () => {
  apiGet.mockResolvedValue({ count: 3 }); // manca `calls`
  render(<OggiCallStrip />);
  expect(await screen.findByText(/Dato non disponibile/)).toBeTruthy();
});

test("sessione scaduta: avvisa l'app", async () => {
  const scaduta = jest.fn();
  apiGet.mockRejectedValue(new Error("AUTH_EXPIRED"));
  render(<OggiCallStrip onAuthExpired={scaduta} />);
  await waitFor(() => expect(scaduta).toHaveBeenCalled());
});
