import { render, screen } from "@testing-library/react";

let mockSlug = "mariangela";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  useParams: () => ({ slug: mockSlug }),
}), { virtual: true });
// Le code sono mockate: mostrano l'ownerFilter ricevuto, così verifichiamo
// il filtro per persona senza toccare la rete.
jest.mock("../components/AcquisizioneQueue", () => ({
  AcquisizioneQueue: ({ ownerFilter }) => <div data-testid="q-acq">acq:{ownerFilter}</div>,
}));
jest.mock("../components/DepartmentQueue", () => ({
  VenditeQueue: ({ ownerFilter }) => <div data-testid="q-ven">ven:{ownerFilter}</div>,
  DeliveryQueue: ({ ownerFilter }) => <div data-testid="q-del">del:{ownerFilter}</div>,
}));

import { PersonaHome } from "./PersonaHome";

test("Mariangela: identità unica con Acquisizione + Vendite filtrate su di lei", () => {
  mockSlug = "mariangela";
  render(<PersonaHome />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mariangela");
  expect(screen.getByTestId("q-acq").textContent).toBe("acq:Mariangela");
  expect(screen.getByTestId("q-ven").textContent).toBe("ven:Mariangela");
  expect(screen.queryByTestId("q-del")).toBeNull(); // niente Delivery per Mariangela
  expect(screen.getByRole("link", { name: /Acquisizione/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Vendite/ })).toBeTruthy();
});

test("Antonella: coda Delivery filtrata su di lei, non Acquisizione/Vendite", () => {
  mockSlug = "antonella";
  render(<PersonaHome />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Antonella");
  expect(screen.getByTestId("q-del").textContent).toBe("del:Antonella");
  expect(screen.queryByTestId("q-acq")).toBeNull();
  expect(screen.queryByTestId("q-ven")).toBeNull();
});

test("slug sconosciuto: messaggio chiaro, nessuna coda", () => {
  mockSlug = "ignoto";
  render(<PersonaHome />);
  expect(screen.getByText("Collaboratrice non trovata")).toBeTruthy();
  expect(screen.queryByTestId("q-acq")).toBeNull();
});
