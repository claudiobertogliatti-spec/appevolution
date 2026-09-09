/**
 * Ciak Admin — header operativo della scheda partner (T17a).
 *
 * La scheda apre su "cosa manca e chi ci lavora": situazione, prossimo risultato,
 * responsabile, scadenza, prossima azione, blocco. I dati operativi vengono da
 * /delivery-audit (prop `audit`) — la stessa fonte della pagina Audit Delivery —
 * e NON sono ricalcolati o inventati: dove mancano, "—".
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { PartnerOpHeader } from "./PartnerDetailModal";

const PARTNER = { name: "Daniele Andolfi", contract_end: "2026-12-31" };

test("con l'item audit mostra prossima azione, responsabile, blocco e scadenza reali", () => {
  render(
    <PartnerOpHeader
      partner={PARTNER}
      phase="F3"
      piano={{ prossima_scadenza: "2026-09-15" }}
      audit={{ current_step: "Funnel", owner: "Antonella", blocked: true, next_action: "Sollecita revisione video" }}
      onOpenJourney={() => {}}
    />
  );
  const h = screen.getByTestId("partner-op-header");
  expect(h.textContent).toMatch(/Funnel/); // situazione = current_step
  expect(h.textContent).toMatch(/Funnel online e testato/); // risultato dell'atto Valida (F3)
  expect(h.textContent).toMatch(/Antonella/); // responsabile
  expect(h.textContent).toMatch(/Sollecita revisione video/); // prossima azione
  expect(h.textContent).toMatch(/Fermo/); // blocco
  expect(h.textContent).toMatch(/15\/09\/2026/); // scadenza dal piano
});

test("senza audit non inventa nulla: azione/blocco a vuoto, situazione dall'atto", () => {
  render(<PartnerOpHeader partner={PARTNER} phase="F1" piano={null} audit={null} onOpenJourney={() => {}} />);
  const h = screen.getByTestId("partner-op-header");
  expect(h.textContent).toMatch(/Esamina/); // attoEvo(F1)
  expect(h.textContent).toMatch(/Nessuna azione in coda/);
  expect(h.textContent).toMatch(/Nessun blocco/);
  expect(h.textContent).toMatch(/31\/12\/2026/); // scadenza dal contract_end (campo reale)
});

test("il bottone apre i Dati Journey", () => {
  const onOpen = jest.fn();
  render(<PartnerOpHeader partner={PARTNER} phase="F2" piano={null} audit={null} onOpenJourney={onOpen} />);
  fireEvent.click(screen.getByRole("button", { name: /apri dati journey/i }));
  expect(onOpen).toHaveBeenCalled();
});
