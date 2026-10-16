# T23 — contratti e regole delle collaborazioni

M2/collaborazioni su nuovo branch `codex/evolution-collaborazioni` (da `origin/main` dopo il
merge di PR #78). Implementatore: Claude. Nessun deploy. **Nessun dato personale nel repo.**

## Sistema esistente inventariato (da riusare, non reinventare)

- `backend/routers/collaborator_settlements.py` — router `/api/admin/ciak/collaboratori`, con
  concorrenza ottimistica sugli stati.
- `backend/services/collaborator_settlements.py` — `build_settlement` (liquidazione **oraria**
  ore×tariffa da task approvati; un'unica tariffa per periodo), macchina di stato
  draft→awaiting_invoice→to_verify→to_pay→paid (+cancelled) con note obbligatorie sulle differenze,
  `can_manage_collaborator_billing` (Antonella, da collaboratrice, non gestisce la contabilità).
- `backend/services/collaborator_document_storage.py` — storage documenti.

Copre l'orario; **non** copre provvigioni/bonus/base/maturazione/esclusioni/storni né la validità
temporale delle regole né l'estrazione dal contratto: è ciò che T23 definisce (schema) e T25 calcolerà.

## Cosa è stato implementato

`backend/services/operational_tasks/collaborations.py` — capacità `collaboration.validate_rules`
(deterministica, nessun dato personale, nessun effetto):
- `document_ref` **tracciabile** (storage_ref/sha256/version/source); un payload che porta il
  **contenuto** del contratto (`content`/`text`/`raw`/…) è **rifiutato**.
- Validazione per regola (fixed/hourly/commission/bonus): clausola + validità temporale + base
  obbligatorie; campo ambiguo/mancante → `non_calcolabile` (**mai zero**), che blocca **solo** il
  proprio calcolo (`is_calculable(artifact, kind)`); `0` come importo fisso è un valore reale, assente no.
- Nessuna eredità fra collaboratori (per-input). Output = PROPOSTA con `needs_human_validation: true`.
- `docs/strategy/evolution-collaborazioni-regole.md` — schema + criteri, zero dati personali.

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_collaborations.py` (nuovo, in `ci.yml`) — **11 passed**: input richiede
  id/regole/ref; **contenuto contratto rifiutato**; regole valide → validate + attesa umana; clausola
  mancante → non_calcolabile (non zero); base provvigione ambigua → blocca solo la provvigione;
  fisso 0 reale vs importo mancante; base mancante → non_calcolabile; ref incompleto segnalato;
  regole per-collaboratore (niente copia); run via motore.
- compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- L'**estrazione** vera delle regole dal contratto (leggere il PDF di Mariangela in
  `C:\Users\berto\Downloads`, il contratto di Antonella in Ciak) è un passo con dati personali:
  va fatto fuori dal repo, in storage privato, e qui entra solo il `document_ref`. Non eseguito qui.
- La **presentazione a Claudio per validazione** e il versionamento temporale con audit sono il
  flusso umano che chiude T23; l'artefatto lo predispone (`needs_human_validation`).
- **T24** aree personali/ore e **T25** prospetti (stimato/maturato/approvato/pagato) sopra
  `collaborator_settlements.py`.

## Prossimo

- T24 (aree personali Antonella/Mariangela, ore dichiarate vs approvate) e T25 (calcolo prospetti,
  deterministico sulle regole validate). Poi collaudo integrato (T20) che include questi scenari.
