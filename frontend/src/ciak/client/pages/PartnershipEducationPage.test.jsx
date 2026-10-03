import { render, screen } from "@testing-library/react";
import { LessonCard, PartnershipEducationPage } from "./PartnershipEducationPage";

const base = {
  client: { access_level: "cliente_blueprint" },
  diagnostic: { recommended_offer: "partnership" },
  partner_area: { status: "in_attesa_attivazione" },
  pricing: { partnership: { full_amount_cents: 299000, credit_amount_cents: 0, due_amount_cents: 299000 } },
};

test("la sequenza e' quella delle cinque lezioni video, nello stesso ordine", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  const titoli = [
    "Cosa succede dentro la Partnership",
    "Cosa costruiamo insieme",
    "Cosa validi tu",
    "Perche' il sistema resta tuo",
    "Perche' esiste il 10% per 12 mesi",
  ];
  titoli.forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  screen.getAllByText(/^Lezione \d$/).forEach((el, i) => expect(el).toHaveTextContent(`Lezione ${i + 1}`));
  expect(screen.getAllByText(/^Lezione \d$/)).toHaveLength(5);
});

test("senza video pronto ogni lezione dice 'in preparazione', senza lettore", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  expect(screen.getAllByText(/Video guida in preparazione/i)).toHaveLength(5);
  expect(document.querySelector("video")).toBeNull();
});

test("quando una lezione ha il suo video mostra il lettore al posto della scritta", () => {
  render(<LessonCard index={0} lesson={{ title: "Cosa succede dentro la Partnership", note: "Panoramica.", videoUrl: "https://cdn.example/lezione-1.mp4" }} />);
  const video = document.querySelector("video");
  expect(video).not.toBeNull();
  expect(video).toHaveAttribute("src", "https://cdn.example/lezione-1.mp4");
  expect(video).toHaveAttribute("controls");
  expect(screen.queryByText(/in preparazione/i)).toBeNull();
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
