import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CiakBlueprint } from "./CiakBlueprint";
import { trackBlueprintBridgeView } from "../lib/metaPixel";

jest.mock("../components/CiakHeader", () => ({ CiakHeader: () => <header>Ciak</header> }));
jest.mock("../components/CiakFooter", () => ({ CiakFooter: () => <footer>Footer</footer> }));
jest.mock("../lib/metaPixel", () => ({
  trackBlueprintBridgeView: jest.fn(),
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CiakBlueprint />
    </MemoryRouter>
  );

describe("CiakBlueprint (analisi gratuita)", () => {
  beforeEach(() => {
    trackBlueprintBridgeView.mockReset();
  });

  test("le CTA portano alle 8 domande (/diagnostica), niente checkout", () => {
    renderAt("/blueprint");
    const cta = screen.getAllByRole("link", { name: /fai la tua analisi gratuita|inizia ora/i });
    expect(cta.length).toBeGreaterThan(0);
    cta.forEach((el) => expect(el.getAttribute("href")).toMatch(/^\/diagnostica/));
    // Blueprint gratis: nessun riferimento al pagamento, prezzo barrato -> GRATIS
    expect(screen.queryByText(/pagamento sicuro/i)).not.toBeInTheDocument();
    expect(screen.getByText("GRATIS")).toBeInTheDocument();
  });

  test("mostra il bridge masterclass e traccia una sola visita", () => {
    renderAt("/blueprint?source=masterclass_optin");
    expect(screen.getByText("Iscrizione completata. La masterclass è pronta.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /non ora, guarda la masterclass/i })).toHaveAttribute("href", "/masterclass/guarda");
    expect(trackBlueprintBridgeView).toHaveBeenCalledTimes(1);
  });

  test("senza sorgente masterclass non mostra né traccia il bridge", () => {
    renderAt("/blueprint");
    expect(screen.queryByText("Iscrizione completata. La masterclass è pronta.")).not.toBeInTheDocument();
    expect(trackBlueprintBridgeView).not.toHaveBeenCalled();
  });

  test("una sorgente arbitraria non attiva il bridge", () => {
    renderAt("/blueprint?source=qualcosa_altro");
    expect(screen.queryByText("Iscrizione completata. La masterclass è pronta.")).not.toBeInTheDocument();
    expect(trackBlueprintBridgeView).not.toHaveBeenCalled();
  });
});
