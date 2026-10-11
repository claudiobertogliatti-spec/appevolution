/**
 * Chi ha Ciak Start attivo entra nell'area in grafica partner; Blueprint e Partnership
 * restano con l'area di sempre.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("./api", () => ({
  clientGet: jest.fn(),
  getClientToken: jest.fn(),
  getClientUser: jest.fn(),
  magicLogin: jest.fn(),
  requestAccess: jest.fn(),
  clearClientSession: jest.fn(),
}));
jest.mock("./welcomeStart", () => ({ welcomeAlreadySeen: jest.fn(), markWelcomeSeen: jest.fn() }));
jest.mock("./start/StartArea", () => ({ __esModule: true, default: () => <div>AREA-START</div> }));
jest.mock("./pages/ClientHome", () => ({ ClientHome: () => <div>HOME-CLASSICA</div> }));

import CiakClientApp from "./CiakClientApp";
import { clientGet, getClientToken, getClientUser } from "./api";
import { welcomeAlreadySeen } from "./welcomeStart";

// CRA azzera i mock prima di ogni test: i valori si rimettono qui.
beforeEach(() => {
  getClientToken.mockReturnValue("tok");
  getClientUser.mockReturnValue({ name: "Linda Pavia" });
  welcomeAlreadySeen.mockReturnValue(true);
});

const monta = () =>
  render(
    <MemoryRouter initialEntries={["/cliente"]}>
      <Routes><Route path="/cliente/*" element={<CiakClientApp />} /></Routes>
    </MemoryRouter>
  );

test("cliente Start: area nuova", async () => {
  clientGet.mockResolvedValue({ client: { id: "c1", name: "Linda Pavia", access_level: "cliente_start" } });
  monta();
  expect(await screen.findByText("AREA-START")).toBeTruthy();
  expect(screen.queryByText("Il tuo percorso Ciak")).toBeNull();
});

test.each(["cliente_blueprint", "partner"])("%s: area di sempre, non quella di Start", async (livello) => {
  clientGet.mockResolvedValue({ client: { id: "c1", name: "Linda Pavia", access_level: livello } });
  monta();
  expect(await screen.findByText("HOME-CLASSICA")).toBeTruthy();
  expect(screen.getByText("Il tuo percorso Ciak")).toBeTruthy();
  expect(screen.queryByText("AREA-START")).toBeNull();
});
