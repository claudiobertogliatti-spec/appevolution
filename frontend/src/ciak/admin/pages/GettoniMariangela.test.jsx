import { formatCents, leadForm, leadOrigin, monthLabel, shiftMonth } from "./GettoniMariangela";

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

test("leadForm: lead nuovo vuoto con ingresso nel mese corrente", () => {
  const f = leadForm(null);
  expect(f).toEqual({ email: "", nome: "", nota: "", call_fatta_il: "", esito_start_il: "", mese: new Date().toISOString().slice(0, 7) });
});

test("leadForm: scheda esistente precompilata, il mese di ingresso non viene inventato", () => {
  expect(leadForm({ email: "a@x.it", nome: "A Esempio", nota: "n", call_fatta_il: "2026-10-05", mese: "2026-09" }))
    .toEqual({ email: "a@x.it", nome: "A Esempio", nota: "n", call_fatta_il: "2026-10-05", esito_start_il: "", mese: "2026-09" });
  expect(leadForm({ email: "a@x.it" }).mese).toBe("");
});

test("leadForm: se il nome coincide con l'email non lo ripropone come nome", () => {
  expect(leadForm({ email: "a@x.it", nome: "a@x.it" }).nome).toBe("");
});

test("leadForm include la data del pacchetto su misura", () => {
  expect(leadForm(null).esito_start_il).toBe("");
  expect(leadForm({ email: "a@x.it", esito_start_il: "2026-10-08" }).esito_start_il).toBe("2026-10-08");
});

test("leadOrigin: dice di che mese e il lead rispetto al mese che guardi", () => {
  expect(leadOrigin("2026-10", "2026-10")).toBe("questo mese");
  expect(leadOrigin("2026-09", "2026-10").toLowerCase()).toContain("settembre");
  expect(leadOrigin("", "2026-10")).toBe("mese ignoto");
});
