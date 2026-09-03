/**
 * Ciak Admin — Fatture: annullare una fattura (azione finanziaria) non parte
 * da un confirm() del browser ma da una conferma in pagina col numero fattura.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Fatture } from "./Fatture";
import { apiGet, apiPost } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  adminFetch: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const ISSUED = {
  total: 1,
  totale_fatturato_euro: 100,
  items: [
    { id: "inv1", numero: "2026-001", stato: "emessa", cliente: { nome: "ACME" }, totale: 100 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockImplementation((url) => {
    if (url === "/invoices/sources") return Promise.resolve({ da_fatturare: 0 });
    if (url === "/invoices") return Promise.resolve(ISSUED);
    return Promise.resolve({});
  });
  apiPost.mockResolvedValue({});
});

async function openEmesse() {
  render(<Fatture />);
  fireEvent.click(await screen.findByRole("button", { name: /Emesse/ }));
  await screen.findByText("2026-001");
}

test("annullare una fattura apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await openEmesse();
  fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/2026-001/);
  spy.mockRestore();
});

test("confermando chiama il cancel per l'id fattura e conferma con un toast", async () => {
  await openEmesse();
  fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Annulla la fattura" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/invoices/inv1/cancel"));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
