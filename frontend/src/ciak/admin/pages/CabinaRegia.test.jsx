/**
 * Ciak Admin — la home mette prima cio' che decide.
 *
 * Prima del 3/9 il numero che chiedeva una decisione ("21 aspettano il tuo OK")
 * stava alla terza schermata e non era cliccabile, mentre il primo blocco era
 * un report scritto a mano, identico ogni giorno. L'ordine e' il contenuto.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { CabinaRegia } from "./CabinaRegia";
import { adminFetch, apiGet } from "../api";

// Mock virtuale: in locale react-router-dom non si risolve dentro jest
// (package.json punta a dist/main.js che non esiste); in CI si risolve ma il
// mock vale lo stesso. Serve solo un <a href> e un navigate finto.
jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);
jest.mock("../api", () => ({
  adminFetch: jest.fn(),
  apiGet: jest.fn(),
}));
jest.mock("../repartoMetrics", () => ({
  useRepartoMetrics: (id) =>
    id === "acquisizione" ? { "Nuovi lead 7 giorni": "12", "Blueprint acquistati": "2" } : {},
}));
jest.mock("../pages/LucaChat", () => ({
  LucaChat: () => <div data-testid="luca-chat">chat</div>,
}));
jest.mock("../components/ApprovalsQueue", () => ({
  ApprovalsQueue: () => <div data-testid="approvals-queue">coda</div>,
}));

const BY_PATH = {
  "/api/agent-hub/summary": { summary: { mrr: 0 }, health: { overall: "🟡" } },
  "/api/agent-tasks/approval-stats": { approved_today: 0, pending_count: 21, stale_count: 0 },
  "/api/admin/ciak/masterclass-analytics": { funnel: { opt_in: 12, diagnostic_completed: 2, purchased_67: 2 } },
  "/api/admin/ciak/invoices/sources": { items: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation(async (path) => ({
    ok: path in BY_PATH,
    json: async () => BY_PATH[path],
  }));
  apiGet.mockImplementation(async (path) => {
    if (path === "/obiettivo/10k-settembre") return { target: 10000, incassato: 375, gap: 9625, giorni_rimasti: 27, leve_ferme: [{ nome: "Rosanna", valore: 1850, giorni_fermi: 15 }] };
    if (path === "/crediti/riepilogo") return { scade_oggi: [], in_ritardo: [], previsto_nel_mese: 559 };
    throw new Error("path inatteso " + path);
  });
});

function renderHome() {
  return render(<CabinaRegia />);
}

const precede = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

test("l'ordine e': cassa a breve, poi cosa aspetta il tuo OK, poi i reparti", async () => {
  renderHome();
  const cassa = await screen.findByTestId("cassa-breve");
  const coda = screen.getByTestId("approvals-queue");
  const reparti = screen.getByRole("heading", { name: /^reparti/i });
  expect(precede(cassa, coda)).toBe(true);
  expect(precede(coda, reparti)).toBe(true);
});

test("la cassa a breve porta all'Amministrazione con i numeri veri", async () => {
  renderHome();
  const cassa = await screen.findByTestId("cassa-breve");
  expect(cassa.textContent).toMatch(/€ 375/);
  expect(cassa.textContent).toMatch(/€ 9\.625/);
  expect(cassa.textContent).toMatch(/Rosanna/);
  const link = screen.getByRole("link", { name: /apri amministrazione/i });
  expect(link.getAttribute("href")).toBe("/admin/amministrazione");
});

test("niente report fisso e niente 'Fatturato mese' che contraddice la Plancia", async () => {
  renderHome();
  await screen.findByTestId("cassa-breve");
  expect(screen.queryByText(/report di inizio giornata/i)).toBeNull();
  expect(screen.queryByText(/fatturato mese/i)).toBeNull();
});

test("le card reparto usano gli stessi KPI delle pagine reparto", async () => {
  renderHome();
  await screen.findByTestId("cassa-breve");
  const acq = screen.getByTestId("reparto-acquisizione");
  expect(acq.textContent).toMatch(/Nuovi lead 7 giorni/);
  expect(acq.textContent).toMatch(/12/);
});

test("la chat di Luca non occupa la prima schermata: si apre da un pulsante", async () => {
  renderHome();
  await screen.findByTestId("cassa-breve");
  expect(screen.queryByTestId("luca-chat")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /chiedi a luca/i }));
  expect(screen.getByTestId("luca-chat")).toBeTruthy();
});
