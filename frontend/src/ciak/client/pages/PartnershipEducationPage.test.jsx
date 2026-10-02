import { render, screen } from "@testing-library/react";
import { PartnershipEducationPage } from "./PartnershipEducationPage";

const base = {
  client: { access_level: "cliente_blueprint" },
  diagnostic: { recommended_offer: "partnership" },
  partner_area: { status: "in_attesa_attivazione" },
  pricing: { partnership: { full_amount_cents: 299000, credit_amount_cents: 0, due_amount_cents: 299000 } },
};

test("non ci sono piu' segnaposto: ogni blocco ha contenuto vero", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  expect(screen.queryByText(/in preparazione/i)).toBeNull();
  [
    "Cosa succede dentro la Partnership", "Cosa costruiamo noi", "Cosa fai tu", "Cosa non è incluso",
    "A chi resta cosa", "Il 10% per 12 mesi", "Da sapere prima di decidere",
  ].forEach((t) => expect(screen.getByRole("heading", { name: t })).toBeInTheDocument());
});

test("non dice che e' tutto tuo al 100% e non promette guadagni", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  const testo = document.body.textContent;
  expect(testo).not.toMatch(/al 100\s?%/);
  expect(testo).toMatch(/Nessun guadagno è garantito/);
  expect(testo).toMatch(/Restano di Evolution PRO il Metodo EVO/);
  expect(testo).toMatch(/non è rimborsabile/);
});

test("senza Start non mostra un credito a zero: mostra il prezzo pieno", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  expect(screen.getByRole("heading", { name: "Il prezzo" })).toBeInTheDocument();
  expect(screen.queryByText(/Credito Ciak Start/)).toBeNull();
  expect(screen.getByText(/2\.990€/)).toBeInTheDocument();
});

test("con Start attivo mostra il credito e il totale dell'upgrade", () => {
  render(<PartnershipEducationPage dashboard={{
    ...base,
    client: { access_level: "cliente_start" },
    pricing: { partnership: { full_amount_cents: 299000, credit_amount_cents: 39000, due_amount_cents: 260000 } },
  }} />);
  expect(screen.getByRole("heading", { name: "Credito Start garantito" })).toBeInTheDocument();
  expect(screen.getByText("Totale upgrade")).toBeInTheDocument();
  expect(screen.getAllByText(/2\.600€/).length).toBeGreaterThan(0);
});
