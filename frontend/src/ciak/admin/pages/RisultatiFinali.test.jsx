/**
 * Ciak Admin — Risultati finali: il lavoro finito si vede senza chiedere link.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RisultatiFinali } from "./RisultatiFinali";
import { apiGet } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn() }));

const DATI = {
  funnel: [
    {
      partner_id: "p1",
      nome: "Daniele Andolfi",
      preview_url: "https://sabai.vercel.app",
      url_non_valido: false,
      version: 1,
      released: true,
      progress: 40,
      corrections_open: 2,
      pages: [
        { id: "optin", title: "Iscrizione", url: "https://sabai.vercel.app/" },
        { id: "offerta", title: "Offerta", url: "https://sabai.vercel.app/offerta" },
      ],
    },
    { partner_id: "p2", nome: "Mario", preview_url: null, url_non_valido: true, released: false, pages: [] },
  ],
  vetrine: [
    {
      client_id: "c1",
      nome: "Linda Pavia",
      approval_status: "pending_review",
      generated_at: "2026-10-06",
      live_url: null,
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

test("mostra funnel dei partner con stato e correzioni aperte", async () => {
  apiGet.mockResolvedValue(DATI);
  render(<RisultatiFinali />);

  expect(await screen.findByText("Daniele Andolfi")).toBeTruthy();
  expect(screen.getByText("Visibile al partner")).toBeTruthy();
  expect(screen.getByText("40% approvato dal partner")).toBeTruthy();
  expect(screen.getByText("2 correzioni aperte")).toBeTruthy();
});

test("l'anteprima del funnel cambia pagina e ha sempre il link di riserva", async () => {
  apiGet.mockResolvedValue(DATI);
  render(<RisultatiFinali />);
  await screen.findByText("Daniele Andolfi");

  expect(screen.getByTitle("Anteprima Daniele Andolfi: Iscrizione").getAttribute("src")).toBe("https://sabai.vercel.app/");
  fireEvent.click(screen.getByRole("tab", { name: "Offerta" }));
  expect(screen.getByTitle("Anteprima Daniele Andolfi: Offerta").getAttribute("src")).toBe(
    "https://sabai.vercel.app/offerta"
  );
  expect(screen.getByText("aprila in una nuova scheda").getAttribute("href")).toBe("https://sabai.vercel.app/offerta");
});

test("un indirizzo non valido non diventa un riquadro ne' un link", async () => {
  apiGet.mockResolvedValue(DATI);
  render(<RisultatiFinali />);
  await screen.findByText("Mario");
  expect(screen.getByText(/non e' valido/)).toBeTruthy();
  expect(screen.queryByTitle(/Anteprima Mario/)).toBeNull();
});

test("la vetrina Start si carica solo al clic e si vede in un riquadro isolato", async () => {
  apiGet.mockImplementation((path) =>
    Promise.resolve(
      path === "/start/c1/bozze"
        ? { items: [{ type: "showcase", html: "<html><body>Linda</body></html>" }] }
        : DATI
    )
  );
  render(<RisultatiFinali />);
  await screen.findByText("Linda Pavia");
  expect(screen.getByText("Bozza da approvare · il cliente non la vede")).toBeTruthy();
  expect(apiGet).not.toHaveBeenCalledWith("/start/c1/bozze");

  fireEvent.click(screen.getByRole("button", { name: "Vedi il sito" }));

  const frame = await screen.findByTitle("Anteprima sito vetrina di Linda Pavia");
  expect(frame.getAttribute("sandbox")).toBe("");
  expect(frame.getAttribute("srcdoc")).toContain("Linda");
});

test("senza risultati lo dice, invece di una pagina vuota", async () => {
  apiGet.mockResolvedValue({ funnel: [], vetrine: [] });
  render(<RisultatiFinali />);
  await waitFor(() => expect(screen.getByText(/Nessun sito vetrina/)).toBeTruthy());
  expect(screen.getByText(/Nessun funnel in anteprima/)).toBeTruthy();
});
