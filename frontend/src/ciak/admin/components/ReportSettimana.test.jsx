import { render, screen, waitFor } from "@testing-library/react";
import { ReportSettimana } from "./ReportSettimana";
import { apiGet } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), SCOPE_DENIED_DETAIL: "scope_denied" }));

test("mostra i conteggi, la variazione e n/d per ciò che non si conta", async () => {
  apiGet.mockResolvedValue({ voci: [
    { chiave: "contatti", etichetta: "Nuovi contatti", attuale: 5, precedente: 2, variazione: 3 },
    { chiave: "reel", etichetta: "Reel generati", attuale: null, precedente: null, variazione: null },
  ] });
  render(<ReportSettimana />);
  expect(await screen.findByText("5")).toBeTruthy();
  expect(screen.getByText("+3 sulla settimana prima")).toBeTruthy();
  expect(screen.getByText("n/d")).toBeTruthy();
});

test("sparisce se il server nega l'accesso", async () => {
  apiGet.mockRejectedValue(new Error('Errore 403: {"detail":"scope_denied"}'));
  const { container } = render(<ReportSettimana />);
  await waitFor(() => expect(container.firstChild).toBeNull());
});
