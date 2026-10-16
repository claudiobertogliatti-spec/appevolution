import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StartAssistenza from "./StartAssistenza";
import { streamAssistente } from "./assistenteStream";
import { ChatError } from "../../insider/chatStream";

jest.mock("./assistenteStream", () => ({ streamAssistente: jest.fn() }));

const client = { name: "Linda Pavia" };

beforeEach(() => {
  streamAssistente.mockReset();
});

test("saluta per nome, ha esempi a un tocco e la mail per scrivere a una persona", () => {
  render(<StartAssistenza client={client} />);
  expect(screen.getByText(/Ciao, Linda!/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Cosa devo fare adesso?" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Scrivi al team/ }).getAttribute("href")).toContain("mailto:assistenza@evolution-pro.it");
});

test("mostra la risposta mentre arriva e manda la storia al server", async () => {
  streamAssistente.mockImplementation(async ({ onText }) => {
    onText("Scegli tre colori ");
    onText("che ti somigliano.");
    return { passato: false };
  });
  render(<StartAssistenza client={client} />);
  fireEvent.change(screen.getByLabelText("La tua domanda"), { target: { value: "Come scelgo i colori?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia" }));
  expect(await screen.findByText("Scegli tre colori che ti somigliano.")).toBeTruthy();
  expect(screen.getByText("Come scelgo i colori?")).toBeTruthy();
  expect(streamAssistente.mock.calls[0][0]).toMatchObject({ message: "Come scelgo i colori?", history: [] });

  fireEvent.change(screen.getByLabelText("La tua domanda"), { target: { value: "E il tono?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia" }));
  await waitFor(() => expect(streamAssistente).toHaveBeenCalledTimes(2));
  expect(streamAssistente.mock.calls[1][0].history).toEqual([
    { role: "user", content: "Come scelgo i colori?" },
    { role: "assistant", content: "Scegli tre colori che ti somigliano." },
  ]);
});

test("un esempio a un tocco invia quella domanda", async () => {
  streamAssistente.mockImplementation(async ({ onText }) => { onText("Rispondi alle ultime domande."); return { passato: false }; });
  render(<StartAssistenza client={client} />);
  fireEvent.click(screen.getByRole("button", { name: "Cosa devo fare adesso?" }));
  expect(await screen.findByText("Rispondi alle ultime domande.")).toBeTruthy();
  expect(streamAssistente.mock.calls[0][0].message).toBe("Cosa devo fare adesso?");
  expect(screen.queryByLabelText("Domande di esempio")).toBeNull();
});

test("se non risponde non inventa: tiene il testo, offre Riprova e la mail", async () => {
  streamAssistente.mockRejectedValueOnce(new ChatError("In questo momento non riesco a risponderti."));
  render(<StartAssistenza client={client} />);
  fireEvent.change(screen.getByLabelText("La tua domanda"), { target: { value: "Quando arriva il sito?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia" }));
  const avviso = await screen.findByRole("alert");
  expect(avviso.textContent).toContain("Messaggio non inviato");
  expect(avviso.textContent).toContain("In questo momento non riesco a risponderti.");
  expect(screen.queryByText("Sto scrivendo…")).toBeNull();

  streamAssistente.mockImplementation(async ({ onText }) => { onText("Entro la terza tappa."); return { passato: false }; });
  fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
  expect(await screen.findByText("Entro la terza tappa.")).toBeTruthy();
  // la domanda non e' duplicata e nella storia non c'e' la domanda fallita
  expect(screen.getAllByText("Quando arriva il sito?")).toHaveLength(1);
  expect(streamAssistente.mock.calls[1][0].history).toEqual([]);
});
