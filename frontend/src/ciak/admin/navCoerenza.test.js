/**
 * Il menu dell'admin non deve piu' divergere dalla realta'.
 *
 * Controlli statici sul sorgente di CiakAdminApp.jsx (il file trascina tutte le
 * pagine, quindi non lo si importa nei test). Nascono da tre difetti trovati il
 * 5/10/2026: due elenchi di pagine che non coincidevano, una pagina che non
 * serviva piu' (Chiusura Insider) e voci con lo stesso nome in due reparti.
 */
const fs = require("fs");
const path = require("path");

const sorgente = fs.readFileSync(path.join(__dirname, "CiakAdminApp.jsx"), "utf8");

// Solo il blocco NAV (dalla dichiarazione alla sua chiusura).
const inizio = sorgente.indexOf("const NAV = [");
const fine = sorgente.indexOf("const MACRO_ICONS");
const blocco = sorgente.slice(inizio, fine);

// Ogni macro (reparto) con le sue pagine: { macro, to, label }.
function pagine() {
  const out = [];
  let macro = null;
  for (const riga of blocco.split("\n")) {
    const m = riga.match(/^\s{4}id: "([^"]+)"/);
    if (m) macro = m[1];
    const p = riga.match(/\{ to: "(\/admin\/[^"]+)", label: "([^"]+)"/);
    if (p && macro) out.push({ macro, to: p[1], label: p[2] });
  }
  return out;
}

const PAGINE = pagine();

test("il blocco del menu e' stato letto (non e' un controllo a vuoto)", () => {
  expect(inizio).toBeGreaterThan(0);
  expect(PAGINE.length).toBeGreaterThan(25);
  expect(new Set(PAGINE.map((p) => p.macro))).toEqual(
    new Set(["acquisizione", "vendite", "delivery", "back-office"])
  );
});

test("ogni voce del menu porta a una pagina vera, non a un reindirizzamento", () => {
  const senzaPagina = PAGINE.filter((p) => {
    const rotta = p.to.replace("/admin/", "");
    const re = new RegExp(`<Route\\s+path="${rotta}"[\\s\\S]{0,160}?(/>|</Route>)`);
    const m = sorgente.match(re);
    return !m || /<Navigate/.test(m[0]);
  });
  expect(senzaPagina.map((p) => `${p.macro}: ${p.label} (${p.to})`)).toEqual([]);
});

test("nessun indirizzo compare due volte nel menu", () => {
  const visti = {};
  const doppi = [];
  for (const p of PAGINE) {
    if (visti[p.to]) doppi.push(`${p.to} (${visti[p.to]} e ${p.macro})`);
    visti[p.to] = p.macro;
  }
  expect(doppi).toEqual([]);
});

test("nessun nome si ripete nello stesso reparto", () => {
  const doppi = [];
  const visti = new Set();
  for (const p of PAGINE) {
    const k = `${p.macro}|${p.label.toLowerCase()}`;
    if (visti.has(k)) doppi.push(`${p.macro}: ${p.label}`);
    visti.add(k);
  }
  expect(doppi).toEqual([]);
});

test("due reparti diversi non hanno voci con lo stesso nome (si confondono)", () => {
  const perNome = {};
  for (const p of PAGINE) {
    const k = p.label.toLowerCase();
    (perNome[k] = perNome[k] || new Set()).add(p.macro);
  }
  const ambigue = Object.entries(perNome)
    .filter(([, reparti]) => reparti.size > 1)
    .map(([nome, reparti]) => `${nome}: ${[...reparti].join(" e ")}`);
  expect(ambigue).toEqual([]);
});

test("le pagine tolte dal menu non ci sono piu': restano raggiungibili solo da indirizzo", () => {
  const nelMenu = PAGINE.map((p) => p.to);
  expect(nelMenu).not.toContain("/admin/chiusura-insider");
  expect(nelMenu).not.toContain("/admin/listino-prezzi");
  expect(nelMenu).not.toContain("/admin/collaudo-checkout");
  expect(sorgente).toMatch(/<Route path="listino-prezzi"/);
  expect(sorgente).toMatch(/<Route path="collaudo-checkout"/);
});
