# T20-T22 — collaudo integrato, runbook di rilascio, piano di pilotaggio

Branch `codex/evolution-collaudo` (da `main` con #78 + #84). Implementatore: Claude. Nessun deploy.

## T20 — collaudo integrato (fatto)

`backend/tests/test_operational_tasks_end_to_end.py` (in `ci.yml`) — **3 passed**:
- tutte le capacità coesistono in un registry, nessuna collisione di task_type;
- **catena completa**: Acquisizione qualifica un contatto → handoff a Vendite il cui `task_type`
  è una capacità **realmente registrata**; Vendite (opportunità vinta) → chiusura con handoff a
  Delivery e Back office, entrambi task_type registrati; Delivery produce un artefatto versionato;
  Back office classifica la scadenza; il coordinatore produce un briefing (report, non agente).
  Ogni passo gira attraverso `execute_and_verify_registered` e completa con prova.
- la catena è **idempotente** sul rerun (nessun doppio ingresso in Vendite).

Prova che i reparti si agganciano davvero: nessun handoff verso un nome senza esecutore.

## T21 — rilascio progressivo (deliverable: runbook)

`docs/agents/runbooks/evolution-operational-tasks.md`: shadow → abilitare UNA capacità alla volta nel
`DEFAULT_TASK_REGISTRY` su entità selezionate → arresto controllato (`is_claim_suspended`) e rollback
che preserva task/eventi → verifiche obbligatorie (CI, revisioni web+worker, scheduler single-owner,
indici, auth smoke). ⛔ L'esecuzione è un'attività su infra viva, decisione di Claudio.

## T22 — pilotaggio (deliverable: piano + misura)

`docs/agents/evidence/evolution-autonomia-pilot.md`: cosa attivare (≥1 ciclo per reparto), controlli
giornalieri (scaduti, verifiche mancanti, duplicati, errori provider, escalation, tempo di Claudio),
confronto col baseline, gate G4. ⛔ È un PIANO: il pilota è **≥7 giorni** di produzione, non
completabile in sessione; gli esiti si aggiungono in fondo con prova.

## ⛔ Confine di completamento (onesto)

Il programma NON si chiude interamente in codice. Restano, per natura:
- **T15-T19 — UI admin** (Direzione, navigazione 5 reparti, scheda partner, code, coerenza): richiedono
  la skill `design-lead` e sono un vero lavoro frontend. NON fatte qui.
- **T21 attivazione + T22 pilota**: attività su **infra viva** (Redis + 2 servizi Cloud Run) con
  **decisioni economiche/di attivazione di Claudio** e **7 giorni** di osservazione. Qui ci sono i
  piani, non l'esecuzione live.
- **Integrazioni runtime**: heartbeat/health, wiring generatori/adapter reali, creazione task in coda,
  lettura sorgenti reali (`ciak_leads`, sessione Blueprint, `collaborator_settlements`).
- **Rimisura funzionale in produzione** di ciò che è già live (PR #78/#84): worker e rotte admin.

## Stato del piano (25 task)

- **G1 (T03-T09)** ✅ · **G2 (T10-T14)** ✅ · **Collaborazioni (T23-T25)** ✅ · **T20** ✅ — in `main`
  (#78, #84) o su questo branch.
- **T15-T19 (UI)** ⬜ design-lead. **T21/T22** 🟡 piani pronti, esecuzione live a Claudio.
