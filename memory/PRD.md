# Evolution PRO OS - Product Requirements Document

**Ultimo aggiornamento:** 16 Marzo 2026

## CICLO COMPLETO EVOLUTION PRO ✅

```
Posizionamento → Masterclass → Videocorso → Funnel → Lancio → Ottimizzazione → Continuità
```

---

## 🆕 DASHBOARD OPERATIONS (Antonella) ✅ (16 Mar 2026)

**Implementato e testato al 100% (16/16 test passati)**

### Credenziali Antonella
- **Email:** `antonella@evolution-pro.it`
- **Password:** `OperationsAnto2024!`
- **Ruolo:** `operations`

### Sezioni Dashboard
1. **Partner** - Lista card partner attivi (F1-F5) con alert ritardi
2. **Contenuti** - 3 tab: Script & Copy, Social Calendar, Video & Materiali
3. **Campagne ADV** - CRUD completo con metriche (impression, click, lead, CPL)

### Endpoint API (`/api/operations/`)
- `GET /stats` - Statistiche generali
- `GET /partners` - Partner attivi con alert ritardi
- `GET /partner/{id}` - Dettaglio partner
- `PUT /partner/note` - Aggiorna note interne
- `GET /contenuti/{partner_id}` - Documenti, calendar, video
- `POST /contenuti/commento` - Aggiungi commento
- `PUT /contenuti/calendar` - Aggiorna stato calendario
- `GET /campagne` - Lista campagne ADV
- `POST /campagne` - Crea campagna
- `PUT /campagne/{id}` - Aggiorna campagna
- `DELETE /campagne/{id}` - Elimina campagna

### Collection MongoDB: `campagne_adv`
```json
{
  "partner_id": "string",
  "piattaforma": "Meta|Google|TikTok|LinkedIn|Altro",
  "nome_campagna": "string",
  "budget_giornaliero": 0,
  "budget_totale": 0,
  "data_inizio": "2026-03-16",
  "data_fine": null,
  "stato": "attiva|in_pausa|terminata",
  "risultati": {
    "impression": 0,
    "click": 0,
    "lead": 0,
    "costo_per_lead": 0,
    "conversioni": 0
  }
}
```

### Vista Antonella (Claudio)
Claudio ha nel menu "👁 Vista Antonella" che apre `/dashboard/operations` in nuova tab.

---

## 🆕 NUOVO FLUSSO ANALISI & ONBOARDING CLIENTE ✅ (15 Mar 2026)

**Implementato e testato al 100% (26/26 test passati)**

### Flusso Completo

```
Cliente compila questionario
    ↓
Sistema AUTO-GENERA "Bozza Analisi" (NASCOSTA al cliente)
    ↓
Admin: Visualizza, modifica, conferma analisi
    ↓
Admin: Fa call strategica con cliente
    ↓
Admin: Clicca "Attiva fase decisione cliente"
    ↓
Cliente accede a /decisione-partnership
    ↓
Cliente: Visualizza analisi, roadmap, proposta
    ↓
Cliente: Firma contratto digitalmente
    ↓
Cliente: Carica documenti (CI, CF, P.IVA)
    ↓
Cliente: Paga €2.790 (Stripe o Bonifico)
    ↓
Partnership attiva → Redirect a /partner/dashboard
```

### Stati del Flusso
1. `questionario_inviato` - Cliente ha compilato il questionario
2. `bozza_analisi` - Analisi auto-generata (nascosta al cliente)
3. `analisi_pronta_per_call` - Admin ha confermato, pronto per call
4. `decisione_partnership` - Cliente può vedere e decidere
5. `partner_attivo` - Partnership attivata

### Template Analisi (13 Sezioni Professionali)
1. **Copertina** - Titolo e dati cliente
2. **Introduzione** - Perché hai ricevuto questa analisi
3. **Modello Evolution PRO** - 5 fasi del sistema
4. **Errori Comuni** - Perché i corsi non vendono
5. **Profilo Professionale** - Analisi del cliente
6. **Problema del Mercato** - Validazione domanda
7. **Target e Posizionamento** - Analisi del target
8. **Potenziale del Progetto** - Valutazione qualitativa
9. **Ipotesi di Accademia** - Struttura moduli suggerita
10. **Modello di Monetizzazione** - Pricing suggerito
11. **🆕 Costo del Modello Attuale** - Pagina persuasiva (shift psicologico da "spendo?" a "quanto mi costa restare fermo?")
12. **Esito Fattibilità** - Punteggio 1-10 + **Livello Potenziale** (Basso/Medio/Alto/Molto Alto) + esito
13. **Roadmap** - 5 fasi con tempistiche
14. **Prossimi Passi** - Azioni dopo la call

### Sezione "Costo del Modello Attuale" (Nuova)
- Analizza il modello di lavoro attuale (consulenze 1:1, ore vendute, reddito legato al tempo)
- Spiega il limite strutturale: ogni entrata richiede nuovo tempo
- Sposta la domanda: da "spendo €2.790?" a "quanto mi costa restare fermo?"
- Presenta l'Accademia Digitale come asset per liberare tempo e stabilizzare reddito

### Livello Potenziale (Nuovo)
| Punteggio | Livello |
|-----------|---------|
| 1-4 | Basso |
| 5-6 | Medio |
| 7-8 | Alto |
| 9-10 | Molto Alto |

### Pagina /decisione-partnership
- Analisi Strategica completa (download PDF)
- Roadmap interattiva del progetto
- Proposta Partnership (€2.790)
- Contratto con firma digitale
- Upload documenti (CI, CF, P.IVA)
- Pagamento (Stripe + Bonifico)
- CTA: "Attiva la Partnership Evolution PRO"

### Endpoint API (flusso_analisi.py)
- `GET /api/flusso-analisi/analisi/{user_id}` - Recupera analisi
- `POST /api/flusso-analisi/genera-analisi-auto/{user_id}` - Genera bozza
- `PUT /api/flusso-analisi/modifica-analisi` - Admin modifica sezione
- `POST /api/flusso-analisi/conferma-analisi` - Conferma per call
- `POST /api/flusso-analisi/attiva-decisione` - Sblocca /decisione-partnership
- `GET /api/flusso-analisi/decisione/{user_id}` - Dati pagina cliente
- `POST /api/flusso-analisi/firma-contratto` - Firma digitale
- `POST /api/flusso-analisi/upload-documento/{user_id}` - Upload doc
- `POST /api/flusso-analisi/create-payment-session/{user_id}` - Stripe
- `POST /api/flusso-analisi/conferma-bonifico/{user_id}` - Conferma bonifico
- `POST /api/flusso-analisi/attiva-partnership/{user_id}` - Attiva partner
- `GET /api/flusso-analisi/analisi-pdf/{user_id}` - PDF analisi
- `GET /api/flusso-analisi/contratto-pdf/{user_id}` - PDF contratto

### Pannello Admin: Gestione Flusso Analisi
- Lista clienti con filtri per stato
- Timeline visiva del flusso
- Modal gestione con editing sezioni
- Bottoni: Conferma Analisi, Attiva Decisione, Conferma Bonifico

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

### 13 Mar 2026 - Flusso Consulenziale Completo ✅ NEW
- ✅ **NUOVO SISTEMA DI ANALISI CONSULENZIALE**
  - Analisi Preliminare (interna, non visibile al cliente)
  - Script Call con 8 blocchi per guidare Claudio
  - Analisi Finale post-call con documento consulenziale professionale
  - Revisione Admin + modifica bozza
  - Approvazione e invio al cliente via Systeme.io
- ✅ Backend nuovo router `analisi_consulenziale.py`:
  - `GET /api/analisi-consulenziale/stato/{user_id}`
  - `POST /api/analisi-consulenziale/genera-preliminare`
  - `POST /api/analisi-consulenziale/genera-script-call`
  - `POST /api/analisi-consulenziale/genera-finale`
  - `PUT /api/analisi-consulenziale/modifica-finale`
  - `POST /api/analisi-consulenziale/approva-invia`
  - `GET /api/analisi-consulenziale/script-call-pdf/{user_id}` (PDF per Claudio)
  - `GET /api/analisi-consulenziale/analisi-finale-pdf/{user_id}` (PDF per cliente)
- ✅ Frontend nuovo componente `AnalisiConsulenziale.jsx`:
  - Modal con 4 tab: Overview, Analisi Preliminare, Script Call, Analisi Finale
  - Timeline visuale con 4 step
  - Editor per modificare sezioni dell'analisi finale
  - Download PDF script call e analisi finale
- ✅ Integrazione in `AdminClientiAnalisiPanel.jsx`:
  - Nuovo pulsante "Consulenziale" (viola) per clienti con questionario+pagamento
  - Accesso rapido dalla tabella clienti
- ✅ Tag Systeme.io: `analisi_finale_pronta` per email automatica
- ✅ 4 stati: `questionario_ricevuto` → `analisi_preliminare_generata` → `analisi_finale_da_revisionare` → `analisi_consegnata`

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
