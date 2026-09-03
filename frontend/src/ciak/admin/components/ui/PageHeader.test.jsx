/**
 * PageHeader — l'intestazione condivisa. Eyebrow slate di default (decisione
 * Claudio 3/9); giallo solo su richiesta esplicita via eyebrowTone="brand".
 */
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

test("mostra eyebrow, titolo, sottotitolo e azione", () => {
  render(
    <PageHeader
      eyebrow="Back office"
      title="Amministrazione"
      subtitle="Obiettivo del mese"
      action={<button>Movimento</button>}
    />
  );
  expect(screen.getByText("Back office")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Amministrazione" })).toBeTruthy();
  expect(screen.getByText("Obiettivo del mese")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Movimento" })).toBeTruthy();
});

// .closest("div") risale al contenitore stilizzato dell'eyebrow: il plugin
// visual-edits avvolge il testo in uno <span> senza classi.
test("l'eyebrow di default e' slate, non gialla", () => {
  render(<PageHeader eyebrow="Reparto" title="Titolo" />);
  const ey = screen.getByText("Reparto").closest("div");
  expect(ey.className).toMatch(/text-slate-500/);
  expect(ey.className).not.toMatch(/yellow/);
});

test('eyebrowTone="brand" rende l\'eyebrow gialla dove serve', () => {
  render(<PageHeader eyebrow="Reparto" title="Titolo" eyebrowTone="brand" />);
  expect(screen.getByText("Reparto").closest("div").className).toMatch(/text-yellow-600/);
});
