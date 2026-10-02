import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BlueprintPage } from "./BlueprintPage";

const bp = {
  progetto: "Read Me Academy",
  sintesi: "Una competenza reale, un business ancora da costruire.",
  problema: "Senza di te in aula non succede nulla.",
  pdf_url: "https://cdn.example/bp.pdf",
};

function vedi(dashboard) {
  render(<MemoryRouter><BlueprintPage dashboard={dashboard} /></MemoryRouter>);
}

test("mostra solo il riassunto e il link al PDF, senza punteggio ne' roadmap", () => {
  vedi({
    blueprint: bp,
    diagnostic: { score: 42, recommended_offer: "partnership", state: "call_done" },
    analysis: { roadmap: [{ fase: "Fase interna", attivita: "x" }] },
  });
  expect(screen.getByText(/Una competenza reale/)).toBeInTheDocument();
  expect(screen.getByText(/Senza di te in aula/)).toBeInTheDocument();
  const pdf = screen.getByRole("link", { name: /Blueprint completo \(PDF\)/i });
  expect(pdf).toHaveAttribute("href", "https://cdn.example/bp.pdf");
  expect(screen.queryByText(/42\/100|readiness/i)).toBeNull();
  expect(screen.queryByText(/Fase interna/)).toBeNull();
});

test("il passo successivo segue l'offerta consigliata", () => {
  vedi({ blueprint: bp, diagnostic: { recommended_offer: "partnership" } });
  expect(screen.getByRole("link", { name: /come proseguire/i })).toHaveAttribute("href", "/cliente/partnership");
});

test("senza PDF consegnato non mostra un link inventato", () => {
  vedi({ blueprint: { ...bp, pdf_url: null }, diagnostic: {} });
  expect(screen.queryByRole("link", { name: /PDF/i })).toBeNull();
  expect(screen.getByText(/arriva per email/i)).toBeInTheDocument();
});

test("senza Blueprint lo dice con onesta' e non inventa un riassunto", () => {
  vedi({ blueprint: null, diagnostic: {} });
  expect(screen.getByText(/non è ancora disponibile/i)).toBeInTheDocument();
  expect(screen.queryByRole("link")).toBeNull();
});
