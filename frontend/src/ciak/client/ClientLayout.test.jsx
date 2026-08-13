import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";

test("il cliente trova un contatto di assistenza esplicito", () => {
  render(<MemoryRouter><ClientLayout client={{ name: "Cliente" }}><p>Area</p></ClientLayout></MemoryRouter>);
  expect(screen.getByRole("link", { name: /supporto/i })).toHaveAttribute(
    "href", "mailto:assistenza@evolution-pro.it"
  );
});
