import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StartPlusPage } from "./StartPlusPage";
import { clientPost } from "../api";

jest.mock("../api", () => ({ clientPost: jest.fn() }));

const base = {
  client: { id: "c1", name: "Maria Rossi", access_level: "cliente_blueprint" },
  diagnostic: { state: "call_done" },
  pricing: { ciak_start_plus: { amount_cents: 79000, credit_valid_days: 60, credit_after_expiry_cents: 39000 } },
  start: { attivo: false },
};

function vedi(dashboard = base) {
  return render(<MemoryRouter><StartPlusPage dashboard={dashboard} /></MemoryRouter>);
}

beforeEach(() => clientPost.mockReset());

test("mostra prezzo, credito a 60 giorni e quello che resta dopo", () => {
  const { container } = vedi();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/primo prodotto/);
  expect(container.textContent).toMatch(/2\.200€/); // upgrade entro 60 giorni
  expect(container.textContent).toMatch(/2\.600€/); // upgrade dopo 60 giorni
  expect(container.textContent).toMatch(/390€ di credito/);
  expect(container.textContent).not.toMatch(/guadagno garantito[^:]/i);
});

test("i tre video senza file veri dicono 'in preparazione', nessun player finto", () => {
  const { container } = vedi();
  expect(container.querySelectorAll("video")).toHaveLength(0);
  expect(screen.getAllByText(/Video guida in preparazione/i)).toHaveLength(3);
});

test("dopo la call chi non ha Start vede il pulsante e il clic apre il checkout", async () => {
  clientPost.mockResolvedValue({ checkout_url: "" });
  vedi();
  const button = screen.getByRole("button", { name: /Attiva Start Plus/ });
  fireEvent.click(button);
  await waitFor(() => expect(clientPost).toHaveBeenCalledWith("/start-plus/checkout"));
  await waitFor(() => expect(screen.getByText(/Checkout non disponibile/)).toBeTruthy());
});

test("prima della call il pulsante non c'e'", () => {
  vedi({ ...base, diagnostic: { state: "call_booked" } });
  expect(screen.queryByRole("button", { name: /Attiva Start Plus/ })).toBeNull();
});

test("chi ha gia' Start vede il passaggio a 400 euro, non l'acquisto da 790", () => {
  const { container } = vedi({ ...base, client: { ...base.client, access_level: "cliente_start" } });
  expect(screen.queryByRole("button", { name: /Attiva Start Plus/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Passa a Start Plus, 400€/ })).toBeTruthy();
  expect(container.textContent).toMatch(/paghi solo la differenza/);
});

test("chi ha gia' Start Plus non vede nessun pulsante", () => {
  const dashboard = {
    ...base,
    client: { ...base.client, access_level: "cliente_start" },
    pricing: { ciak_start_plus: { ...base.pricing.ciak_start_plus, already_active: true } },
  };
  const { container } = vedi(dashboard);
  expect(screen.queryByRole("button")).toBeNull();
  expect(container.textContent).toMatch(/Start Plus è attivo sul tuo account/);
});

test("il partner non vede ne' pulsante ne' messaggio di passaggio", () => {
  const { container } = vedi({ ...base, client: { ...base.client, access_level: "partner" } });
  expect(screen.queryByRole("button", { name: /Attiva Start Plus/ })).toBeNull();
  expect(container.textContent).not.toMatch(/paghi solo la differenza/);
});
