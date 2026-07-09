# Acquisizione Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare l'attuale area acquisizione Ciak in Acquisizione Evolution: progetto pilota interno con target minimo 3, ottimale 4, routine giornaliera Luca e ponte strategico verso il Motore Vendite Partner.

**Architecture:** Evolvere il Command Center esistente invece di creare un CRM parallelo. Il backend espone metadati operativi e KPI coerenti; il frontend li mostra in una vista di comando compatta; i materiali outreach diventano il primo asset copy della macchina.

**Tech Stack:** FastAPI router in `backend/routers/ciak_admin.py`, React CRA in `frontend/src/ciak/admin`, Tailwind utility classes gia' presenti, Markdown docs in `docs/marketing`.

## Global Constraints

- `www.ciak.io` e' la piattaforma applicativa completa; non usare `app.evolution-pro.it`.
- `www.evolution-pro.it` resta sito vetrina marketing.
- Target Acquisizione Evolution: minimo 3 ingressi Metodo EVO/mese, ottimale 4 ingressi Metodo EVO/mese.
- Routine iniziale: 20 nuovi contatti mirati/giorno, 100/settimana, 400/mese.
- Lista fredda 13k: niente email massive, drip o sequenze cold non personalizzate; uso ammesso per custom audience Meta, analisi segmenti e studio mercato.
- Non modificare il system prompt di Matteo.
- Tono: diretto, italiano semplice, anti-fuffa, frasi brevi.

---

## File Structure

- Modify: `backend/routers/ciak_admin.py`
  - Responsabilita': arricchire `/api/admin/ciak/acquisizione-command-center` con target minimo/ottimale, routine Luca, canali ammessi e ponte Motore Vendite Partner.
- Modify: `frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx`
  - Responsabilita': rinominare la vista in Acquisizione Evolution, mostrare target 3/4, routine Luca, priorita' recuperi e ponte partner.
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`
  - Responsabilita': aggiornare etichette e descrizioni della macro Acquisizione.
- Modify: `frontend/src/ciak/admin/departmentRooms.js`
  - Responsabilita': allineare la stanza acquisizione al modello Claudio -> Claude + Codex -> Luca -> agenti.
- Modify: `docs/marketing/messaggi-outreach-pronti.md`
  - Responsabilita': riallineare i messaggi al nuovo posizionamento Metodo EVO, Acquisizione Evolution e Ciak Blueprint.

---

### Task 1: Backend Contract Acquisizione Evolution

**Files:**
- Modify: `backend/routers/ciak_admin.py`

**Interfaces:**
- Consumes: collection gia' lette da `acquisizione_command_center`: `diagnostic_sessions`, `ciak_checkpoint_events`, `ciak_leads`, `proposte`, `partners`.
- Produces: endpoint `GET /api/admin/ciak/acquisizione-command-center` con campi aggiunti:
  - `target.minimum_monthly: number`
  - `target.optimal_monthly: number`
  - `target.partnerships_monthly: number`
  - `target.target_label: string`
  - `routine.daily_new_contacts: number`
  - `routine.weekly_new_contacts: number`
  - `routine.monthly_new_contacts: number`
  - `routine.today: Array<{id:string,title:string,owner:string,metric:string,priority:string}>`
  - `channels.allowed: string[]`
  - `channels.blocked: string[]`
  - `partner_sales_engine.summary: string`
  - `partner_sales_engine.stable_parts: string[]`
  - `partner_sales_engine.adapted_parts: string[]`

- [ ] **Step 1: Snapshot current response shape**

Run:

```powershell
Select-String -Path backend\routers\ciak_admin.py -Pattern '"target": \{|partnerships_monthly|bottlenecks' -Context 3,8
```

Expected: output shows the current `target`, `funnel`, `priorities`, and `bottlenecks` payload in `acquisizione_command_center`.

- [ ] **Step 2: Add constants inside `acquisizione_command_center`**

Find:

```python
    target_partnerships = 4
```

Replace with:

```python
    target_minimum = 3
    target_optimal = 4
    target_partnerships = target_optimal
    daily_new_contacts = 20
    weekly_new_contacts = 100
    monthly_new_contacts = 400
```

- [ ] **Step 3: Add routine, channels and partner engine payload before return**

Insert immediately before:

```python
    return {
```

Code:

```python
    luca_routine = [
        {
            "id": "new_contacts",
            "title": "Seleziona e lavora 20 nuovi contatti mirati",
            "owner": "Luca + Valentina",
            "metric": f"{daily_new_contacts} contatti/giorno",
            "priority": "alta",
        },
        {
            "id": "hot_recoveries",
            "title": "Recupera checkout cliccati e Blueprint non pagati",
            "owner": "Luca + Marco",
            "metric": f"{len(clicked_no_purchase)} recuperi caldi",
            "priority": "critica" if clicked_no_purchase else "normale",
        },
        {
            "id": "diagnostic_recoveries",
            "title": "Porta chi ha completato le 8 Domande verso il Blueprint",
            "owner": "Luca + Andrea",
            "metric": f"{len(completed_no_purchase)} diagnosi da convertire",
            "priority": "alta" if completed_no_purchase else "normale",
        },
        {
            "id": "call_recoveries",
            "title": "Fai prenotare la call a chi ha acquistato il Blueprint",
            "owner": "Luca + Gaia",
            "metric": f"{len(purchased_no_call)} Blueprint senza call",
            "priority": "alta" if purchased_no_call else "normale",
        },
        {
            "id": "evening_report",
            "title": "Report serale a Claudio, Claude e Codex",
            "owner": "Luca",
            "metric": "priorita', blocchi, numeri del giorno",
            "priority": "normale",
        },
    ]

    channels = {
        "allowed": [
            "rete calda, WhatsApp, referral ed ex clienti",
            "LinkedIn organico con DM mirati",
            "contenuti Claudio con CTA verso Ciak Blueprint",
            "custom audience Meta dalla lista fredda",
        ],
        "blocked": [
            "email massive sulla lista fredda 13k",
            "drip email cold non personalizzate",
            "sequenze automatiche prima di validare messaggi e call",
        ],
    }

    partner_sales_engine = {
        "summary": "Acquisizione Evolution e' il progetto pilota madre. Il Motore Vendite Partner duplica lo stesso sistema adattandolo a target, promessa, contenuti, offerta e dati del partner.",
        "stable_parts": [
            "metodo",
            "struttura del percorso",
            "disciplina sui follow-up",
            "lettura dei dati",
            "ciclo Esamina, Valida, Ottimizza",
        ],
        "adapted_parts": [
            "target",
            "promessa",
            "linguaggio",
            "canale principale",
            "offerta",
            "script di vendita",
            "KPI specifici",
        ],
    }
```

- [ ] **Step 4: Extend returned `target` payload**

Find the returned `target` object and make it:

```python
        "target": {
            "minimum_monthly": target_minimum,
            "optimal_monthly": target_optimal,
            "partnerships_monthly": target_partnerships,
            "partnerships_closed": partnerships_month,
            "gap": gap,
            "month_start": month_start,
            "target_label": "minimo 3, ottimale 4 ingressi Metodo EVO/mese",
        },
```

- [ ] **Step 5: Extend returned root payload**

After `"bottlenecks": bottlenecks,` add:

```python
        "routine": {
            "daily_new_contacts": daily_new_contacts,
            "weekly_new_contacts": weekly_new_contacts,
            "monthly_new_contacts": monthly_new_contacts,
            "today": luca_routine,
        },
        "channels": channels,
        "partner_sales_engine": partner_sales_engine,
```

- [ ] **Step 6: Verify Python syntax**

Run:

```powershell
python -m py_compile backend\routers\ciak_admin.py
```

Expected: command exits with code 0 and no output.

- [ ] **Step 7: Commit**

```powershell
git add backend\routers\ciak_admin.py
git commit -m "feat: expose Acquisition Evolution operating payload"
```

---

### Task 2: Frontend Command Center Acquisizione Evolution

**Files:**
- Modify: `frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx`

**Interfaces:**
- Consumes: payload from Task 1.
- Produces: user-facing view with title `Acquisizione Evolution`, target `Minimo 3 / Ottimale 4`, routine Luca and Motore Vendite Partner summary.

- [ ] **Step 1: Update imports**

Find the lucide import block and add:

```javascript
  ListChecks,
  ShieldCheck,
```

Final import list must include existing icons plus `ListChecks` and `ShieldCheck`.

- [ ] **Step 2: Add `InfoPanel` component after `KpiCard`**

```javascript
function InfoPanel({ icon: Icon, title, children, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-700",
    slate: "border-slate-200 bg-white text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="text-sm text-slate-600 mt-3 leading-relaxed">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Read new payload fields**

After:

```javascript
  const priorities = data.priorities || {};
```

Add:

```javascript
  const routine = data.routine || {};
  const channels = data.channels || {};
  const partnerSalesEngine = data.partner_sales_engine || {};
  const targetMinimum = target.minimum_monthly || 3;
  const targetOptimal = target.optimal_monthly || target.partnerships_monthly || 4;
```

- [ ] **Step 4: Replace hero copy**

Replace the hero title:

```javascript
              Obiettivo: 4 partnership al mese
```

With:

```javascript
              Acquisizione Evolution
```

Replace the hero paragraph with:

```javascript
              Progetto pilota madre: minimo {targetMinimum}, ottimale {targetOptimal} ingressi Metodo EVO al mese. Luca coordina contatti, recuperi e report giornaliero.
```

Replace the gap footer:

```javascript
              {target.partnerships_closed || 0}/{target.partnerships_monthly || 4} partnership chiuse
```

With:

```javascript
              {target.partnerships_closed || 0}/{targetOptimal} ingressi Metodo EVO
```

- [ ] **Step 5: Replace target KPI labels**

Replace the first two KPI cards with:

```javascript
        <KpiCard icon={Target} label="Ottimale" value={targetOptimal} hint={`Minimo sostenibile: ${targetMinimum} ingressi Metodo EVO.`} tone="yellow" />
        <KpiCard icon={CheckCircle2} label="Ingressi" value={target.partnerships_closed || 0} hint="Contratti pagati nel mese." tone="green" />
```

- [ ] **Step 6: Add routine section after bottlenecks**

Insert after the bottlenecks block:

```javascript
      <div className="grid lg:grid-cols-3 gap-4">
        <InfoPanel icon={ListChecks} title="Routine Luca" tone="yellow">
          <p>
            {routine.daily_new_contacts || 20} nuovi contatti al giorno, {routine.weekly_new_contacts || 100} a settimana, {routine.monthly_new_contacts || 400} al mese.
          </p>
          <div className="mt-3 space-y-2">
            {(routine.today || []).map((item) => (
              <div key={item.id} className="rounded-lg bg-white/70 border border-white px-3 py-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.owner} · {item.metric}</p>
              </div>
            ))}
          </div>
        </InfoPanel>
        <InfoPanel icon={ShieldCheck} title="Canali ammessi" tone="blue">
          <ul className="space-y-1">
            {(channels.allowed || []).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </InfoPanel>
        <InfoPanel icon={AlertTriangle} title="Da non fare ora" tone="slate">
          <ul className="space-y-1">
            {(channels.blocked || []).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </InfoPanel>
      </div>
```

- [ ] **Step 7: Add Motore Vendite Partner section before final dark rule**

Insert before:

```javascript
      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
```

Code:

```javascript
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Duplicazione partner</p>
        <h2 className="text-xl font-semibold text-slate-900 mt-1">Motore Vendite Partner</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {partnerSalesEngine.summary || "Il sistema validato su Evolution viene adattato al mercato del partner."}
        </p>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-900">Resta stabile</p>
            <p className="text-sm text-slate-500 mt-1">{(partnerSalesEngine.stable_parts || []).join(" · ")}</p>
          </div>
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Si adatta</p>
            <p className="text-sm text-slate-600 mt-1">{(partnerSalesEngine.adapted_parts || []).join(" · ")}</p>
          </div>
        </div>
      </div>
```

- [ ] **Step 8: Update final rule copy**

Replace:

```javascript
              Prima lavori i checkout caldi, poi chi ha completato le 8 domande, poi chi ha fatto solo il Checkpoint.
```

With:

```javascript
              Prima lavori recuperi caldi e Blueprint, poi alimenti ogni giorno la pipeline con 20 nuovi contatti mirati.
```

- [ ] **Step 9: Build frontend**

Run:

```powershell
cd frontend; npm run build
```

Expected: build completes. Existing React hook warnings may appear; no new compile errors.

- [ ] **Step 10: Commit**

```powershell
git add frontend\src\ciak\admin\pages\AcquisizioneCommandCenter.jsx
git commit -m "feat: turn command center into Acquisition Evolution"
```

---

### Task 3: Admin Navigation and Department Room Alignment

**Files:**
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`
- Modify: `frontend/src/ciak/admin/departmentRooms.js`

**Interfaces:**
- Consumes: existing `NAV` structure and `getDepartmentRoom`.
- Produces: acquisition macro and room copy aligned with Acquisizione Evolution.

- [ ] **Step 1: Update acquisition page descriptions in `CiakAdminApp.jsx`**

In the `NAV` macro with `id: "acquisizione"`, replace these page objects:

```javascript
      { to: "/admin/lead-manager", label: "New Lead", desc: "Inserisci e lavora i nuovi contatti in entrata" },
      { to: "/admin/lista-fredda", label: "Lista Fredda", desc: "Database freddo da riscaldare con l'outreach" },
      { to: "/admin/pipeline", label: "Pipeline", desc: "Funnel masterclass → €27: numeri (Panoramica) e contatti in un'unica vista" },
      { to: "/admin/acq-campagne-ads", label: "Campagne Ads", desc: "Campagne pubblicitarie di acquisizione" },
      { to: "/admin/acq-calendario", label: "Calendario Editoriale", desc: "Piano contenuti organici per attrarre lead" },
```

With:

```javascript
      { to: "/admin/lead-manager", label: "New Lead", desc: "20 contatti mirati al giorno per alimentare Acquisizione Evolution" },
      { to: "/admin/lista-fredda", label: "Lista Fredda", desc: "Archivio congelato: niente email massive, solo audience e analisi" },
      { to: "/admin/pipeline", label: "Acquisizione Evolution", desc: "Progetto pilota madre: Blueprint, call, recuperi e target 3/4" },
      { to: "/admin/acq-campagne-ads", label: "Campagne Ads", desc: "Acceleratore da usare dopo la validazione organica/manuale" },
      { to: "/admin/acq-calendario", label: "Calendario Editoriale", desc: "Contenuti Claudio per generare conversazioni e Blueprint" },
```

- [ ] **Step 2: Update visible admin focus copy**

Find:

```javascript
              Funnel, vendite, delivery, materiali e post-lancio in un'unica regia.
```

Replace with:

```javascript
              Acquisizione, vendite, delivery, materiali e post-lancio in un'unica regia.
```

- [ ] **Step 3: Inspect acquisition room object**

Run:

```powershell
Select-String -Path frontend\src\ciak\admin\departmentRooms.js -Pattern 'id: "acquisizione"|Andrea|Recupera lead caldi|contenuto del giorno' -Context 4,12
```

Expected: output shows the acquisition room copy and priorities.

- [ ] **Step 4: Replace acquisition room priorities**

In `frontend/src/ciak/admin/departmentRooms.js`, for the acquisition room, set:

```javascript
    priorities: [
      "20 nuovi contatti mirati",
      "Recuperi Blueprint e call",
      "Contenuto Claudio con CTA Ciak",
    ],
```

- [ ] **Step 5: Replace acquisition room prompt examples**

Set the acquisition room `prompts` array to:

```javascript
    prompts: [
      {
        label: "Priorita' del giorno",
        prompt: "Luca, dimmi quali contatti lavorare oggi per Acquisizione Evolution.",
      },
      {
        label: "Recuperi caldi",
        prompt: "Luca, trova chi ha cliccato checkout, completato le 8 Domande o acquistato Blueprint senza call.",
      },
      {
        label: "Contenuto acquisizione",
        prompt: "Andrea, prepara un contenuto Claudio che porti professionisti reali verso Ciak Blueprint.",
      },
    ],
```

- [ ] **Step 6: Build frontend**

Run:

```powershell
cd frontend; npm run build
```

Expected: build completes with no compile errors.

- [ ] **Step 7: Commit**

```powershell
git add frontend\src\ciak\admin\CiakAdminApp.jsx frontend\src\ciak\admin\departmentRooms.js
git commit -m "copy: align admin acquisition room"
```

---

### Task 4: Outreach Asset Riallineato

**Files:**
- Modify: `docs/marketing/messaggi-outreach-pronti.md`

**Interfaces:**
- Consumes: Claudio voice style and Acquisizione Evolution spec.
- Produces: copy ready for Claudio/Luca using Metodo EVO, Ciak Blueprint, 3/4 settimane, 12 mesi and no cold-email reactivation.

- [ ] **Step 1: Replace intro note**

Replace:

```markdown
Tutti derivati dal messaggio canonico in `claudio_voice_style.md`.
Sostituire `{nome}`. CTA unica: `www.ciak.io`. Niente emoji, niente CAPS.
```

With:

```markdown
Tutti derivati dal messaggio canonico in `claudio_voice_style.md` e riallineati ad Acquisizione Evolution.
Sostituire `{nome}`. CTA primaria: `www.ciak.io`. Niente emoji, niente CAPS.

Regola: questi messaggi servono per outreach manuale assistito da AI. Non usare la lista fredda 13k per email massive o drip automatici.
```

- [ ] **Step 2: Replace LinkedIn connection note**

Use:

````markdown
```
Ciao {nome}, ti scrivo direttamente perché cerco professionisti con
competenze reali e ho notato il tuo profilo. Sto lavorando al Metodo EVO:
porta online un'Accademia Digitale in 3/4 settimane e la ottimizza per 12
mesi. Vorrei mandarti una cosa utile, niente vendita. Claudio
```
````

- [ ] **Step 3: Replace LinkedIn first message**

Use:

````markdown
```
Ciao {nome},

ti scrivo direttamente perché sto cercando professionisti con competenze
reali e ho notato il tuo profilo.

Sono Claudio Bertogliatti: 22 anni nella vendita, oltre 25.000 trattative
e piu' di 6 milioni di euro generati.

Con Evolution/Ciak oggi lavoro su una cosa precisa: trasformare competenze
professionali vere in Accademie Digitali vendibili, senza lasciare il
professionista da solo davanti a piattaforme, funnel e corsi generici.

Non e' una piattaforma corsi. Non e' un funnel builder. Non e' un'agenzia
marketing. E' il Metodo EVO: in 3/4 settimane costruiamo gli asset
essenziali e portiamo online il sistema; poi per 12 mesi leggiamo i dati,
correggiamo e puntiamo ai primi risultati di vendita.

Il primo passo e' capire se la direzione ha senso. Qui trovi Ciak e il
Blueprint: www.ciak.io

Se non e' il momento, nessun problema.

Claudio
```
````

- [ ] **Step 4: Replace WhatsApp warm message**

Use:

````markdown
```
Ciao {nome}, ti scrivo io di persona.

Sto cercando professionisti con competenze vere e ho pensato a te.

Con Evolution/Ciak stiamo portando online accademie digitali professionali
con il Metodo EVO: prima capiamo direzione, mercato e offerta; poi in 3/4
settimane costruiamo gli asset essenziali; poi ottimizziamo per 12 mesi.

Non e' un corso per creare corsi e non e' un'agenzia marketing. E' un
sistema operativo guidato.

Ti lascio Ciak qui: www.ciak.io

Se non fa per te nessun problema, ci tenevo solo a girartelo.
```
````

- [ ] **Step 5: Replace referral message**

Use:

````markdown
```
Ciao {nome}, una domanda veloce.

Sto costruendo Acquisizione Evolution, il progetto pilota con cui
applichiamo su di noi il Metodo EVO prima di duplicarlo sui partner.

Conosci 1-2 professionisti con una competenza vera che potrebbero
trasformarla in un'Accademia Digitale, ma oggi sono fermi tra contenuti,
funnel, piattaforme e poca chiarezza commerciale?

Se si', mi basta il contatto o una presentazione semplice. Ci penso io,
senza nessun impegno per loro.

Grazie, Claudio
```
````

- [ ] **Step 6: Replace email cold note**

Use:

````markdown
## 5. Email cold — nota operativa

Le 9 email cold in `email-cold-outreach-ciak.md` restano archivio storico.
Non riattivare il job `daily-systeme-import` e non usare la lista fredda
13k per sequenze email massive.

Uso ammesso della lista fredda:
- custom audience Meta;
- analisi segmenti;
- studio del mercato.
```
````

- [ ] **Step 7: Add Luca daily block before Silvia follow-up**

Insert before `## 6. Follow-up Silvia Arcari`:

````markdown
## 6. Routine Luca — messaggio di report serale

```
Report Acquisizione Evolution — oggi

Nuovi contatti lavorati: X/20
Risposte ricevute: X
Conversazioni qualificate: X
8 Domande completate: X
Blueprint acquistati: X
Call fissate: X

Priorita' domani:
1. ...
2. ...
3. ...

Blocco principale:
...
```
````

Then rename `## 6. Follow-up Silvia Arcari` to:

```markdown
## 7. Follow-up Silvia Arcari (unico inbound vero)
```

- [ ] **Step 8: Markdown sanity check**

Run:

```powershell
Select-String -Path docs\marketing\messaggi-outreach-pronti.md -Pattern 'lista fredda 13k|Metodo EVO|Acquisizione Evolution|Motore Vendite Partner|www.ciak.io'
```

Expected: output includes the new positioning and the operational ban on email massive.

- [ ] **Step 9: Commit**

```powershell
git add docs\marketing\messaggi-outreach-pronti.md
git commit -m "copy: align outreach with Acquisition Evolution"
```

---

### Task 5: Final Verification and Push

**Files:**
- Verify only.

**Interfaces:**
- Consumes: commits from Tasks 1-4.
- Produces: pushed `main` with Acquisizione Evolution first release.

- [ ] **Step 1: Check git status**

Run:

```powershell
git status --short --branch
```

Expected: branch is `main`; no unexpected modified files except `AGENTS.md` untracked if present locally.

- [ ] **Step 2: Run backend syntax check**

Run:

```powershell
python -m py_compile backend\routers\ciak_admin.py
```

Expected: exits with code 0 and no output.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd frontend; npm run build
```

Expected: build completes. Existing React hook warnings may appear; no new compile errors.

- [ ] **Step 4: Review final diff**

Run:

```powershell
git log --oneline -5
git status --short --branch
```

Expected: latest commits correspond to Tasks 1-4; only `AGENTS.md` may remain untracked.

- [ ] **Step 5: Push**

Run:

```powershell
git push origin main
```

Expected: push succeeds and `main` on GitHub contains the first Acquisizione Evolution release.
