/**
 * Ciak Admin — Chiusura Insider: il gesto di handoff post-call genera e mostra
 * il link /insider (non il legacy /proposta) e lo copia.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
jest.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }), { virtual: true });
jest.mock("../api", () => ({ adminFetch: jest.fn() }));

import { ChiusuraInsider } from "./ChiusuraInsider";
import { adminFetch } from "../api";

beforeEach(() => jest.clearAllMocks());

test("email vuota → errore onesto, nessuna chiamata", () => {
  render(<ChiusuraInsider onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Genera link Insider/i }));
  expect(screen.getByText(/Inserisci l'email/i)).toBeTruthy();
  expect(adminFetch).not.toHaveBeenCalled();
});

test("genera e mostra il link /insider (derivato da /proposta), e lo copia", async () => {
  // Il backend restituisce l'URL /proposta/:token; la UI deve mostrare/copiare
  // la pagina cliente /insider/:token (stesso token) — controprova sulla derivazione.
  adminFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ url: "https://www.ciak.io/proposta/tok9", status: "generata" }),
  });
  const writeText = jest.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });

  render(<ChiusuraInsider onAuthExpired={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Email del lead/i), { target: { value: "marco@x.it" } });
  fireEvent.click(screen.getByRole("button", { name: /Genera link Insider/i }));

  expect(await screen.findByText(/\/insider\/tok9/)).toBeTruthy();
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://www.ciak.io/insider/tok9"));
});
