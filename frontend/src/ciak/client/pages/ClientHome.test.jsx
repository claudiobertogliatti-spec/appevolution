import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientHome } from "./ClientHome";

const BLUEPRINT = {
  meta: { progetto: "Accademia", accent_progetto: "Maria", ambito: "Formazione", data: "03/10/2026" },
  sintesi: "Una competenza reale e un metodo gia' usato con i clienti.",
  potenziale: { lead: "Alto", cards: [{ h: "Competenza ✓", p: "Clienti che ti richiamano." }, { h: "Struttura ✗", p: "Niente prodotto ripetibile." }] },
  problema: "Tutto dipende dalla tua presenza.",
  forza: ["Clienti fissi"],
  limiti: ["Nessun prodotto ripetibile"],
  manca: [{ h: "Offerta chiara", p: "ripetibile" }],
  rischio: { lead: "Ogni mese lavori alla stessa condizione." },
  roadmap: [{ h: "Direzione e posizionamento", p: "Chi aiuti e con quale promessa." }],
  pdf_url: "https://cdn.example/bp.pdf",
};

const base = {
  client: { id: "c1", name: "Maria Rossi", access_level: "cliente_blueprint" },
  diagnostic: { state: "call_done", recommended_offer: "partnership" },
  analysis: { status: "inviata", roadmap: [] },
  blueprint: BLUEPRINT,
  proposta: null,
  raccomandata: "partnership",
  pricing: { ciak_start: { amount_cents: 39000 }, partnership: { full_amount_cents: 299000 } },
  partner_area: { status: "in_attesa_attivazione" },
  offer: {},
};

function vedi(dashboard) {
  return render(<MemoryRouter><ClientHome dashboard={dashboard} /></MemoryRouter>);
}

test("dopo la call la Home e' personalizzata sul Blueprint: nome, sue parole, diagnosi, rischio e tappe", () => {
  vedi(base);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Maria, in call abbiamo trovato/);
  expect(screen.getByText(/Le parole del tuo Blueprint/)).toBeTruthy();
  expect(screen.getAllByText(/Tutto dipende dalla tua presenza\./).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Competenza")).toBeTruthy();
  expect(screen.getByText("Ogni mese lavori alla stessa condizione.")).toBeTruthy();
  expect(screen.getByText("Direzione e posizionamento")).toBeTruthy();
  // il PDF e' li', non e' piu' una pagina a parte
  expect(screen.getAllByRole("link", { name: /PDF/i })[0].getAttribute("href")).toBe("https://cdn.example/bp.pdf");
});

test("i due percorsi stanno nella Home, ognuno porta alla sua pagina", () => {
  const { container } = vedi(base);
  const start = container.querySelector('[data-path="start"]');
  const partnership = container.querySelector('[data-path="partnership"]');
  expect(within(start).getByRole("link", { name: /Scopri Ciak Start/i }).getAttribute("href")).toBe("/cliente/start");
  expect(within(partnership).getByRole("link", { name: /Scopri la Partnership/i }).getAttribute("href")).toBe("/cliente/partnership");
});

test("il percorso consigliato dal Blueprint va per primo, con l'etichetta", () => {
  const { container } = vedi(base);
  const ordine = [...container.querySelectorAll("[data-path]")].map((n) => n.getAttribute("data-path"));
  expect(ordine).toEqual(["partnership", "start"]);
  expect(within(container.querySelector('[data-path="partnership"]')).getByText("Consigliato per te")).toBeTruthy();

  const rec = vedi({ ...base, raccomandata: "start" });
  const ordine2 = [...rec.container.querySelectorAll("[data-path]")].map((n) => n.getAttribute("data-path"));
  expect(ordine2).toEqual(["start", "partnership"]);
});

test("la Partnership dichiara il prezzo E il 10%: niente 'tutto incluso'", () => {
  const { container } = vedi(base);
  const card = container.querySelector('[data-path="partnership"]');
  expect(card.textContent).toMatch(/2\.990\s*€/);
  expect(card.textContent).toMatch(/\+ 10% sulle vendite del tuo corso, per 12 mesi dalla firma/);
  expect(container.textContent).not.toMatch(/tutto incluso/i);
});

test("i prezzi arrivano dal dashboard e il credito Start e' detto chiaro", () => {
  const { container } = vedi(base);
  expect(container.querySelector('[data-path="start"]').textContent).toMatch(/390\s*€/);
  expect(container.textContent).toMatch(/si scalano interi/);
});

test("onesta': nessuna garanzia di guadagno, nessuna promessa", () => {
  const { container } = vedi(base);
  expect(container.textContent).toMatch(/Nessun guadagno è garantito/);
  expect(container.textContent).not.toMatch(/garantit[oiae] (di )?(guadagn|ritorn|vendit|client)/i);
});

test("la scadenza compare solo se la proposta esiste davvero", () => {
  const senza = vedi(base);
  expect(senza.container.textContent).toMatch(/Decidi adesso/);
  senza.unmount();
  const con = vedi({ ...base, proposta: { token: "t", scadenza: "2999-10-10T10:00:00+00:00" } });
  expect(con.container.textContent).toMatch(/Decidi entro/);
});

test("senza Blueprint pronto le sezioni personali NON compaiono, ne' testo segnaposto", () => {
  const { container } = vedi({ ...base, blueprint: null });
  expect(screen.queryByText(/Le parole del tuo Blueprint/)).toBeNull();
  expect(screen.queryByText("Competenza")).toBeNull();
  expect(container.textContent).not.toMatch(/lorem|segnaposto|in preparazione/i);
  // i due percorsi ci sono comunque
  expect(container.querySelectorAll("[data-path]")).toHaveLength(2);
});

test("prima della call resta la Home di stato (nessuna persuasione prematura)", () => {
  vedi({ ...base, diagnostic: { state: "call_booked" }, blueprint: null });
  expect(screen.getByText("Call prenotata")).toBeTruthy();
  expect(document.querySelector("[data-path]")).toBeNull();
});

test.each([
  ["cliente_start", "Continua Ciak Start"],
  ["partner", "Partnership attiva"],
])("chi ha gia' un percorso attivo (%s) vede la sua Home, non la vendita", (access_level, titolo) => {
  vedi({ ...base, client: { ...base.client, access_level } });
  expect(screen.getByText(titolo)).toBeTruthy();
  expect(document.querySelector("[data-path]")).toBeNull();
});
