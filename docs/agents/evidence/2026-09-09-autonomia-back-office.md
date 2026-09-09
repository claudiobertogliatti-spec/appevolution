# T13 — flusso Back office: scadenza riconciliata e attività di recupero

M2 su `codex/evolution-autonomia`, base `c33dd585` (T12). Implementatore: Claude. Bozza; nessun deploy.

## Struttura reale del piano (verificata)

`routers/ciak_admin.py` (`PianoPagamento`, ~riga 495): `tipo` (mensile | rate_concordate),
`rate_totali`, `rate_pagate` (validato ≤ rate_totali → "rata 9 di 2" è incoerenza),
`importo_rata` (Optional, ≥ 0: **0 è un valore reale, None è dato mancante**), `prossima_scadenza`
(Optional). Klarna e saldo unico NON sono tracciati (già incassati per intero).

## Cosa è stato implementato

`backend/services/operational_tasks/back_office.py` — `back_office.check_due_item` (deterministico,
nessuna azione economica):
- Stati: `atteso` (dovuta, nessuna prova — **mai** dedotta come incassata dalla sola data),
  `incassato_verificato` (prova riconciliata + importo combaciante), `esito_da_confermare` (movimento
  non riconciliato / importo diverso), `sospeso` (solleciti sospesi → nessuna bozza), `completed`
  (tutte le rate pagate).
- Anomalie: `rate_incoerenti` (rate_pagate > rate_totali), `importo_mancante` (≠ importo 0),
  `scadenza_mancante` (rata priva di data), `importo_non_valido`, `piano_incompleto`.
- Per anomalia o rata scaduta: **una** attività (`owner_id: back_office`, `document_ref`,
  `next_action`); il sollecito è **solo una bozza** e solo se non sospeso.
- `explain` rende la scadenza spiegabile (tipo, "rata X di Y", importo, scadenza). Il modello **non
  incassa, non paga, non rimborsa, non incrementa le rate**: classifica soltanto → l'evento ripetuto
  non può contare due volte.

Capacità kind AI, no approvazione/no effetti; `register()` esplicito, NON nel DEFAULT (attivazione T21).

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_back_office.py` (nuovo, in `ci.yml`) — **13 passed**: rata incoerente → anomalia;
  **importo mancante ≠ zero**; rata priva di data → anomalia; futura → atteso senza bozza; **scaduta senza
  prova → mai incassata**, con bozza sollecito; **solleciti sospesi → nessuna bozza**; prova riconciliata
  + importo ok → incassato_verificato; non riconciliato/importo diverso → esito_da_confermare; tutte pagate
  → completed; **idempotenza** (evento ripetuto → stesso ref, il modello non conta); run via motore;
  nessuna azione economica.
- Suite operational completa **139 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.

## Residui onesti

- Il **wiring** che legge i piani reali (`db.crediti` / `PianoPagamento` / eventi Stripe), applica
  l'aggiornamento amministrativo **autorizzato** (mai automatico) e riconcilia i movimenti richiede
  DB/infra viva. Firma/incasso/rimborso restano azioni umane.
- Le concessioni ai partner (congelamenti, solleciti sospesi) stanno su WhatsApp: `reminders_suspended`
  va alimentato da lì, non dedotto.
- UI `Amministrazione.jsx` → design-lead.

## Prossimo

- T14 — Luca coordina tramite capacità limitate (briefing dalle 4 code verificate, strumenti solo
  lettura-stato/proposta-piano/creazione task catalogati, budget per ciclo). Chiude il gate G2 (M2).
