# T14 — Luca coordina tramite capacità limitate. Chiude il gate G2 (M2).

M2 su `codex/evolution-autonomia`, base `6c31b1c8` (T13). Implementatore: Claude. Bozza; nessun deploy.

## Vincolo reale (verificato)

`routers/admin_luca.py` (righe 7-11): la chat di Luca chiama il modello **SENZA `tools`** — legge,
ragiona, propone; "le mani stanno nel briefing schedulato". Nota ⛔: "se un giorno si aggiungono i
tool qui, va riscritto anche `LUCA_AD_SYSTEM`". `luca_briefing_task.py`: chiave read-only, "misura e
propone, non esegue". T14 costruisce quegli strumenti in modo sicuro, senza attivarli nella chat.

## Cosa è stato implementato

`backend/services/operational_tasks/coordinator.py` (puro):
- `build_direction_briefing(queues)` — briefing dalle 4 code: **verificati solo con prova**
  (completed/verified + evidence_refs), blocchi con owner e motivo, dipendenze, decisioni attese,
  ultimo aggiornamento. `kind: report`, `is_executive_agent: False` — un report NON è un agente esecutivo.
- `coordinator_tool_call(tool, args, registry, cycle, request_key)` — strumenti limitati:
  - tool fuori da `{read_state, propose_plan, create_task}` → `tool_not_allowed`.
  - `read_state` sola lettura; `propose_plan` autorizza **solo task catalogati** (uncatalogati → rejected);
    `create_task` crea solo un task_type **registrato** (con esecutore) e con input valido, stato `planned`.
  - **budget per ciclo**: `create_task` oltre `max_tasks` → `cycle_budget_exhausted`; `charge_model_call`
    oltre `max_model_calls` → False.
  - **doppia richiesta** con la stessa `request_key` → `deduped` (nessuna azione ripetuta).
- `authorize_proposed_task` — task_type non registrato = delega a un nome senza esecutore → rifiutato
  (`unknown_task_type`); input non valido → `invalid_task_input`.
- `can_start(task, dependency_statuses)` — dipendenza non risolta → `blocked`, non parte.
- `WorkStatus`: proposed / planned / in_execution / verified / blocked.

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_coordinator.py` (nuovo, in `ci.yml`) — **10 passed**: briefing è un report (non
  agente), conta solo i verificati con prova; tool sconosciuto rifiutato; **testo malevolo**
  (`send_all_emails`/`wire_money`) non catalogato → rifiutato; create solo catalogato+valido;
  **budget ciclo esaurito**; **doppia richiesta deduplicata**; budget chiamate modello; **dipendenza
  non risolta blocca**.
- **Intera suite motore M1+M2 149 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Gate G2 (M2) — coperto lato backend

Acquisizione (T10) → Vendite (T11) → Delivery (T12) → Back office (T13) → **coordinamento Luca (T14)**:
quattro flussi + coordinamento controllato, tutti deterministici, verificati, **nessuna azione fuori
catalogo né permessi impliciti**. G1 (T03-T09) + G2 (T10-T14) chiusi lato backend.

## Residui onesti (prima che giri davvero)

- **Cablaggio nella chat Luca**: aggiungere i tool a `admin_luca.py` richiede la riscrittura di
  `LUCA_AD_SYSTEM` (nota ⛔) e il ciclo LLM con budget reale — attivazione esplicita con infra viva.
- **Integrazioni runtime** (heartbeat/health T09, wiring dei generatori/adapter reali dei flussi
  T10-T13, creazione effettiva dei task in coda) — richiedono Redis + i 2 servizi Cloud Run.
- **UI del motore** (OperationalTasks, VideoPipelineMonitor, LucaChat) → design-lead.
- **Attivazione capacità**: `register()` nel `DEFAULT_TASK_REGISTRY` una alla volta su entità
  selezionate (T21). **Push/PR**: tutto locale, branch avanti di 12 su origin.

## Prossimo

- Restano T15-T19 (admin UI, con design-lead), T20-T22 (collaudo integrato, rilascio, pilotaggio) e
  T23-T25 (collaborazioni/compensi). Oppure le integrazioni runtime con l'infra viva. Decide Claudio.
