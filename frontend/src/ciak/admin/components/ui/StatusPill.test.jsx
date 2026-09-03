/**
 * StatusPill — lo stato non si legge mai dal solo colore.
 *
 * Nell'admin rosso e ambra si confondono per chi ha un deficit cromatico, e i
 * semafori a emoji ("🔴") non dicono cosa fare. Ogni pill porta un'icona E una
 * parola: il colore e' rinforzo, non l'unico canale.
 */
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

test("mostra sempre l'etichetta testuale, non solo il colore", () => {
  render(<StatusPill tone="critical" label="In ritardo" />);
  expect(screen.getByText("In ritardo")).toBeTruthy();
});

test("porta un'icona accanto alla parola, per non dipendere dalla vista cromatica", () => {
  const { container } = render(<StatusPill tone="warning" label="Da confermare" />);
  expect(container.querySelector("svg")).toBeTruthy();
});

test("un tono sconosciuto non rompe: ricade sul neutro con la sua parola", () => {
  render(<StatusPill tone="qualcosa" label="Boh" />);
  expect(screen.getByText("Boh")).toBeTruthy();
});
