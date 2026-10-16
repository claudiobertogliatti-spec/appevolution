/**
 * Ciak Admin — Consegna manuale: invia email+nome+PDF all'endpoint via multipart,
 * mostra il magic-link col monito che è monouso (non va aperto dall'admin).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
jest.mock("../api", () => ({ adminFetch: jest.fn() }));

import { ConsegnaManuale } from "./ConsegnaManuale";
import { adminFetch } from "../api";

beforeEach(() => {
  jest.clearAllMocks();
});

function fill() {
  fireEvent.change(screen.getByPlaceholderText(/nome@esempio/i), {
    target: { value: "linda.pavia@hotmail.it" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Nome e cognome/i), {
    target: { value: "Linda Pavia" },
  });
  const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "blueprint.pdf", {
    type: "application/pdf",
  });
  const fileInput = document.querySelector('input[type="file"]');
  fireEvent.change(fileInput, { target: { files: [pdf] } });
}

test("invia i dati all'endpoint consegna-manuale via multipart", async () => {
  adminFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      email_sent: true,
      email: "linda.pavia@hotmail.it",
      magic_link: "https://ciak.io/cliente/accesso?token=abc123",
    }),
  });
  render(<ConsegnaManuale onAuthExpired={() => {}} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: /Invia il Blueprint/i }));

  await waitFor(() => expect(adminFetch).toHaveBeenCalled());
  const [path, opts] = adminFetch.mock.calls[0];
  expect(path).toBe("/api/ciak/client/admin/consegna-manuale");
  expect(opts.method).toBe("POST");
  expect(opts.body instanceof FormData).toBe(true);
  expect(opts.body.get("email")).toBe("linda.pavia@hotmail.it");
  expect(opts.body.get("nome")).toBe("Linda Pavia");

  // esito + magic-link col monito che e' monouso
  expect(await screen.findByText(/Consegnato a/i)).toBeTruthy();
  expect(screen.getByText(/token=abc123/)).toBeTruthy();
  expect(screen.getByText(/Non aprire questo link/i)).toBeTruthy();
});

test("blocca il submit senza email o PDF", async () => {
  render(<ConsegnaManuale onAuthExpired={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /Invia il Blueprint/i }));
  expect(await screen.findByText(/obbligatori/i)).toBeTruthy();
  expect(adminFetch).not.toHaveBeenCalled();
});
