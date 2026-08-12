# Partner Step Materials Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il modal finto del Percorso con un archivio autenticato che mostra e scarica i materiali reali di ogni step, senza esporre Drive/GCS.

**Architecture:** Un servizio backend centralizza mappa categoria-step, normalizzazione e whitelist URL/dati. Un router espone stato aggregato, preview e download autenticati. Un visualizzatore React unico rende PDF, immagini, dati, video e link pubblici YouTube.

**Tech Stack:** FastAPI, MongoDB/Motor, HTTP streaming/proxy controllato, React 19, pytest.

## Global Constraints

- Nessun URL Drive/GCS nella risposta partner.
- Video consultabili ma non scaricabili; playlist letta dal record partner.
- Download per documenti e immagini tramite endpoint Ciak autenticati.
- Mostrare sempre l'avviso sul Workbook finale.

---

### Task 1: Dominio archivio e mappa storica

**Files:**
- Create: `backend/services/partner_step_materials.py`
- Test: `backend/tests/test_partner_step_materials.py`

**Interfaces:**
- Produces: `categories_for_step(step_id)`, `normalize_file_material(doc)`, `allowed_public_url(url)`, `safe_step_data(step_id, data)`.

- [ ] Test rossi per tutti gli step, URL Drive/GCS, YouTube, dati whitelist e versioni superseded.
- [ ] Implementare mappa canonica e normalizzatori puri.
- [ ] Eseguire test e commit.

### Task 2: Endpoint archivio, preview e download

**Files:**
- Create: `backend/routers/partner_step_materials.py`
- Modify: `backend/server.py`
- Test: `backend/tests/test_partner_step_materials_api.py`

**Interfaces:**
- Produces: `GET /api/partner-journey/operativo/step-materials/{partner_id}/{step_id}`, `GET /api/partner-step-materials/{file_id}/preview`, `GET /api/partner-step-materials/{file_id}/download`.

- [ ] Testare isolamento partner, stato vuoto, dati/DB files, playlist, inline/attachment e URL vietati.
- [ ] Implementare aggregazione per step usando `db.files`, journey, partner, masterclass e videocorso.
- [ ] Implementare proxy soltanto da riferimenti DB; mai da URL fornito dal client.
- [ ] Registrare router in server, verificare test e commit.

### Task 3: Nuovi output con step_id

**Files:**
- Modify: `backend/routers/brand_kit_approval.py`
- Modify: `backend/routers/storia_approval.py`
- Modify: `backend/routers/posizionamento_approval.py`
- Modify: `backend/routers/masterclass_factory.py`
- Modify: `backend/routers/workspace_corso.py`
- Test: `backend/tests/test_partner_step_material_writers.py`

- [ ] Testare che ogni writer salvi lo `step_id` canonico.
- [ ] Aggiungere `step_id` senza cambiare category o compatibilità storica.
- [ ] Verificare test e commit.

### Task 4: Visualizzatore Percorso

**Files:**
- Create: `frontend/src/ciak/partner/sections/StepMaterialsModal.jsx`
- Modify: `frontend/src/ciak/partner/sections/MetodoEvoPage.jsx`
- Test: `frontend/src/ciak/partner/sections/StepMaterialsModal.test.jsx`

- [ ] Testare loading, vuoto, errore/retry, PDF/image/data, YouTube e assenza link Drive/GCS.
- [ ] Sostituire il modal generico e rinominare il pulsante `Visualizza materiali`.
- [ ] Usare fetch autenticato per preview/download e layout responsive.
- [ ] Mostrare avviso Workbook e azione modifica separata.
- [ ] Verificare test/build e commit.

### Task 5: Gate integrato e live

- [ ] Eseguire suite mirate, py_compile, build frontend, secret scan e `git diff --check`.
- [ ] Verificare endpoint anonimo 401 e isolamento con test autenticati.
- [ ] Aggiornare HANDOFF con comandi/output.
- [ ] Integrare su main, monitorare CI/Cloud Run e verificare bundle live su `www.ciak.io`.
