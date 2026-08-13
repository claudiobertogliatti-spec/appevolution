import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CalendarioEditoriale } from "./CalendarioEditoriale";
import { adminFetch } from "../api";

jest.mock("../api", () => ({
  adminFetch: jest.fn(),
  getToken: jest.fn(() => "admin-token"),
  getAdminUser: jest.fn(() => ({ user_id: "marco", role: "admin" })),
}));

function response(data, ok = true, status = 200) {
  return { ok, status, json: jest.fn().mockResolvedValue(data) };
}

const pendingItem = {
  partner_id: "p1",
  partner_name: "Partner Uno",
  version: 3,
  status: "pending_review",
  checksum: "checksum-versione-3-lungo",
  partner_confirmed_at: "2026-08-12T10:00:00+00:00",
  dates: { start_date: "2026-09-01", live_date: "2026-09-28" },
  completeness: { complete_days: 30, total_days: 30 },
  destination_urls: ["https://www.ciak.io/masterclass"],
  bonus: { name: "Sessione di orientamento", expires_at: "2026-10-01T23:59:59+02:00" },
  failed_checks: ["verified_destination_urls"],
};

const pendingDocument = {
  ...pendingItem,
  calendar: {
    ...pendingItem.dates,
    days: Array.from({ length: 30 }, (_, index) => ({
      day: index + 1,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      theme: `Tema ${index + 1}`,
      destination_url: "https://www.ciak.io/masterclass",
    })),
    commercial_terms: { bonus: pendingItem.bonus },
  },
};

function mockQueue(items = [pendingItem]) {
  adminFetch.mockImplementation((path, options = {}) => {
    if (path === "/api/partner/calendar/admin/pending-review") return Promise.resolve(response({ items }));
    if (path === "/api/partner/calendar/p1/versions/3") return Promise.resolve(response(pendingDocument));
    if (path === "/api/partner/calendar/p1/versions/3/review" && options.method === "POST") {
      return Promise.resolve(response({ ...pendingDocument, status: options.body.includes("approve") ? "approved" : "rejected" }));
    }
    return Promise.resolve(response({ items: [] }));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueue();
});

test("Marco approva la stessa versione e checksum mostrati solo dopo conferma", async () => {
  render(<CalendarioEditoriale />);

  fireEvent.click(await screen.findByRole("button", { name: /apri revisione/i }));
  expect(await screen.findByRole("heading", { name: /partner uno.*versione 3/i })).toBeTruthy();
  expect(screen.getByText("Checksum checksum-versione-3-lungo")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /approva calendario/i }));
  expect(await screen.findByRole("dialog", { name: /conferma approvazione/i })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /conferma approvazione/i }));

  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(
    "/api/partner/calendar/p1/versions/3/review",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "approve", note: "" }) })
  ));
  await waitFor(() => expect(screen.queryByText("Partner Uno")).toBeNull());
});

test("Marco non puo rifiutare senza nota e la coda cambia solo dalla risposta server", async () => {
  render(<CalendarioEditoriale />);

  fireEvent.click(await screen.findByRole("button", { name: /apri revisione/i }));
  const reject = await screen.findByRole("button", { name: /rifiuta e rimanda/i });
  expect(reject.disabled).toBe(true);

  fireEvent.change(screen.getByRole("textbox", { name: /nota per il partner/i }), { target: { value: "Correggi la destinazione della live." } });
  fireEvent.click(reject);

  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(
    "/api/partner/calendar/p1/versions/3/review",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ decision: "reject", note: "Correggi la destinazione della live." }) })
  ));
  await waitFor(() => expect(screen.queryByText("Partner Uno")).toBeNull());
});
