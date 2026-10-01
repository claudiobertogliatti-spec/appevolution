/**
 * Benvenuto Ciak Start: accoglienza calda, video a tutta larghezza, cosa si fa
 * insieme con le date, un motivo per iniziare e una sola azione.
 * Niente Metodo E.V.O. (della Partnership), niente elenco che ripete il video.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import BenvenutoStart from "./BenvenutoStart";

test("accoglie con calore, mostra le tappe con le date e la CTA Iniziamo", () => {
  const onStart = jest.fn();
  render(
    <BenvenutoStart
      clientName="Linda Pavia"
      consegne={["08/10/2026", "15/10/2026", "22/10/2026"]}
      onStart={onStart}
    />
  );
  expect(screen.getByText(/Ciao Linda, siamo felici di averti con noi/)).toBeTruthy();
  expect(screen.getByText("Cosa faremo insieme")).toBeTruthy();
  expect(screen.getByText("Entro il 08/10/2026")).toBeTruthy();
  expect(screen.getByText("Entro il 22/10/2026")).toBeTruthy();
  expect(screen.getByText(/Il momento giusto per iniziare è adesso/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Iniziamo" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("non ripete il video con un elenco e non porta il Metodo E.V.O. della Partnership", () => {
  const { container } = render(<BenvenutoStart clientName="Linda" onStart={() => {}} />);
  const testo = container.textContent;
  expect(testo).not.toMatch(/Cosa hai acquistato/);
  expect(testo).not.toMatch(/Esamina|Valida|Ottimizza|Metodo E\.V\.O|funnel|masterclass|accademia/i);
});

test("il video 1 e' un mp4 riprodotto dal sito, a tutta larghezza, non un iframe", () => {
  const { container } = render(<BenvenutoStart clientName="Linda" consegne={[]} onStart={() => {}} />);
  expect(container.textContent).not.toMatch(/Entro il/);
  expect(container.querySelector("iframe")).toBeNull();
  const video = container.querySelector("video");
  expect(video).not.toBeNull();
  expect(video.getAttribute("src")).toBe("/video/ciak-start-benvenuto-1.mp4");
  expect(video.hasAttribute("controls")).toBe(true);
  // Una colonna sola: niente griglia a due colonne che lo dimezza.
  expect(container.querySelector("section[aria-label='Video di benvenuto']").className).not.toMatch(/grid-cols-2|sm:grid-cols/);
});
