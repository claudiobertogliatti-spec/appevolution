# Systeme Discovery Sales Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare il sistema scraping/Discovery di Ciak al Motore Vendite Evolution e preparare lo stesso schema per il Motore Vendite Partner.

**Architecture:** Ciak resta il cervello di acquisizione: scopre lead, li qualifica, li mette in priorita' e decide se accodarli. Systeme resta il motore commerciale/statistico: riceve solo lead ammessi dalla policy, li tagga, li misura e attiva workflow brevi. Il primo rilascio evolve i punti gia' esistenti: `discovery_leads`, `systeme_daily_queue`, `daily_systeme_import`, Command Center Acquisizione e Lead Manager.

**Tech Stack:** FastAPI routers in `backend/routers`, Celery in `backend/celery_tasks.py`, MongoDB collections `discovery_leads` e `systeme_daily_queue`, React CRA in `frontend/src/ciak/admin`, pytest backend.

## Global Constraints

- `www.ciak.io` e' la piattaforma applicativa completa; non usare `app.evolution-pro.it`.
- Systeme Evolution acquisisce partner Metodo EVO; Systeme partner vende l'accademia/prodotto del partner.
- Ciak Discovery e' il primo stadio per i lead nuovi; Systeme e' il secondo stadio commerciale/statistico.
- `google_places` e' source ammessa nella coda Systeme.
- `lista_fredda` resta esclusa da import Systeme salvo flag esplicito `ALLOW_LISTA_FREDDA_SYSTEME_IMPORT=true`.
- Niente email massive, drip o sequenze cold non personalizzate sulla lista fredda 13k.
- Non modificare il system prompt di Matteo.
- Tono: diretto, italiano semplice, anti-fuffa, frasi brevi.

---

## File Structure

- Modify: `backend/routers/ciak_admin.py`
  - Responsabilita': arricchire `/api/admin/ciak/acquisizione-command-center` con metriche Discovery + Systeme queue.
- Modify: `backend/celery_tasks.py`
  - Responsabilita': applicare tag Evolution piu' espliciti su import giornaliero da `google_places`, senza abilitare `lista_fredda`.
- Modify: `backend/routers/discovery_engine.py`
  - Responsabilita': salvare metadata operativi utili quando un lead viene accodato a Systeme.
- Modify: `frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx`
  - Responsabilita': mostrare il ponte Discovery -> Systeme e priorita' Luca.
- Modify: `frontend/src/ciak/admin/pages/LeadManager.jsx`
  - Responsabilita': chiarire che "Approva" non vuol dire inviare email massive, ma promuovere il lead nel Motore Vendite Evolution.
- Test: `backend/tests/test_acquisition_policy.py`
  - Responsabilita': bloccare regressioni su source ammesse/escluse e tag mapping.
- Create: `docs/marketing/systeme-motore-vendite-setup.md`
  - Responsabilita': checklist manuale per tag, custom field e workflow minimi in Systeme Evolution e account partner.

---

### Task 1: Backend Discovery Metrics nel Command Center

**Files:**
- Modify: `backend/routers/ciak_admin.py`

**Interfaces:**
- Consumes: MongoDB collections `discovery_leads`, `systeme_daily_queue`, `celery_job_logs`.
- Produces: in `GET /api/admin/ciak/acquisizione-command-center` il campo:

```python
"discovery_engine": {
    "new_leads_total": int,
    "hot_leads_total": int,
    "google_places_total": int,
    "queued_systeme_pending": int,
    "queued_systeme_imported": int,
    "queued_systeme_failed": int,
    "lista_fredda_pending_blocked": int,
    "last_import": dict | None,
}
```

- [ ] **Step 1: Add a failing unit-style contract test**

Append this test to `backend/tests/test_acquisition_policy.py`:

```python
def test_discovery_engine_contract_documents_allowed_sources():
    allowed = acquisition_policy.get_allowed_systeme_sources({})
    assert allowed == ["google_places"]
    assert "lista_fredda" not in allowed
```

- [ ] **Step 2: Run the targeted test**

Run:

```powershell
cd backend; python -m pytest tests/test_acquisition_policy.py -q
```

Expected: PASS. This confirms the policy baseline before touching the command center.

- [ ] **Step 3: Add helper counts inside `acquisizione_command_center`**

In `backend/routers/ciak_admin.py`, inside `acquisizione_command_center`, after the target constants, add:

```python
    discovery_total = await db.discovery_leads.count_documents({})
    discovery_hot = await db.discovery_leads.count_documents({"score_total": {"$gte": 75}})
    discovery_google_places = await db.discovery_leads.count_documents({"source": "google_places"})
    queue_pending = await db.systeme_daily_queue.count_documents({"status": "pending", "source": {"$ne": "lista_fredda"}})
    queue_imported = await db.systeme_daily_queue.count_documents({"status": "imported"})
    queue_failed = await db.systeme_daily_queue.count_documents({"status": "failed"})
    lista_fredda_pending_blocked = await db.systeme_daily_queue.count_documents({"status": "pending", "source": "lista_fredda"})
    last_systeme_import = await db.celery_job_logs.find_one(
        {"job": "daily_systeme_import"},
        {"_id": 0},
        sort=[("executed_at", -1)],
    )
```

- [ ] **Step 4: Add the payload to the return object**

In the endpoint return dict, add:

```python
        "discovery_engine": {
            "new_leads_total": discovery_total,
            "hot_leads_total": discovery_hot,
            "google_places_total": discovery_google_places,
            "queued_systeme_pending": queue_pending,
            "queued_systeme_imported": queue_imported,
            "queued_systeme_failed": queue_failed,
            "lista_fredda_pending_blocked": lista_fredda_pending_blocked,
            "last_import": last_systeme_import,
        },
```

- [ ] **Step 5: Run backend tests**

Run:

```powershell
cd backend; python -m pytest tests/test_acquisition_policy.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/routers/ciak_admin.py backend/tests/test_acquisition_policy.py
git commit -m "feat: expose discovery acquisition metrics"
```

---

### Task 2: Tag Mapping Evolution per Systeme Daily Import

**Files:**
- Modify: `backend/celery_tasks.py`
- Test: `backend/tests/test_acquisition_policy.py`

**Interfaces:**
- Consumes: `systeme_daily_queue.source`.
- Produces: tag Systeme espliciti per Evolution:
  - `google_places -> EVO_DISCOVERY_GOOGLE_PLACES`
  - fallback -> `EVO_DISCOVERY_OTHER`
  - `lista_fredda -> EVO_LISTA_FREDDA_META` only when feature flag is enabled.

- [ ] **Step 1: Add policy helper test**

Append to `backend/tests/test_acquisition_policy.py`:

```python
def test_systeme_daily_queue_match_excludes_lista_fredda_without_flag():
    match = acquisition_policy.get_systeme_daily_queue_match({})
    assert match == {"status": "pending", "source": {"$ne": "lista_fredda"}}
```

- [ ] **Step 2: Update tag names in `daily_systeme_import`**

In `backend/celery_tasks.py`, replace:

```python
            TAG_NAMES_BY_SOURCE = {
                "google_places": "ciak_cold_outreach_places",
                "lista_fredda":  "ciak_cold_outreach_legacy",
            }
            DEFAULT_TAG_NAME = "ciak_cold_outreach_other"
```

with:

```python
            TAG_NAMES_BY_SOURCE = {
                "google_places": "EVO_DISCOVERY_GOOGLE_PLACES",
                "lista_fredda":  "EVO_LISTA_FREDDA_META",
            }
            DEFAULT_TAG_NAME = "EVO_DISCOVERY_OTHER"
```

- [ ] **Step 3: Update the adjacent comments**

Replace the comment above `TAG_NAMES_BY_SOURCE` with:

```python
            # Tag Evolution per il Motore Vendite Evolution.
            # google_places e' ammesso dalla policy; lista_fredda resta esclusa
            # salvo flag esplicito ALLOW_LISTA_FREDDA_SYSTEME_IMPORT=true.
```

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
cd backend; python -m pytest tests/test_acquisition_policy.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/celery_tasks.py backend/tests/test_acquisition_policy.py
git commit -m "fix: align Systeme import tags with Evolution engine"
```

---

### Task 3: Discovery Queue Metadata

**Files:**
- Modify: `backend/routers/discovery_engine.py`

**Interfaces:**
- Consumes: Google Places lead details in `_run_places_query`.
- Produces: richer `systeme_daily_queue` documents:

```python
"engine": "motore_vendite_evolution"
"priority": "hot" | "standard"
"score_total": int
"profession_category": str
"next_action": "systeme_import"
```

- [ ] **Step 1: Locate queue insert**

Run:

```powershell
Select-String -Path backend\routers\discovery_engine.py -Pattern "systeme_daily_queue.insert_one" -Context 4,24
```

Expected: output shows the insert performed when `email` exists.

- [ ] **Step 2: Add metadata to the inserted queue document**

Inside the `await db.systeme_daily_queue.insert_one({...})` dict, add:

```python
                        "engine": "motore_vendite_evolution",
                        "priority": "hot" if score >= 75 else "standard",
                        "score_total": score,
                        "profession_category": category_label,
                        "next_action": "systeme_import",
```

- [ ] **Step 3: Preserve existing queue behavior**

Do not change:

```python
                        "source": "google_places",
                        "status": "pending",
```

These fields are required by `daily_systeme_import`.

- [ ] **Step 4: Run syntax check**

Run:

```powershell
cd backend; python -m py_compile routers/discovery_engine.py
```

Expected: no output and exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add backend/routers/discovery_engine.py
git commit -m "feat: enrich discovery leads queued for Systeme"
```

---

### Task 4: Command Center Ponte Discovery -> Systeme

**Files:**
- Modify: `frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx`

**Interfaces:**
- Consumes: `data.discovery_engine` from Task 1.
- Produces: visual block showing:
  - lead scoperti;
  - HOT;
  - in coda Systeme;
  - importati;
  - falliti;
  - lista fredda bloccata.

- [ ] **Step 1: Add icon imports**

In the lucide import, add:

```javascript
  Database,
  Route,
```

- [ ] **Step 2: Read the payload**

After:

```javascript
  const partnerSalesEngine = data.partner_sales_engine || {};
```

add:

```javascript
  const discoveryEngine = data.discovery_engine || {};
```

- [ ] **Step 3: Insert the bridge block after the KPI grid**

After the first KPI grid, add:

```jsx
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Ponte operativo</p>
            <h2 className="text-xl font-semibold text-slate-900">Ciak Discovery → Systeme Evolution</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
          <KpiCard icon={Database} label="Scoperti" value={discoveryEngine.new_leads_total || 0} hint="Lead in discovery_leads." tone="slate" />
          <KpiCard icon={Flame} label="Hot" value={discoveryEngine.hot_leads_total || 0} hint="Score almeno 75." tone="yellow" />
          <KpiCard icon={MapPin} label="Google Places" value={discoveryEngine.google_places_total || 0} hint="Professionisti offline trovati." tone="green" />
          <KpiCard icon={ListChecks} label="Coda Systeme" value={discoveryEngine.queued_systeme_pending || 0} hint="Source ammesse, pronte import." tone="blue" />
          <KpiCard icon={CheckCircle2} label="Importati" value={discoveryEngine.queued_systeme_imported || 0} hint="Gia' entrati in Systeme." tone="green" />
          <KpiCard icon={AlertTriangle} label="Bloccati" value={discoveryEngine.lista_fredda_pending_blocked || 0} hint="Lista fredda esclusa da policy." tone="slate" />
        </div>
      </div>
```

- [ ] **Step 4: Add missing imports if needed**

If `Flame` or `MapPin` are not imported in this file, add them to the lucide import.

- [ ] **Step 5: Build frontend**

Run:

```powershell
cd frontend; npm run build
```

Expected: build succeeds. Existing eslint warnings are acceptable if unrelated.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/ciak/admin/pages/AcquisizioneCommandCenter.jsx
git commit -m "feat: show discovery to Systeme bridge"
```

---

### Task 5: Lead Manager Copy Safety

**Files:**
- Modify: `frontend/src/ciak/admin/pages/LeadManager.jsx`

**Interfaces:**
- Consumes: existing approval flow `/api/lista-fredda/approve-from-discovery/{lead_id}`.
- Produces: safer UI language that says approval promotes a lead to the Evolution engine, not to massive cold email.

- [ ] **Step 1: Change approve tooltip**

Replace:

```jsx
                        title="Approva → Lista Fredda"
```

with:

```jsx
                        title="Approva nel Motore Vendite Evolution"
```

- [ ] **Step 2: Change page subtitle**

Replace:

```jsx
      <p className="text-slate-500 mb-6">Discovery Leads — import, edit, filtri.</p>
```

with:

```jsx
      <p className="text-slate-500 mb-6">Discovery Leads — scraping, scoring e promozione controllata nel Motore Vendite Evolution.</p>
```

- [ ] **Step 3: Change Google Places helper text**

Replace:

```jsx
              <div className="text-[11px] text-slate-400">Tiene solo chi ha un sito → email reperibile per la Lista Fredda</div>
```

with:

```jsx
              <div className="text-[11px] text-slate-400">Tiene solo chi ha un sito: email reperibile per coda Systeme ammessa dalla policy</div>
```

- [ ] **Step 4: Build frontend**

Run:

```powershell
cd frontend; npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/ciak/admin/pages/LeadManager.jsx
git commit -m "copy: clarify discovery lead approval"
```

---

### Task 6: Setup Manuale Systeme Evolution e Partner

**Files:**
- Create: `docs/marketing/systeme-motore-vendite-setup.md`

**Interfaces:**
- Consumes: spec `docs/superpowers/specs/2026-07-09-systeme-motore-vendite-evolution-partner-design.md`.
- Produces: checklist operativa per Gaia/Luca.

- [ ] **Step 1: Create setup doc**

Create `docs/marketing/systeme-motore-vendite-setup.md` with:

```markdown
# Systeme.io - Setup Motore Vendite Evolution e Partner

## Regola Madre

Evolution usa il proprio account Systeme per acquisire partner Metodo EVO.

Ogni partner usa il proprio account Systeme per vendere la propria Accademia Digitale, videocorso o prodotto digitale.

Ciak governa, misura e ottimizza. Systeme esegue funnel, tag, email, checkout e statistiche.

## Motore Vendite Evolution

### Tag Da Creare

- EVO_DISCOVERY_GOOGLE_PLACES
- EVO_DISCOVERY_OTHER
- EVO_LISTA_FREDDA_META
- EVO_LISTA_WA_RELAZIONALE
- EVO_WA_CHAT_ATTIVA
- EVO_RUBRICA
- EVO_NOME_COMPLETO
- EVO_PRIORITY_0
- EVO_PRIORITY_1
- EVO_NO_EMAIL_COLD
- EVO_BLUEPRINT_INVITATO
- EVO_BLUEPRINT_VISITATO
- EVO_BLUEPRINT_ACQUISTATO
- EVO_CALL_PRENOTATA
- EVO_CALL_FATTA
- EVO_PROPOSTA_INVIATA
- EVO_CONTRATTO_FIRMATO
- EVO_NON_INTERESSATO

### Custom Field Da Creare

- evo_source
- evo_lista
- evo_priority
- evo_phone_norm
- evo_wa_status
- evo_import_batch
- evo_owner
- evo_last_touch
- evo_next_action
- evo_note_operativa
- utm_source
- utm_campaign
- utm_content

### Workflow Minimi

1. Nuovo interessato Blueprint.
2. Blueprint acquistato.
3. Blueprint acquistato ma call non prenotata.
4. Call prenotata.
5. Proposta inviata.
6. Contratto firmato.
7. Stop comunicazioni commerciali.

## Motore Vendite Partner

### Tag Standard

- PARTNER_LEAD_NUOVO
- PARTNER_LEAD_DA_LISTA
- PARTNER_LEAD_DA_META
- PARTNER_LEAD_DA_ORGANICO
- PARTNER_MASTERCLASS_ISCRITTO
- PARTNER_MASTERCLASS_VISTA
- PARTNER_DIAGNOSI_COMPLETATA
- PARTNER_CALL_PRENOTATA
- PARTNER_CALL_FATTA
- PARTNER_CHECKOUT_VISITATO
- PARTNER_ACQUISTO_CORSO
- PARTNER_UPSELL_VISITATO
- PARTNER_UPSELL_ACQUISTATO
- PARTNER_NON_INTERESSATO

### Custom Field Standard

- partner_id
- partner_source
- partner_lead_temperature
- partner_offer
- partner_campaign
- partner_phone_norm
- partner_owner
- partner_last_touch
- partner_next_action
- partner_note_operativa
- utm_source
- utm_campaign
- utm_content

## Cosa Non Fare

- Non usare la lista fredda per email massive.
- Non attivare sequenze cold non personalizzate.
- Non automatizzare WhatsApp in modo aggressivo.
- Non mettere i dati del partner nell'account Systeme Evolution.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/marketing/systeme-motore-vendite-setup.md
git commit -m "docs: add Systeme sales engine setup checklist"
```

---

### Task 7: Verification and Push

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: completed Tasks 1-6.
- Produces: pushed `main`.

- [ ] **Step 1: Run tests**

Run:

```powershell
cd backend; python -m pytest tests/test_acquisition_policy.py -q
cd ..\frontend; npm run build
```

Expected: backend tests pass and frontend build succeeds.

- [ ] **Step 2: Review diff**

Run:

```powershell
git diff --stat HEAD~6..HEAD
git log --oneline -6
```

Expected: six focused commits matching Tasks 1-6.

- [ ] **Step 3: Push**

Run:

```powershell
git push origin main
```

Expected: push succeeds.

---

## Self-Review

Spec coverage:

- Ciak Discovery as first stage: Task 1, Task 3, Task 4.
- Systeme as commercial/statistical second stage: Task 2, Task 4, Task 6.
- Lista fredda frozen: Task 1, Task 2, Task 5, Task 6.
- Evolution and Partner separation: Task 6.
- KPI visible in Ciak: Task 1 and Task 4.

No placeholders:

- No `TBD`, `TODO`, or "implement later" language is present.
- Each task has concrete files, commands, and expected output.

Type consistency:

- Backend payload uses `discovery_engine`.
- Frontend reads `data.discovery_engine`.
- Queue source remains `google_places`, required by `daily_systeme_import`.
