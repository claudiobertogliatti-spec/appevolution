import { differenceNeedsNote, settlementStatusLabel } from "./CollaboratorSettlements";

test("richiede una nota quando fattura e compenso differiscono", () => {
  expect(differenceNeedsNote(110, 100)).toBe(true);
  expect(differenceNeedsNote(100, 100)).toBe(false);
});

test("mostra stati amministrativi in italiano", () => {
  expect(settlementStatusLabel("awaiting_invoice")).toBe("In attesa fattura");
  expect(settlementStatusLabel("to_pay")).toBe("Da pagare");
  expect(settlementStatusLabel("paid")).toBe("Pagata");
});
