# Audit tag Systeme — pulizia + integrazione Ciak↔Systeme (2026-07-07)

## Principio di architettura (risolve le "azioni doppie")

**Ciak (backend) = fonte di verità.** Scrive nei tag Systeme lo stato reale (acquisti, stati
diagnostici, fase partner) da un solo punto: `ciak_state_machine.transition_to`.
**Systeme = motore email.** Reagisce ai tag per mandare le sequenze, ma **non ri-scrive** i tag di stato.

## Causa root delle azioni doppie

Oggi **due sistemi di tag paralleli** scrivono in Systeme per gli stessi eventi:

| Evento | Schema VECCHIO (flusso `cliente_analisi`) | Schema EVO/Ciak (state machine) |
|---|---|---|
| Lead | `lead_registrato` — `server.py:1488` | `ciak_started` — `ciak_state_machine.py:47` |
| Questionario | `questionario_compilato` — `server.py:2545` | (stato diagnostico) |
| Analisi pagata | `analisi_pagata` — `celery_tasks.py:710` | `ciak_bought_67` — `ciak_state_machine.py:51` |
| Call prenotata | `call_prenotata` — `server.py:1927` | `ciak_call_booked` — `ciak_state_machine.py:52` |
| Partner attivo | `partner_attivo` — `epos_config.py:233` | `ciak_partner_active` — `ciak_state_machine.py:55` |

Lo stesso evento fa scattare due tag → due automazioni Systeme → email/logiche duplicate.

## Set canonico = EVO/Ciak

## A. TENERE — scritti dal metodo EVO / funnel / delivery attivi

- **State machine**: `ciak_started`, `ciak_completed`, `ciak_clicked_67`, `ciak_bought_67`,
  `ciak_call_booked`, `ciak_call_done`, `ciak_partner_approved`, `ciak_partner_active`
- **Diagnostica/report**: `stato_3`, `stato_4` (+ `stato_1/2`), `segment_benessere`, `segment_coach`,
  `segment_altro`, `digital_level_base`, `digital_level_intermedia`, `obiettivo_scalare`
- **Checkpoint** (`checkpoint.py`): tutti i `ciak_checkpoint_*`, `ciak_checkpoint_done`
- **Optin/funnel**: `ciak_optin_masterclass`, `source_landing_hero`, `source_masterclass_gate`, `source_unknown`
- **Cold outreach ATTIVO**: `ciak_cold_outreach_legacy`, `ciak_cold_outreach_places` (+ `ciak_cold_outreach_other`)
- **Partnership email automation** (`ciak_partnership_email.py`): tutti i `ciak_partnership_*` (sent/opened/solleciti g7/g14/g18)
- **Delivery partner** (`partner_journey.py`): `step_posizionamento_pronto`, `step_funnel_pronto`,
  `step_masterclass_pronto`, `step_videocorso_pronto`, `step_webinar_pronto`, `step_webinar_in_lavorazione`,
  `step_email_pronto`, `step_lancio_pronto`, `sistema_attivo`, `azione_webinar_richiesta`
- **Stato partner**: `partner_setup_pending`, `contratto_firmato`
- **Nuovi (2026-07-07)**: `ciak_bought_27`, `ciak_bought_499`, `source_analisi_gratuita`

## B. RITIRARE — legacy / doppioni (richiede prima fix nel codice)

Schema italiano parallelo (flusso `cliente_analisi`), duplica il set EVO:
- `lead_registrato`, `questionario_compilato`, `analisi_pagata`, `call_prenotata`, `call_fatta`,
  `decisione_positiva`, `decisione_negativa`, `partner_attivo`

> ⚠️ Prima di cancellarli in Systeme: rimuovere le scritture in
> `server.py` (1488, 1927, 2545) e `celery_tasks.py` (710), altrimenti si rigenerano.

Cold list vecchia (superata da `ciak_cold_outreach_*`, vedi `celery_app.py:117`):
- `Lista_Fredda`, `lista_fredda_tag1..4`, `riattivazione_caldo`, `riattivazione_risposto`

> ⚠️ Rimuovere prima il riferimento hardcoded `TAG_LISTA_FREDDA_ID` in `systeme_contacts.py:32`.

Vecchia nurture lead (da verificare se ancora attiva):
- `lead_sequence_step_2`, `lead_sequence_step_3`, `lead_sequence_step_4`

## C. CANCELLARE SUBITO — test/junk (rischio zero)

- `utm_source_test`, `utm_campaign_smoke_test`, `utm_source_e2e_fix_verify`, `utm_campaign_email_test`

## D. UTM auto-generati — rumore (si rigenerano)

- `utm_medium_email`, `utm_campaign_legacy_b1`, `utm_source_systeme_email`, `utm_medium_paid`,
  `utm_campaign_120251843794950188`, `utm_source_fb`

> Systeme crea questi automaticamente dai parametri UTM all'optin. Cancellarli uno a uno è inutile
> (ricompaiono). Se fanno rumore: valutare di disattivare l'auto-tagging UTM in Systeme.

## Piano di esecuzione (in ordine)

1. **[fatto]** Creati `ciak_bought_27`, `ciak_bought_499`, `source_analisi_gratuita`.
2. **[safe, ora]** Cancellare i 4 tag test (sezione C).
3. **[codice]** Verificare che il flusso `cliente_analisi` sia dismesso; rimuovere le scritture doppie
   (sezione B) da `server.py` + `celery_tasks.py` + `systeme_contacts.py`; deploy.
4. **[Systeme UI]** Rivedere le Automazioni/Regole: mappare solo i tag canonici, email-only.
   (L'MCP non espone le automazioni: verifica manuale necessaria prima di cancellare i tag legacy.)
5. **[cleanup]** Cancellare i tag legacy (sezione B) una volta che nessun codice/automazione li usa.
