import {
  INPUT_INIZIALI, PARTNERSHIP_EUR, ROYALTY, SCENARI, contattiNecessari, limita, prezzoValido, simula,
} from "./simulatoreModel";

const prudente = SCENARI.prudente;
const ambizioso = SCENARI.ambizioso;

test("ci sono solo due scenari: nessuno 'Base' che sembri il risultato normale", () => {
  expect(Object.keys(SCENARI)).toEqual(["prudente", "ambizioso"]);
});

test("il costo del servizio e la royalty vengono dal listino e dal contratto", () => {
  expect(PARTNERSHIP_EUR).toBe(2990);
  expect(ROYALTY).toBe(0.1);
});

test("prima live del prudente: 150 contatti, 45 iscritti, 11,25 presenti, 0,3375 acquirenti", () => {
  const r = simula(INPUT_INIZIALI, prudente);
  const live = r.live[0];
  expect(live.mese).toBe(3);
  expect(live.contatti).toBeCloseTo(150);
  expect(live.iscritti).toBeCloseTo(45);
  expect(live.presenti).toBeCloseTo(11.25);
  expect(live.acquirenti).toBeCloseTo(0.3375);
  expect(live.incasso).toBeCloseTo(0.3375 * 197);
});

test("le live sono ogni 2 mesi dal mese scelto e gli incassi cadono solo in quei mesi", () => {
  const r = simula(INPUT_INIZIALI, prudente);
  expect(r.live.map((l) => l.mese)).toEqual([3, 5, 7, 9, 11]);
  r.incassi.forEach((v, i) => {
    if ([3, 5, 7, 9, 11].includes(i + 1)) expect(v).toBeGreaterThan(0);
    else expect(v).toBe(0);
  });
});

test("le live successive rendono meno: la seconda e' il 40% della prima nello scenario prudente", () => {
  const r = simula(INPUT_INIZIALI, prudente);
  expect(r.live[1].contatti / r.live[0].contatti).toBeCloseTo(0.4);
});

test("costi: 2.990 euro al mese 1, royalty 10% sugli incassi, e il cumulato parte in negativo", () => {
  const r = simula(INPUT_INIZIALI, ambizioso);
  expect(r.costi[0]).toBe(2990);
  r.incassi.forEach((v, i) => expect(r.royalty[i]).toBeCloseTo(v * 0.1));
  expect(r.cumulato[0]).toBe(-2990);
  expect(r.netto).toBeCloseTo(r.totIncassi - r.totCosti);
});

test("senza vendite sufficienti non c'e' pareggio: viene detto, non inventato", () => {
  const r = simula(INPUT_INIZIALI, prudente);
  expect(r.netto).toBeLessThan(0);
  expect(r.pareggio).toBeNull();
});

test("la pubblicita' costa dal mese prima della live fino al 12 e porta contatti in piu'", () => {
  const senza = simula(INPUT_INIZIALI, prudente);
  const con = simula({ ...INPUT_INIZIALI, adsGiorno: 10, cpl: 3 }, prudente);
  expect(con.costi[1]).toBe(300); // mese 2 = lancio meno 1
  expect(con.costi[0]).toBe(2990); // prima: solo il servizio
  expect(con.live[0].contatti).toBeCloseTo(senza.live[0].contatti + 100); // 300 euro a 3 euro per contatto
});

test("il secondo corso e' facoltativo: spento non cambia nulla, acceso usa il suo prezzo", () => {
  const uno = simula({ ...INPUT_INIZIALI, secondo: false, prezzo2: 297 }, ambizioso);
  const due = simula({ ...INPUT_INIZIALI, secondo: true, prezzo1: 197, prezzo2: 297 }, ambizioso);
  expect(simula(INPUT_INIZIALI, ambizioso).totIncassi).toBeCloseTo(uno.totIncassi);
  expect(due.totIncassi).not.toBeCloseTo(uno.totIncassi);
});

test("i prezzi restano dentro la fascia 97-297 anche se qualcuno scrive altro", () => {
  expect(prezzoValido(50)).toBe(97);
  expect(prezzoValido(900)).toBe(297);
  expect(prezzoValido("abc")).toBe(97);
  const r = simula({ ...INPUT_INIZIALI, prezzo1: 5000 }, ambizioso);
  expect(r.live[0].incasso).toBeCloseTo(r.live[0].acquirenti * 297);
});

test("limita non lascia passare valori non numerici", () => {
  expect(limita(NaN, 1, 10)).toBe(1);
  expect(limita(99, 1, 10)).toBe(10);
});

test("calcolo inverso: con i contatti calcolati si incassa l'obiettivo alla prima live", () => {
  const obiettivo = 3000;
  const n = contattiNecessari(obiettivo, INPUT_INIZIALI, prudente);
  const r = simula(INPUT_INIZIALI, { ...prudente, contatti: n.contatti });
  expect(r.live[0].incasso).toBeCloseTo(obiettivo, 1);
  expect(n.contatti).toBeGreaterThan(n.iscritti);
  expect(n.iscritti).toBeGreaterThan(n.presenti);
  expect(n.presenti).toBeGreaterThan(n.acquirenti);
});

test("calcolo inverso con acquisti a zero non divide per zero", () => {
  expect(contattiNecessari(3000, INPUT_INIZIALI, { ...prudente, acquisti: 0 })).toBeNull();
});
