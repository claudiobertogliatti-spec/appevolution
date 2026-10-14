import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PartnerAssistente from "./PartnerAssistente";
import { streamSse } from "../../components/assistenteSse";

jest.mock("../../components/assistenteSse", () => {
  const actual = jest.requireActual("../../components/assistenteSse");
  return { ...actual, streamSse: jest.fn() };
});
jest.mock("../api", () => ({ getToken: () => "tok-partner" }));

beforeEach(() => streamSse.mockReset());

test("senza partner non mostra nessuna chat", () => {
  const { container } = render(<PartnerAssistente partner={null} />);
  expect(container.firstChild).toBeNull();
});

test("manda la domanda per quel partner con il suo token e mostra la risposta", async () => {
  streamSse.mockImplementation(async ({ onText }) => { onText("Carichi il video e noi lo montiamo."); return { passato: false }; });
  render(<PartnerAssistente partner={{ id: "p 1", name: "Sarah Arensi" }} />);
  expect(screen.getByText(/Ciao, Sarah!/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Come funziona il montaggio del mio video?" }));
  expect(await screen.findByText("Carichi il video e noi lo montiamo.")).toBeTruthy();
  const arg = streamSse.mock.calls[0][0];
  expect(arg.url).toBe("/api/partner-assistente/p%201/chat");
  expect(arg.token).toBe("tok-partner");
  expect(arg.message).toBe("Come funziona il montaggio del mio video?");
});

test("se non risponde non inventa: Riprova e mail del team", async () => {
  const { ChatError } = jest.requireActual("../../components/assistenteSse");
  streamSse.mockRejectedValueOnce(new ChatError("Questo assistente non è disponibile per il tuo account. Scrivi al team."));
  render(<PartnerAssistente partner={{ id: "p1", name: "Sarah" }} />);
  fireEvent.change(screen.getByLabelText("La tua domanda"), { target: { value: "Quando arriva il montaggio?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia" }));
  const avviso = await screen.findByRole("alert");
  expect(avviso.textContent).toContain("non è disponibile per il tuo account");
  expect(screen.getByRole("link", { name: "Scrivi al team" }).getAttribute("href")).toContain("mailto:assistenza@evolution-pro.it");
  await waitFor(() => expect(screen.getByRole("button", { name: "Riprova" })).toBeTruthy());
});
