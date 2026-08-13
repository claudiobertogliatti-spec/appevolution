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

function pendingDocumentFor(item) {
  return {
    ...pendingDocument,
    partner_id: item.partner_id,
    version: item.version,
    checksum: item.checksum,
    calendar: { ...pendingDocument.calendar, commercial_terms: { bonus: item.bonus } },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

function mockQueue(items = [pendingItem]) {
  adminFetch.mockImplementation((path, options = {}) => {
    if (path === "/api/partner/calendar/admin/pending-review?limit=25") return Promise.resolve(response({ items, has_more: false, next_cursor: null }));
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

test("la risposta lenta della revisione A non sostituisce B e non puo approvare A", async () => {
  const secondItem = { ...pendingItem, partner_id: "p2", partner_name: "Partner Due", version: 4, checksum: "checksum-versione-4-lungo" };
  const firstDetail = deferred();
  const secondDetail = deferred();
  adminFetch.mockImplementation((path, options = {}) => {
    if (path === "/api/partner/calendar/admin/pending-review?limit=25") return Promise.resolve(response({ items: [pendingItem, secondItem], has_more: false, next_cursor: null }));
    if (path === "/api/partner/calendar/p1/versions/3") return firstDetail.promise;
    if (path === "/api/partner/calendar/p2/versions/4") return secondDetail.promise;
    if (path === "/api/partner/calendar/p2/versions/4/review" && options.method === "POST") return Promise.resolve(response({ ...pendingDocumentFor(secondItem), status: "approved" }));
    return Promise.resolve(response({ items: [] }));
  });
  render(<CalendarioEditoriale />);

  const openButtons = await screen.findAllByRole("button", { name: /apri revisione/i });
  fireEvent.click(openButtons[0]);
  fireEvent.click(openButtons[1]);
  secondDetail.resolve(response(pendingDocumentFor(secondItem)));
  expect(await screen.findByRole("heading", { name: /partner due.*versione 4/i })).toBeTruthy();
  firstDetail.resolve(response(pendingDocumentFor(pendingItem)));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByRole("heading", { name: /partner uno.*versione 3/i })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /approva calendario/i }));
  fireEvent.click(await screen.findByRole("button", { name: /conferma approvazione/i }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(
    "/api/partner/calendar/p2/versions/4/review",
    expect.objectContaining({ method: "POST" })
  ));
  expect(adminFetch.mock.calls.some(([path]) => path === "/api/partner/calendar/p1/versions/3/review")).toBe(false);
});

test("la coda espone un'azione per caricare la pagina successiva", async () => {
  const secondItem = { ...pendingItem, partner_id: "p2", partner_name: "Partner Due", version: 4, checksum: "checksum-versione-4-lungo" };
  adminFetch.mockImplementation((path) => {
    if (path === "/api/partner/calendar/admin/pending-review?limit=25") return Promise.resolve(response({ items: [pendingItem], has_more: true, next_cursor: "cursor-1" }));
    if (path === "/api/partner/calendar/admin/pending-review?limit=25&cursor=cursor-1") return Promise.resolve(response({ items: [secondItem], has_more: false, next_cursor: null }));
    return Promise.resolve(response({ items: [] }));
  });
  render(<CalendarioEditoriale />);

  fireEvent.click(await screen.findByRole("button", { name: /carica altre revisioni/i }));
  expect(await screen.findByText("Partner Due")).toBeTruthy();
});

test("un errore 409 strutturato mostra i controlli leggibili", async () => {
  adminFetch.mockImplementation((path, options = {}) => {
    if (path === "/api/partner/calendar/admin/pending-review?limit=25") return Promise.resolve(response({ items: [pendingItem], has_more: false, next_cursor: null }));
    if (path === "/api/partner/calendar/p1/versions/3") return Promise.resolve(response(pendingDocument));
    if (path === "/api/partner/calendar/p1/versions/3/review" && options.method === "POST") {
      return Promise.resolve(response({ detail: { code: "launch_calendar_not_ready", failed_checks: ["verified_destination_urls"] } }, false, 409));
    }
    return Promise.resolve(response({ items: [] }));
  });
  render(<CalendarioEditoriale />);

  fireEvent.click(await screen.findByRole("button", { name: /apri revisione/i }));
  fireEvent.click(await screen.findByRole("button", { name: /approva calendario/i }));
  fireEvent.click(await screen.findByRole("button", { name: /conferma approvazione/i }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toMatch(/url.*https pubblica/i);
  expect(alert.textContent).not.toContain("[object Object]");
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
