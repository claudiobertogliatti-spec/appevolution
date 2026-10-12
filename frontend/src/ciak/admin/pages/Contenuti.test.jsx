import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Contenuti } from "./Contenuti";
import { apiPost } from "../api";

jest.mock("../api", () => ({ apiPost: jest.fn() }));
jest.mock("../components/AndreaChat", () => ({ AndreaChat: () => <div>CHAT-ANDREA</div> }));

const mostra = () => render(<MemoryRouter><Contenuti /></MemoryRouter>);
const scrivi = (brief = "Racconta il nuovo percorso EVO in modo semplice") => {
  fireEvent.change(screen.getByLabelText("Brief"), { target: { value: brief } });
  fireEvent.click(screen.getByRole("button", { name: "Scrivi la bozza" }));
};

beforeEach(() => apiPost.mockReset());

test("raccoglie le pagine contenuti che esistono già", () => {
  mostra();
  const href = (nome) => screen.getByText(nome).closest("a").getAttribute("href");
  expect(href("Editoriale")).toBe("/admin/acquisizione-editoriale");
  expect(href("Casi studio")).toBe("/admin/casi-studio");
  expect(href("Calendario partner")).toBe("/admin/calendario-editoriale");
});

test("«Scrivi la bozza» è spento finché il brief è troppo corto", () => {
  mostra();
  expect(screen.getByRole("button", { name: "Scrivi la bozza" }).disabled).toBe(true);
});

test("manda tipo e brief e mostra la bozza marcata AI", async () => {
  apiPost.mockResolvedValue({ tipo: "post_instagram", testo: "Ecco la didascalia." });
  mostra();
  fireEvent.click(screen.getByLabelText("Post Instagram"));
  scrivi();
  expect(await screen.findByText("Ecco la didascalia.")).toBeTruthy();
  expect(apiPost).toHaveBeenCalledWith("/contenuti/bozza", { tipo: "post_instagram", brief: "Racconta il nuovo percorso EVO in modo semplice" });
  expect(screen.getByText("AI")).toBeTruthy();
});

test("SEO: mostra i campi con i caratteri contati e segnala un limite superato", async () => {
  apiPost.mockResolvedValue({ tipo: "seo_pagina", seo: { title: "T".repeat(70), meta: "Descrizione", h1: "Titolo", parole_chiave: ["evo"], title_len: 70, meta_len: 11, title_ok: false, meta_ok: true } });
  mostra();
  fireEvent.click(screen.getByLabelText("SEO di una pagina"));
  scrivi();
  expect(await screen.findByText("70/60 caratteri")).toBeTruthy();
  expect(screen.getByText(/Un limite è superato/)).toBeTruthy();
});

test("se Andrea non può rispondere lo dice, senza testo inventato", async () => {
  apiPost.mockRejectedValue(new Error('Errore 503: {"detail":"Andrea non può rispondere adesso. Riprova tra un momento."}'));
  mostra();
  scrivi();
  expect(await screen.findByText("Andrea non può rispondere adesso. Riprova tra un momento.")).toBeTruthy();
  expect(screen.queryByText("AI")).toBeNull();
});

test("«Copia» mette la bozza negli appunti", async () => {
  apiPost.mockResolvedValue({ tipo: "email", testo: "Oggetto: Ciao\n\nCorpo" });
  const scritto = jest.fn(() => Promise.resolve());
  Object.assign(navigator, { clipboard: { writeText: scritto } });
  mostra();
  scrivi();
  fireEvent.click(await screen.findByRole("button", { name: "Copia" }));
  await waitFor(() => expect(scritto).toHaveBeenCalledWith("Oggetto: Ciao\n\nCorpo"));
});

test("in cima c'è la chat con Andrea", () => {
  mostra();
  expect(screen.getByText("CHAT-ANDREA")).toBeTruthy();
});
