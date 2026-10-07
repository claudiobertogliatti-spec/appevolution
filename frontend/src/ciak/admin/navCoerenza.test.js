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

test("le dashboard di Antonella chiamano le pagine Delivery con il nome del menu", () => {
  // "Calendario Editoriale" e "Campagne Ads" sono i nomi di Acquisizione (contenuti di
  // Ciak); le pagine Delivery a cui Antonella arriva si chiamano "... partner".
  const dashboard = fs.readFileSync(path.join(__dirname, "pages", "AntonellaDashboard.jsx"), "utf8");
  const oggi = fs.readFileSync(path.join(__dirname, "pages", "AntonellaOggi.jsx"), "utf8");
  for (const testo of [dashboard, oggi]) {
    expect(testo).not.toMatch(/Campagne Ads|campagne ads/);
    expect(testo).not.toMatch(/Calendario Editoriale/);
  }
  expect(dashboard).toMatch(/Campagne partner/);
  expect(dashboard).toMatch(/Calendario partner/);
  expect(oggi).toMatch(/Calendario partner/);
  expect(oggi).toMatch(/Alert campagne partner/);
  // e il menu di Delivery usa gli stessi nomi
  expect(PAGINE.filter((p) => p.macro === "delivery").map((p) => p.label)).toEqual(
    expect.arrayContaining(["Calendario partner", "Campagne partner"])
  );
});

test("Acquisizione: una sola voce 'Contatti' (ex New Lead + Acquisizione Evolution), Lista Fredda fuori dal menu", () => {
  const acq = PAGINE.filter((p) => p.macro === "acquisizione").map((p) => p.label);
  expect(acq).toContain("Contatti");
  expect(acq).toContain("Lead in arrivo");
  ["New Lead", "Acquisizione Evolution", "Lead inbound", "Lista Fredda"].forEach((vecchia) =>
    expect(acq).not.toContain(vecchia)
  );
  // nessuna voce del menu punta alla pagina vecchia (era lo stesso strumento di /admin/pipeline)
  expect(PAGINE.map((p) => p.to)).not.toContain("/admin/lead-manager");
});

test("i vecchi link restano vivi: /lead-manager reindirizza a Contatti conservando ?apri=, Lista Fredda resta raggiungibile", () => {
  expect(sorgente).toMatch(/path="lead-manager" element=\{<RedirectKeepSearch to="\/admin\/pipeline" \/>\}/);
  expect(sorgente).toMatch(/path="lista-fredda" element=\{<ListaFredda/);
  // le scorciatoie "Importa lista / Ricerca automatica" aprono direttamente Contatti
  expect(sorgente).not.toMatch(/navigate\("\/admin\/lead-manager/);
});

test("gli accessi diretti sopra i reparti (Lead in lavorazione, Clienti, Partner) portano a pagine vere", () => {
  const i = sorgente.indexOf("const QUICK = [");
  const blocco = sorgente.slice(i, sorgente.indexOf("];", i));
  const voci = [...blocco.matchAll(/to: "(\/admin\/[^"]+)", label: "([^"]+)"/g)].map((m) => ({ to: m[1], label: m[2] }));
  expect(voci.map((v) => v.label)).toEqual(["Lead in lavorazione", "Clienti", "Partner"]);
  for (const v of voci) {
    const rotta = v.to.replace("/admin/", "");
    const re = new RegExp(`<Route\\s+path="${rotta}"[\\s\\S]{0,160}?(/>|</Route>)`);
    const m = sorgente.match(re);
    expect(m && !/<Navigate/.test(m[0])).toBeTruthy();
  }
  // Mariangela lavora solo in Acquisizione, Antonella solo in Delivery: stessa regola dei reparti
  expect(blocco).toMatch(/label: "Lead in lavorazione".*hideFor: \["antonella"\]/);
  expect(blocco).toMatch(/label: "Clienti".*hideFor: \["mariangela"\]/);
  expect(blocco).toMatch(/label: "Partner".*hideFor: \["mariangela"\]/);
});
