import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MasterclassReview } from "./MasterclassReview";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

const WORDS = "oggi vediamo il punto nave dove dove sei e dove vuoi andare grazie".split(" ").map((t, i) => ({
  text: t, start: i * 1.0, end: i * 1.0 + 0.8,
}));
const DATA = {
  pipeline_status: "da_revisionare", raw_duration_s: 13, words: WORDS, transcript: WORDS.map((w) => w.text).join(" "),
  cut_segments: [{ id: 0, start: 5.0, end: 6.0, type: "smart", reason: "balbettio", word: "dove", enabled: true }],
};

function renderLesson() {
  return render(
    <MemoryRouter initialEntries={["/review/p1/lez-2"]}>
      <Routes><Route path="/review/:partnerId/:lessonId" element={<MasterclassReview onAuthExpired={() => {}} />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "POST") return Promise.resolve({ ok: true, text: async () => "" });
    return Promise.resolve({ ok: true, json: async () => DATA });
  });
});

const approveBody = () => JSON.parse(adminFetch.mock.calls.find(([, o]) => o?.method === "POST")[1].body);

test("si seleziona un passaggio del testo e lo si aggiunge come taglio manuale che parte con l'approvazione", async () => {
  renderLesson();
  fireEvent.click(await screen.findByText("grazie"));                      // ultima parola
  const words = screen.getAllByText("punto");
  fireEvent.click(words[0]);                                               // "punto"
  fireEvent.click(screen.getByText("nave"), { shiftKey: true });          // "punto nave"
  fireEvent.click(screen.getByRole("button", { name: "Taglia selezione" }));
  expect(screen.getByText("Taglio tuo")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Approva e monta/ }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(2));
  expect(adminFetch.mock.calls[1][0]).toBe("/api/partner-journey/videocorso/review-approve");
  expect(approveBody()).toEqual({ partner_id: "p1", lesson_id: "lez-2", disabled_cut_ids: [],
    custom_cuts: [{ start_s: 3, end_s: 4.8 }] });
});

test("un clic su una parola barrata rimette la proposta; un taglio manuale si toglie dalla lista", async () => {
  renderLesson();
  await screen.findByText("grazie");
  const struck = screen.getAllByText("dove")[0];                           // la prima "dove" e dentro il taglio 5-6
  expect(struck.className).toMatch(/line-through/);
  fireEvent.click(struck);
  expect(struck.className).not.toMatch(/line-through/);
  fireEvent.click(screen.getByRole("button", { name: /Approva e monta/ }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(2));
  expect(approveBody().disabled_cut_ids).toEqual([0]);
  expect(approveBody().custom_cuts).toEqual([]);
});

test("per la masterclass le parole non sono selezionabili e non si inviano tagli manuali", async () => {
  render(
    <MemoryRouter initialEntries={["/review/p1"]}>
      <Routes><Route path="/review/:partnerId" element={<MasterclassReview onAuthExpired={() => {}} />} /></Routes>
    </MemoryRouter>
  );
  const w = await screen.findByText("grazie");
  fireEvent.click(w);
  expect(screen.queryByRole("button", { name: "Taglia selezione" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Approva e monta/ }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(2));
  expect(adminFetch.mock.calls[1][0]).toBe("/api/partner-journey/masterclass/review-approve");
  expect("custom_cuts" in approveBody()).toBe(false);
});
