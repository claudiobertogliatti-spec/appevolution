/**
 * Ciak Admin — ContractParamsModal: ripristinare i parametri standard non parte
 * da un confirm() del browser ma da una conferma in pagina. Il modale e' annidato
 * dentro la scheda partner: il ConfirmDialog non deve chiudere il modale padre.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ContractParamsModal } from "./ContractParamsModal";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

const PARAMS = {
  corrispettivo: 2790,
  corrispettivo_testo: "duemilasettecentonovanta/00",
  royalty_perc: 10,
  durata_mesi: 12,
  num_rate: 3,
  note_admin: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (opts?.method === "PATCH") {
      return Promise.resolve({ json: async () => ({ success: true, params: PARAMS }) });
    }
    return Promise.resolve({ json: async () => ({ params: PARAMS, is_customized: true, contract_signed: false }) });
  });
});

async function renderModal() {
  render(<ContractParamsModal partnerId="p1" partnerName="ACME" onClose={() => {}} onAuthExpired={() => {}} />);
  await waitFor(() => expect(screen.getByTestId("contract-params-reset").disabled).toBe(false));
}

test("ripristinare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderModal();
  fireEvent.click(screen.getByTestId("contract-params-reset"));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/parametri/i);
  spy.mockRestore();
});

test("confermando chiama la PATCH di reset dei parametri", async () => {
  await renderModal();
  fireEvent.click(screen.getByTestId("contract-params-reset"));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Ripristina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/partners/p1/contract-params",
      expect.objectContaining({ method: "PATCH" })
    )
  );
});
