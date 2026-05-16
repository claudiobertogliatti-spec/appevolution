# Systeme.io — Audit completo tag + workflow ciak.io

**Stato:** LOCK 17/5/2026. Mappa di **tutti** i tag che il backend Ciak emette su
Systeme.io e i workflow/email che devono essere configurati lato Systeme per
ciascuno. Da usare come **checklist di verifica** dentro Systeme.

**Convenzione**:
- 🟢 = workflow OBBLIGATORIO per il lancio (se manca, perdiamo email a clienti)
- 🟡 = workflow CONSIGLIATO (migliora conversion, ma non blocca)
- ⚪ = tag puramente DIAGNOSTICO (audit/segmentazione admin, NO email da inviare)
- 🔵 = tag già gestito dal backend (es. email transactional SMTP) — Systeme può
       eventualmente solo loggarlo per analytics

---

## ⚡ Quick check (15 minuti)

Per ogni tag elencato nelle sezioni 1-7 sotto:

1. **Esiste il tag?** Vai su Systeme → Contacts → Tags. Cerca il nome esatto (case-sensitive, underscore). Se non c'è, **non crearlo a mano** — verrà creato automaticamente al primo evento backend (`find_or_create_tag_id`).
2. **C'è il workflow corretto?** Se 🟢 o 🟡, deve esistere un workflow "Quando contatto riceve tag X → invia email Y / wait Z giorni / invia email Y2 / ecc."
3. **Stato workflow attivo?** Toggle verde nella lista Automations → Workflows.
4. **No workflow obsoleti?** Se vedi workflow vecchi che si triggerano sugli stessi tag (es. workflow legacy del periodo app.evolution-pro.it), disattivali per evitare doppi invii.

---

## §1 — Funnel pubblico (opt-in masterclass)

### Tag emessi su `POST /api/ciak/lead-capture`
Trigger: utente compila il form Nome+Email su `ciak.io/` o `ciak.io/masterclass`.

| Tag | Tipo | Workflow Systeme da configurare |
|---|---|---|
| `ciak_optin_masterclass` | 🟢 | **Sequenza opt-in masterclass**: 4 email su 7 giorni (T+0/T+24h/T+3d/T+7d), CTA progressiva verso Ciak Blueprint €67. Exit on tag: `ciak_bought_67`. Copy in [PR #7](https://github.com/claudiobertogliatti-spec/appevolution/pull/7). |
| `source_landing_hero` / `source_masterclass_gate` / `source_unknown` | ⚪ | Segmentazione: capisci da quale entry il lead è arrivato. NO email. |
| `utm_source_<x>` / `utm_campaign_<x>` / `utm_medium_<x>` | ⚪ | Segmentazione UTM. NO email diretta. Utile per filtri segmenti (es. "tutti i lead utm_campaign_lancio_giugno"). |

**Test rapido**: completa il form su `ciak.io/` con email `claudio.bertogliatti+optin1@gmail.com`. Vai su Systeme → Contacts → cerca quella email. Deve avere tag `ciak_optin_masterclass` + tag UTM/source. Se hai configurato il workflow, deve arrivare la prima email entro 1-2 min.

---

## §2 — Checkpoint Strategico (post-masterclass)

### Tag emessi su `POST /api/checkpoint/result`
Trigger: utente completa le 5 domande del Checkpoint.

| Tag | Tipo | Workflow Systeme da configurare |
|---|---|---|
| `ciak_checkpoint_stato_1` | 🟢 | **Email Stato 1 — Definizione** (subject + HTML in `docs/marketing/systeme-checkpoint-workflows.md`) |
| `ciak_checkpoint_stato_2` | 🟢 | **Email Stato 2 — Strutturazione** (idem) |
| `ciak_checkpoint_stato_3` | 🟢 | **Email Stato 3 — Validazione** (idem) |
| `ciak_checkpoint_stato_4` | 🟢 | **Email Stato 4 — Evoluzione Strategica** (idem) |
| `ciak_checkpoint_done` | ⚪ | Tag aggiuntivo segnaletico. Utile per filtri "tutti quelli che hanno fatto il checkpoint, qualunque stato". NO email diretta. |

### Tag confirm da backend dopo invio email
| Tag | Tipo | Note |
|---|---|---|
| `ciak_checkpoint_email_sent_stato_<n>` | ⚪ | Applicato dal backend DOPO che la pipeline checkpoint→tag→Systeme è scattata. Diagnostico: se vedi questo tag su un contatto MA non l'email dello stato N nella sua history Systeme, il workflow N non è attivo. |
| `ciak_checkpoint_email_sent` | ⚪ | Tag generico, idem. |
| `ciak_checkpoint_email_opened_stato_<n>` | ⚪ | **Da configurare** lato Systeme se vuoi tracking apertura: aggiungi un Action "Apply tag" su "Email opened" dentro ogni workflow stato_<n>. Senza, l'open rate in `ciak.io/admin/masterclass-analytics` resta 0. |
| `ciak_checkpoint_email_opened` | ⚪ | Idem, generico. |

---

## §3 — 8 Domande Ciak (Diagnostica post-pagamento €67)

### Tag emessi via `routers/diagnostic.py`

| Tag | Trigger | Tipo | Workflow Systeme |
|---|---|---|---|
| `ciak_started` | `POST /api/diagnostic/start` (apre le 8 domande) | ⚪ | Diagnostico. NO email (l'utente è dentro il flusso, sta compilando). |
| `ciak_completed` | `POST /api/diagnostic/answer` su ultima domanda (con report Matteo generato) | 🟡 | Opzionale: email "Il tuo report è pronto, prenota la call su [Cal.com]". Triggera anche se lead ha già `ciak_bought_67`. Exit on tag: `ciak_call_booked`. |
| `stato_1` / `stato_2` / `stato_3` / `stato_4` | Con `ciak_completed` come `extra_tag` | ⚪ | Segmentazione finale dopo report Matteo (NOTA: nome diverso da `ciak_checkpoint_stato_<n>`, che è pre-acquisto). |
| `segment_<x>` (es. `segment_benessere`, `segment_coach`, ...) | Con `ciak_completed` | ⚪ | 9 valori possibili. Segmentazione professione. Utile per ads lookalike o newsletter dedicate per segmento. |
| `digital_level_<x>` (nessuna/base/intermedia/avanzata) | Con `ciak_completed` | ⚪ | Segmentazione maturità digitale. |
| `obiettivo_<x>` (extra/scalare/libertà/indeciso) | Con `ciak_completed` | ⚪ | Segmentazione obiettivo dichiarato. |
| `ciak_clicked_67` | `POST /api/diagnostic/cta-clicked` (click sul CTA Blueprint nel report) | 🟡 | Opzionale: email "Hai cliccato ma non hai completato l'acquisto — vuoi una chiamata?" con exit `ciak_bought_67`. Triggera retargeting. |

---

## §4 — Acquisto Ciak Blueprint €67

### Tag emessi via `routers/checkout.py`

| Tag | Trigger | Tipo | Workflow Systeme |
|---|---|---|---|
| `ciak_bought_67` | Webhook Stripe `payment_completed` su checkout €67 | 🟢 | **Sequenza post-acquisto** (3 email): conferma + reminder compila 8 domande + reminder prenota call. Exit on tag `ciak_call_booked`. Inoltre questo tag è EXIT per tutte le sequenze precedenti (`ciak_optin_masterclass`, `ciak_checkpoint_stato_<n>`, `ciak_clicked_67`) — verifica che gli exit siano configurati su tutti. |

⚠️ **CRITICO**: senza l'exit `ciak_bought_67` configurato su `ciak_optin_masterclass`, un cliente che ha già pagato continua a ricevere email "Compra il Blueprint" → pessima esperienza.

---

## §5 — Cal.com booking (post-acquisto €67)

### Tag emessi via `routers/booking.py` (Cal.com webhook)

| Tag | Trigger | Tipo | Workflow Systeme |
|---|---|---|---|
| `ciak_call_booked` | Cal.com `BOOKING_CREATED` | 🟡 | Opzionale: email "Conferma prenotazione" (Cal.com manda già la conferma di default, evita duplicato a meno che vuoi un tone custom). |
| `ciak_call_rescheduled` | Cal.com `BOOKING_RESCHEDULED` | ⚪ | Diagnostico. NO email (Cal.com manda nota automaticamente). |
| `ciak_call_cancelled` | Cal.com `BOOKING_CANCELLED` | 🟡 | Opzionale ma utile: email "Hai cancellato — vuoi riprogrammare? Ecco il calendario [link]" + exit on tag `ciak_call_booked`. |
| `ciak_call_done` | Cal.com `MEETING_ENDED` (durata > soglia minima) | 🟡 | Opzionale: email "Grazie per la call — riceverai la Roadmap entro 48h" + tono di attesa documento. |

⚠️ **PREREQUISITO**: Cal.com webhook deve essere configurato (Settings → Webhooks → URL `https://app.evolution-pro.it/api/booking/webhook`, eventi BOOKING_CREATED/RESCHEDULED/CANCELLED/MEETING_ENDED). Senza, questi tag non vengono mai applicati.

---

## §6 — Partnership Evolution €2.790 (post-call)

### Tag emessi via `routers/proposta.py` + service `ciak_partnership_email.py`

| Tag | Trigger | Tipo | Workflow Systeme |
|---|---|---|---|
| `contratto_firmato` | `POST /api/proposta/{token}/firma-contratto` | 🔵 | Email transactional SMTP la manda già il backend (`send_contratto_firmato_async`). Su Systeme: NO workflow email aggiuntivo (rischio duplicato). Tag utile solo per segmento "contratto firmato non ancora pagato" se vuoi un follow-up se il pagamento non arriva entro N giorni. |
| `onboarding_avviato` | Idem | ⚪ | Diagnostico. NO email. |
| `acquisto_partnership` | `POST /api/proposta/{token}/conferma-stripe` o `/conferma-bonifico` | 🔵 | Email "Benvenuto" la manda già il backend SMTP (`send_partnership_benvenuto_async`). Su Systeme: NO workflow email (duplicato). |
| `partner_attivo` | Idem | ⚪ | Diagnostico + segmentazione (filtra "tutti i partner attivi"). |
| `pagamento_2790` | Idem | ⚪ | Diagnostico fiscale/billing. |
| `ciak_partnership_contratto_firmato_email_sent` | Backend dopo SMTP send | ⚪ | Conferma backend che la transactional è partita. NO azione Systeme. |
| `ciak_partnership_benvenuto_email_sent` | Idem | ⚪ | Idem. |
| `ciak_partnership_documenti_email_sent` | `POST /api/proposta/{token}/upload-documenti` (cliente carica docs post-pagamento) | ⚪ | Idem. |
| `ciak_partner_attivo` | Con `ciak_partnership_benvenuto_email_sent` | ⚪ | Idem `partner_attivo`. Duplicato semantico (storico, lasciato per compat). |
| `ciak_partnership_<kind>_email_opened` | Backend dopo apertura via pixel tracking | ⚪ | Open rate transactional. NO azione Systeme. |

⚠️ **NON FARE**: workflow email Systeme su `acquisto_partnership` o `contratto_firmato`. Il backend manda già l'email transactional con credenziali account + PDF allegati. Sovrapporre Systeme = doppia email con voci diverse.

---

## §7 — Cold outreach (Google Places + Lista Fredda)

### Tag emessi via `celery_tasks.daily_systeme_import`
Beat schedule attualmente **COMMENTATO** (sessione 15/5 — Claudio: "restare calmi"). Da riattivare quando le 2 campagne sono pronte.

| Tag | Trigger | Tipo | Workflow Systeme |
|---|---|---|---|
| `ciak_cold_outreach_places` | Import giornaliero contatti `source=google_places` | 🟢 | **Campagna A — Places** (4 email cadenza T+0/T+3/T+7/T+14). Copy in `docs/marketing/email-cold-outreach-ciak.md`. Tono: primo contatto onesto. Exit on tag: `ciak_optin_masterclass`. |
| `ciak_cold_outreach_legacy` | Import giornaliero contatti `source=lista_fredda` | 🟢 | **Campagna B — Legacy** (5 email T+0/T+4/T+9/T+16/T+25). Copy stesso file. Riattivazione, anteprima contenuto masterclass. Exit on tag: `ciak_optin_masterclass`. |
| `ciak_cold_outreach_other` | Import contatti con source diverso | ⚪ | Fallback. Decidi tu: workflow generico o nessuno. |

⚠️ **Tag legacy `Lista_Fredda`** (id 1936026, hardcoded): non più applicato dal backend dal 15/5 (sessione cold outreach STOP). Se vedi contatti con questo tag, sono pre-15/5. Lascialo: serve per filtri storici.

---

## ✅ Checklist finale (10 minuti — fai questi controlli adesso)

### Workflow ESSENZIALI (🟢 — se mancano blocchi il lancio)
- [ ] **`ciak_optin_masterclass`** → sequenza 4 email opt-in, exit `ciak_bought_67`
- [ ] **`ciak_checkpoint_stato_1/2/3/4`** → 4 workflow email Stato (in setup ora via Cowork)
- [ ] **`ciak_bought_67`** → sequenza 3 email post-acquisto, exit `ciak_call_booked`
- [ ] **`ciak_cold_outreach_places`** → campagna A 4 email
- [ ] **`ciak_cold_outreach_legacy`** → campagna B 5 email

### Workflow OPZIONALI ma consigliati (🟡)
- [ ] `ciak_completed` → "Report pronto, prenota la call"
- [ ] `ciak_clicked_67` → retargeting "hai cliccato ma non completato"
- [ ] `ciak_call_cancelled` → "Vuoi riprogrammare?"
- [ ] `ciak_call_done` → "Grazie + attesa Roadmap"

### Workflow da VERIFICARE NON ESISTANO (🚨 evita duplicati)
- [ ] Nessun workflow Systeme manda email su `acquisto_partnership` (backend la manda già)
- [ ] Nessun workflow Systeme manda email su `contratto_firmato` (idem)

### Exit rules da verificare su workflow ESSENZIALI
- [ ] `ciak_optin_masterclass` ha exit `ciak_bought_67`
- [ ] `ciak_checkpoint_stato_<n>` ha exit `ciak_bought_67` (opzionale: anche `ciak_clicked_67`)
- [ ] `ciak_bought_67` ha exit `ciak_call_booked`
- [ ] `ciak_cold_outreach_places/legacy` ha exit `ciak_optin_masterclass`

### Tag setup (opzionali)
- [ ] Per ogni workflow checkpoint stato_<n>: aggiungi Action "Apply tag `ciak_checkpoint_email_opened_stato_<n>`" su evento "Email opened" — per popolare l'open rate nel masterclass-analytics admin.

---

## Debug se qualcosa non funziona

### "L'email non arriva"
1. Vai su Systeme → Contacts → cerca l'email del lead test
2. Verifica che il tag triggering esista nella sua "Tags" list
3. Vai su Activity → cerca evento "Workflow enrolled" / "Email sent"
4. Se workflow enrolled ma email non inviata: probabilmente exit rule scattato per altro tag già presente (es. lead ha già `ciak_bought_67` e workflow `ciak_optin_masterclass` ha quell'exit)
5. Se workflow NON enrolled: tag non scattato o workflow disattivo

### "Vedo tag duplicati / doppi invii"
- Cerca workflow vecchi che si triggerano sullo stesso tag. Disattivali (non eliminare, per audit storico).
- Esempi noti di tag duplicati semantici: `ciak_partner_attivo` ↔ `partner_attivo` (gestione storica, OK averli entrambi se nessun workflow usa il secondo).

### "Backend mostra tag applicato ma su Systeme non lo vedo"
- Verifica audit log MongoDB: collection `ciak_systeme_events` → trova evento per quella email, controlla campo `applied_tags` vs `failed_tags`. Se `failed_tags` non vuoto: errore Systeme API (rate limit o invalid token).
- Probabilmente env var `SYSTEME_API_KEY` su Cloud Run scaduta.

---

## Audit URLs operativi

- **Systeme.io dashboard**: https://systeme.io/dashboard
- **Audit Mongo eventi Systeme**: `db.ciak_systeme_events` (timestamp + applied_tags + failed_tags per ogni emit)
- **Analytics interno funnel**: https://www.ciak.io/admin/masterclass-analytics
- **Configurazione runtime** (Cal.com URL, ecc.): https://www.ciak.io/admin/configurazione
