# Evolution PRO OS - Product Requirements Document

**Ultimo aggiornamento:** 13 Marzo 2026

## CICLO COMPLETO EVOLUTION PRO ✅

```
Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione → Continuità
```

---

## CONFIGURAZIONE EMAIL E CALENDARIO ✅

### Email: Systeme.io
Le notifiche email sono gestite tramite **Systeme.io** usando i tag:
- `analisi_pronta` → Triggera email "La tua Analisi è pronta"
- `analisi_finale_pronta` → Triggera email con link al documento finale (NUOVO)
- `reminder_analisi` → Triggera email reminder dopo 24h

**Configurazione Systeme.io:**
- Creare automazione che invia email quando tag `analisi_pronta` viene aggiunto
- Creare automazione per `analisi_finale_pronta` con link al PDF
- Creare automazione per `reminder_analisi`
- Template email con link: https://calendar.app.google/ip1MfDcfcrju1WFh6

### Calendario: Google Calendar
Link prenotazione call: `https://calendar.app.google/ip1MfDcfcrju1WFh6`

---

## NUOVO FLUSSO CONSULENZIALE ✅ (13 Mar 2026)

```
Pagamento Analisi (€67)
    ↓
Registrazione su app.evolution-pro.it
    ↓
Questionario progetto (7 domande)
    ↓
Admin: Genera Analisi Preliminare (INTERNA - non visibile al cliente)
    ↓
Admin: Genera Script Call (8 blocchi per Claudio)
    ↓
Call Strategica con Claudio
    ↓
Admin: Genera Analisi Finale (documento consulenziale)
    ↓
Admin: Revisione e modifica bozza
    ↓
Admin: Approva e Invia → Systeme.io tag "analisi_finale_pronta"
    ↓
Cliente riceve email con link al PDF
```

### Stati del Sistema
1. `questionario_ricevuto` - Questionario compilato
2. `analisi_preliminare_generata` - Analisi interna pronta
3. `analisi_finale_da_revisionare` - Bozza finale da revisionare
4. `analisi_consegnata` - Documento inviato al cliente

### Struttura Script Call (8 Blocchi)
1. **Apertura Call** - Creare connessione e fiducia
2. **Comprendere il Cliente** - Domande per approfondire
3. **Analisi del Problema** - Evidenziare difficoltà target
4. **Valutazione Competenza** - Verificare esperienza e metodo
5. **Presentazione Modello Accademia** - Mostrare possibilità
6. **Verifica Fattibilità** - Valutare sostenibilità
7. **Introduzione Partnership** - Spiegare Evolution PRO
8. **Chiusura e Prossimi Passi** - Definire next steps

### Struttura Analisi Finale
- Copertina
- Introduzione personalizzata
- Profilo professionale
- Problema del mercato
- Potenziale di mercato
- Ipotesi di Accademia Digitale
- Modello di Business
- Valutazione del progetto (punteggio 1-10)
- Prossimi passi

### Endpoint API
- `GET /api/analisi-consulenziale/stato/{user_id}`
- `POST /api/analisi-consulenziale/genera-preliminare`
- `POST /api/analisi-consulenziale/genera-script-call`
- `POST /api/analisi-consulenziale/genera-finale`
- `PUT /api/analisi-consulenziale/modifica-finale`
- `POST /api/analisi-consulenziale/approva-invia`
- `GET /api/analisi-consulenziale/script-call-pdf/{user_id}`
- `GET /api/analisi-consulenziale/analisi-finale-pdf/{user_id}`

---

## FLUSSO CLIENTE (Precedente)

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
[Admin usa NUOVO FLUSSO CONSULENZIALE]
    ↓
[Systeme.io: tag "analisi_finale_pronta" → email automatica]
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

**Route:** `/partner/lancio`

#### CALENDARIO EDITORIALE 30 GIORNI ✅ NEW - Marzo 2026

**Route:** `/partner/lancio/calendario`

Sistema di generazione AI del piano contenuti per il lancio:

**4 Settimane:**
1. **Settimana 1 - Attenzione:** Storia personale, errore comune, contenuto educativo
2. **Settimana 2 - Autorità:** Mini lezione, case study, dietro le quinte
3. **Settimana 3 - Coinvolgimento:** FAQ, miti da sfatare, invito masterclass
4. **Settimana 4 - Lancio:** Apertura iscrizioni, testimonianze, ultimo giorno

**Per ogni giorno:**
- Tipo contenuto
- Idea contenuto
- Formato (post/reel/story/live/carousel)
- Obiettivo

**Export:** PDF, CSV, Google Calendar (.ics)

### FASE 6: OTTIMIZZAZIONE ✅

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

#### WEBINAR MENSILE EVOLUTION ✅ NEW - Marzo 2026

**Route:** `/partner/webinar`

Sistema per organizzare e promuovere webinar live mensili su Zoom per vendere il videocorso.

**4 Sezioni:**
1. **Header** - Titolo webinar generato AI, data suggerita, durata 45 min
2. **Struttura Webinar** - Scaletta standard 6 blocchi:
   - Introduzione (5 min)
   - Il Problema (8 min)
   - Il Metodo (12 min)
   - Caso Studio (8 min)
   - Presentazione Corso (7 min)
   - Call To Action (5 min)
3. **Promozione** - Contenuti generati AI:
   - EMAIL: Invito, Reminder, Ultimo posto
   - SOCIAL: Post annuncio, 3 Stories promozionali
   - Ogni elemento ha "Copia testo"
4. **Replay Automatico** - Flusso: Live → Registrazione → Replay 48h → Email follow-up

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

## PIANI CONTINUITÀ ✅ NEW - Marzo 2026

**Route:** `/partner/continuita`

Pagina di vendita accessibile quando il contratto si avvicina alla scadenza o il partner vuole crescere.

### 3 PIANI:

| Piano | Prezzo | Include |
|-------|--------|---------|
| **Continuity** | €97/mese | Hosting Accademia, Monitoraggio tecnico, Funnel attivo, Report mensile automatico, Supporto base |
| **Growth** ⭐ | €197/mese | Tutto Continuity + Analisi vendite, Ottimizzazione funnel, Strategia mensile, 1 call/mese |
| **Scale** | €397/mese | Tutto Growth + Lancio periodico, Marketing avanzato, 2 call/mese, Supporto prioritario |

---

## API ENDPOINTS - CALENDARIO LANCIO ✅ NEW

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/partner-journey/lancio/calendario/{partner_id}` | Recupera calendario esistente |
| `POST /api/partner-journey/lancio/genera-calendario` | Genera 30 giorni con AI |
| `POST /api/partner-journey/lancio/export-calendario` | Export PDF/CSV/ICS |

---

## API ENDPOINTS - OTTIMIZZAZIONE ✅

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/partner-journey/ottimizzazione/{partner_id}` | Dati completi fase ottimizzazione |
| `POST /api/partner-journey/ottimizzazione/genera-report` | Genera report AI |
| `POST /api/partner-journey/ottimizzazione/salva-azioni` | Salva stato azioni |
| `POST /api/partner-journey/ottimizzazione/crea-caso-studio` | Crea caso studio (se soglia raggiunta) |
| `GET /api/partner-journey/ottimizzazione/caso-studio/{id}` | Dettagli caso studio |

---

## API ENDPOINTS - PARTNER JOURNEY ✅

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

### 13 Mar 2026 - Funnel Completo + Lead Management
- ✅ Pagina Funnel con 5 blocchi completi:
  1. Generazione Funnel (6 pagine con preview/approva/modifica)
  2. Revisione Contenuti (headline, sottotitolo, promessa, CTA, email)
  3. Configurazione Dominio (salvataggio + verifica DNS)
  4. Pagine Legali (Privacy, Cookie, Termini, Disclaimer con PDF)
  5. Pubblicazione su Systeme.io
- ✅ Backend endpoints nuovi in `partner_journey.py`:
  - `GET /api/partner-journey/funnel-complete/{partner_id}`
  - `POST /api/partner-journey/funnel/save-domain`
  - `POST /api/partner-journey/funnel/verify-domain`
  - `POST /api/partner-journey/funnel/generate-legal`
  - `POST /api/partner-journey/funnel/approve-legal`
  - `GET /api/partner-journey/funnel/legal-pdf/{partner_id}/{page_id}`
- ✅ Nuova pagina Lead Management (`/partner/lead`):
  - Tabella leads con Nome, Email, Telefono, Data, Origine, Status
  - Filtri per data, funnel, status
  - Export CSV
  - Modifica status e note per singolo lead
  - Webhook per ricevere lead da Systeme.io
- ✅ Sidebar aggiornata con voce "I miei Lead"

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
