/**
 * I materiali approvati di Ciak Start, come li legge il cliente: ognuno col suo
 * titolo in parole semplici e, dove serve, il pulsante "Copia".
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MaterialiStart } from "./MaterialiStart";

const POS = {
  type: "positioning",
  frase: "Anna Rossi è la specialista che accompagna le donne dopo i quaranta a ritrovare energia.",
  fallback: false,
  elementi: { brand: "Anna Rossi", categoria: "Donne dopo i quaranta", idea_differenziante: "Piccoli gruppi", a_differenza_di: "Promettono risultati veloci", vantaggio_cliente: "Più energia, con calma" },
};
const MARCHIO = {
  type: "brand_kit",
  palette: { nome: "Naturale e sereno", colori: ["#1F4D3A", "#6B9080", "#C9A66B"] },
  font: { nome: "Classico", famiglia: "Lora" },
  tono: { nome: "Caldo e rassicurante", frase: "Parlo in modo caldo e rassicurante." },
  parole_chiave: ["calma", "ascolto", "metodo"],
  logo_url: "https://cdn.example.com/logo.png",
  foto_url: "",
};
const PROFILI = {
  type: "social_profiles",
  nome_visualizzato: "Anna Rossi | Energia dopo i 40",
  instagram: { bio: "Ti aiuto a ritrovare energia." },
  linkedin: { headline: "Coach", about: "Lavoro con piccoli gruppi." },
  in_evidenza: ["Chi sono", "Come lavoro"],
};

test("ogni materiale ha il suo titolo semplice e nessuno diventa 'Verifica finale Partnership' per sbaglio", () => {
  render(<MaterialiStart items={[PROFILI, MARCHIO, POS, { type: "showcase", live_url: "https://www.annarossi.it" }]} />);
  expect(screen.getByText("Il tuo posizionamento")).toBeTruthy();
  expect(screen.getByText("Il tuo marchio")).toBeTruthy();
  expect(screen.getByText("I tuoi profili social")).toBeTruthy();
  expect(screen.getByText("La tua pagina web")).toBeTruthy();
  expect(screen.queryByText("Verifica finale Partnership")).toBeNull();
});

test("il posizionamento mostra la frase e gli elementi con etichette semplici", () => {
  render(<MaterialiStart items={[POS]} />);
  expect(screen.getByText(POS.frase)).toBeTruthy();
  expect(screen.getByText("Cosa ti rende speciale")).toBeTruthy();
  expect(screen.getByText("Piccoli gruppi")).toBeTruthy();
});

test("se la frase non e' riuscita lo dice senza mostrare testo sbagliato", () => {
  render(<MaterialiStart items={[{ ...POS, fallback: true, frase: "Testo di servizio" }]} />);
  expect(screen.queryByText("Testo di servizio")).toBeNull();
  expect(screen.getByText(/la completiamo insieme a te/)).toBeTruthy();
});

test("il marchio mostra colori, lettere, voce e parole scelte", () => {
  const { container } = render(<MaterialiStart items={[MARCHIO]} />);
  expect(screen.getByText("#1F4D3A")).toBeTruthy();
  expect(screen.getByText(/Le tue lettere · Classico/)).toBeTruthy();
  expect(screen.getByText("calma")).toBeTruthy();
  expect(container.querySelector("img[alt='Il tuo logo']")).not.toBeNull();
});

describe("profili social guidati", () => {
  beforeEach(() => window.localStorage.clear());

  test("un passo alla volta: parte da Instagram, con i passi numerati e il disegno d'esempio", () => {
    render(<MaterialiStart items={[PROFILI]} />);
    expect(screen.getByText("Passo 1 di 2")).toBeTruthy(); // Instagram e LinkedIn (non ci sono Facebook e TikTok)
    expect(screen.getByRole("heading", { name: "Instagram" })).toBeTruthy();
    expect(screen.getByText(/Tocca «Modifica profilo»/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /zona gialla/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "LinkedIn" })).toBeNull(); // LinkedIn arriva dopo
    expect(screen.getByText("Hai completato 0 passi su 2")).toBeTruthy();
  });

  test("il testo si copia con un pulsante grande e dice cosa fare dopo", async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
    render(<MaterialiStart items={[PROFILI]} />);
    const passo = screen.getByRole("heading", { name: "Instagram" }).parentElement;
    fireEvent.click(within(passo).getByRole("button", { name: "Copia il testo" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Ti aiuto a ritrovare energia."));
    expect(await screen.findByText(/Copiato! Ora vai a incollarlo/)).toBeTruthy();
  });

  test("«Ho incollato» segna il passo e porta al successivo; il progresso resta", () => {
    const { unmount } = render(<MaterialiStart items={[PROFILI]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ho incollato, vai avanti" }));
    expect(screen.getByRole("heading", { name: "LinkedIn" })).toBeTruthy();
    expect(screen.getByText("Hai completato 1 passo su 2")).toBeTruthy();
    unmount();
    render(<MaterialiStart items={[PROFILI]} />);
    // riaperto: riparte dal primo passo non fatto
    expect(screen.getByRole("heading", { name: "LinkedIn" })).toBeTruthy();
    expect(screen.getByText("Hai completato 1 passo su 2")).toBeTruthy();
  });

  test("LinkedIn ha due testi numerati; «Lo faccio dopo» non lo segna come fatto", () => {
    render(<MaterialiStart items={[PROFILI]} />);
    fireEvent.click(screen.getByRole("button", { name: "Lo faccio dopo" }));
    expect(screen.getByText("1. La riga sotto il tuo nome")).toBeTruthy();
    expect(screen.getByText("2. La sezione «Informazioni»")).toBeTruthy();
    const passo = screen.getByRole("heading", { name: "LinkedIn" }).parentElement;
    expect(within(passo).getAllByRole("button", { name: "Copia il testo" })).toHaveLength(2);
    expect(screen.getByText("Hai completato 0 passi su 2")).toBeTruthy();
  });

  test("c'e' sempre un modo per chiedere aiuto, e il link segnaposto non si copia come testo", () => {
    render(<MaterialiStart items={[{ ...PROFILI, link_in_bio: "da inserire quando il sito vetrina e' online" }]} />);
    expect(screen.getByRole("link", { name: /scrivici e ti aiutiamo/ }).getAttribute("href")).toMatch(/^mailto:/);
    expect(screen.queryByText(/da inserire quando/)).toBeNull();
    expect(screen.getByText(/lo aggiungiamo dopo/)).toBeTruthy();
  });

  test("senza testi pronti lo dice con parole semplici", () => {
    render(<MaterialiStart items={[{ type: "social_profiles" }]} />);
    expect(screen.getByText(/non sono ancora pronti/)).toBeTruthy();
  });
});

test("la pagina web rimanda all'indirizzo vero, o dice che arriva", () => {
  const { rerender } = render(<MaterialiStart items={[{ type: "showcase", live_url: "https://www.annarossi.it" }]} />);
  expect(screen.getByRole("link", { name: "Apri la tua pagina" }).getAttribute("href")).toBe("https://www.annarossi.it");
  rerender(<MaterialiStart items={[{ type: "showcase" }]} />);
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByText(/ti scriviamo appena è online/)).toBeTruthy();
});

test("senza materiali non mostra niente", () => {
  const { container } = render(<MaterialiStart items={[]} />);
  expect(container.firstChild).toBeNull();
});
