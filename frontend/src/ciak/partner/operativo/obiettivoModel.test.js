import { DEFAULTS, GOALS, PRICE_MIN, PRICE_MAX, clampPrice, computeRitmo, etaMesi } from "./obiettivoModel";

describe("obiettivoModel", () => {
  test("default confermati dalla spec", () => {
    expect(DEFAULTS).toEqual({ price: 297, conv: 15, show: 50 });
    expect(GOALS).toEqual([2000, 5000, 10000]);
    expect(PRICE_MIN).toBe(97);
    expect(PRICE_MAX).toBe(297);
  });

  test("clampPrice vincola al range 97-297", () => {
    expect(clampPrice(50)).toBe(97);
    expect(clampPrice(500)).toBe(297);
    expect(clampPrice(197)).toBe(197);
    expect(clampPrice(NaN)).toBe(PRICE_MIN);
  });

  test("computeRitmo: catena a ritroso con i default", () => {
    const r = computeRitmo({ goal: 5000, price: 297, conv: 15, show: 50 });
    expect(Math.round(r.sales)).toBe(17);
    expect(Math.round(r.perWeek)).toBe(52);
  });

  test("perWeek per gli obiettivi tipici (default)", () => {
    const p = { price: 297, conv: 15, show: 50 };
    expect(Math.round(computeRitmo({ ...p, goal: 2000 }).perWeek)).toBe(21);
    expect(Math.round(computeRitmo({ ...p, goal: 5000 }).perWeek)).toBe(52);
    expect(Math.round(computeRitmo({ ...p, goal: 10000 }).perWeek)).toBe(104);
  });

  test("perWeek cresce con l'obiettivo (monotonìa)", () => {
    const p = { price: 297, conv: 15, show: 50 };
    const a = computeRitmo({ ...p, goal: 2000 }).perWeek;
    const b = computeRitmo({ ...p, goal: 10000 }).perWeek;
    expect(b).toBeGreaterThan(a);
  });

  test("computeRitmo: guardie divisione per zero", () => {
    const r = computeRitmo({ goal: 5000, price: 0, conv: 0, show: 0 });
    expect(Number.isFinite(r.perWeek)).toBe(true);
    expect(r.perWeek).toBeGreaterThanOrEqual(0);
  });

  test("etaMesi cresce a scaglioni con il ritmo", () => {
    expect(etaMesi(21)).toBe(3);
    expect(etaMesi(52)).toBe(4);
    expect(etaMesi(104)).toBe(5);
    expect(etaMesi(300)).toBe(6);
  });

  test("computeRitmo: goal negativo o non numerico non produce ritmo negativo/NaN", () => {
    const p = { price: 297, conv: 15, show: 50 };
    expect(computeRitmo({ ...p, goal: -5000 }).perWeek).toBe(0);
    expect(computeRitmo({ ...p, goal: undefined }).perWeek).toBe(0);
  });
});
