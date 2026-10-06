import { formatCents, monthLabel, shiftMonth } from "./GettoniMariangela";

test("formatCents mostra euro da centesimi", () => {
  expect(formatCents(25000)).toMatch(/250,00/);
  expect(formatCents(1500)).toMatch(/15,00/);
  expect(formatCents(null)).toMatch(/0,00/);
});

test("shiftMonth attraversa l'anno", () => {
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-10", 0)).toBe("2026-10");
});

test("monthLabel in italiano", () => {
  expect(monthLabel("2026-10").toLowerCase()).toContain("ottobre");
});
