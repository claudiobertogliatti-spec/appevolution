/**
 * I materiali approvati di Ciak Start, come li legge il cliente: ognuno col suo
 * titolo in parole semplici e, dove serve, il pulsante "Copia".
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

test("i testi dei profili si copiano con un pulsante", async () => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
  render(<MaterialiStart items={[PROFILI]} />);
  const copia = screen.getAllByRole("button", { name: "Copia" });
  fireEvent.click(copia[1]); // il primo e' il nome, il secondo Instagram
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Ti aiuto a ritrovare energia."));
  expect(await screen.findByText("Copiato")).toBeTruthy();
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
