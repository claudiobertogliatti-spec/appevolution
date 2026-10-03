import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function accettaContratto() {
  const [condizioni, dichiarazione] = await screen.findAllByRole("checkbox");
  await screen.findByText("Contratto pronto");
  fireEvent.click(condizioni);
  fireEvent.click(dichiarazione);
  fireEvent.click(screen.getByRole("button", { name: /paga|procedi/i }));
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

test("con una proposta gia' attiva: accetta, contratto, firma, pagamento, Stripe", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: "Contratto pronto" }),
    "/api/proposta/t/accetta": ok({ success: true }),
    "/api/proposta/t/firma-contratto": ok({ success: true }),
    "/api/proposta/t/pagamento-stripe": ok({ success: true, checkout_url: "https://stripe.test/partnership" }),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proposta/t/accetta", expect.objectContaining({ method: "POST" })));
  await accettaContratto();

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    "/api/proposta/t/firma-contratto",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        clausole_vessatorie_approved: true,
        consenso_checkbox: true,
        dichiarazione_imprenditoriale: true,
        piva: "",
      }),
    }),
  ));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/proposta/t/pagamento-stripe", expect.objectContaining({ method: "POST" })));
  await waitFor(() => expect(window.location.href).toBe("https://stripe.test/partnership"));
  // la proposta esistente non viene ricreata
  expect(global.fetch).not.toHaveBeenCalledWith("/api/ciak/client/partnership/proposta", expect.anything());
});

test("senza proposta: prima la ottiene dalla sua area, poi accetta con il token ricevuto", async () => {
  rispondi({
    "/api/ciak/client/partnership/proposta": ok({ token: "nuovo", partner_id: "p9", scadenza: "2999-10-10T10:00:00+00:00", stato: "inviata", creata: true }),
    "/api/proposta/nuovo/accetta": ok({ success: true }),
    "/api/contract/text/p9": ok({ contract_text: "Contratto pronto" }),
  });
  const onProposta = jest.fn();
  render(<PartnershipCheckout proposta={null} checkoutReadiness={aperto} onProposta={onProposta} />);
  expect(screen.getByText(/si apre la tua proposta, con una scadenza reale/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));

  await screen.findByText("Contratto pronto");
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

test("errore alla firma: niente pagamento, niente finto successo, si resta sul contratto", async () => {
  rispondi({
    "/api/contract/text/p1": ok({ contract_text: "Contratto pronto" }),
    "/api/proposta/t/accetta": ok({ success: true }),
    "/api/proposta/t/firma-contratto": ko(422),
  });
  render(<PartnershipCheckout proposta={proposta} checkoutReadiness={aperto} />);
  fireEvent.click(screen.getByRole("button", { name: /entra in partnership/i }));
  await accettaContratto();

  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalledWith("/api/proposta/t/pagamento-stripe", expect.anything());
  expect(window.location.href).toBe("");
  // il contratto resta li': non si riparte da capo
  expect(screen.getByText("Contratto pronto")).toBeTruthy();
});

test("pagamento gia' completato: nessun bottone, nessun contratto", () => {
  global.fetch = jest.fn();
  render(<PartnershipCheckout proposta={{ ...proposta, stato: "pagamento_completato" }} checkoutReadiness={aperto} />);
  expect(screen.getByText(/hai già completato la Partnership/i)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
