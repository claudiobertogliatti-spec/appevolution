import { render, screen, fireEvent, act } from "@testing-library/react";
import { useDrawer } from "./useDrawer";

function Harness({ routeKey = "/admin" }) {
  const { open, setOpen, close, triggerRef, panelRef } = useDrawer(routeKey);
  return (
    <div>
      <button ref={triggerRef} aria-expanded={open} onClick={() => setOpen(true)}>Apri</button>
      <div ref={panelRef} data-testid="pannello" data-open={String(open)}>
        <button onClick={close}>Chiudi</button>
        <a href="/admin/leads">Lead</a>
        <a href="/admin/partner">Partner</a>
      </div>
    </div>
  );
}

const aperto = () => screen.getByTestId("pannello").getAttribute("data-open") === "true";

test("si apre dal pulsante e il focus entra nel pannello", () => {
  render(<Harness />);
  expect(aperto()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Apri" }));
  expect(aperto()).toBe(true);
  expect(screen.getByRole("button", { name: "Apri" }).getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Chiudi" }));
});

test("Esc chiude e riporta il focus sul pulsante che l'ha aperto", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Apri" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(aperto()).toBe(false);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apri" }));
});

test("Tab non esce dal pannello: dall'ultimo torna al primo e viceversa", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Apri" }));
  screen.getByRole("link", { name: "Partner" }).focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Chiudi" }));
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "Partner" }));
});

test("cambiando pagina il menu si chiude", () => {
  const { rerender } = render(<Harness routeKey="/admin" />);
  fireEvent.click(screen.getByRole("button", { name: "Apri" }));
  expect(aperto()).toBe(true);
  rerender(<Harness routeKey="/admin/partner" />);
  expect(aperto()).toBe(false);
});

test("passando a desktop il drawer aperto si chiude", () => {
  let listener;
  const mq = {
    matches: false,
    addEventListener: (_, fn) => { listener = fn; },
    removeEventListener: jest.fn(),
  };
  const original = window.matchMedia;
  window.matchMedia = jest.fn(() => mq);
  try {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Apri" }));
    expect(aperto()).toBe(true);
    act(() => listener({ matches: true }));
    expect(aperto()).toBe(false);
  } finally {
    window.matchMedia = original;
  }
});

test("da chiuso i tasti non fanno niente (nessun focus rubato)", () => {
  render(<Harness />);
  screen.getByRole("button", { name: "Apri" }).focus();
  fireEvent.keyDown(document, { key: "Tab" });
  fireEvent.keyDown(document, { key: "Escape" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apri" }));
});
