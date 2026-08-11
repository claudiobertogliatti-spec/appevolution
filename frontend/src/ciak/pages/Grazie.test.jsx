import { render, screen, waitFor } from "@testing-library/react";
import { CiakGrazie } from "./Grazie";

jest.mock("../components/CiakHeader", () => ({ CiakHeader: () => <header>Ciak</header> }));
jest.mock("../components/CiakFooter", () => ({ CiakFooter: () => <footer>Footer</footer> }));
jest.mock("../lib/metaPixel", () => ({ trackPurchase: jest.fn() }));

describe("CiakGrazie", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, "", "/blueprint/grazie?session_id=cs_test");
  });

  test("descrive solo i prossimi passi realmente disponibili", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ calcom_booking_url: "https://cal.com/evolution/test" }),
    });
    render(<CiakGrazie />);

    expect(screen.getByText(/acquisto confermato/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /apri il calendario/i })).toHaveAttribute(
      "href",
      "https://cal.com/evolution/test"
    );
    expect(screen.getByText(/preparazione della sessione/i)).toBeInTheDocument();
    expect(screen.getByText(/roadmap operativa/i)).toBeInTheDocument();
    expect(screen.queryByText(/8 domande ciak/i)).not.toBeInTheDocument();
  });

  test("senza calendario mostra un contatto utile senza promettere email automatiche", async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) });
    render(<CiakGrazie />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: /assistenza@evolution-pro\.it/i })).toHaveAttribute(
      "href",
      "mailto:assistenza@evolution-pro.it"
    );
    expect(screen.queryByText(/riceverai.*email/i)).not.toBeInTheDocument();
  });
});
