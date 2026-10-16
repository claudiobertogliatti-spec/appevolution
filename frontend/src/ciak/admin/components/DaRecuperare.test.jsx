import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DaRecuperare } from "./DaRecuperare";
import { apiGet } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn() }));
jest.mock("./SollecitoPannello", () => ({
  SollecitoPannello: ({ tipo, email, onInviato, onClose }) => (
    <div>
      PANNELLO-{tipo}-{email}
      <button type="button" onClick={() => { onInviato(); onClose(); }}>finto-invio</button>
    </div>
  ),
}));

const C = { email: "a@x.it", nome: "Anna Rossi", motivo: "report_senza_call", motivo_label: "Ha il report ma non ha fissato la call", giorni: 6 };
const mostra = () => render(<MemoryRouter><DaRecuperare /></MemoryRouter>);

beforeEach(() => apiGet.mockReset());

test("elenca chi è fermo con il motivo vero e i giorni", async () => {
  apiGet.mockResolvedValue({ items: [C] });
  mostra();
  expect(await screen.findByText("Anna Rossi")).toBeTruthy();
  expect(screen.getByText("Ha il report ma non ha fissato la call · da 6 giorni")).toBeTruthy();
});

test("«Prepara l'email» apre il flusso recupero; dopo l'invio la lista si ricarica", async () => {
  apiGet.mockResolvedValueOnce({ items: [C] }).mockResolvedValueOnce({ items: [] });
  mostra();
  fireEvent.click(await screen.findByRole("button", { name: "Prepara l'email" }));
  expect(screen.getByText(/PANNELLO-recupero-a@x.it/)).toBeTruthy();
  fireEvent.click(screen.getByText("finto-invio"));
  expect(await screen.findByText("Nessuno da recuperare adesso.")).toBeTruthy();
});

test("lista vuota lo dice; fonte rotta non diventa «nessuno»", async () => {
  apiGet.mockResolvedValue({ items: [] });
  const a = mostra();
  expect(await screen.findByText("Nessuno da recuperare adesso.")).toBeTruthy();
  a.unmount();
  apiGet.mockRejectedValue(new Error("x"));
  mostra();
  expect(await screen.findByText(/Dato non disponibile/)).toBeTruthy();
  expect(screen.queryByText("Nessuno da recuperare adesso.")).toBeNull();
});
