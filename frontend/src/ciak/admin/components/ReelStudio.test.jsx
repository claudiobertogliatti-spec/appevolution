import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReelStudio } from "./ReelStudio";
import { apiGet, apiPost } from "../api";

jest.mock("../api", () => ({ apiGet: jest.fn(), apiPost: jest.fn(), SCOPE_DENIED_DETAIL: "scope_denied" }));

const CONF = { heygen_ok: true, scelta: { avatar_id: "av1", voice_id: "vo1", tetto_mensile: 8 },
  avatars: [{ avatar_id: "av1", nome: "Claudio" }], voices: [{ voice_id: "vo1", nome: "Voce Claudio" }] };

beforeEach(() => {
  apiGet.mockImplementation((p) => Promise.resolve(p === "/reel" ? { items: [] } : CONF));
  apiPost.mockReset();
});

test("genera solo dopo lo script e il clic su «Approva e genera»", async () => {
  apiPost.mockImplementation((p) => Promise.resolve(p === "/reel/bozza" ? { script: "Ciao a tutti questo è lo script", didascalia: "Did", secondi: 24 } : { ok: true }));
  render(<ReelStudio />);
  await waitFor(() => expect(screen.getByLabelText("Avatar").value).toBe("av1"));
  fireEvent.change(screen.getByLabelText("Di cosa parla il reel"), { target: { value: "Perché i corsi online non vendono" } });
  fireEvent.click(screen.getByRole("button", { name: "Fai scrivere lo script" }));
  expect(await screen.findByText(/circa 24 secondi/)).toBeTruthy();
  expect(apiPost).not.toHaveBeenCalledWith("/reel/genera", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Approva e genera" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/reel/genera", { script: "Ciao a tutti questo è lo script", didascalia: "Did", approvato: true }));
});

test("senza avatar salvato «Approva e genera» è spento", async () => {
  apiGet.mockImplementation((p) => Promise.resolve(p === "/reel" ? { items: [] } : { ...CONF, scelta: {} }));
  apiPost.mockResolvedValue({ script: "Ciao a tutti questo è lo script", didascalia: "Did", secondi: 24 });
  render(<ReelStudio />);
  await waitFor(() => expect(apiGet).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("Di cosa parla il reel"), { target: { value: "Perché i corsi online non vendono" } });
  fireEvent.click(screen.getByRole("button", { name: "Fai scrivere lo script" }));
  const bottone = await screen.findByRole("button", { name: "Approva e genera" });
  expect(bottone.disabled).toBe(true);
});

test("sparisce se il server nega l'accesso", async () => {
  apiGet.mockRejectedValue(new Error('Errore 403: {"detail":"scope_denied"}'));
  const { container } = render(<ReelStudio />);
  await waitFor(() => expect(container.firstChild).toBeNull());
});
