# T09 (backend) — salute runtime, arresto controllato, proprietario unico dei periodici

Continuazione backend-first su `codex/evolution-autonomia`, base `bc8825d3` (T08).
Implementatore: Claude. La PR resta bozza; nessun deploy. **Chiude il gate G1 (M1) lato backend.**

## Segnali reali letti

`backend/celery_manager.py`: `is_redis_available()` fa un `ping` vero a Redis; `_worker_process`
e `_beat_process` sono riferimenti a **subprocess locali** (`Optional[Popen]`). `backend/scheduler.py`:
APScheduler (senza Redis) usato come fallback quando Redis Upstash è rate-limited (nota dell'1/9),
in parallelo a Celery Beat → rischio di doppio proprietario delle schedulazioni.

Conseguenza chiave: l'**istanza API** non condivide il processo del **servizio worker** separato.
Guardare `_worker_process` sull'API dice solo che l'API non ha un worker locale, non che il worker
sia fermo. Il monitor video storico sbagliava proprio qui.

## Cosa è stato implementato

`backend/services/operational_tasks/runtime.py` (puro):
- `classify_runtime_health(is_worker_service, redis_ok, local_worker_alive, heartbeat_age_seconds, …)`
  → `HEALTHY` / `DEGRADED` / `DOWN` / `UNKNOWN_SEPARATE`. Regole: Redis giù → `DOWN`; sul servizio
  worker, processo locale assente → `DOWN`, vivo ma heartbeat vecchio → `DEGRADED`; **sull'istanza API,
  senza heartbeat condiviso → `UNKNOWN_SEPARATE`, MAI `DOWN`** (non si dichiara morto ciò che non si vede).
- `is_claim_suspended(suspensions, department_id, capability)` → arresto controllato dei NUOVI claim
  per reparto/capacità (`department_id=None` = tutti; `capability=None` = tutte). Non tocca i lease in
  corso: ferma solo le prese nuove.
- `periodic_window_key` + `claim_periodic_window` → un solo proprietario per finestra temporale (upsert
  su `_id` unico), così un periodico non parte due volte se due scheduler coesistono.

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_runtime_health.py` (nuovo, in `ci.yml`) — **15 passed**: i 4 scenari del piano
  (worker assente → DOWN, Redis giù → DOWN, heartbeat vecchio → DEGRADED, API sana + worker separato
  sano → HEALTHY) + l'anti-bugia (API senza heartbeat → UNKNOWN_SEPARATE), sospensione per
  reparto/globale/capacità, single-owner per finestra.
- Suite operational completa (**gate G1**) **95 passed, 2 skipped**; compileall OK; flake8 pulito.

## Residui onesti

- `runtime.py` fornisce i **classificatori**; il wiring che li alimenta con heartbeat reali —
  far scrivere al worker un heartbeat condiviso (Redis/Mongo) che l'API rilegge, esporre l'health in
  `celery_manager`/un endpoint, e far consultare `is_claim_suspended` al loop del worker — richiede
  Redis + i due servizi Cloud Run, non provabile in `.venv-ops`. È l'integrazione runtime, da fare con
  l'infra viva.
- La pagina `VideoPipelineMonitor.jsx` che mostra questo health va aggiornata con **design-lead** (UI).
- L'atomicità di `claim_periodic_window` è verificata come logica su fake; poggia sull'`_id` unico di
  Mongo come il claim di T05 (provato su Mongo reale in quel task).

## Stato del gate G1

T03 catalogo · T04 stop falsi «completato» · T05 claim atomico+lease (atomicità su Mongo reale) ·
T06 auth+approvazioni versionate · T07 riconciliazione effetti · T08 registro+recupero ·
**T09 salute runtime** — tutti fatti e verificati (locali). Restano da fare: le **integrazioni runtime**
con l'infra viva e le **UI** (design-lead), poi i flussi reparto M2 (T10-T14).
