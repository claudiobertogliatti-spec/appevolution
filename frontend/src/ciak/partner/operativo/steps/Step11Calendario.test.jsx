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
  let reject;
  const promise = new Promise((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
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

test("non consente invio finche proposta commerciale e routine non sono complete e salvate", async () => {
  const calendar = validCalendar();
  delete calendar.commercial_terms;
  mockApi.current = () => versionDocument({ calendar });
  renderStep();

  expect((await screen.findByRole("button", { name: /invia a marco/i })).disabled).toBe(true);
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

  const submit = await screen.findByRole("button", { name: /invia a marco/i });
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

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

test("traduce tutti i codici di readiness senza esporre codici tecnici", async () => {
  mockApi.current = () => versionDocument();
  const codes = [
    "exactly_30_days", "consecutive_dates", "live_day_28", "day_fields", "canonical_enums",
    "https_destination_urls", "content_cadence", "funnel_sequence", "organic_routine",
    "bonus_deadline", "partner_confirmation", "admin_approval",
  ];
  axios.post.mockRejectedValueOnce({
    response: { status: 409, data: { detail: { code: "launch_calendar_not_ready", failed_checks: codes } } },
  });
  renderStep();

  const submit = await screen.findByRole("button", { name: /invia a marco/i });
  expect(submit.disabled).toBe(false);
  fireEvent.click(submit);
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

  const alert = await screen.findByRole("alert");
  [
    "Il calendario deve contenere esattamente 30 giorni.",
    "Le date dei 30 giorni devono essere consecutive.",
    "La diretta deve cadere al giorno 28.",
    "Completa tema, istruzioni, CTA, destinazione e routine di ogni giorno.",
    "Usa canale, formato e responsabile previsti per il calendario.",
    "Inserisci un URL HTTPS valido per ogni destinazione.",
    "Riequilibra la cadenza dei contenuti nel calendario.",
    "Controlla la sequenza tra contenuti, live e checkout.",
    "Completa la routine organica quotidiana.",
    "Completa prezzo, bonus e scadenza nelle condizioni commerciali.",
    "Completa la conferma del partner prima dell’invio.",
    "L’approvazione di Marco viene registrata dopo la revisione.",
  ].forEach((message) => expect(alert.textContent).toContain(message));
  codes.forEach((code) => expect(screen.queryByText(code, { exact: true })).toBeNull());
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

test("ignora la creazione precedente se il partner cambia durante la mutazione", async () => {
  mockApi.current = () => versionDocument();
  const creation = deferred();
  const p2 = deferred();
  axios.post.mockImplementationOnce(() => creation.promise);
  axios.get.mockImplementationOnce(() => Promise.resolve({ data: versionDocument() })).mockImplementationOnce(() => p2.promise);
  const view = render(<Step11Calendario step={{ data: {} }} partnerId="p1" />);

  fireEvent.click(await screen.findByRole("button", { name: /rigenera nuova versione/i }));
  view.rerender(<Step11Calendario step={{ data: {} }} partnerId="p2" />);
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

  p2.resolve({ data: versionDocument({ partner_id: "p2", version: 2, checksum: "checksum-p2" }) });
  expect(await screen.findByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();
  creation.resolve({ data: versionDocument({ partner_id: "p1", version: 3, checksum: "checksum-p3" }) });

  await new Promise((resolve) => setTimeout(resolve, 0));
  await waitFor(() => expect(screen.getByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy());
  expect(screen.queryByText((_, element) => element?.textContent === "Versione 3")).toBeNull();
});

test("ignora l'errore di salvataggio del partner precedente dopo il cambio partner", async () => {
  mockApi.current = () => versionDocument();
  const saving = deferred();
  const p2 = deferred();
  axios.put.mockImplementationOnce(() => saving.promise);
  axios.get.mockImplementationOnce(() => Promise.resolve({ data: versionDocument() })).mockImplementationOnce(() => p2.promise);
  const view = render(<Step11Calendario step={{ data: {} }} partnerId="p1" />);

  fireEvent.change(await screen.findByRole("textbox", { name: /^tema del giorno 1$/i }), { target: { value: "Tema aggiornato" } });
  fireEvent.click(screen.getByRole("button", { name: /salva modifiche/i }));
  view.rerender(<Step11Calendario step={{ data: {} }} partnerId="p2" />);
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

  p2.resolve({ data: versionDocument({ partner_id: "p2", version: 2, checksum: "checksum-p2" }) });
  expect(await screen.findByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();
  saving.reject({ response: { status: 503, data: { detail: "Errore salvataggio P1" } } });

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(screen.queryByText("Errore salvataggio P1")).toBeNull();
  expect(screen.getByText((_, element) => element?.textContent === "Versione 2")).toBeTruthy();
});
