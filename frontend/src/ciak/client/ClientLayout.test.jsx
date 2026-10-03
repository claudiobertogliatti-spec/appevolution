import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";

function renderLayout() {
  render(<MemoryRouter><ClientLayout client={{ name: "Cliente" }}><p>Area</p></ClientLayout></MemoryRouter>);
}

test("il menu ha il Simulatore al posto del Supporto, che non e' piu' una voce", () => {
  renderLayout();
  expect(screen.getByRole("link", { name: /simulatore/i })).toHaveAttribute("href", "/cliente/simulatore");
  expect(screen.queryByRole("link", { name: /supporto/i })).toBeNull();
});

test("restano le voci del percorso", () => {
  renderLayout();
  ["Home", "Blueprint", "Ciak Start", "Partnership"].forEach((nome) => {
    expect(screen.getByRole("link", { name: new RegExp(nome, "i") })).toBeInTheDocument();
  });
});
