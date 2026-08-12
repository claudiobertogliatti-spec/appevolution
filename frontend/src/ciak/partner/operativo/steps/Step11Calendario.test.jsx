import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Step11Calendario from "./Step11Calendario";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}), { virtual: true });

const mockApi = { current: () => ({}) };

function makeDays(total) {
  return Array.from({ length: total }, (_, index) => ({
    day: index + 1,
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    channel: "instagram",
    format: "reel",
    theme: `Tema ${index + 1}`,
    how_to: "Parla a camera per 30 secondi",
    cta: "follow",
    destination_url: "https://www.ciak.io/masterclass",
    destination_kind: index < 14 ? "masterclass" : index < 28 ? "live" : "checkout",
    owner: "partner",
    phase: index < 7 ? "recognition" : "conversion",
    dm_action: "Rispondi ai messaggi entro la giornata.",
    action_kind: "content",
    audience_condition: "Pubblico interessato",
  }));
}

function validCalendar(days = 30) {
  return {
    start_date: "2026-09-01",
    live_date: "2026-09-28",
    days: makeDays(days),
    organic_routine: {
      daily_minutes: 30,
      interactions_target: 10,
      outreach_target: 10,
      dm_follow_up_target: 10,
      actions: {
        interactions: "Rispondi ai commenti utili.",
        outreach: "Avvia nuove conversazioni mirate.",
        dm_follow_up: "Segui in DM chi ha interagito.",
      },
    },
    commercial_terms: {
      version: "catalogo-lancio-v1",
      contract_duration_months: 12,
      contract_start_anchor: "payment_completed",
      price: { price_id: "price-corso-v1", amount_cent: 2700, currency: "EUR" },
      bonus: {
        bonus_id: "bonus-orientamento-v1",
        name: "Sessione di orientamento",
        version: "bonus-v1",
        expires_at: "2026-10-01T23:59:59+02:00",
      },
    },
  };
}

function versionDocument(overrides = {}) {
  return {
    partner_id: "p1",
    version: 1,
    status: "draft",
    checksum: "checksum-v1",
    calendar: validCalendar(),
    admin_review: null,
    ...overrides,
  };
}

function renderStep(step = { data: {} }) {
  return render(<Step11Calendario step={step} partnerId="p1" />);
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockImplementation(() => Promise.resolve({ data: mockApi.current() }));
});

test("non consente invio con meno di 30 giorni", async () => {
  mockApi.current = () => versionDocument({ calendar: validCalendar(29) });
  renderStep();

  expect((await screen.findByRole("button", { name: /invia a marco/i })).disabled).toBe(true);
  expect(screen.getByText((_, element) => element?.textContent === "29 di 30 giorni")).toBeTruthy();
});

test("mostra lo stato in revisione senza dichiarare lo step concluso", async () => {
  mockApi.current = () => versionDocument({ version: 2, status: "pending_review" });
  renderStep({ status: "in_progress", data: {} });

  expect(await screen.findByText(/in revisione da marco/i)).toBeTruthy();
  expect(screen.queryByText(/completato/i)).toBeNull();
});

test("invia la conferma con il checksum della versione mostrata", async () => {
  mockApi.current = () => versionDocument();
  axios.post.mockResolvedValueOnce({
    data: versionDocument({ status: "pending_review", checksum: "checksum-confermato" }),
  });
  renderStep();

  fireEvent.click(await screen.findByRole("button", { name: /invia a marco/i }));

  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/partner\/calendar\/p1\/versions\/1\/submit$/),
      { partner_confirmed: true, expected_checksum: "checksum-v1" },
      expect.any(Object)
    )
  );
  expect(await screen.findByText(/in revisione da marco/i)).toBeTruthy();
});

test("una versione approvata e' consultabile ma non modificabile", async () => {
  mockApi.current = () => versionDocument({ status: "approved" });
  renderStep();

  expect(await screen.findByText("Approvato")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: /^tema del giorno 1$/i }).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: /invia a marco/i })).toBeNull();
});

test("rigenera creando una nuova versione senza sovrascrivere quella corrente", async () => {
  mockApi.current = () => versionDocument();
  axios.post.mockResolvedValueOnce({ data: versionDocument({ version: 2, checksum: "checksum-v2" }) });
  renderStep();

  fireEvent.click(await screen.findByRole("button", { name: /rigenera nuova versione/i }));

  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/partner\/calendar\/p1\/versions$/),
      { start_date: "2026-09-01", live_date: "2026-09-28" },
      expect.any(Object)
    )
  );
  expect(await screen.findByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();
});

test("dopo un errore di caricamento non propone di creare una versione", async () => {
  axios.get.mockRejectedValueOnce({ response: { status: 503, data: { detail: "Servizio non disponibile" } } });
  renderStep();

  expect(await screen.findByText("Servizio non disponibile")).toBeTruthy();
  expect(screen.getByRole("button", { name: /riprova/i })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /crea il calendario/i })).toBeNull();
});

test("mostra un messaggio operativo per i controlli strutturati rifiutati", async () => {
  mockApi.current = () => versionDocument();
  axios.post.mockRejectedValueOnce({
    response: {
      status: 409,
      data: { detail: { code: "launch_calendar_not_ready", failed_checks: ["https_destination_urls", "bonus_deadline"] } },
    },
  });
  renderStep();

  fireEvent.click(await screen.findByRole("button", { name: /invia a marco/i }));

  expect(await screen.findByText(/inserisci un URL https valido/i)).toBeTruthy();
  expect(screen.getByText(/completa prezzo, bonus e scadenza/i)).toBeTruthy();
});

test("blocca la seconda mutazione finche la nuova versione non e' confermata dal server", async () => {
  mockApi.current = () => versionDocument();
  const creation = deferred();
  axios.post.mockImplementationOnce(() => creation.promise);
  renderStep();

  const regenerate = await screen.findByRole("button", { name: /rigenera nuova versione/i });
  fireEvent.click(regenerate);
  fireEvent.click(regenerate);

  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox", { name: /^tema del giorno 1$/i }).disabled).toBe(true);

  creation.resolve({ data: versionDocument({ version: 2, checksum: "checksum-v2" }) });
  expect(await screen.findByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();
});

test("ignora il caricamento precedente quando cambia il partner", async () => {
  const first = deferred();
  const second = deferred();
  axios.get.mockReset();
  axios.get.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const view = render(<Step11Calendario step={{ data: {} }} partnerId="p1" />);

  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
  view.rerender(<Step11Calendario step={{ data: {} }} partnerId="p2" />);
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  second.resolve({ data: versionDocument({ partner_id: "p2", version: 2, checksum: "checksum-p2" }) });
  expect(await screen.findByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();

  first.resolve({ data: versionDocument({ partner_id: "p1", version: 1, checksum: "checksum-p1" }) });
  await waitFor(() => expect(screen.getByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy());
  expect(screen.queryByText((_, element) => element?.textContent === "Versione 1")).toBeNull();
});
