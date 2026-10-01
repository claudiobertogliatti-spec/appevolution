/**
 * Benvenuto Ciak Start: cosa si e' acquistato, cosa si fa insieme, una sola azione.
 * Niente Metodo E.V.O. (della Partnership), niente riquadri video vuoti.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import BenvenutoStart from "./BenvenutoStart";

test("mostra acquisto, tappe con date e CTA Iniziamo", () => {
  const onStart = jest.fn();
  render(
    <BenvenutoStart
      clientName="Linda Pavia"
      consegne={["08/10/2026", "15/10/2026", "22/10/2026"]}
      onStart={onStart}
    />
  );
  expect(screen.getByText(/Ciao Linda/)).toBeTruthy();
  expect(screen.getByText("Cosa hai acquistato")).toBeTruthy();
  expect(screen.getByText("Cosa faremo insieme")).toBeTruthy();
  expect(screen.getByText("Entro il 08/10/2026")).toBeTruthy();
  expect(screen.getByText("Entro il 22/10/2026")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Iniziamo" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("non porta il Metodo E.V.O. della Partnership, ne' parla di accademia o funnel", () => {
  const { container } = render(<BenvenutoStart clientName="Linda" onStart={() => {}} />);
  const testo = container.textContent;
  expect(testo).not.toMatch(/Esamina|Valida|Ottimizza|Metodo E\.V\.O|funnel|masterclass|accademia/i);
  // La Partnership compare solo come passo successivo, con i 390 euro scalati.
  expect(testo).toMatch(/Partnership/);
  expect(testo).toMatch(/390/);
});

test("senza date non inventa scadenze; il video 1 e' un mp4 riprodotto dal sito, non un iframe", () => {
  const { container } = render(<BenvenutoStart clientName="Linda" consegne={[]} onStart={() => {}} />);
  expect(container.textContent).not.toMatch(/Entro il/);
  expect(container.querySelector("iframe")).toBeNull();
  const video = container.querySelector("video");
  expect(video).not.toBeNull();
  expect(video.getAttribute("src")).toBe("/video/ciak-start-benvenuto-1.mp4");
  expect(video.hasAttribute("controls")).toBe(true);
});
