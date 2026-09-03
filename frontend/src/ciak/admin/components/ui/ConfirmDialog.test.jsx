/**
 * ConfirmDialog — la conferma di un'azione irreversibile sta in pagina, con il
 * nome dell'oggetto e il verbo esatto. Non un window.confirm() del browser, che
 * non dice cosa succede e si rende diverso su ogni sistema.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

test("chiuso non renderizza nulla nel DOM", () => {
  const { container } = render(
    <ConfirmDialog open={false} title="Elimina" onConfirm={() => {}} onCancel={() => {}} />
  );
  expect(container.querySelector("[role='dialog']")).toBeNull();
});

test("aperto mostra titolo e verbo, ed espone un dialog accessibile", () => {
  render(
    <ConfirmDialog open title="Eliminare Alfredo Vasi?" confirmLabel="Elimina" onConfirm={() => {}} onCancel={() => {}} />
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(screen.getByText("Eliminare Alfredo Vasi?")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Elimina" })).toBeTruthy();
});

test("Conferma chiama onConfirm, Annulla chiama onCancel", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <ConfirmDialog open title="Procedere?" confirmLabel="Procedi" onConfirm={onConfirm} onCancel={onCancel} />
  );
  fireEvent.click(screen.getByRole("button", { name: "Procedi" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: /annulla/i }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("il click sul backdrop chiude il dialog ma non si propaga al modale padre", () => {
  const onCancel = jest.fn();
  const parentClick = jest.fn();
  render(
    <div onClick={parentClick}>
      <ConfirmDialog open title="Procedere?" confirmLabel="Procedi" onConfirm={() => {}} onCancel={onCancel} />
    </div>
  );
  // Il backdrop e' il presentation-layer che avvolge il dialog.
  const backdrop = screen.getByRole("dialog").parentElement;
  fireEvent.click(backdrop);
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(parentClick).not.toHaveBeenCalled();
});

test("un'azione distruttiva colora il bottone di conferma di rosso, non di navy", () => {
  render(
    <ConfirmDialog open title="Eliminare?" confirmLabel="Elimina" destructive onConfirm={() => {}} onCancel={() => {}} />
  );
  const btn = screen.getByRole("button", { name: "Elimina" });
  expect(btn.className).toMatch(/red/);
});
