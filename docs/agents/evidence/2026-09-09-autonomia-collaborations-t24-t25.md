# T24 + T25 — aree personali/ore e prospetti compensi

Branch `codex/evolution-collaborazioni` (da `main` dopo il merge di PR #78). Implementatore:
Claude. Backend puro; la UI (Collaboratori/CollaboratorSettlements) resta a design-lead. Nessun
dato personale nel repo; nessun pagamento eseguito dal codice.

## Sorgenti reali (verificate)

`backend/routers/ciak_admin.py` (sezione "Collaboratori: Antonella ore effettive", ~riga 2153):
task collaboratore con `assigned_to`, `estimated_minutes` (pianificazione), `actual_minutes`
(consuntivo/timer), `approved_minutes`, `approved_amount = approved_min/60 × hourly_rate`,
`week_start`, tetto settimanale. `services/collaborator_settlements.py`: liquidazione oraria +
stati draft→…→paid + `_money` (Decimal HALF_UP). T24/T25 riusano questi campi/regole.

## T24 — `services/operational_tasks/collaboration_timesheet.py`

- `normalize_entry` distingue pianificazione (estimated) / consuntivo (actual) / approvato
  (approved) e tempo da risultato (`result_ref`).
- **Identità unica**: `department_view` filtra per reparto senza duplicare; `personal_totals`
  deduplica per attività → passare da Acquisizione a Vendite non conta le ore due volte.
- `detect_duplicates`, `detect_overlaps`, `weekly_load` (segnala `over_limit` **senza** riscrivere
  l'accordo).
- **Accessi**: `access_for(actor, collaborator_id)` — direzione (superadmin / admin senza
  admin_type di collaboratrice) vede tutto e modifica le economiche; la collaboratrice vede i propri
  dati ma NON modifica le proprie economiche; chiunque altro → minimo, campi economici rimossi
  (`redact_for`). Coerente con `can_manage_collaborator_billing` esistente.

## T25 — `services/operational_tasks/collaboration_compensation.py`

- `compute_prospetto` calcola **solo** dalle regole validate (T23) + ore approvate + eventi (T24).
  Stati **stimato/maturato/approvato/pagato**; ogni voce spiegabile (base, formula, clausola,
  evento, periodo). Arrotondamento Decimal HALF_UP (come i settlements).
- **Attribuzione vendita per evento**: `attributed_collaborator_id` + `attribution_verified`;
  un'attribuzione per **nome** è ignorata; eventi ripetuti deduplicati per `event_id`; `refunded` →
  **storno** (importo negativo); maturazione solo se l'evento è `reconciled`.
- **Bonus discrezionale**: senza `approved` resta stimato, mai approvato in automatico.
- **Regola assente/non calcolabile** (da T23) → voce `non_calcolabile`, esclusa dai totali (mai zero).
- **Nessun pagamento eseguito**: `pagato` solo da conferma `authorized` con `evidence_ref`.
- `close_period` → versione **immutabile** con approvazione + hash; `rectify` → rettifica esplicita
  che referenzia versione/hash, non ricalcola né modifica lo snapshot chiuso.

Per abilitare il calcolo, l'artefatto T23 ora porta anche `basis`/`maturation`/`condition` delle
regole validate (arricchimento compatibile in `collaborations.py`; T23 re-testato verde).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_collaborator_department_access.py` (T24) — **11 passed**.
- `test_collaboration_compensation.py` (T25) — **13 passed** (attribuzione per evento vs nome,
  dedup evento, storno, pagamento parziale/senza evidenza, bonus senza approvazione, regola assente
  non-zero, arrotondamento, chiusura immutabile + rettifica).
- Suite motore completa **179 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.
  Entrambi i file nuovi collegati a `ci.yml`.

## Residui onesti

- **Estrazione** delle regole dai contratti reali (dati personali) → fuori repo, storage privato
  (T23). Qui si consuma solo l'artefatto validato + input verificati.
- **UI** aree personali e prospetti (Collaboratori.jsx / CollaboratorSettlements.jsx) → design-lead.
- **Wiring**: leggere ore/eventi reali (task collaboratore, eventi vendita) e persistere i prospetti
  su `collaborator_settlements` richiede DB/infra viva; l'approvazione economica è di Claudio.

## Stato

Collaborazioni T23 ✅ + T24 ✅ + T25 ✅ (backend). Restano: UI (design-lead) e T20-T22
(collaudo integrato/rilascio/pilotaggio) con infra viva.
