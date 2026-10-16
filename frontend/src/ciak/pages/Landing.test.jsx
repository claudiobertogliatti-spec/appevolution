import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CiakLanding } from "./Landing";

jest.mock("../components/CiakHeader", () => ({
  CiakHeader: () => <header>Ciak</header>,
}));

jest.mock("../components/CiakFooter", () => ({
  CiakFooter: () => <footer>Footer</footer>,
}));

describe("CiakLanding", () => {
  test("e una vetrina senza form e porta alla masterclass", () => {
    render(<MemoryRouter><CiakLanding /></MemoryRouter>);

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    // Dal restyle del 22/7 "Metodo EVO" e' l'etichetta della sezione e il titolo
    // sono le tre fasi del metodo.
    expect(screen.getByText("Metodo EVO", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /esamina\. valida\. ottimizza\./i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /masterclass gratuita/i }))
      .toHaveLength(2);
    screen.getAllByRole("link", { name: /masterclass gratuita/i })
      .forEach((link) => expect(link).toHaveAttribute("href", "/masterclass"));
    expect(screen.queryByText(/metodo ciak/i)).not.toBeInTheDocument();
  });
});
