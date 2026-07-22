import { fireEvent, render, screen } from "@testing-library/react";
import { CiakBlueprint } from "./CiakBlueprint";
import { trackBlueprintBridgeView, trackInitiateCheckout } from "../lib/metaPixel";

jest.mock("../components/CiakHeader", () => ({ CiakHeader: () => <header>Ciak</header> }));
jest.mock("../components/CiakFooter", () => ({ CiakFooter: () => <footer>Footer</footer> }));
jest.mock("../lib/metaPixel", () => ({
  trackInitiateCheckout: jest.fn(),
  trackBlueprintBridgeView: jest.fn(),
}));

describe("CiakBlueprint bridge", () => {
  beforeEach(() => {
    trackBlueprintBridgeView.mockReset();
    trackInitiateCheckout.mockReset();
    window.history.pushState({}, "", "/blueprint?source=masterclass_optin");
  });

  test("mostra il bridge accessibile e traccia una sola visita", () => {
    render(<CiakBlueprint />);
    expect(screen.getByText("Iscrizione completata. La masterclass è pronta.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizziamo il mio progetto — 27 €" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /non ora, guarda la masterclass/i })).toHaveAttribute("href", "/masterclass/guarda");
    expect(trackBlueprintBridgeView).toHaveBeenCalledTimes(1);
  });

  test("non mostra né traccia il bridge senza sorgente masterclass", () => {
    window.history.pushState({}, "", "/blueprint");
    render(<CiakBlueprint />);
    expect(screen.queryByText("Iscrizione completata. La masterclass è pronta.")).not.toBeInTheDocument();
    expect(trackBlueprintBridgeView).not.toHaveBeenCalled();
  });

  test("una sorgente arbitraria non attiva il bridge", () => {
    window.history.pushState({}, "", "/blueprint?source=qualcosa_altro");
    render(<CiakBlueprint />);
    expect(screen.queryByText("Iscrizione completata. La masterclass è pronta.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /non ora, guarda la masterclass/i })).not.toBeInTheDocument();
    expect(trackBlueprintBridgeView).not.toHaveBeenCalled();
  });

  test("passa la sorgente whitelisted al checkout", async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ checkout_url: "https://checkout.example" }) });
    render(<CiakBlueprint />);
    fireEvent.click(screen.getAllByRole("button", { name: /27/i })[0]);
    await Promise.resolve();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.source).toBe("masterclass_optin");
    expect(body.attribution_source).toBe("masterclass_optin");
    expect(trackInitiateCheckout).toHaveBeenCalledWith(27, "EUR");
  });
});
