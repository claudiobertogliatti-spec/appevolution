# T10 — flusso Acquisizione: contatto qualificato pronto per Vendite

Inizio di M2 (flussi reparto) su `codex/evolution-autonomia`, base `fd5ef7dd` (T09).
Implementatore: Claude. La PR resta bozza; nessun deploy. **Prima capacità registrata nel motore.**

## Campi reali del contatto (verificati, non inventati)

`backend/routers/ciak_leads.py` + `frontend/src/ciak/admin/pages/LeadManager.jsx`: un lead ha
`email` (identità, chiave upsert), `nome`, `telefono`/`phone`/`business_phone`, `source`
(masterclass_landing / manual / google_places / …), `status`, `tags`, `metadata`. L'opt-in caldo
è il tag `ciak_optin_masterclass`.

## Cosa è stato implementato

`backend/services/operational_tasks/acquisition.py` — capacità `acquisition.qualify_contact`:
- `validate_qualify_input`: serve un contatto **identificabile** (email o id) per leggerlo.
- `qualify_contact` (esecutore, **deterministico, nessun effetto esterno, nessun LLM opaco**):
  produce la qualificazione — decisione motivata (`reasons`), `missing_fields`, caldo/freddo
  (opt-in), `sources`, versione e un `qualification_ref` idempotente (identità+versione). Obbligatori
  per Vendite: `email` (identità) + `source` (provenienza/consenso); serve almeno un canale
  raggiungibile.
- `next_step` come **BOZZA**: se qualificato → una `handoff` a **vendite**
  (`sales.prepare_next_action`, entity_ref = contatto, chiave idempotente); altrimenti
  un'attività `data_integration` con owner `acquisizione`. Nessun invio, nessun cold outreach.
- `verify_qualification`: l'artefatto è verificato se ben formato (ref + decisione + prossimo passo),
  valido sia per qualificato sì sia no. `evidence_refs = [qualification_ref]`.
- `QUALIFY_CONTACT_CAPABILITY` (kind AI, `requires_approval=False`, `external_effects=False`) +
  `register(registry)`. **NON** registrata nel `DEFAULT_TASK_REGISTRY`: l'attivazione in produzione
  è una scelta esplicita (T21).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_acquisition.py` (nuovo, in `ci.yml`) — **8 passed**: la capacità gira **attraverso
  il motore** (`execute_and_verify_registered`, T04) e completa con la qualificazione verificata;
  contatto qualificato → handoff a Vendite; `source` mancante → completa ma instrada a
  `data_integration` (nessun handoff); contatto non identificabile → rifiutato; id senza canale →
  non raggiungibile; caldo vs freddo; **dedup per identità** (stesso contatto → stesso ref, niente
  doppio handoff) e **aggiornamento contatto** → versione/ref nuovi; nessun effetto esterno / nessun
  invio in preparazione.
- Suite operational completa **103 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- La qualificazione è **deterministica e spiegabile** (regole sui campi reali). Un eventuale
  arricchimento LLM è un layer successivo: non fabbrica dati e resta dietro la stessa verifica.
- Il **wiring**: creare davvero il task Vendite in coda dalla `handoff` e leggere i contatti da
  `ciak_leads` (con `is_claim_suspended` di T09 a monte) richiede DB/infra viva — è l'attivazione
  del flusso, da fare con l'ambiente vivo. `register(...)` in `DEFAULT_TASK_REGISTRY` è il passo di
  abilitazione esplicito (T21).
- `LeadManager.jsx` (UI acquisizione) → con design-lead quando si fa la UI del motore.

## Prossimo

- T11 flusso Vendite (`sales.prepare_next_action`: legge acquisto/analisi/call, propone UN passo
  ammissibile, collega gli handoff a Delivery/Back office) — è il consumatore della consegna prodotta qui.
