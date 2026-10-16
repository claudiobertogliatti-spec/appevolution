/**
 * Ciak Admin — ContrattoCustomModal (dentro Pipeline Prospect): rimuovere il
 * contratto custom non parte da un confirm() del browser ma da una conferma in
 * pagina. Il modale e' annidato: il ConfirmDialog non chiude il modale padre.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
// PipelineProspect.jsx importa react-router-dom a livello di modulo (non risolve in jest).
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../api", () => ({ adminFetch: jest.fn() }));

import { ContrattoCustomModal } from "./PipelineProspect";
import { adminFetch } from "../api";

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "DELETE") return Promise.resolve({ ok: true });
    return Promise.resolve({ json: async () => ({ custom_pdf_url: "http://x/c.pdf", filename: "c.pdf", uploaded_at: "2026-01-01" }) });
  });
});

async function renderModal() {
  render(<ContrattoCustomModal cliente={{ id: "c1", nome: "ACME" }} onClose={() => {}} onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: "Rimuovi" });
}

test("rimuovere il contratto custom apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderModal();
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi" }));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/contratto custom/i);
  spy.mockRestore();
});

test("confermando chiama la DELETE del contratto custom", async () => {
  await renderModal();
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Rimuovi" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith("/api/contract/custom-pdf/c1", { method: "DELETE" })
  );
});
