import { render, screen, within, waitFor } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
}), { virtual: true });
jest.mock("../api", () => ({ apiGet: jest.fn() }));

import { OggiBlocks } from "./OggiBlocks";
import { apiGet } from "../api";

const AUDIT = {
  items: [
    { id: "p1", name: "Dario Fontana", email: "dario@x.it", owner: "Team", stale: true, macro_label: "Valida" },
    { id: "p2", name: "Irene Costa", email: "irene@x.it", owner: "Partner", stale: true, macro_label: "Valida" },
  ],
};

beforeEach(() => {
  apiGet.mockReset();
  window.localStorage.setItem("ciak_admin_home_riquadri", JSON.stringify(["partner"]));
});

test("partner: prima le liste da lavorare, in fondo il conteggio per fase", async () => {
  apiGet.mockImplementation((path) => Promise.resolve(path === "/pipeline-blueprint" ? { columns: [] } : AUDIT));
  render(<OggiBlocks />);
  await waitFor(() => expect(screen.queryAllByText("Caricamento…")).toHaveLength(0));
  const blocco = screen.getByRole("heading", { name: "Partner" }).closest("section");
  const titoli = within(blocco).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  const toccaATe = titoli.findIndex((t) => /^Tocca a te/.test(t));
  const aspettiamo = titoli.findIndex((t) => /^Aspettiamo il partner/.test(t));
  const fasi = titoli.findIndex((t) => /Come procedono, per fase/.test(t));
  expect(toccaATe).toBeGreaterThanOrEqual(0);
  expect(aspettiamo).toBeGreaterThan(toccaATe);
  expect(fasi).toBeGreaterThan(aspettiamo);
});
