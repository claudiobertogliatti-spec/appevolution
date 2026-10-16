import {
  computeModel,
  scenarioState,
  PRICE,
  EVOS_CANONE_MENSILE,
} from "./simulatoreFatturato";

describe("computeModel — acquisizione anno per anno", () => {
  test("base anno 1: Blueprint netto CAC, Start e Setup coi numeri del prototipo", () => {
    const { years } = computeModel(scenarioState("base"));
    // f = 0.5 → bp 750; blueprint gratis, netto CAC = 750*(0-20) = -15000
    expect(years[0].blueprint).toBeCloseTo(-15000, 2);
    // start = 750*0.15 * 390 = 43875
    expect(years[0].start).toBeCloseTo(43875, 2);
    // upg = 22.5 → 22.5*2600 ; dir = 10 → 10*2990 ; setup = 88400
    expect(years[0].setup).toBeCloseTo(88400, 2);
  });

  test("il Blueprint è al netto del CAC (CAC > prezzo → contributo negativo)", () => {
    const st = { ...scenarioState("base"), cac: 40 };
    const { years } = computeModel(st);
    // 750*(0-40) = -30000
    expect(years[0].blueprint).toBeLessThan(0);
    expect(years[0].blueprint).toBeCloseTo(-30000, 2);
  });
});

describe("computeModel — provvigione ed EVO-S", () => {
  test("EVO-S canone è zero nell'anno 1 (le coorti maturano dopo 12 mesi)", () => {
    const { years } = computeModel(scenarioState("base"));
    expect(years[0].canone).toBe(0);
    expect(years[1].canone).toBeGreaterThan(0);
    expect(years[2].canone).toBeGreaterThan(0);
  });

  test("con venduto partner = 0 le provvigioni spariscono ma il canone EVO-S resta", () => {
    const st = { ...scenarioState("base"), partnerSales: 0 };
    const { years } = computeModel(st);
    years.forEach((y) => expect(y.commPart).toBe(0));
    // il canone non dipende dal venduto: resta > 0 dall'anno 2
    expect(years[1].canone).toBeGreaterThan(0);
  });

  test("la provvigione vive solo nella finestra Partnership (ttl ≥ 12 → nessuna provvigione)", () => {
    const st = { ...scenarioState("base"), ttl: 12 };
    const { years } = computeModel(st);
    years.forEach((y) => expect(y.commPart).toBeCloseTo(0, 6));
  });

  test("il canone EVO-S non supera mai il tetto teorico (partner × canone medio × 12)", () => {
    const st = scenarioState("base");
    const { years } = computeModel(st);
    const capYear = st.capacity * 12;
    const teorico = capYear * EVOS_CANONE_MENSILE * 12;
    years.forEach((y) => expect(y.canone).toBeLessThanOrEqual(teorico + 1e-6));
  });
});

describe("computeModel — capacità e traiettoria", () => {
  test("lo scenario ambizioso satura la capacità di lancio (clamp)", () => {
    const { years, capAnnual } = computeModel(scenarioState("ambizioso"));
    expect(capAnnual).toBe(96); // 8 partner/mese × 12
    // anno 2/3 la domanda supera il tetto
    expect(years.some((y) => y.clamped)).toBe(true);
    const clampedYear = years.find((y) => y.clamped);
    expect(clampedYear.partners).toBeCloseTo(capAnnual, 6);
    expect(clampedYear.demand).toBeGreaterThan(capAnnual);
  });

  test("lo scenario base cresce anno su anno e resta sotto il milione a regime", () => {
    const { years } = computeModel(scenarioState("base"));
    expect(years[0].total).toBeLessThan(years[1].total);
    expect(years[1].total).toBeLessThan(years[2].total);
    // ~225k → ~470k → ~707k (Blueprint gratis = costo netto CAC; il milione non arriva col ramp base)
    expect(years[0].total).toBeGreaterThan(210000);
    expect(years[0].total).toBeLessThan(240000);
    expect(years[2].total).toBeGreaterThan(680000);
    expect(years[2].total).toBeLessThan(740000);
  });

  test("il totale è la somma delle sei voci", () => {
    const { years } = computeModel(scenarioState("base"));
    years.forEach((y) => {
      const sum = y.blueprint + y.start + y.setup + y.commPart + y.canone + y.services;
      expect(y.total).toBeCloseTo(sum, 6);
    });
  });
});

describe("costanti di business", () => {
  test("provvigione al 10% e canone medio EVO-S coerente col mix", () => {
    expect(PRICE.commRate).toBe(0.10);
    expect(EVOS_CANONE_MENSILE).toBeCloseTo(363.67, 1);
  });
});
