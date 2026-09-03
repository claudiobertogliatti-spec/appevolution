/**
 * Ciak Admin — PipelineList: eliminare un contatto non parte da un confirm()
 * del browser ma da una conferma in pagina, e l'esito passa da un toast.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn(), adminFetch: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { PipelineList } from "./PipelineList";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

const DATA = {
  columns: [{ id: "s1", label: "Lead", count: 1, items: [{ email: "pip@x.it" }] }],
};

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockResolvedValue(DATA);
});

async function renderList() {
  render(<PipelineList endpoint="/pipeline" title="Pipeline" deletable onAuthExpired={() => {}} />);
  await screen.findByText("pip@x.it");
}

test("eliminare un contatto apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await renderList();
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  expect(spy).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toMatch(/pip@x\.it/);
  spy.mockRestore();
});

test("confermando chiama la DELETE per email e conferma con un toast", async () => {
  adminFetch.mockResolvedValue({ ok: true });
  await renderList();
  fireEvent.click(screen.getByRole("button", { name: "Elimina" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Elimina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/ciak/lead?email=pip%40x.it",
      { method: "DELETE" }
    )
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});
