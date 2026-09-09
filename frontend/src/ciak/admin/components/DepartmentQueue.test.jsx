/**
 * Ciak Admin — Coda del reparto (T18).
 *
 * La coda mette in fila chi aspetta un passo: prossima azione, responsabile
 * (persona vs agente AI), scadenza e blocco. Priorita': prima i fermi. I dati
 * arrivano gia' pronti (props) dalla stessa fonte di Audit Delivery.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DepartmentQueue } from "./DepartmentQueue";

jest.mock("../api", () => ({ apiGet: jest.fn(() => Promise.resolve({ items: [] })) }));

const ITEMS = [
  { id: "1", name: "Zeta Uno", passaggio: "Valida", next_action: "Sollecita video", owner: "Antonella", scadenza: "15/09/2026", blocked: true, stale: false, incoerenza: false },
  { id: "2", name: "Alfa Due", passaggio: "Esamina", next_action: "Genera bozza", owner: "Valentina", scadenza: null, blocked: false, stale: false, incoerenza: false },
  { id: "3", name: "Beta Tre", passaggio: "Ottimizza", next_action: null, owner: "Claudio", scadenza: null, blocked: false, stale: true, incoerenza: false },
];

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

test("mostra le colonne operative e il tag persona vs agente AI", () => {
  render(<DepartmentQueue items={ITEMS} />);
  const r1 = screen.getByTestId("coda-row-1");
  expect(r1.textContent).toMatch(/Sollecita video/);
  expect(within(r1).getByText("persona")).toBeTruthy(); // Antonella = persona
  expect(r1.textContent).toMatch(/Fermo/); // blocco
  const r2 = screen.getByTestId("coda-row-2");
  expect(within(r2).getByText("agente AI")).toBeTruthy(); // Valentina = agente AI
});

test("ordina per priorita': prima i fermi, poi in ritardo, poi il resto", () => {
  render(<DepartmentQueue items={ITEMS} />);
  const order = screen.getAllByTestId(/coda-row-/).map((r) => r.getAttribute("data-testid"));
  expect(order).toEqual(["coda-row-1", "coda-row-3", "coda-row-2"]);
});

test("il filtro 'Bloccati' mostra solo i bloccati e persiste in URL", () => {
  render(<DepartmentQueue items={ITEMS} />);
  fireEvent.click(screen.getByRole("button", { name: "Bloccati" }));
  expect(screen.getByTestId("coda-row-1")).toBeTruthy();
  expect(screen.queryByTestId("coda-row-2")).toBeNull();
  expect(window.location.search).toMatch(/coda=bloccati/);
});

test("cliccare una riga apre il partner", () => {
  const onOpen = jest.fn();
  render(<DepartmentQueue items={ITEMS} onOpenPartner={onOpen} />);
  fireEvent.click(screen.getByTestId("coda-row-2"));
  expect(onOpen).toHaveBeenCalledWith("2");
});

test("una riga si apre anche da tastiera (Enter) — accessibile", () => {
  const onOpen = jest.fn();
  render(<DepartmentQueue items={ITEMS} onOpenPartner={onOpen} />);
  fireEvent.keyDown(screen.getByTestId("coda-row-2"), { key: "Enter" });
  expect(onOpen).toHaveBeenCalledWith("2");
});
