// Parità admin per RAGGIUNGIBILITÀ (non più NAV byte-identico: la riorganizzazione
// delle voci per reparto cambia il NAV, ma nessuna route/capacità può sparire).
// Verifica: 1) nessuna route rimossa rispetto alla base; 2) ogni voce NAV punta a
// una route registrata; 3) handler import manuale/CSV di LeadManager invariati.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const base = '20f43d4d';
const file = 'frontend/src/ciak/admin/CiakAdminApp.jsx';
const before = cp.execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' }).replace(/\r/g, '');
const after = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

const routesBlock = (s) => s.slice(s.indexOf('<Routes>'), s.lastIndexOf('</Routes>') + 9);
// path="literal": ignora i path dinamici generati (path={`reparto/${m.id}`}) e l'index.
const literalPaths = (s) => {
  const set = new Set();
  const re = /path=["'`]([^"'`$]+)["'`]/g;
  const block = routesBlock(s);
  let m;
  while ((m = re.exec(block))) set.add(m[1]);
  return set;
};
const beforePaths = literalPaths(before);
const afterPaths = literalPaths(after);
const removed = [...beforePaths].filter((p) => !afterPaths.has(p));
assert.equal(removed.length, 0, `Route rimosse rispetto alla base: ${removed.join(', ')}`);

// Reachability: ogni voce NAV (page.to o macro.to) punta a una route registrata.
const navStart = after.indexOf('const NAV = [');
const navBlock = after.slice(navStart, after.indexOf('];', navStart) + 2);
const navTos = [...navBlock.matchAll(/to:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
const unreachable = navTos.filter((to) => {
  if (to === '/admin') return false; // index route
  const rel = to.replace(/^\/admin\//, '');
  return !afterPaths.has(rel);
});
assert.equal(unreachable.length, 0, `Voci NAV senza route registrata: ${unreachable.join(', ')}`);

// Handler manuale/CSV di LeadManager invariati (contratto di import).
const lead = 'frontend/src/ciak/admin/pages/LeadManager.jsx';
const oldLead = cp.execFileSync('git', ['show', `${base}:${lead}`], { encoding: 'utf8' }).replace(/\r/g, '');
const newLead = fs.readFileSync(lead, 'utf8').replace(/\r/g, '');
for (const name of ['handleCsvUpload', 'handleManualSave']) {
  const body = (s) => s.slice(s.indexOf(`const ${name} =`), s.indexOf('\n  };', s.indexOf(`const ${name} =`)) + 5);
  assert.equal(body(newLead), body(oldLead), `${name} changed`);
}

const result = {
  base,
  routesPreserved: 'PASS (superset: nessuna route rimossa)',
  removedRoutes: removed.length,
  navReachable: 'PASS',
  navPagesChecked: navTos.length,
  csvAndManualHandlers: 'identical',
  status: 'PASS',
  method: 'reachability (route-set superset + NAV targets registered)',
  limit: 'Static reachability for this patch; not full runtime/permissions certification',
};
console.log(JSON.stringify(result, null, 2));
