/**
 * Ciak Admin — Memoria Ciak: stato vuoto onesto, salvataggio con etichetta obbligatoria,
 * riattivazione con conferma in pagina.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoriaCiak } from "./MemoriaCiak";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const SECTIONS = [
  { key: "marchio", title: "Marchio", hint: "Chi siamo." },
  { key: "offerte", title: "Offerte", hint: "Cosa vendiamo." },
  { key: "regole", title: "Regole", hint: "Cosa non fare." },
  { key: "tono", title: "Tono", hint: "Come si scrive." },
];

const VUOTA = { active: null, versions: [], sections: SECTIONS, max_section_chars: 4000 };
const CON_DATI = {
  active: { id: "v1", label: "Prima", sections: { tono: "Dai del tu." }, author_email: "c@x.it", created_at: "2026-10-12", active: true },
  versions: [
    { id: "v1", label: "Prima", sections: { tono: "Dai del tu." }, author_email: "c@x.it", created_at: "2026-10-12", active: true },
    { id: "v0", label: "Zero", sections: { tono: "Dai del lei." }, author_email: "c@x.it", created_at: "2026-10-01", active: false },
  ],
  sections: SECTIONS,
  max_section_chars: 4000,
};

beforeEach(() => {
  jest.clearAllMocks();
  apiPost.mockResolvedValue({});
});

test("senza memoria dice che gli agenti lavorano come prima", async () => {
  apiGet.mockResolvedValue(VUOTA);
  render(<MemoriaCiak onAuthExpired={() => {}} />);
  expect(await screen.findByText(/Nessuna memoria scritta/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Salva e attiva" }).disabled).toBe(true);
});

test("salva solo con l'etichetta e manda le sezioni scritte", async () => {
  apiGet.mockResolvedValue(VUOTA);
  render(<MemoriaCiak onAuthExpired={() => {}} />);
  await screen.findByText(/Nessuna memoria scritta/);
  fireEvent.change(screen.getByLabelText("Tono"), { target: { value: "Dai del tu." } });
  fireEvent.change(screen.getByLabelText("Cosa hai cambiato"), { target: { value: "primo tono" } });
  fireEvent.click(screen.getByRole("button", { name: "Salva e attiva" }));
  fireEvent.click(screen.getByRole("button", { name: "Conferma, attiva" }));
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith("/memoria", {
      label: "primo tono",
      sections: { tono: "Dai del tu." },
      parent_id: null,
      activate: true,
    })
  );
});

test("carica la versione attiva negli editor", async () => {
  apiGet.mockResolvedValue(CON_DATI);
  render(<MemoriaCiak onAuthExpired={() => {}} />);
  await screen.findByRole("button", { name: "Attiva questa" });
  expect(screen.getByLabelText("Tono").value).toBe("Dai del tu.");
});

test("riattivare una versione apre una conferma in pagina e poi chiama l'activate", async () => {
  apiGet.mockResolvedValue(CON_DATI);
  render(<MemoriaCiak onAuthExpired={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Attiva questa" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Riattiva" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/memoria/v0/activate", {}));
});

test("oltre il limite di caratteri il salvataggio è bloccato", async () => {
  apiGet.mockResolvedValue(VUOTA);
  render(<MemoriaCiak onAuthExpired={() => {}} />);
  await screen.findByText(/Nessuna memoria scritta/);
  fireEvent.change(screen.getByLabelText("Marchio"), { target: { value: "a".repeat(4001) } });
  fireEvent.change(screen.getByLabelText("Cosa hai cambiato"), { target: { value: "x" } });
  expect(screen.getByRole("button", { name: "Salva e attiva" }).disabled).toBe(true);
});
