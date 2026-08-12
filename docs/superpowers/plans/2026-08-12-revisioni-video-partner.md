# Partner Video Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consentire al partner di inviare una lista versionata di revisioni generali o a timestamp, con automazione sicura, escalation al team e nuovo ok obbligatorio.

**Architecture:** Un servizio puro normalizza catalogo, intensità, conflitti e rischio; endpoint partner persistono pacchetti immutabili e audit; il worker esegue solo pacchetti verdi supportati e mette gli altri in review team. Il Workspace Corso usa un componente dedicato per player e lista revisioni.

**Tech Stack:** FastAPI, MongoDB/Motor, Celery, FFmpeg, React 19, pytest.

## Global Constraints

- Ogni richiesta è legata a `output_version`; ogni nuovo render azzera l'ok precedente.
- Dal terzo ciclo il controllo team è obbligatorio.
- Nessun contenuto didattico o esercizio guidato può essere alterato automaticamente.
- Il partner vede solo stati comprensibili, mai dettagli tecnici.

---

### Task 1: Dominio e validazione revisioni

**Files:**
- Create: `backend/services/ciak_lesson_review.py`
- Test: `backend/tests/test_ciak_lesson_review.py`

**Interfaces:**
- Produces: `build_partner_review_update()`, `is_partner_approved()`, `classify_revision_items(items, duration_s, cycle)`, `build_revision_package(...)`.

- [ ] Scrivere test rossi per catalogo, intensità, timestamp, conflitti, rischio massimo, terzo ciclo e versione superata.
- [ ] Eseguire `python -m pytest backend/tests/test_ciak_lesson_review.py -q` e confermare FAIL.
- [ ] Implementare enum/catalogo immutabile, normalizzazione e builder del pacchetto.
- [ ] Rieseguire il test e confermare PASS.
- [ ] Commit selettivo del servizio e dei test.

### Task 2: API partner e audit

**Files:**
- Modify: `backend/routers/partner_journey.py`
- Test: `backend/tests/test_ciak_lesson_review_api.py`

**Interfaces:**
- Consumes: servizio Task 1.
- Produces: `POST /videocorso/partner-review`, `POST /videocorso/revisions`, `POST /videocorso/revisions/{revision_id}/cancel`.

- [ ] Scrivere test per ruolo partner, isolamento, versione, lista immutabile, annullamento e storico.
- [ ] Verificare RED.
- [ ] Implementare endpoint, update atomici e Telegram; solo ruolo partner può dare l'ok finale.
- [ ] Alla richiesta, impostare `revision_requested`; per giallo/rosso o ciclo >=3 impostare review team.
- [ ] Verificare GREEN e commit selettivo.

### Task 3: Worker e versionamento output

**Files:**
- Modify: `backend/video_pipeline_task.py`
- Modify: `backend/services/ciak_lesson_standard.py`
- Test: `backend/tests/test_ciak_lesson_revision_worker.py`

**Interfaces:**
- Consumes: pacchetto normalizzato Task 1.
- Produces: `process_lesson_revision` Celery task e nuova `output_version` in `ready_for_review`.

- [ ] Testare che i pacchetti non verdi non renderizzino e che quelli verdi supportati producano una sola versione.
- [ ] Implementare operazioni sicure supportate (volume, normalizzazione, velocità massima 1.05x, margini inizio/fine); escalation per richieste non supportate.
- [ ] Conservare grezzo/versioni e registrare risultati per elemento.
- [ ] Verificare test worker e commit.

### Task 4: UI lista revisioni

**Files:**
- Create: `frontend/src/ciak/partner/operativo/LessonRevisionPanel.jsx`
- Modify: `frontend/src/ciak/partner/operativo/Workspace2Corso.jsx`
- Test: `frontend/src/ciak/partner/operativo/LessonRevisionPanel.test.jsx`

**Interfaces:**
- Consumes: endpoint Task 2 e `output_version` dal workspace.

- [ ] Testare cattura `currentTime`, lista multipla, intensità, conflitti e riepilogo.
- [ ] Implementare catalogo UI, ambito generale/puntuale, riordino/eliminazione e invio unico.
- [ ] Mostrare lista inviata read-only e stati partner-friendly.
- [ ] Eseguire test frontend e build; commit.

### Task 5: Gate integrato

**Files:**
- Modify: `skills/ciak-video-lesson-editor/SKILL.md`
- Modify: `docs/video/recipe-lezione-cut.md`

- [ ] Eseguire test backend revisioni + standard, build frontend, py_compile e `git diff --check`.
- [ ] Validare la skill e aggiornare documentazione/handoff con prove.
- [ ] Commit finale della feature.
