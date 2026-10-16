# T07 — prove, deduplicazione e riconciliazione degli effetti

Continuazione backend-first su `codex/evolution-autonomia`, base `358196b4` (T06).
Implementatore: Claude. La PR resta bozza; nessun deploy.

## Adapter reale letto: `backend/services/social_publisher.py`

Il publisher social incarna già gran parte di T07 per il canale social:
- risultati **per-canale** (`results = {canale: {..., permalink}}`), errori per-canale;
- stato `partial` se qualcuno esce e qualcuno no; i canali già usciti conservano il
  permalink e **non si ripubblicano** → niente doppioni (`gia_usciti`/`da_fare`);
- la prova è il **permalink riletto dalla piattaforma**, non un flag `success`.

**Il buco che resta** (righe ~176-186 e ~236-265): se `_pubblica_ig`/`_pubblica_fb`
solleva **dopo** che la piattaforma ha creato il post ma prima di rileggere il permalink
(timeout sulla `_graph_get` finale, o sulla risposta di `media_publish`), il canale finisce
in `errori` e NON in `results`. Al giro successivo `da_fare` lo include di nuovo →
**ripubblicazione → doppione**. Il codice deduplica solo i canali con permalink; un
timeout a metà è trattato come "non fatto" e reinviato alla cieca.

## Cosa è stato implementato

`backend/services/operational_tasks/evidence.py` (puro, nessun provider):
- `classify_effect_outcome(sent, provider_ok, evidence_ref)` → `PRODUCED` (ok + prova
  riletta), `FAILED` (mai partito: sicuro reinviare), `UNKNOWN` (inviato ma senza prova:
  timeout/ambiguo → riconciliare, **mai reinviare**).
- `channels_to_retry` → SOLO i `FAILED`; `channels_needing_reconciliation` → gli `UNKNOWN`.
  Ripetere un `UNKNOWN` è esattamente ciò che crea i doppioni.
- `all_effects_verified(records, required)` → completo solo se OGNI canale richiesto è
  `PRODUCED` con prova non vuota (riferimento artefatto non accessibile → non completo).
- `EffectLedger`: `record_intent` PRIMA dell'effetto (chiave di idempotenza); una seconda
  `record_intent` con la stessa chiave (tentativo/callback duplicato) ritorna `False` → il
  chiamante non rifà l'effetto. `resolve` fissa l'esito noto. Chiave via
  `build_idempotency_key` (riuso da T03).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_task_reconciliation.py` (nuovo, in `ci.yml`) — **14 passed**:
  timeout dopo l'invio = `UNKNOWN` e mai reinviato (no doppione), callback ripetuta
  deduplicata dal ledger, pubblicazione parziale che ripete solo il `FAILED`, riferimento
  artefatto non accessibile che non conta come completo, idempotency key stabile.
- Suite operational completa **70 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- `evidence.py` è la **primitiva riutilizzabile**; il wiring in `social_publisher.py`
  (registrare l'intento prima di pubblicare e, sul timeout, **cercare l'operazione remota**
  — cioè interrogare Graph per un permalink recente con la stessa caption/idempotency —
  prima di ripubblicare) è l'integrazione successiva: tocca un adapter di produzione con
  test propri e richiede logica Graph specifica, non provabile qui senza API live.
- La ricerca dell'operazione remota è per-provider: Systeme, Graph IG/FB e SMTP hanno modi
  diversi di ritrovare un'operazione. `evidence.py` fornisce la macchina a stati; gli
  adapter forniranno la query di riconciliazione quando i flussi reparto (T10-T13) li useranno.

## Prossimo

- T08 registro/scadenze/recupero amministrativo (lista+dettaglio task, azioni controllate,
  escalation persistente), poi T09 salute runtime + arresto nuovi claim.
