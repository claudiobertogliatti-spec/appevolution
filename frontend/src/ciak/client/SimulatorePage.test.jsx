import { fireEvent, render, screen, within } from "@testing-library/react";
import { SimulatorePage } from "./pages/SimulatorePage";

test("si apre sullo scenario Prudente e dice subito che sono ipotesi, non una promessa", () => {
  render(<SimulatorePage />);
  expect(screen.getByRole("radio", { name: "Prudente" })).toBeChecked();
  expect(screen.getByRole("note")).toHaveTextContent(/ipotesi, non una promessa/i);
  expect(screen.getByRole("note")).toHaveTextContent(/nessun guadagno è garantito/i);
});

test("gli scenari sono Prudente, Ambizioso e Tuo: non esiste il Base", () => {
  render(<SimulatorePage />);
  const gruppo = screen.getByRole("radiogroup", { name: "Scenario" });
  const nomi = within(gruppo).getAllByRole("radio").map((r) => r.value);
  expect(nomi).toEqual(["prudente", "ambizioso", "custom"]);
  expect(screen.queryByText(/^base$/i)).toBeNull();
});

test("passare ad Ambizioso cambia i risultati, e modificare un valore porta su Tuo", () => {
  render(<SimulatorePage />);
  const prima = screen.getByText(/Incassi in 12 mesi/).parentElement.textContent;
  fireEvent.click(screen.getByRole("radio", { name: "Ambizioso" }));
  expect(screen.getByText(/Incassi in 12 mesi/).parentElement.textContent).not.toBe(prima);
  fireEvent.change(screen.getByLabelText("Comprano (valore)"), { target: { value: "4" } });
  expect(screen.getByRole("radio", { name: "Tuo" })).toBeChecked();
});

test("il numero si puo' digitare liberamente e rientra nella fascia all'uscita", () => {
  render(<SimulatorePage />);
  const prezzo = screen.getByLabelText("Prezzo del corso (valore)");
  fireEvent.change(prezzo, { target: { value: "1" } });
  expect(prezzo).toHaveValue(1); // non scatta subito a 97 mentre si scrive
  fireEvent.blur(prezzo);
  expect(prezzo).toHaveValue(97);
});

test("il secondo corso compare solo se lo si attiva", () => {
  render(<SimulatorePage />);
  expect(screen.queryByLabelText("Prezzo del secondo corso (valore)")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: /secondo corso/i }));
  expect(screen.getByLabelText("Prezzo del secondo corso (valore)")).toBeInTheDocument();
});

test("elenca i costi inclusi e quelli non inclusi, senza promesse", () => {
  render(<SimulatorePage />);
  const testo = document.body.textContent;
  expect(testo).toMatch(/Partnership 2\.990 € una tantum/);
  expect(testo).toMatch(/royalty del 10%/);
  expect(testo).toMatch(/Non inclusi: IVA e imposte/);
  expect(testo).not.toMatch(/garantit[oiae] (di )?(guadagn|ritorn|vendit)/i);
});

test("la tabella dei numeri esiste per chi non legge il grafico", () => {
  render(<SimulatorePage />);
  expect(screen.getByText(/Vedi la tabella dei numeri/i)).toBeInTheDocument();
  expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(13); // intestazione e 12 mesi
});
