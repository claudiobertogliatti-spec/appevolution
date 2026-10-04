import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PartnershipCheckout } from "./PartnershipCheckout";

const aperto = { partnership: { enabled: true } };
const proposta = { token: "t", partner_id: "p1", stato: "inviata", scadenza: "2999-10-10T10:00:00+00:00", scaduta: false };

const originalLocation = window.location;

beforeEach(() => {
  delete window.location;
  window.location = { href: "" };
  localStorage.setItem("ciak_client_token", "jwt-finto");
});

afterEach(() => {
  delete global.fetch;
  window.location = originalLocation;
  localStorage.clear();
});

function rispondi(mappa) {
  global.fetch = jest.fn((url) => {
    const r = mappa[url];
    if (!r) return Promise.reject(new Error(`fetch inatteso: ${url}`));
    return Promise.resolve(r);
  });
}
const ok = (json) => ({ ok: true, status: 200, json: () => Promise.resolve(json) });
const ko = (status, json = {}) => ({ ok: false, status, json: () => Promise.resolve(json) });

const CONTRATTO = [
  "Contratto pronto",
  "15.5 Approvazione specifica delle clausole",
  "• Articolo 1.4 (Esclusiva);",
  "• Articolo 14.4 (Foro competente esclusivo di Torino).",
  "15.6 Chiusura del Contratto",
].join("\n");

const DATI = {
  Nome: "Mario", Cognome: "Bianchi", "Codice fiscale": "BNCMRA80A01L219X",
  "Indirizzo di residenza o sede": "Via Roma 1", CAP: "10100", Città: "Torino", Provincia: "TO", Email: "mario@example.com",
};

// I quattro passi del contratto: leggi (flag) -> dati -> approva le clausole (flag) -> paga.
async function passoDati() {
  await screen.findByText(/Contratto pronto/);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /avanti: i tuoi dati/i }));
  Object.entries(DATI).forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
  fireEvent.click(screen.getByRole("button", { name: /avanti: le clausole/i }));
}

async function accettaContratto() {
  await passoDati();
  await screen.findByRole("heading", { name: /passo 3 di 4/i });
  screen.getAllByRole("checkbox").forEach((box) => fireEvent.click(box));
  fireEvent.click(screen.getByRole("button", { name: /avanti: il pagamento/i }));
  fireEvent.click(await screen.findByRole("button", { name: /paga e conferma/i }));
}

test.each([undefined, {}, { partnership: { enabled: false } }])(
  "gate chiuso o mancante (%j): nessuna accettazione, nessun checkout, il bottone e' spento",
  (checkoutReadiness) => {
    global.fetch = jest.fn();
    render(<PartnershipCheckout proposta={proposta} checkoutReadiness={checkoutReadiness} />);
    const bottone = screen.getByRole("button", { name: /entra in partnership/i });
    expect(bottone.disabled).toBe(true);
    fireEvent.click(bottone);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/non è ancora disponibile/i);
  },
);

test("con una proposta gia' attiva: accetta, contratto, dati, firma doppia, pagamento, Stripe", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: CONTRATTO }),
    "/api/proposta/t/accetta": ok({ success: true }),
    "/api/proposta/t/dati-contratto": ok({ success: true }),
    "/api/proposta/t/firma-contratto": ok({ success: true }),
    "/api/proposta/t/pagamento-stripe": ok({ success: true, checkout_url: "https://stripe.test/partnership" }),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proposta/t/accetta", expect.objectContaining({ method: "POST" })));
  await accettaContratto();

  // i dati anagrafici vanno al server PRIMA della firma, normalizzati come scritti dal cliente
  const dati = global.fetch.mock.calls.find(([url]) => url === "/api/proposta/t/dati-contratto");
  expect(JSON.parse(dati[1].body)).toEqual(expect.objectContaining({ nome: "Mario", cognome: "Bianchi", provincia: "TO" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    "/api/proposta/t/firma-contratto",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        consenso_checkbox: true,
        clausole_vessatorie_approved: true,
        approvazione_specifica_clausole: true,
        dichiarazione_imprenditoriale: true,
        piva: "",
      }),
    }),
  ));
  const ordine = global.fetch.mock.calls.map(([url]) => url.replace("/api/proposta/t/", ""));
  expect(ordine.indexOf("dati-contratto")).toBeLessThan(ordine.indexOf("firma-contratto"));
  expect(ordine.indexOf("firma-contratto")).toBeLessThan(ordine.indexOf("pagamento-stripe"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proposta/t/pagamento-stripe", expect.objectContaining({ method: "POST" })));
  await waitFor(() => expect(window.location.href).toBe("https://stripe.test/partnership"));
  // la proposta esistente non viene ricreata
  expect(global.fetch).not.toHaveBeenCalledWith("/api/ciak/client/partnership/proposta", expect.anything());
});

test("senza proposta: prima la ottiene dalla sua area, poi accetta con il token ricevuto", async () => {
  rispondi({
    "/api/ciak/client/partnership/proposta": ok({ token: "nuovo", partner_id: "p9", scadenza: "2999-10-10T10:00:00+00:00", stato: "inviata", creata: true }),
    "/api/proposta/nuovo/accetta": ok({ success: true }),
    "/api/contract/text/p9": ok({ contract_text: CONTRATTO }),
  });
  const onProposta = jest.fn();
  render(<PartnershipCheckout proposta={null} checkoutReadiness={aperto} onProposta={onProposta} />);
  expect(screen.getByText(/si apre la tua proposta, con una scadenza reale/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));

  await screen.findByText(/Contratto pronto/);
  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/ciak/client/partnership/proposta", expect.objectContaining({ method: "POST" }));
  expect(global.fetch).toHaveBeenCalledWith("/api/proposta/nuovo/accetta", expect.objectContaining({ method: "POST" }));
  expect(onProposta).toHaveBeenCalledWith(expect.objectContaining({ token: "nuovo" }));
  // ora la scadenza e' reale e visibile
  expect(screen.getByText(/La tua proposta è aperta fino a/i)).toBeTruthy();
});

test("proposta scaduta (410): lo dice, non offre un contratto e non chiama nulla", () => {
  global.fetch = jest.fn();
  render(<PartnershipCheckout proposta={{ scaduta: true }} checkoutReadiness={aperto} />);
  expect(screen.getByRole("alert").textContent).toMatch(/scaduta/i);
  expect(screen.queryByRole("button", { name: /entra in partnership/i })).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("se il server dice che la proposta e' scaduta, il messaggio e' quello vero e non parte nulla", async () => {
  rispondi({
    "/api/ciak/client/partnership/proposta": ko(410, { detail: "La proposta è scaduta. Scrivici e la riapriamo." }),
  });
  render(<PartnershipCheckout proposta={null} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/proposta è scaduta/i);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: /entra in partnership/i }).disabled).toBe(false); // si puo' riprovare
});

test("sessione scaduta: invita a riaprire il link dell'email", async () => {
  rispondi({ "/api/ciak/client/partnership/proposta": ko(401) });
  render(<PartnershipCheckout proposta={null} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/riapri il link ricevuto via email/i);
});

test("errore alla firma: niente pagamento, niente finto successo, non si riparte da capo", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: CONTRATTO }),
    "/api/proposta/t/accetta": ok({ success: true }),
    "/api/proposta/t/dati-contratto": ok({ success: true }),
    "/api/proposta/t/firma-contratto": ko(422, { detail: "Approva specificamente le clausole elencate nell'Art. 15.5" }),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  await accettaContratto();

  expect((await screen.findByRole("alert")).textContent).toMatch(/Approva specificamente le clausole/);
  expect(global.fetch).not.toHaveBeenCalledWith("/api/proposta/t/pagamento-stripe", expect.anything());
  expect(window.location.href).toBe("");
  // i dati e i consensi restano: si e' ancora all'ultimo passo, con il bottone di nuovo attivo
  expect(screen.getByRole("heading", { name: /passo 4 di 4/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /paga e conferma/i }).disabled).toBe(false);
});

test("dati rifiutati dal server: si resta al passo dei dati, nessuna firma e nessun pagamento", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: CONTRATTO }),
    "/api/proposta/t/accetta": ok({ success: true }),
    "/api/proposta/t/dati-contratto": ko(422, { detail: "Controlla il codice fiscale: sono 16 caratteri (11 cifre per una società)" }),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  await passoDati();

  expect((await screen.findByText(/Controlla il codice fiscale/)).getAttribute("role")).toBe("alert");
  expect(screen.getByRole("heading", { name: /passo 2 di 4/i })).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalledWith("/api/proposta/t/firma-contratto", expect.anything());
  expect(global.fetch).not.toHaveBeenCalledWith("/api/proposta/t/pagamento-stripe", expect.anything());
});

test("prima di iniziare la scheda mostra i quattro passi in ordine, senza nessuno evidenziato", () => {
  global.fetch = jest.fn();
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  const passi = within(screen.getByRole("list", { name: /i passi per entrare/i })).getAllByRole("listitem");
  expect(passi.map((p) => p.textContent)).toEqual([
    "1Leggi il contratto", "2Inserisci i tuoi dati", "3Approva le clausole", "4Passa al pagamento",
  ]);
  expect(passi.every((p) => p.getAttribute("aria-current") === null)).toBe(true);
  // i passi stanno SOPRA il pulsante che apre il percorso
  const bottone = screen.getByRole("button", { name: /entra in partnership/i });
  expect(passi[0].compareDocumentPosition(bottone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("dentro il percorso i passi non si duplicano e il primo e' quello in corso", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: CONTRATTO }),
    "/api/proposta/t/accetta": ok({ success: true }),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  await screen.findByText(/Contratto pronto/);
  const liste = screen.getAllByRole("list", { name: /i passi per entrare/i });
  expect(liste).toHaveLength(1);
  expect(within(liste[0]).getAllByRole("listitem")[0].getAttribute("aria-current")).toBe("step");
});

test("proposta scaduta: nessun elenco di passi da seguire", () => {
  global.fetch = jest.fn();
  render(<PartnershipCheckout proposta={{ scaduta: true }} checkoutReadiness={aperto} />);
  expect(screen.queryByRole("list", { name: /i passi per entrare/i })).toBeNull();
});

test("pagamento gia' completato: nessun bottone, nessun contratto", () => {
  global.fetch = jest.fn();
  render(<PartnershipCheckout proposta={{ ...proposta, stato: "pagamento_completato" }} checkoutReadiness={aperto} />);
  expect(screen.getByText(/hai già completato la Partnership/i)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
