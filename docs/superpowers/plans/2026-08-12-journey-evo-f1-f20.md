# Journey EVO F-1–F-20 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere F-1…F-20 l'unico journey operativo di Ciak, con tre macro-fasi, documenti protetti, gate video e lancio verificabili, certificato e Workbook versionati.

**Architecture:** `backend/models/partner_journey_step.py` espone la definizione canonica consumata da API e frontend. Le transizioni passano da policy pure e testabili; le attività con effetti esterni (lancio, render, storage) usano servizi idempotenti e record di audit. La migrazione conserva i record storici e aggiunge soltanto i nuovi gate con dry-run obbligatorio.

**Tech Stack:** Python 3.11, FastAPI, Motor/MongoDB, React/CRA, pytest, Jest/React Testing Library, Cloud Run, Celery, Vercel.

## Global Constraints

- Ordine obbligatorio: sicurezza documenti → journey 20 step → gate video → readiness/lancio → certificato/Workbook.
- Macro-fasi esatte: Esamina F-1–F-7, Valida F-8–F-19, Ottimizza F-20.
- `partner_journey_steps` è la fonte di verità; `partners.phase` resta derivato.
- Nessuna perdita o sovrascrittura di dati, date, stati o materiali storici.
- Nessun admin può impersonare l'approvazione video del partner.
- Ogni produzione documentale è versionata e idempotente.
- Vietati `git add .` e commit di credenziali.

---

### Task 1: Chiudere l'accesso anonimo ai documenti partner

**Files:**
- Modify: `backend/routers/partner_rewards.py`
- Modify: `frontend/src/ciak/partner/rewards/ProjectBookCard.jsx`
- Modify: `frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx`
- Modify: `frontend/src/ciak/partner/sections/PartnerFilesPage.jsx`
- Create: `backend/tests/test_partner_rewards_auth.py`
- Create: `frontend/src/ciak/partner/rewards/ProjectBookCard.test.jsx`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `require_partner_or_admin_for_partner(partner_id, credentials)` e `authHeaders()`.
- Produces: tutti gli endpoint rewards autenticati; helper frontend `downloadProtectedDocument(url, filename)`.

- [ ] **Step 1: scrivere i test RED backend** per anonimo 401, partner estraneo 403, proprietario 200 e admin 200 su `/state`, `/project-book`, `/certificate/{phase}`, `/bonus/{phase}`.
- [ ] **Step 2: eseguire** `pytest -q backend/tests/test_partner_rewards_auth.py` e verificare che i casi anonimi/ownership falliscano per l'assenza delle guardie.
- [ ] **Step 3: aggiungere `HTTPBearer(auto_error=False)` e `Depends(security)`** a ogni route; chiamare la guardia prima di caricare dati o generare PDF.
- [ ] **Step 4: rieseguire il test backend** e ottenere tutti i casi verdi.
- [ ] **Step 5: scrivere il test RED frontend** che dimostra che la dispensa viene scaricata con header Bearer e Blob, non con un link nudo.
- [ ] **Step 6: implementare il download autenticato** in una utility condivisa e usarla nelle tre superfici.
- [ ] **Step 7: eseguire Jest mirato e build**; aggiungere il test backend alla lista esplicita della CI.
- [ ] **Step 8: commit** con soli file Task 1: `fix(security): protect partner rewards documents`.

---

### Task 2: Definire F-1…F-20 e la migrazione conservativa

**Files:**
- Modify: `backend/models/partner_journey_step.py`
- Create: `backend/services/journey_f20_migration.py`
- Create: `backend/scripts/migrate_journey_f20.py`
- Modify: `backend/routers/partner_journey.py`
- Modify: `backend/tests/test_protocollo_evo_valida.py`
- Create: `backend/tests/test_journey_f20_migration.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `JOURNEY_STEPS_DEFINITION` con campi `code`, `owner`, `completion_policy`, `material_categories`; `migrate_partner_to_f20(db, partner_id, *, dry_run=True) -> MigrationReport`.

- [ ] **Step 1: estendere i test RED del modello**: 20 record, codici esatti F-1…F-20, codici/ID unici, tre macro-fasi e intervalli approvati.
- [ ] **Step 2: eseguire i test modello** e osservare il fallimento 15 ≠ 20.
- [ ] **Step 3: aggiornare la definizione canonica** aggiungendo F-16, F-18, F-19, F-20 e i metadati a tutti gli step.
- [ ] **Step 4: rendere verdi i test del modello** senza ancora modificare dati reali.
- [ ] **Step 5: scrivere test RED migrazione** per dry-run senza scritture, conservazione campi storici, creazione dei quattro step, secondo run idempotente e partner LIVE non promosso falsamente a F-20.
- [ ] **Step 6: implementare la migrazione** usando update mirati e `$setOnInsert`; restituire conteggi e blocchi.
- [ ] **Step 7: aggiungere CLI** con `--partner-id`, `--all`, `--apply`, default dry-run e output JSON; vietare `--all --apply` senza flag esplicito `--confirm-all`.
- [ ] **Step 8: aggiornare seed/auto-heal e proiezione legacy** per usare i 20 metadati senza resettare partner esistenti.
- [ ] **Step 9: eseguire test modello+migrazione e `py_compile`**; aggiungerli alla CI.
- [ ] **Step 10: commit**: `feat(journey): define canonical F-1 to F-20 model`.

---

### Task 3: Allineare Home, demo, Percorso e avanzamento alle tre macro-fasi

**Files:**
- Create: `frontend/src/ciak/partner/operativo/journeyPresentation.js`
- Modify: `frontend/src/ciak/partner/operativo/GuidedHome.jsx`
- Modify: `frontend/src/ciak/pages/CiakPartnerDashboardDemo.jsx`
- Modify: `frontend/src/ciak/partner/sections/MetodoEvoPage.jsx`
- Modify: `frontend/src/ciak/partner/operativo/JourneyMap.jsx`
- Modify: `frontend/src/ciak/partner/operativo/ProgressBar.jsx`
- Create: `frontend/src/ciak/partner/operativo/journeyPresentation.test.js`
- Create: `frontend/src/ciak/partner/sections/MetodoEvoPage.test.jsx`

**Interfaces:**
- Consumes: API state con `steps[].code`, `macro_phase`, `owner`, `label`.
- Produces: `groupJourneySteps(steps)` e `activeAgentForStep(step)` senza copie dell'ordine canonico.

- [ ] **Step 1: scrivere test RED** che richiedono tre sole macro-fasi, nessuna “Fase 4”, 20 card ordinate e agente dinamico dentro Valida.
- [ ] **Step 2: eseguire Jest mirato** e osservare quattro fasi/14 card.
- [ ] **Step 3: creare gli helper presentazionali** basati esclusivamente sui dati API.
- [ ] **Step 4: rimuovere gli array canonici hard-coded** da Home/Percorso; mantenere soltanto copy e fallback non numerici.
- [ ] **Step 5: allineare la demo** a un fixture di 20 step che usa gli stessi helper.
- [ ] **Step 6: rendere verdi i test e costruire il frontend**.
- [ ] **Step 7: commit**: `feat(partner): show three EVO phases and F-1 to F-20`.

---

### Task 4: Centralizzare le completion policy degli step

**Files:**
- Create: `backend/services/journey_completion.py`
- Modify: `backend/routers/partner_journey.py`
- Create: `backend/tests/test_journey_completion.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `evaluate_step_completion(step_id, context) -> CompletionResult(ok, code, message, evidence)`; `complete_step_if_ready(...)`.
- Consumes: definizione `completion_policy` del Task 2.

- [ ] **Step 1: scrivere test RED** che dimostrano che un payload arbitrario non può chiudere uno step con policy e che gli step dichiarativi ammessi continuano a funzionare.
- [ ] **Step 2: eseguire il test e osservare che `_complete_operativo_step_unchecked` chiude tutto**.
- [ ] **Step 3: implementare registry di policy** e risultato strutturato; nessun accesso DB dentro le policy pure.
- [ ] **Step 4: integrare la valutazione prima della scrittura `done`**; restituire HTTP 409 con codice e messaggio partner-safe quando non pronto.
- [ ] **Step 5: rendere verdi i test e verificare le regressioni journey esistenti**.
- [ ] **Step 6: commit**: `feat(journey): enforce step completion policies`.

---

### Task 5: Bloccare F-11 fino all'approvazione della masterclass definitiva

**Files:**
- Modify: `backend/services/journey_completion.py`
- Modify: `backend/routers/partner_journey.py`
- Modify: `frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.jsx`
- Modify: `frontend/src/ciak/partner/operativo/Workspace1Masterclass.jsx`
- Create: `backend/tests/test_journey_video_gates.py`
- Create: `frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.test.jsx`

**Interfaces:**
- Produces policy `masterclass_current_version_approved`.
- Evidence: pipeline finale, URL/output, `approved_version == output_version`, approvatore partner, nessuna revisione aperta.

- [ ] **Step 1: scrivere test RED backend** per grezzo caricato, pipeline in corso, versione vecchia approvata, revisione pendente e versione corrente approvata.
- [ ] **Step 2: osservare RED** perché oggi `video_submitted` basta.
- [ ] **Step 3: implementare il resolver del contesto masterclass** e la policy pura.
- [ ] **Step 4: scrivere test RED frontend**: il CTA upload non completa F-11 e mostra lo stato di revisione.
- [ ] **Step 5: aggiornare UI**: upload salva bozza; solo l'OK partner sulla versione corrente richiede il completamento.
- [ ] **Step 6: rendere verdi backend/frontend**.
- [ ] **Step 7: commit**: `feat(video): gate F-11 on partner approval`.

---

### Task 6: Bloccare F-12 finché tutte le lezioni previste sono approvate

**Files:**
- Modify: `backend/services/journey_completion.py`
- Modify: `backend/routers/workspace_corso.py`
- Modify: `frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.jsx`
- Modify: `frontend/src/ciak/partner/operativo/Workspace2Corso.jsx`
- Modify: `backend/tests/test_journey_video_gates.py`
- Create: `frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.test.jsx`

**Interfaces:**
- Produces policy `all_required_lessons_current_version_approved` e `required_lesson_ids_from_outline(outline)`.

- [ ] **Step 1: aggiungere test RED** per lezione mancante, output in processing, versione vecchia, revisione aperta, tutte approvate e lezione extra.
- [ ] **Step 2: osservare RED** perché oggi un singolo upload basta.
- [ ] **Step 3: introdurre ID stabili nell'outline** e resolver di compatibilità per outline storici.
- [ ] **Step 4: implementare policy F-12** e riapertura quando cambia l'insieme richiesto.
- [ ] **Step 5: aggiornare UI** con contatore `approvate/previste`; il bottone completa solo a gate verde.
- [ ] **Step 6: rendere verdi i test e commit**: `feat(video): require every lesson approval for F-12`.

---

### Task 7: Verificare F-13 con evidenze reali del sistema di vendita

**Files:**
- Create: `backend/services/sales_system_readiness.py`
- Modify: `backend/services/journey_completion.py`
- Create: `backend/routers/partner_readiness.py`
- Modify: `backend/server.py`
- Modify: `frontend/src/ciak/partner/operativo/steps/Step10SistemaVendita.jsx`
- Create: `backend/tests/test_sales_system_readiness.py`
- Create: `frontend/src/ciak/partner/operativo/steps/Step10SistemaVendita.test.jsx`

**Interfaces:**
- Produces: `evaluate_sales_system(ctx) -> ReadinessReport`; GET `/api/partner-journey/readiness/{partner_id}/sales-system`.

- [ ] **Step 1: scrivere test RED** per ognuno dei sette controlli e per checkbox senza evidenze.
- [ ] **Step 2: osservare RED** sul comportamento autocertificato.
- [ ] **Step 3: implementare i controlli** su partner, funnel, hub, legal, checkout, prezzo e automazioni, con evidenza redatta.
- [ ] **Step 4: collegare F-13 alla policy** e proteggere il nuovo endpoint partner-or-admin.
- [ ] **Step 5: aggiornare UI** a checklist letta dal backend, mantenendo la conferma del partner separata.
- [ ] **Step 6: rendere verdi test/build e commit**: `feat(launch): verify F-13 sales readiness`.

---

### Task 8: Implementare F-16 e il lancio canonico F-17

**Files:**
- Create: `backend/services/partner_launch.py`
- Modify: `backend/services/journey_completion.py`
- Modify: `backend/routers/partner_readiness.py`
- Modify: `frontend/src/ciak/partner/operativo/steps/Step13Lancio.jsx`
- Create: `backend/tests/test_partner_launch_readiness.py`
- Create: `backend/tests/test_partner_launch_activation.py`
- Create: `frontend/src/ciak/partner/operativo/steps/Step13Lancio.test.jsx`

**Interfaces:**
- Produces: `evaluate_launch_readiness(ctx)`, `activate_partner_launch(db, partner_id, actor, http_probe) -> LaunchResult`; POST `/readiness/{partner_id}/activate-launch`.

- [ ] **Step 1: scrivere test RED F-16** per video, F-13, calendario, prezzo/webinar, data e checklist mancanti.
- [ ] **Step 2: implementare aggregatore F-16** e salvataggio dello snapshot di evidenze.
- [ ] **Step 3: scrivere test RED F-17** per readiness rossa, URL non raggiungibile, doppio submit e successo singolo auditato.
- [ ] **Step 4: implementare claim atomico e attivazione idempotente**; completare F-17 solo dopo probe HTTP positivo.
- [ ] **Step 5: sostituire il completamento diretto della UI** con visualizzazione report + chiamata di attivazione.
- [ ] **Step 6: rendere verdi test/build e commit**: `feat(launch): add verified F-16 and canonical F-17`.

---

### Task 9: Generare e versionare F-18 Certificato Valida

**Files:**
- Create: `backend/services/partner_document_versions.py`
- Modify: `backend/services/certificati_pdf_renderer.py`
- Modify: `backend/routers/partner_rewards.py`
- Modify: `backend/routers/partner_step_materials.py`
- Create: `backend/tests/test_partner_document_versions.py`
- Create: `backend/tests/test_valida_certificate_generation.py`

**Interfaces:**
- Produces: `generate_versioned_document(db, partner_id, kind, source_version, render, store) -> DocumentVersion`; policy `valida_certificate_archived`.

- [ ] **Step 1: scrivere test RED** per render fallito, storage fallito, retry idempotente, checksum/versione e registrazione materiale.
- [ ] **Step 2: implementare claim e record versionato** senza sovrascrittura.
- [ ] **Step 3: collegare il certificato Valida al servizio** e mantenere gli endpoint storici come alias autenticati.
- [ ] **Step 4: completare F-18 solo a documento verificato**; fallimento registra errore recuperabile.
- [ ] **Step 5: rendere verdi i test e commit**: `feat(documents): archive versioned F-18 certificate`.

---

### Task 10: Generare F-19 Workbook finale e aprire F-20

**Files:**
- Modify: `backend/services/partner_document_versions.py`
- Modify: `backend/services/project_book_html.py`
- Modify: `backend/routers/partner_rewards.py`
- Modify: `backend/services/journey_completion.py`
- Modify: `frontend/src/ciak/partner/rewards/ProjectBookCard.jsx`
- Modify: `frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx`
- Create: `backend/tests/test_final_workbook_generation.py`
- Create: `backend/tests/test_f20_unlock.py`

**Interfaces:**
- Produces: Workbook snapshot versionato e policy `final_workbook_archived`; `unlock_f20_if_ready(partner_id)`.

- [ ] **Step 1: scrivere test RED** per PDF vuoto, render/storage fallito, versione successiva, indice F-1…F-20 e F-20 non ancora ottenuto.
- [ ] **Step 2: implementare snapshot/versioning F-19** e registrazione nei materiali.
- [ ] **Step 3: scrivere test RED sblocco**: F-17 senza F-18/F-19 non apre F-20; tutti e tre done aprono una sola volta.
- [ ] **Step 4: implementare lo sblocco atomico F-20** e l'agente Marco/Ottimizza.
- [ ] **Step 5: aggiornare UI documenti** per mostrare ultima versione e storico autorizzato.
- [ ] **Step 6: rendere verdi test/build e commit**: `feat(documents): finalize F-19 workbook and unlock F-20`.

---

### Task 11: Migrazione controllata, regressione e deploy

**Files:**
- Modify: `docs/agents/HANDOFF.md`
- Create: `docs/migration/journey-f20-release.md`
- Modify only if required by tests: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: CLI migrazione Task 2 e tutti i gate precedenti.
- Produces: report dry-run/apply, prove CI/deploy/smoke e rollback operativo non distruttivo.

- [ ] **Step 1: fetch e integrare `origin/main` senza sovrascrivere lavoro concorrente**; rieseguire test mirati.
- [ ] **Step 2: eseguire suite backend CI completa**, flake8 E9/F821, compileall e `git diff --check`.
- [ ] **Step 3: eseguire Jest mirati e build production frontend**.
- [ ] **Step 4: eseguire migrazione dry-run su tutti i partner** e archiviare conteggi/blocchi senza dati sensibili.
- [ ] **Step 5: revisionare i casi bloccati**; applicare la migrazione solo dopo dry-run senza perdita dati.
- [ ] **Step 6: rieseguire dry-run** e ottenere `unchanged`/nessuna scrittura residua.
- [ ] **Step 7: commit esplicito e push `main`**, attendere CI e deploy backend/worker sul medesimo SHA.
- [ ] **Step 8: verificare Vercel production e bundle live**: tre fasi, F-1…F-20, assenza “Fase 4”.
- [ ] **Step 9: smoke live anonimo**: tutti i rewards 401; smoke autenticato su partner test autorizzato per ownership e journey.
- [ ] **Step 10: verificare Cloud Run revision/traffico, `/api/health`, OpenAPI e coda errori**.
- [ ] **Step 11: aggiornare HANDOFF e memoria solo con prove**, poi commit/push documentale e CI finale.

## Verification Gate Finale

- Backend: nuova suite + lista CI esistente tutte verdi.
- Frontend: test mirati e build production verdi.
- Migrazione: dry-run iniziale registrato, apply verificato, secondo dry-run idempotente.
- Sicurezza: anonimo 401 e cross-partner 403 sui documenti.
- UI: tre macro-fasi e venti passaggi dal bundle servito.
- Video: F-11/F-12 non chiudibili con il solo upload.
- Lancio: F-17 non chiudibile con checkbox o URL non raggiungibile.
- Documenti: F-18/F-19 versionati e F-20 bloccato finché entrambi non sono archiviati.
- Release: GitHub main, CI, revisioni Cloud Run, traffico, Vercel e smoke live sullo stesso codice applicativo.
