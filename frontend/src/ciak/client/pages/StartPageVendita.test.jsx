import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StartPage } from "./StartPage";
import { StartSalesVideo } from "../StartSalesVideo";

const base = {
  client: { id: "c1", name: "Maria Rossi", access_level: "cliente_blueprint" },
  diagnostic: { state: "call_done", recommended_offer: "partnership" },
  pricing: { ciak_start: { amount_cents: 39000 }, partnership: { full_amount_cents: 299000, amount_cents: 299000 } },
  offer: {},
  start: { consegne: [] },
};

function vedi(dashboard = base) {
  return render(<MemoryRouter><StartPage dashboard={dashboard} /></MemoryRouter>);
}

test("la pagina Start parla solo di Start: nessuna scheda Partnership, nessun 'Ne parliamo insieme'", () => {
  const { container } = vedi();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Le fondamenta/);
  expect(container.querySelector('[data-offer="start"]')).toBeTruthy();
  expect(container.textContent).not.toMatch(/Il sistema completo, con noi/);
  expect(container.textContent).not.toMatch(/Ne parliamo insieme/);
  expect(container.textContent).not.toMatch(/tutto incluso/i);
  expect(container.textContent).not.toMatch(/Il turbo|Consigliato per te/);
});

test("anche con la Partnership consigliata la pagina Start resta Start (la persuasione sta nella Home)", () => {
  const { container } = vedi({ ...base, diagnostic: { state: "call_done", recommended_offer: "partnership" } });
  expect(container.textContent).not.toMatch(/il percorso consigliato per te è la Partnership/i);
  expect(screen.getByRole("button", { name: /Attiva Ciak Start/i })).toBeTruthy();
});

test("il prezzo e' quello del dashboard e il credito verso la Partnership e' una riga, con rimando alla sua pagina", () => {
  const { container } = vedi();
  expect(container.querySelector('[data-offer="start"]').textContent).toMatch(/390\s*€/);
  const link = screen.getByRole("link", { name: "Partnership" });
  expect(link.getAttribute("href")).toBe("/cliente/partnership");
  expect(container.textContent).toMatch(/si scalano interi/);
});

test("bonus 48h: nessun prezzo di riferimento barrato ne' 'Valore' (mai pagato da nessuno)", () => {
  const { container } = vedi({
    ...base,
    offer: { bonus_guida_attiva: true, bonus_expires_at: "2999-01-01T00:00:00+00:00", guida_valore_cents: 4900 },
  });
  expect(container.textContent).toMatch(/Guida in omaggio/);
  expect(container.querySelector(".line-through")).toBeNull();
  expect(container.textContent).not.toMatch(/Valore\s*49/);
  expect(container.textContent).toMatch(/Inclusa solo se attivi entro 48h/);
});

test("senza bonus attivo non c'e' nessuna urgenza inventata", () => {
  const { container } = vedi();
  expect(container.textContent).not.toMatch(/l'offerta scade tra|solo entro 48h/i);
});

test("nessuna garanzia di guadagno, detto chiaro", () => {
  const { container } = vedi();
  expect(container.textContent).toMatch(/Nessun risultato economico è garantito/);
});

test("senza un video vero non c'e' nessun riquadro vuoto", () => {
  const { container } = render(<StartSalesVideo config={{ title: "x", videoUrl: null }} />);
  expect(container.innerHTML).toBe("");
  const senzaConfig = render(<StartSalesVideo config={null} />);
  expect(senzaConfig.container.innerHTML).toBe("");
});

test("senza sottotitoli il video resta riproducibile, senza traccia vuota", () => {
  const { container } = render(<StartSalesVideo config={{ title: "T", videoUrl: "/video/x.mp4", posterUrl: "/video/x.jpg" }} />);
  const video = container.querySelector("video");
  expect(video).toBeTruthy();
  expect(video.querySelector("track")).toBeNull();
});

test("con il video vero compare sopra l'offerta, con locandina e sottotitoli, senza avvio automatico", () => {
  const { container } = vedi();
  const box = container.querySelector('[data-testid="start-sales-video"]');
  expect(box).toBeTruthy();
  const video = box.querySelector("video");
  expect(video.querySelector("source").getAttribute("src")).toBe("/video/ciak-start-perche.mp4");
  expect(video.getAttribute("poster")).toBe("/video/ciak-start-perche.jpg");
  expect(video.querySelector("track").getAttribute("src")).toBe("/video/ciak-start-perche.it.vtt");
  expect(video.hasAttribute("autoplay")).toBe(false);
  const offerta = container.querySelector('[data-offer="start"]');
  expect(box.compareDocumentPosition(offerta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
