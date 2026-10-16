# T11 — flusso Vendite: opportunità → un solo passo ammissibile → chiusura coerente

M2 su `codex/evolution-autonomia`, base `46a808fd` (T10). Implementatore: Claude. Bozza; nessun deploy.

## Gate reale riusato (verificato nel codice)

`backend/routers/proposta.py::require_partnership_proposal_eligibility` (righe 127-153) impone, in
ordine: (1) pagamento Blueprint = evento `stripe_payment_completed` in sessione; (2) analisi
consegnata = `analysis.bozza_inviata_at`; (3) call = `session.current_state == "call_done"`;
(4) decisione = `client.offer_decision == "partnership"`. T11 ricalca **queste** condizioni.

## Cosa è stato implementato

`backend/services/operational_tasks/sales.py` — capacità `sales.prepare_next_action` (consuma la
handoff prodotta da T10):
- `prepare_next_action` (esecutore, deterministico, nessun effetto): il passo ammissibile è il
  **primo gate non soddisfatto** — `blueprint_payment` → `deliver_analysis` → `do_call` →
  `commercial_decision`; decisione negativa → `closed_lost` (nessun handoff); tutti i gate + decisione
  `partnership` → **chiusura** con handoff idempotenti a **Delivery** (`delivery.generate_positioning`)
  e **Back office** (`back_office.check_due_item`, con `obligations`). Ogni passo ha un SLA relativo
  (`sla_days`); la data assoluta la fissa il wiring. **Non firma e non incassa.**
- `verify_next_action`: artefatto verificato se ben formato (ref + step + stage + reasons);
  `evidence_refs=[next_action_ref]`.
- Capacità kind AI, `requires_approval=False`, `external_effects=False`; `register()` esplicito, NON
  nel `DEFAULT_TASK_REGISTRY` (attivazione = T21).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_sales.py` (nuovo, in `ci.yml`) — **8 passed**: ordine dei gate (un solo passo),
  SLA sul passo, decisione negativa → closed_lost, **chiusura → handoff a Delivery + Back office** via
  motore (`execute_and_verify_registered`) con obblighi, **idempotenza** (evento ripetuto/proposta già
  esistente → stessi ref, niente doppio handoff), cambio di stato → ref nuovo, opportunità senza
  identità rifiutata, il modello non firma né incassa.
- Suite operational completa **111 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- Il gate è ricalcato per **valori** (i flag `blueprint_paid`/`analysis_delivered`/`call_done`/
  `offer_decision`): il **wiring** che li legge dalle sorgenti reali (sessione Blueprint,
  `ciak_analisi.bozza_inviata_at`, `ciak_clients.offer_decision`) e crea davvero i task Delivery/Back
  office in coda richiede DB/infra viva — è l'attivazione del flusso.
- Nessuna firma/pagamento: quelli restano nelle rotte reali di `proposta.py` (Stripe/bonifico),
  gestite da un umano; la capacità li **collega**, non li esegue.
- UI `PipelineList.jsx`/`ClientiCiak.jsx` → con design-lead.

## Prossimo

- T12 flusso Delivery (`delivery.generate_positioning` + `delivery.case_study_evidence_check`) — il
  reparto che riceve la chiusura di Vendite. Userà `evidence.py` (T07) per le prove dei casi studio.
