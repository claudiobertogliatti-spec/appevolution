import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MasterclassLanding } from "./MasterclassLanding";
import { CiakMasterclass } from "./Masterclass";
import CiakApp from "../CiakApp";

jest.mock("../components/CiakHeader", () => ({
  CiakHeader: () => <header>Ciak</header>,
}));

jest.mock("../components/CiakFooter", () => ({
  CiakFooter: () => <footer>Footer</footer>,
}));

jest.mock("./Landing", () => ({ CiakLanding: () => <div>Vetrina</div> }));
jest.mock("./Checkpoint", () => ({ CiakCheckpoint: () => <div /> }));
jest.mock("./CiakBlueprint", () => ({ CiakBlueprint: () => <div /> }));
jest.mock("./Grazie", () => ({ CiakGrazie: () => <div /> }));
jest.mock("./Diagnostica", () => ({ CiakDiagnostica: () => <div /> }));
jest.mock("./Report", () => ({ CiakReport: () => <div /> }));
jest.mock("./Analisi", () => ({ CiakAnalisi: () => <div /> }));
jest.mock("./Proposta", () => ({ CiakProposta: () => <div /> }));
jest.mock("./PartnerSetupPassword", () => ({ PartnerSetupPassword: () => <div /> }));
jest.mock("./NotFound", () => ({ CiakNotFound: () => <div /> }));
jest.mock("../components/CookieBanner", () => ({ CookieBanner: () => null }));
jest.mock("../hooks/usePageTracking", () => ({ usePageTracking: () => {} }));
jest.mock("../admin/CiakAdminApp", () => () => <div />);
jest.mock("../client/CiakClientApp", () => () => <div />);
jest.mock("../partner/CiakPartnerApp", () => () => <div />);

describe("funnel masterclass", () => {
  test("la landing raccoglie solo nome ed email", () => {
    render(
      <MemoryRouter>
        <MasterclassLanding />
      </MemoryRouter>
    );

    expect(screen.getAllByPlaceholderText("Il tuo nome")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("La tua email")).toHaveLength(2);
    expect(screen.queryByPlaceholderText(/telefono/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Metodo EVO/i)).toBeInTheDocument();
  });

  test("il viewer mostra il video senza un form di acquisizione", () => {
    render(
      <MemoryRouter>
        <CiakMasterclass />
      </MemoryRouter>
    );

    expect(screen.getByTitle("Masterclass Ciak")).toHaveAttribute(
      "src",
      expect.stringContaining("youtube.com/embed/E2XDEdJgzcQ")
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
  });

  test("la route masterclass monta la landing di acquisizione", () => {
    window.history.pushState({}, "", "/masterclass");
    render(<CiakApp />);

    expect(screen.getByRole("heading", { name: /Da competenza o corso fermo/i })).toBeInTheDocument();
    expect(screen.queryByTitle("Masterclass Ciak")).not.toBeInTheDocument();
  });

  test("la route viewer monta il video e non rimanda alla landing", () => {
    window.history.pushState({}, "", "/masterclass/guarda");
    render(<CiakApp />);

    expect(screen.getByTitle("Masterclass Ciak")).toHaveAttribute(
      "src",
      expect.stringContaining("youtube.com/embed/E2XDEdJgzcQ")
    );
    expect(screen.queryByRole("heading", { name: /Da competenza o corso fermo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
