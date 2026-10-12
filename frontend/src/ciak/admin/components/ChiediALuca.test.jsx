import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChiediALuca } from "./ChiediALuca";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

const ok = (reply) => ({ ok: true, json: async () => ({ reply }) });

beforeEach(() => adminFetch.mockReset());

test("invia la domanda alla chat di Luca e mostra la risposta", async () => {
  adminFetch.mockResolvedValue(ok("Sollecita **Chiara Ferri**."));
  render(<ChiediALuca />);
  fireEvent.change(screen.getByLabelText("Chiedi a Luca"), { target: { value: "Chi sollecito?" } });
  fireEvent.click(screen.getByRole("button", { name: "Invia a Luca" }));
  expect(await screen.findByText("Chiara Ferri")).toBeTruthy();
  const [url, opts] = adminFetch.mock.calls[0];
  expect(url).toBe("/api/admin/luca/chat");
  expect(JSON.parse(opts.body)).toEqual({ message: "Chi sollecito?", session_id: "default" });
});

test("un suggerimento parte da solo", async () => {
  adminFetch.mockResolvedValue(ok("Ecco."));
  render(<ChiediALuca />);
  fireEvent.click(screen.getByRole("button", { name: "Quali partner sono fermi?" }));
  await waitFor(() => expect(adminFetch).toHaveBeenCalledTimes(1));
  expect(JSON.parse(adminFetch.mock.calls[0][1].body).message).toBe("Quali partner sono fermi?");
});

test("se Luca non risponde lo dice, non inventa", async () => {
  adminFetch.mockResolvedValue({ ok: false, json: async () => ({ detail: "boom" }) });
  render(<ChiediALuca />);
  fireEvent.click(screen.getByRole("button", { name: "Cosa aspetta il mio OK" }));
  expect(await screen.findByText(/Non sono riuscito a farmi rispondere da Luca/)).toBeTruthy();
});

test("scadenza della sessione: avvisa l'app, non mostra errori finti", async () => {
  adminFetch.mockRejectedValue(new Error("AUTH_EXPIRED"));
  const scaduta = jest.fn();
  render(<ChiediALuca onAuthExpired={scaduta} />);
  fireEvent.click(screen.getByRole("button", { name: "Cosa aspetta il mio OK" }));
  await waitFor(() => expect(scaduta).toHaveBeenCalled());
});

test("senza testo il pulsante di invio è spento e dice che Luca non esegue", () => {
  render(<ChiediALuca />);
  expect(screen.getByRole("button", { name: "Invia a Luca" }).disabled).toBe(true);
  expect(screen.getByText(/non esegue/)).toBeTruthy();
});
