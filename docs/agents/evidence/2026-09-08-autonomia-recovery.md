# T08 (backend) — registro, scadenze e recupero amministrativo

Continuazione backend-first su `codex/evolution-autonomia`, base `2baa7d34` (T07).
Implementatore: Claude. La PR resta bozza; nessun deploy.

## Scelta di perimetro

T08 include anche una pagina frontend (`OperationalTasks.jsx`). Coerentemente con
la scelta backend-first di Claudio e con la direttiva che impone di passare da
`design-lead` per qualunque UI, questo turno consegna **solo il backend**; la pagina
verrà fatta a parte, con il processo design-lead.

## Cosa è stato implementato

`backend/services/operational_tasks/events.py` (opera su collection passate, testabile):
- `append_event` / `timeline` — traccia append-only di ogni transizione (PASS: le
  transizioni hanno una traccia).
- `escalate` — apre un'escalation **deduplicata per incidente** (`incident_key` =
  hash di task+error_code): se ne esiste una non risolta, non se ne crea un'altra.
- `record_escalation_delivery` — registra l'esito della notifica; **una consegna
  fallita NON risolve** (il problema resta aperto e interrogabile).
- `resolve_escalation` — chiusura esplicita (solo un'azione voluta risolve).
- `can_admin_retry(task)` — guardia: ritentabile solo se stato `blocked`/`failed` e
  effetto NON incerto; `reconciliation_required` o un `error_code` UNKNOWN
  (`execution_uncertain`/`verification_uncertain`/`reconciliation_required`) → vietato,
  prima si riconcilia (coerente con T07).

`backend/routers/operational_tasks.py` (prefix `/api/operational-tasks`):
- `GET ""` lista con filtri reparto/stato/owner/scadenza · `GET "/{id}"` dettaglio con
  timeline + escalation aperta.
- Azioni controllate: `retry` (guardia `can_admin_retry` + controllo concorrenza: agisce
  solo se lo stato è ancora quello letto, altrimenti 409), `reconcile`, `assign`, `cancel`.
- Ogni endpoint richiede **admin autenticato** (`require_admin` via `decode_token`) e ogni
  azione lascia un evento in timeline.
- Registrato in `server.py` con lo stesso pattern degli altri router (`set_db` + `include_router`).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_task_recovery.py` (nuovo, in `ci.yml`) — **10 passed**: timeline
  ordinata, escalation deduplicata, distinti error_code separati, **notifica fallita che
  non chiude il problema**, re-escalation dopo resolve, guardia retry (blocca stati non
  recuperabili ed effetti incerti), + **AST**: i 6 endpoint del router richiedono admin.
- Suite operational completa **80 passed, 2 skipped**; compileall (router/events/server) OK;
  flake8 E9/F821 pulito.

## Residui onesti

- **Pagina frontend `OperationalTasks.jsx`** non fatta (vedi perimetro sopra) → con design-lead.
- Il router è verificato **per struttura** (AST) + `compileall`, non con una chiamata su app
  FastAPI live: `.venv-ops` è minimale (no fastapi). In CI `requirements.txt` installa fastapi,
  quindi l'app include il router; una prova autenticata end-to-end resta da fare.
- L'escalation ha lo store e la macchina a stati, ma **chi la apre** (il worker quando un task
  va `blocked`) e **chi invia** la notifica si collegano quando i flussi reparto T10-T13 girano.

## Prossimo

- T09 salute runtime (heartbeat consumer/scheduler reali, queue lag, arresto nuovi claim per
  reparto) — chiude il gate G1 del piano. Poi la UI del motore con design-lead.
