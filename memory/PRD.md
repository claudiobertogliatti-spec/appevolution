# Evolution PRO OS - Product Requirements Document

## CONFIGURAZIONE EMAIL E CALENDARIO ✅

### Email: Systeme.io
Le notifiche email sono gestite tramite **Systeme.io** usando i tag:
- `analisi_pronta` → Triggera email "La tua Analisi è pronta"
- `reminder_analisi` → Triggera email reminder dopo 24h

**Configurazione Systeme.io:**
- Creare automazione che invia email quando tag `analisi_pronta` viene aggiunto
- Creare automazione per `reminder_analisi`
- Template email con link: https://calendar.app.google/ip1MfDcfcrju1WFh6

### Calendario: Google Calendar
Link prenotazione call: `https://calendar.app.google/ip1MfDcfcrju1WFh6`

---

## FLUSSO CLIENTE

```
/analisi-strategica (Registrazione)
    ↓
/questionario (7 Domande)
    ↓
/analisi-attivazione (Pagamento €67)
    ↓
[Stripe Checkout]
    ↓
/analisi-in-preparazione
    ↓
[Admin genera analisi AI]
    ↓
[Systeme.io: tag "analisi_pronta" → email automatica]
    ↓
Dashboard: "La tua Analisi Strategica è pronta"
    ↓
Prenota call (Google Calendar)
    ↓
[Call con Claudio → Approvazione]
    ↓
/attivazione-partnership (5 Step)
```

---

## FLUSSO ATTIVAZIONE PARTNERSHIP ✅

Dopo la call strategica, se il cliente viene approvato, accede a `/attivazione-partnership`:

**5 Step:**
1. **Analisi Strategica** - Visualizza l'analisi generata dall'admin
2. **Conferma Partnership** - Legge e conferma la sintesi della collaborazione
3. **Firma Contratto** - Scarica e carica il contratto firmato
4. **Documenti Personali** - Upload carta d'identità + codice fiscale
5. **Pagamento** - €2.790 una tantum via Stripe o Bonifico

---

## PERCORSO PARTNER (AI COURSE FACTORY) ✅ NEW - Dicembre 2025

Il partner, dopo l'attivazione, segue un percorso guidato in 5 fasi:

### FASE 1: POSIZIONAMENTO
Wizard in 5 step per definire le fondamenta del progetto:
1. Studente ideale
2. Obiettivo dello studente
3. Trasformazione (prima/dopo)
4. Metodo/Framework
5. Obiezioni principali

**Al completamento:** AI genera automaticamente la struttura del videocorso (5 moduli x 3 lezioni)

### FASE 2: MASTERCLASS
Costruzione della masterclass gratuita:
- **Fase Script:** 5 blocchi (Intro, Problema, Metodo, Caso Studio, Invito)
- **Fase Registrazione:** Upload video masterclass (30-40 min)

### FASE 3: VIDEOCORSO
Upload delle lezioni del corso seguendo la struttura generata in Fase 1.
Ogni lezione viene caricata e approvata dal team Evolution PRO.

### FASE 4: FUNNEL (AI Course Factory)
Generazione automatica del sistema di vendita:
- Opt-in page
- Pagina Masterclass
- Sales page
- Checkout
- Sequenza email (6 email automatiche)

**Al completamento:** Pubblicazione su Systeme.io via OpenClaw

### FASE 5: LANCIO
Checklist finale prima del go-live:
- ✅ Masterclass registrata
- ✅ Videocorso caricato
- ✅ Funnel approvato
- ✅ Email attive
- 🚀 Attivazione Accademia Digitale

**Al clic su "Attiva Lancio":** `stato_progetto = OTTIMIZZAZIONE`

### FASE 6: OTTIMIZZAZIONE ✅ NEW - Dicembre 2025

Fase post-lancio che dura dal **mese 1 al mese 12**.
Obiettivo: **trasformare i partner in casi studio**.

**4 Sezioni:**

1. **STATO ACCADEMIA** - KPI principali
   - Studenti totali
   - Vendite mese corrente
   - Lead generati
   - Conversione funnel %
   - *Dati recuperati da Systeme.io API*

2. **REPORT AI** - Analisi automatica
   - Cosa sta funzionando
   - Cosa migliorare
   - Prossima azione consigliata
   - Pulsante: "Genera report"

3. **AZIONI CONSIGLIATE** - Checklist operativa
   - Pubblica contenuti social
   - Ripromuovi masterclass
   - Raccogli testimonianze
   - *Stati: non iniziata / in corso / completata*

4. **CASO STUDIO** - Proof Generation
   - Mostra: studenti, fatturato, recensioni
   - **Soglia unlock:** 10 studenti OPPURE €1.000 fatturato
   - Pulsante: "Crea il tuo Caso Studio Evolution"

---

## LOGICA TEMPORALE PARTNERSHIP ✅ NEW

La durata della partnership Evolution PRO è di **12 mesi** a partire dal momento del pagamento.

**Variabili:**
- `data_pagamento` → data attivazione
- `data_scadenza` = data_pagamento + 12 mesi
- `giorni_rimanenti` = giorni fino a scadenza

**Dashboard Partner mostra:**
- Partnership Attiva/Scaduta
- Data attivazione
- Data scadenza
- Giorni rimanenti

**Scadenza:** Quando data corrente > data_scadenza:
- `stato_partner = scaduto`
- Messaggio: "La tua partnership è scaduta. Contatta il team Evolution PRO per il rinnovo o per attivare il Piano Continuità."

---

## API ENDPOINTS - OTTIMIZZAZIONE ✅ NEW

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/partner-journey/progress/{partner_id}` | Stato complessivo percorso partner |
| `GET /api/partner-journey/posizionamento/{partner_id}` | Dati posizionamento |
| `POST /api/partner-journey/posizionamento/save-step` | Salva step wizard |
| `POST /api/partner-journey/posizionamento/save-all` | Salva tutti i dati |
| `POST /api/partner-journey/posizionamento/generate-structure` | Genera struttura corso (AI) |
| `POST /api/partner-journey/posizionamento/approve-structure` | Approva struttura |
| `GET /api/partner-journey/masterclass/{partner_id}` | Dati masterclass |
| `POST /api/partner-journey/masterclass/save-blocks` | Salva blocchi script |
| `POST /api/partner-journey/masterclass/generate-script` | Genera script (AI) |
| `POST /api/partner-journey/masterclass/upload-video` | Upload video masterclass |
| `GET /api/partner-journey/videocorso/{partner_id}` | Dati videocorso |
| `POST /api/partner-journey/videocorso/upload-lesson` | Upload lezione |
| `GET /api/partner-journey/funnel/{partner_id}` | Dati funnel |
| `POST /api/partner-journey/funnel/generate` | Genera materiale marketing (AI) |
| `POST /api/partner-journey/funnel/publish` | Pubblica su Systeme.io |
| `GET /api/partner-journey/lancio/{partner_id}` | Stato lancio |
| `POST /api/partner-journey/lancio/activate` | Attiva lancio |

---

## API ENDPOINTS - PARTNERSHIP ACTIVATION

1. **Automazione "Analisi Pronta":**
   - Trigger: Tag `analisi_pronta` aggiunto
   - Azione: Invia email
   - Oggetto: "La tua Analisi Strategica è pronta"
   - CTA: https://calendar.app.google/ip1MfDcfcrju1WFh6

2. **Automazione "Reminder":**
   - Trigger: Tag `reminder_analisi` aggiunto
   - Azione: Invia email reminder
   - Oggetto: "Reminder: La tua Analisi ti aspetta"

---

## CREDENZIALI

| Tipo | Email | Password |
|------|-------|----------|
| Admin | claudio.bertogliatti@gmail.com | Evoluzione74 |
| Cliente test (con analisi) | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

### 13 Mar 2026 - Attivazione Partnership
- ✅ Pagina `/attivazione-partnership` con 5 step
- ✅ Backend router `/api/partnership/*` completo
- ✅ Upload documenti (contratto, carta identità, codice fiscale)
- ✅ Pagamento €2.790 via Stripe con Klarna
- ✅ Bonifico bancario con coordinate Revolut
- ✅ PDF contratto partnership scaricabile
- ✅ Conversione automatica da cliente a partner

### 12-13 Mar 2026
- ✅ Email tramite Systeme.io (tag `analisi_pronta`, `reminder_analisi`)
- ✅ Calendario Google: https://calendar.app.google/ip1MfDcfcrju1WFh6
- ✅ Rimosso Resend, integrato con Systeme.io esistente

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **Systeme.io:** ✅ Integrato (API key configurata)
- **Google Calendar:** ✅ Link configurato
- **Stripe:** ✅ Live (€67 analisi + €2.790 partnership)
- **PDF Contratto:** ✅ Accessibile
