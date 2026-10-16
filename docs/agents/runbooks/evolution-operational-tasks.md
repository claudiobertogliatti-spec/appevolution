# Runbook — rilascio progressivo del motore operativo (T21)

Come si porta in esercizio il motore (T03-T14) e le collaborazioni (T23-T25) **una capacità
alla volta**, senza rompere ciò che gira. Il codice è già in produzione ma **inerte**: nessuna
capacità è registrata nel `DEFAULT_TASK_REGISTRY`, quindi il percorso-contratto non si attiva
finché non lo si abilita di proposito.

⛔ Questo è un runbook operativo: ogni attivazione è una **decisione di Claudio**, su **infra viva**
(Redis + i due servizi Cloud Run — web e worker). «Pronto» si dice con la rimisura verde allegata.

## 0. Precondizioni
- Deploy backend su Cloud Run verde (CI + `Deploy Backend`), revisione che serve il 100% del traffico.
- `collaudo` di produzione letto (catene di acquisizione/funnel): vedi `backend/collaudo.py`.
- Salute runtime osservabile: heartbeat worker condiviso + `classify_runtime_health` esposti
  (integrazione runtime ancora da cablare — vedi §5).

## 1. Shadow (nessun effetto)
- Le nuove esecuzioni restano **disabilitate**: `DEFAULT_TASK_REGISTRY` vuoto → nessun task porta
  `operational_contract`, il motore legacy continua come prima (con i fix T04/T05/T06 già attivi).
- Verificare in sola lettura: registro `/api/operational-tasks` (admin), briefing coordinatore,
  proiezione legacy. Nessuna pubblicazione/invio/pagamento duplicato.

## 2. Abilitare UNA capacità
Ordine consigliato (dalla più innocua): `acquisition.qualify_contact` → `sales.prepare_next_action`
→ `back_office.check_due_item` → `delivery.generate_positioning` → `delivery.case_study_evidence_check`
→ `collaboration.validate_rules`.
1. Registrare **solo quella** capacità nel `DEFAULT_TASK_REGISTRY` (chiamando la sua `register()`).
2. Abilitarla su **entità esplicitamente selezionate** (un partner/contatto pilota), non su tutti.
3. Le capacità con `external_effects=True` **non esistono** in questo motore: nessuna di queste invia
   o incassa. Un futuro esecutore con effetti esterni resta disabilitato finché non autorizzato per
   quel collaudo, con la riconciliazione di T07 collegata.
4. Rimisurare: il task passa da `queued`→`completed` **solo con prova** (verificatore), altrimenti
   `blocked` con owner. Controllare la timeline (`operational_tasks/{id}`).

## 3. Arresto controllato e rollback
- **Sospendere i nuovi claim** per reparto/capacità con `is_claim_suspended` (T09): ferma le prese
  nuove **senza** toccare i lease in corso né le prove.
- Rollback applicativo: ridistribuire la revisione precedente. Task ed eventi restano; gli effetti
  esterni già avvenuti si **riconciliano** (T07), non si annullano modificando il DB.

## 4. Verifiche obbligatorie ad ogni step
- CI verde; revisioni backend **e worker** aggiornate (Cloud Run ha DUE servizi); traffico allo 100%
  sulla nuova; scheduler con **un solo proprietario** (T09 `claim_periodic_window`); indici creati
  (`ensure_task_indexes`); bundle servito da www.ciak.io.
- **Auth smoke reale** admin e partner sulle rotte toccate (T06/T08).

## 5. Integrazioni runtime ancora da cablare (prerequisiti dell'attivazione)
- Heartbeat condiviso worker→API + health endpoint (`classify_runtime_health`).
- Wiring dei generatori/adapter reali dei flussi (VALENTINA/case_study, pipeline video, Systeme,
  `social_publisher` con `evidence.py`) e creazione effettiva dei task in coda dai handoff.
- Lettura reale di `ciak_leads` / sessione Blueprint / `collaborator_settlements`.
Finché questi non sono cablati e rimisurati, l'attivazione resta in shadow.
