import { formatCents, leadForm, monthLabel, shiftMonth } from "./GettoniMariangela";

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

test("leadForm: lead nuovo vuoto, scheda esistente precompilata", () => {
  expect(leadForm(null)).toEqual({ email: "", nome: "", nota: "", call_fatta_il: "" });
  expect(leadForm({ email: "a@x.it", nome: "A Esempio", nota: "n", call_fatta_il: "2026-10-05" }))
    .toEqual({ email: "a@x.it", nome: "A Esempio", nota: "n", call_fatta_il: "2026-10-05" });
});

test("leadForm: se il nome coincide con l'email non lo ripropone come nome", () => {
  expect(leadForm({ email: "a@x.it", nome: "a@x.it" }).nome).toBe("");
});
