# T12 — flusso Delivery: posizionamento versionato e prove per i casi studio

M2 su `codex/evolution-autonomia`, base `8458fbb1` (T11). Implementatore: Claude. Bozza; nessun deploy.

## Sorgenti reali lette

- `services/agent_deliverable.py`: mappa agente→deliverable (case_study→MARCO, posizionamento→brand).
- `routers/posizionamento_approval.py`: il posizionamento passa da una **coda approvazione admin**
  (`file_id`, approve/reject) e completa uno step del journey.
- `services/case_study_engine.py`: `risultato` con chiavi reali `nome/prima/dopo/citazione/tempo/**prova**`
  (`prova` = risultato concreto misurato, vuota se assente); `prova_visiva` è solo un riferimento.
- `video_pipeline_task.py`: pipeline video reale a stati → attività **figlie monitorate**.

## Cosa è stato implementato

`backend/services/operational_tasks/delivery.py`, due capacità (deterministiche, nessun effetto):

- **`delivery.generate_positioning`**: prerequisiti canonici mancanti → `blocked_missing_input` con
  richiesta interna **precisa**; altrimenti artefatto **versionato** (versione = checksum del
  CONTENUTO, non della metadata di revisione) `ready_for_review`. Disponibilità al partner
  (`available` + `availability_ref`) SOLO se la **stessa versione** è approvata e il file esiste;
  revisione rifiutata → `changes_requested`; nuovo input mentre l'approvazione era su una versione
  vecchia → `ready_for_review` (**nessuna riapprovazione automatica**). Il video è un'**attività figlia
  monitorata** (`task_type: video.render`, pipeline reale), NON il fallback Andrea; idempotente
  (callback duplicata → stessa chiave).
- **`delivery.case_study_evidence_check`**: `blocked` senza consenso o senza `prova` misurata
  ("ricavo senza prova del risultato"); `candidate` con consenso+prova ma senza approvazione;
  `verifiable` con consenso+prova+approvazione. `published` è sempre `False`: **MAI pubblicazione
  automatica di una testimonianza**. Il verificatore rifiuta l'artefatto se `published` non è False.

Entrambe kind AI, no approvazione/no effetti; `register()` esplicito, NON nel DEFAULT (attivazione T21).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_delivery.py` (nuovo, in `ci.yml`) — **15 passed**: prerequisiti mancanti → richiesta
  precisa; ready_for_review via motore; approvato-stessa-versione → available; **nuovo input non
  riapprovato**; revisione rifiutata → changes_requested; **file non disponibile** → non available;
  video figlio monitorato (non Andrea) + callback duplicata idempotente; casi studio: **niente consenso
  → blocked**, **niente prova → blocked**, candidate/verifiable, `published` sempre False.
- Suite operational completa **126 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- Il **generatore vero** del posizionamento (prompt/LLM di VALENTINA) e di `case_study_engine`
  producono il CONTENUTO: qui si coordina versione/revisione/disponibilità e si gatea la prova. Il
  wiring che invoca il generatore reale, legge lo stato del journey/coda approvazione e monitora la
  pipeline video richiede DB/infra viva.
- I casi studio `verifiable` sono usabili da Acquisizione/Vendite **solo se approvati** (architettura):
  il collegamento a quei reparti è wiring successivo.
- UI Delivery/casi studio → design-lead.

## Prossimo

- T13 flusso Back office (`back_office.check_due_item`: scadenza riconciliata, atteso/incassato/da
  confermare/sospeso; nessun incasso dedotto dal tempo, nessun pagamento automatico) — riceve la
  chiusura di Vendite.
