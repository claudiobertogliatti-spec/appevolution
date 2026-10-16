/**
 * Ciak Admin — editor prompt Analisi: riattivare una versione storica non parte
 * da un confirm() del browser ma da una conferma in pagina, con toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AnalisiPromptEditor } from "./AnalisiPromptEditor";
import { apiGet, apiPost } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const DATA = {
  active: { id: "v1", content: "attivo" },
  versions: [
    { id: "v2", label: "Vecchia", active: false, created_at: "2026-01-01", author_email: "a@x.it", content: "old" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue(DATA);
  apiPost.mockResolvedValue({});
});

async function renderEditor() {
  render(<AnalisiPromptEditor onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: "Riattiva" });
}

test("riattivare una versione apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/versione/i);
  spy.mockRestore();
});

test("confermando chiama l'activate della versione per la chiave selezionata", async () => {
  await renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "Riattiva" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riattiva" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/analisi/prompt/definitiva/v2/activate", {})
  );
});
