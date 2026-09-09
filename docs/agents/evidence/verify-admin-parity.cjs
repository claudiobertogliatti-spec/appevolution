const fs=require('node:fs');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const base='20f43d4d';
const file='frontend/src/ciak/admin/CiakAdminApp.jsx';
const before=cp.execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'});
const after=fs.readFileSync(file,'utf8');
const section=s=>s.slice(s.indexOf('const NAV = ['),s.indexOf('//',s.indexOf('];',s.indexOf('const NAV = ['))));
assert.equal(section(after).replace(/\r/g,''),section(before).replace(/\r/g,''),'NAV catalog/roles changed');
const routes=s=>s.slice(s.indexOf('<Routes>'),s.lastIndexOf('</Routes>')+9);
assert.equal(routes(after).replace(/\r/g,''),routes(before).replace(/\r/g,''),'Registered routes or component bindings changed');
const lead='frontend/src/ciak/admin/pages/LeadManager.jsx';
const oldLead=cp.execFileSync('git',['show',`${base}:${lead}`],{encoding:'utf8'});
const newLead=fs.readFileSync(lead,'utf8');
for(const name of ['handleCsvUpload','handleManualSave']){
 const body=s=>s.slice(s.indexOf(`const ${name} =`),s.indexOf('\n  };',s.indexOf(`const ${name} =`))+5).replace(/\r/g,'');
 assert.equal(body(newLead),body(oldLead),`${name} changed`);
}
const result={base,nav:'identical',routesAndBindings:'identical',csvAndManualHandlers:'identical',status:'PASS',limit:'Static parity for this patch; not full runtime/permissions certification'};
console.log(JSON.stringify(result,null,2));
