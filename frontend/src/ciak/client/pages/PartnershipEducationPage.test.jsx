import { render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LessonCard, PartnershipEducationPage } from "./PartnershipEducationPage";

const render = (ui) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

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
  const etichette = screen.getAllByText(/^Lezione \d$/);
  expect(etichette).toHaveLength(5);
  etichette.forEach((el, i) => expect(el).toHaveTextContent(`Lezione ${i + 1}`));
});

test("ogni lezione ha il suo video, la sua locandina e i suoi sottotitoli in italiano", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  const video = document.querySelectorAll("video");
  expect(video).toHaveLength(5);
  video.forEach((v, i) => {
    const n = i + 1;
    expect(v).toHaveAttribute("controls");
    expect(v).toHaveAttribute("poster", `/video/partnership-lezione-${n}.jpg`);
    expect(v.querySelector("source")).toHaveAttribute("src", `/video/partnership-lezione-${n}.mp4`);
    const track = v.querySelector("track");
    expect(track).toHaveAttribute("src", `/video/partnership-lezione-${n}.it.vtt`);
    expect(track).toHaveAttribute("srclang", "it");
    expect(track).toHaveAttribute("kind", "captions");
  });
  expect(screen.queryByText(/in preparazione/i)).toBeNull();
});

test("una lezione senza video lo dice con onesta' e non mostra un lettore vuoto", () => {
  render(<LessonCard index={2} lesson={{ title: "Cosa validi tu", note: "Decisioni.", videoUrl: null }} />);
  expect(screen.getByText(/Video guida in preparazione/i)).toBeInTheDocument();
  expect(document.querySelector("video")).toBeNull();
});

test("senza sottotitoli il video resta riproducibile, senza traccia vuota", () => {
  render(<LessonCard index={0} lesson={{ title: "T", note: "N", videoUrl: "/video/x.mp4", posterUrl: "/video/x.jpg" }} />);
  const v = document.querySelector("video");
  expect(v).not.toBeNull();
  expect(v.querySelector("track")).toBeNull();
  expect(v.querySelector("source")).toHaveAttribute("src", "/video/x.mp4");
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

test("il prezzo dice anche il 10% per 12 mesi e rimanda al Simulatore", () => {
  render(<PartnershipEducationPage dashboard={base} />);
  expect(document.body.textContent).toMatch(/10% dell'importo netto incassato dalle vendite del tuo corso/);
  expect(document.body.textContent).toMatch(/per 12 mesi dalla firma/);
  expect(screen.getByRole("link", { name: "Simulatore Corsi" }).getAttribute("href")).toBe("/cliente/simulatore");
  expect(document.body.textContent).toMatch(/Nessun guadagno è garantito/);
  expect(document.body.textContent).not.toMatch(/tutto incluso/i);
});

test("dopo la call compare contratto e pagamento; prima della call no", () => {
  const dopo = { ...base, diagnostic: { state: "call_done" }, checkout_readiness: { partnership: { enabled: true } } };
  const { unmount } = render(<PartnershipEducationPage dashboard={dopo} />);
  expect(screen.getByTestId("partnership-checkout")).toBeTruthy();
  unmount();
  render(<PartnershipEducationPage dashboard={{ ...base, diagnostic: { state: "call_booked" } }} />);
  expect(screen.queryByTestId("partnership-checkout")).toBeNull();
});

test("chi ha gia' la Partnership non vede ne' prezzo ne' contratto, ma ritrova le lezioni", () => {
  render(<PartnershipEducationPage dashboard={{ ...base, partner_area: { status: "attiva" } }} />);
  expect(screen.getByRole("heading", { name: "Partnership attiva" })).toBeTruthy();
  expect(screen.queryByTestId("partnership-checkout")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Il prezzo" })).toBeNull();
  expect(screen.getAllByText(/^Lezione \d$/)).toHaveLength(5);
});
