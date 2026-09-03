/**
 * Ciak Admin — Knowledge Base di Carlo: riattivare una versione storica non
 * parte da un confirm() del browser ma da una conferma in pagina, con toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MatteoKBEditor } from "./MatteoKBEditor";
import { apiGet, apiPost } from "../api";
import { toast } from "sonner";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const DATA = {
  active: { id: "v1", content: "attivo" },
  fallback_hardcoded: { content: "fb" },
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
  render(<MatteoKBEditor onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: "Attiva questa" });
}

test("riattivare una versione apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "Attiva questa" }));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/versione/i);
  spy.mockRestore();
});

test("confermando chiama l'activate della versione", async () => {
  await renderEditor();
  fireEvent.click(screen.getByRole("button", { name: "Attiva questa" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Riattiva" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/matteo-prompt/v2/activate", {})
  );
});
