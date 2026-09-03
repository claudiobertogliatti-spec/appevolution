/**
 * Ciak Admin — KPI del Back office collegati alla cassa.
 *
 * "Incassi mese: Da attivare" e' rimasto in pagina per due mesi dopo che il
 * dato era pronto. Il KPI deve leggere il riepilogo crediti, e deve dire
 * chi scade oggi: e' l'unico numero che cambia una telefonata.
 */
import { computeMetrics } from "./repartoMetrics";

const RIEPILOGO = {
  mese: "2026-09",
  previsto_nel_mese: 1165,
  gia_incassato_nel_mese: 360,
  rate_nel_mese: 3,
  scade_oggi: [{ nome: "Annamaria Depalma", importo: 360 }],
  in_ritardo: [{ nome: "Luigi Calafiore", importo: 930 }],
  importo_in_ritardo: 930,
  crediti_aperti: 5,
  residuo_totale: 5140,
};

test("Incassi mese legge previsto e incassato dal riepilogo crediti", () => {
  const m = computeMetrics("back-office", { cred: RIEPILOGO });
  expect(m["Incassi mese"]).toBe("€ 360 su € 1.165");
});

test("Scade oggi e In ritardo dicono chi, non solo quanti", () => {
  const m = computeMetrics("back-office", { cred: RIEPILOGO });
  expect(m["Scade oggi"]).toBe("Annamaria Depalma · € 360");
  expect(m["In ritardo"]).toBe("1 · € 930");
});

test("senza riepilogo i KPI di cassa restano onesti, non a zero", () => {
  const m = computeMetrics("back-office", {});
  expect(m["Incassi mese"]).toBe("—");
  expect(m["Scade oggi"]).toBe("—");
});
