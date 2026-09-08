# T05 — presa in carico atomica, lease e ripresa controllata

Continuazione backend-first su `codex/evolution-autonomia`, base `58672a4f` (T04).
Implementatore: Claude. La PR resta bozza; nessun deploy, nessun effetto esterno.

## Problema affrontato

Il consumer legacy `integrated_services.process_pending_tasks` seleziona i task con
`find(...).to_list(50)` e poi li lavora: **nessun claim, nessun lease**. Due istanze
del worker prenderebbero lo stesso task; un worker che muore dopo aver preso un task
lo lascia appeso senza che nessuno lo riprenda. È il buco descritto nell'audit
("selezione e presa in carico non atomiche").

## Cosa è stato implementato

`backend/services/operational_tasks/runner.py` (modulo puro di coordinamento, nessun
esecutore, nessun effetto esterno):

- `claim_task` — prende UN task in modo atomico con `find_one_and_update`: filtro su
  stato legacy (`pending`/`in_progress`), lease libero o **scaduto**, `retry_at`
  maturato; segna `in_progress`, valorizza `lease` (owner, token, claimed_at,
  expires_at) e incrementa `attempt_count`. Recupera i lease scaduti (worker morto) →
  il task non sparisce dopo un'interruzione.
- `renew_lease`, `complete_with_lease`, `apply_retry` — mutano **solo se il token
  combacia**: un worker vecchio che finisce in ritardo non può chiudere o declassare
  il task ripreso da un altro.
- `plan_retry` — decisione pura: errore transitorio → retry con backoff `60s`, `300s`;
  tentativi esauriti (default 3) → `blocked` (`error_code=attempts_exhausted`); errore
  permanente / permesso mancante → `blocked` subito.
- `ensure_task_indexes` — indici idempotenti a supporto del claim.

Vocabolario di stato: riusato quello legacy `pending`/`in_progress`, per non introdurre
un terzo sistema di stati (la divergenza di schema è un guasto ricorrente di Ciak).

## Verifica

`.venv-ops/Scripts/python.exe`, `PYTHONPATH=backend`:

- `backend/tests/test_operational_task_concurrency.py` — **14 passed, 1 skipped**.
- Suite operational completa (contracts + completion + concurrency) — **38 passed, 1 skipped**.
- `flake8 --select=E9,F821` su `runner.py` e sul test — pulito.

Controprova: introdotto per errore un doc senza `status`, il claim tornava `None` e 8
test cadevano — il filtro conta davvero, il test solleva.

## Limiti dichiarati (NON provati)

1. **Atomicità sotto contesa.** `test_two_concurrent_workers_exactly_one_wins` esiste
   ma è **skippato**: non c'è un MongoDB reale in locale (porta 27017 chiusa, no docker,
   no `mongomock`). Un mock a thread singolo prova la logica del filtro, **non**
   l'atomicità. Il test gira contro `OPS_TEST_MONGO_URL` (o `mongodb://localhost:27017`)
   e fa skip se il server non risponde. Finché non gira su Mongo reale, l'atomicità
   resta *non provata*. Non è marcato `unit`, quindi la CI lo salta.
2. **Integrazione nel worker vivo.** Il runner **non è ancora cablato** in
   `process_pending_tasks`. Cablarlo alla cieca, senza poter provare la catena su Mongo
   reale, violerebbe il metodo di collaudo ("pronta" solo con output verde). È il passo
   successivo di T05.

## Prossimo

- Cablare `claim_task`/`renew_lease`/`complete_with_lease`/`apply_retry` nel loop legacy,
  con prova della catena cablata (richiede un Mongo di test o la CI con servizio Mongo).
- T06 policy/autorizzazioni lato server, T07 riconciliazione, T08 registro/recupero,
  T09 salute runtime + arresto nuovi claim.
