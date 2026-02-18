# Evolution PRO OS - Documentazione Completa del Sistema

**Data:** Febbraio 2026
**Versione:** 1.0
**Scopo:** Documento tecnico per definire le istruzioni degli agenti AI

---

## 1. COS'È EVOLUTION PRO OS

Evolution PRO OS è una piattaforma web proprietaria per l'automazione di workflow aziendali nel settore della creazione e vendita di videocorsi. Il sistema è progettato per supportare:

1. **Il Founder (Claudio)** - Gestione centralizzata di partner, vendite, marketing
2. **I Partner** - Creatori di videocorsi che seguono un percorso guidato (F0 → F1 → F2 → F3)

L'elemento centrale è **VALENTINA**, un'orchestratrice AI che coordina altri agenti specializzati per eseguire task reali.

---

## 2. ARCHITETTURA TECNICA ATTUALE

### Stack Tecnologico
```
Frontend: React 18 + TailwindCSS + Shadcn/UI
Backend: FastAPI (Python 3.11)
Database: MongoDB Atlas
LLM: Claude Sonnet 4 (via Emergent LLM Key)
Hosting: Kubernetes (Emergent Platform)
```

### Struttura File Principali
```
/app/backend/
├── server.py                 # Monolite 10.770 righe, 295 endpoint
├── valentina_ai.py           # Logica AI di VALENTINA
├── valentina_actions.py      # Action Dispatcher - mappa comandi → funzioni
├── valentina_memory.py       # Sistema memoria persistente
├── integrated_services.py    # Background worker + Systeme.io client
├── orion_service.py          # Servizio ORION (lead scoring)
├── agent_hub_service.py      # Gestione stati agenti
└── routers/                  # Struttura preparata per refactoring

/app/frontend/src/
├── App.js                    # Routing principale
├── components/
│   ├── admin/                # Dashboard amministratore
│   ├── partner/              # Area partner
│   └── ui/                   # Componenti Shadcn
```

---

## 3. INTEGRAZIONI ESTERNE ATTIVE

### 3.1 Systeme.io (CRM + Email + Pagamenti)
**Stato: ✅ FUNZIONANTE**

| Operazione | Endpoint | Status |
|------------|----------|--------|
| Lettura contatti | GET /api/contacts | ✅ |
| Ricerca per email | GET /api/contacts?email=X | ✅ |
| Creazione contatto | POST /api/contacts | ✅ |
| Lettura tag | GET /api/tags | ✅ |
| Creazione tag | POST /api/tags | ✅ |
| Aggiunta tag a contatto | POST /api/contacts/{id}/tags | ✅ |

**Limitazioni API Systeme.io:**
- ❌ NON può creare/modificare pipeline
- ❌ NON può creare/modificare funnel
- ❌ NON può creare/modificare automazioni
- ❌ NON può spostare contatti in colonne specifiche della pipeline

**Credenziali:**
- API Key: Configurata in `/app/backend/.env`
- Scadenza: 31/12/2028

### 3.2 MongoDB Atlas
**Stato: ✅ FUNZIONANTE**

Database: `evolution_pro`

**Collezioni principali:**
- `partners` - Dati partner (26 attivi)
- `systeme_contacts` - Cache contatti Systeme.io (13.349 lead)
- `agent_tasks` - Task creati dagli agenti
- `agents` - Configurazione agenti AI
- `chat_sessions` - Storico conversazioni VALENTINA
- `valentina_knowledge` - Memoria persistente VALENTINA

### 3.3 Cloudinary (Media)
**Stato: ✅ FUNZIONANTE**
- Upload immagini/video
- Trasformazioni base

### 3.4 Stripe (Pagamenti)
**Stato: ✅ CONFIGURATO**
- Webhook attivi
- Gestione abbonamenti

### 3.5 YouTube API
**Stato: ❌ TOKEN SCADUTO**
- Richiede ri-autenticazione OAuth

---

## 4. GLI AGENTI AI - STATO ATTUALE DETTAGLIATO

### 4.1 VALENTINA (Orchestratrice Centrale)
**File:** `valentina_ai.py`, `valentina_actions.py`

**Cosa FA ora:**
- Risponde in linguaggio naturale (italiano)
- Riconosce 25+ azioni tramite keyword matching
- Crea task per altri agenti
- Differenzia tra utente Admin (Claudio) e Partner
- Mantiene memoria della conversazione (sessione LLM)
- Ha memoria persistente (fatti importanti salvati in DB)

**Sistema di rilevamento azioni:**
```python
# Esempio da valentina_actions.py
"add_systeme_tag": {
    "agent": "GAIA",
    "scope": "internal",  # Solo admin può usarla
    "keywords": ["aggiungi tag", "aggiungi il tag", "metti tag", ...]
}
```

**Azioni disponibili per Admin (scope: internal):**
| Azione | Agente | Funziona |
|--------|--------|----------|
| get_lead_stats | ORION | ✅ |
| get_hot_leads | ORION | ✅ |
| analyze_lead | ORION | ✅ |
| get_leads_to_reactivate | ORION | ✅ |
| migrate_leads_segment | ORION | ✅ |
| get_conversion_potential | ORION | ✅ |
| get_sales_kpi | MARTA | ✅ |
| get_pipeline_status | MARTA | ✅ |
| get_partner_revenue | MARTA | ✅ |
| add_systeme_tag | GAIA | ✅ |
| trigger_email_campaign | GAIA | ⚠️ Parziale |
| sync_systeme_contacts | GAIA | ✅ |
| generate_email_copy | STEFANIA | ✅ |
| generate_social_copy | STEFANIA | ✅ |
| create_video_task | ANDREA | ⚠️ Solo task |
| get_retention_stats | ATLAS | ✅ |
| check_contract_status | LUCA | ✅ |

**Azioni disponibili per Partner (scope: external):**
| Azione | Agente | Funziona |
|--------|--------|----------|
| get_my_progress | VALENTINA | ✅ |
| get_next_steps | VALENTINA | ✅ |
| ask_question | VALENTINA | ✅ |

**Prompt di sistema attuale:**
- Admin: Prompt dettagliato che specifica cosa può/non può fare
- Partner: Prompt limitato al supporto sul percorso

**Limitazioni attuali:**
- Non ha conoscenza del nuovo workflow (Landing → Approvazione)
- Non sa come coordinare la creazione di landing page
- Non ha istruzioni su editing video specifico

---

### 4.2 ORION (Lead Intelligence)
**File:** `orion_service.py`, `valentina_actions.py`

**Cosa FA ora:**
- Legge statistiche lead dal database locale
- Classifica lead in segmenti: HOT, WARM, COLD, FROZEN
- Calcola potenziale di conversione
- Identifica lead da riattivare

**Dati che può fornire:**
```
- Totale lead: 13.349
- Distribuzione per segmento
- Top lead per score
- Lead da riattivare
- Potenziale revenue stimato
```

**Limitazioni:**
- Lo scoring è basico (non usa ML reale)
- I dati sono una cache di Systeme.io (può essere non aggiornata)
- Non può modificare dati su Systeme.io direttamente

---

### 4.3 MARTA (Sales & KPI)
**File:** `valentina_actions.py`

**Cosa FA ora:**
- Legge KPI vendite dal database
- Mostra pipeline commerciale (partner per fase)
- Calcola revenue per partner

**Dati che può fornire:**
```
- Partner per fase (F0, F1, F2, F3)
- Revenue totale e per partner
- Tasso conversione tra fasi
```

**Limitazioni:**
- Solo lettura, non può modificare nulla
- Dati dipendono dalla qualità del database

---

### 4.4 GAIA (Funnel & Systeme.io)
**File:** `integrated_services.py`, `valentina_actions.py`

**Cosa FA ora:**
- Aggiunge tag a contatti su Systeme.io ✅
- Crea tag se non esistono ✅
- Crea contatti se non esistono (email valide) ✅
- Sincronizza contatti da Systeme.io al DB locale ✅

**Come funziona:**
1. VALENTINA rileva azione (es: "aggiungi tag X a Y")
2. Crea un task nella collezione `agent_tasks`
3. Background worker (ogni 60 secondi) processa i task pending
4. Esegue chiamata API a Systeme.io
5. Aggiorna status task (completed/failed)

**Task types supportati:**
- `add_tag` - Aggiunge tag a contatto
- `sync_contacts` - Sincronizza contatti

**Limitazioni:**
- Non può creare landing/funnel su Systeme.io (API non lo permette)
- Non può modificare pipeline
- Email devono avere dominio DNS valido

---

### 4.5 STEFANIA (Copy Factory)
**File:** `valentina_actions.py`, sezione copy in `server.py`

**Cosa FA ora:**
- Genera copy per email (soggetto + corpo)
- Genera copy per social (post + hashtag)
- Usa template predefiniti + personalizzazione

**Template disponibili:**
- Email di benvenuto
- Email promozionale
- Email urgenza/scarsità
- Post social annuncio
- Post social testimonianza

**Limitazioni:**
- Non integrata con workflow landing page
- Non salva i copy generati per riuso
- Non ha contesto sul partner specifico

---

### 4.6 ANDREA (Video Production)
**File:** `valentina_actions.py`, `server.py`

**Cosa FA ora:**
- Crea task di editing video (solo registrazione, non esecuzione)
- Integrazione HeyGen per avatar AI (parziale)

**Limitazioni:**
- NON esegue editing video automatico
- Richiede intervento manuale per processare
- Manca integrazione con FFmpeg/Shotstack/Creatomate

---

### 4.7 ATLAS (Customer Success & LTV)
**File:** `valentina_actions.py`

**Cosa FA ora:**
- Legge statistiche retention dal database
- Mostra LTV (Lifetime Value) stimato

**Limitazioni:**
- Solo lettura
- Dati limitati

---

### 4.8 LUCA (Legal & Compliance)
**File:** `valentina_actions.py`, endpoint PDF in `server.py`

**Cosa FA ora:**
- Verifica stato contratti partner
- Genera PDF contratto personalizzato

**Funziona:** ✅

---

## 5. BACKGROUND WORKER (Job Executor)

**File:** `integrated_services.py`

**Come funziona:**
```python
# Ciclo ogni 60 secondi
1. Query: db.agent_tasks.find({"status": "pending"})
2. Per ogni task:
   - Cambia status → "in_progress"
   - Esegue l'operazione (es: API call a Systeme.io)
   - Cambia status → "completed" o "failed"
   - Salva risultato
```

**Task types gestiti:**
- `add_tag` → Chiama Systeme.io API
- `sync_contacts` → Importa contatti
- `trigger_campaign` → Aggiunge tag per trigger automazione

**Collezione `agent_tasks`:**
```json
{
  "id": "uuid",
  "title": "Descrizione task",
  "task_type": "add_tag",
  "agent": "GAIA",
  "status": "pending|in_progress|completed|failed",
  "data": { "email": "...", "tag_name": "..." },
  "result": { "success": true, "message": "..." },
  "created_by": "valentina",
  "created_at": "ISO date",
  "completed_at": "ISO date"
}
```

---

## 6. AREA PARTNER ATTUALE

### Fasi del percorso partner:
- **F0** - Onboarding iniziale
- **F1** - Creazione contenuti
- **F2** - Setup tecnico
- **F3** - Lancio e vendita

### Funzionalità disponibili:
- Dashboard con progress
- Chat con VALENTINA
- Documenti e contratti
- Bonus strategici
- Download materiali

### Funzionalità MANCANTI per nuovo workflow:
- ❌ Sezione "La Mia Landing"
- ❌ Preview landing page
- ❌ Sistema approvazione/feedback
- ❌ Storico revisioni

---

## 7. OBIETTIVO CONCORDATO

### Architettura Target

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEME.IO                                 │
│  - CRM & Contatti                                               │
│  - Pagamenti & Checkout                                         │
│  - Email & Automazioni                                          │
│  - Area Corso (hosting video)                                   │
│  - Area Riservata Partner                                       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ (API: tag, contatti, webhook)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVOLUTION PRO OS                             │
│                                                                 │
│  AGENTI AI:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ VALENTINA (Orchestratrice)                               │   │
│  │ - Riceve richieste                                       │   │
│  │ - Smista agli agenti specializzati                       │   │
│  │ - Coordina workflow                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│     ┌─────┴─────┬─────────┬─────────┬─────────┐                │
│     ▼           ▼         ▼         ▼         ▼                │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐              │
│  │ORION│   │MARTA│   │STEF.│   │ANDREA│  │GAIA │              │
│  │Lead │   │Sales│   │Copy │   │Video │  │Mail │              │
│  └─────┘   └─────┘   └─────┘   └─────┘  └─────┘              │
│                                                                 │
│  FUNZIONALITÀ DA COSTRUIRE:                                    │
│  - Landing Page Builder                                         │
│  - Sistema Preview/Approvazione                                 │
│  - Video Editing Automatico                                     │
│  - Export per Systeme.io                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow Target: Creazione Landing

```
FASE 1: BRIEF
├── Team inserisce copy + layout per partner specifico
├── STEFANIA può generare varianti copy
└── Admin assegna a partner

FASE 2: REALIZZAZIONE  
├── Sistema genera landing da template + copy
├── Varianti create automaticamente
└── Preview generata

FASE 3: REVISIONE
├── Partner vede preview in area riservata
├── Può approvare o richiedere modifiche
├── Commenti specifici su sezioni
└── Storico revisioni mantenuto

FASE 4: DEPLOY
├── Una volta approvato → Export HTML
├── Caricamento su Systeme.io (manuale o semi-auto)
└── Collegamento a checkout Systeme.io
```

### Workflow Target: Video Editing

```
FASE 1: UPLOAD
├── Partner carica video raw
└── Sistema analizza (durata, qualità, audio)

FASE 2: EDITING
├── ANDREA applica template editing
├── Operazioni: intro/outro, sottotitoli, watermark, color correction
└── Genera preview

FASE 3: REVISIONE
├── Partner approva o richiede modifiche
└── Iterazioni fino ad approvazione

FASE 4: EXPORT
├── Render finale
├── Upload su Cloudinary/YouTube
└── Link per Systeme.io
```

---

## 8. GAP DA COLMARE

### 8.1 Istruzioni Agenti (PRIORITÀ ALTA)
Ogni agente deve avere:
- **Identità chiara** - Chi è, cosa fa, come parla
- **Capabilities** - Lista esatta di cosa può fare
- **Limitations** - Cosa NON può fare
- **Workflow** - Come interagisce con altri agenti
- **Trigger phrases** - Frasi che attivano le sue azioni

### 8.2 Funzionalità Mancanti

| Funzionalità | Priorità | Complessità |
|--------------|----------|-------------|
| Istruzioni agenti complete | P0 | Media |
| Landing Page Builder | P1 | Alta |
| Sistema Preview/Approvazione | P1 | Media |
| Video Editing (FFmpeg base) | P2 | Alta |
| Export HTML per Systeme.io | P1 | Bassa |
| Storico revisioni | P2 | Media |

### 8.3 Integrazioni Mancanti

| Integrazione | Scopo | Priorità |
|--------------|-------|----------|
| FFmpeg | Editing video programmatico | P2 |
| Shotstack/Creatomate | Editing video avanzato | P3 |
| YouTube (ri-auth) | Upload video | P1 |

---

## 9. DATABASE SCHEMA RILEVANTI

### Partner
```javascript
{
  _id: ObjectId,
  id: "uuid",
  email: "email@example.com",
  name: "Nome Partner",
  business_name: "Nome Business",
  phase: "F0|F1|F2|F3",
  status: "active|pending|suspended",
  created_at: ISODate,
  // ... altri campi
}
```

### Agent Task
```javascript
{
  _id: ObjectId,
  id: "uuid",
  title: "Descrizione",
  task_type: "add_tag|sync_contacts|...",
  agent: "GAIA|ANDREA|...",
  status: "pending|in_progress|completed|failed",
  data: { /* parametri specifici */ },
  result: { success: Boolean, message: String },
  created_by: "valentina|admin",
  created_at: ISODate,
  completed_at: ISODate
}
```

### Landing Page (DA CREARE)
```javascript
{
  _id: ObjectId,
  id: "uuid",
  partner_id: "uuid",
  template_id: "template_name",
  title: "Titolo Landing",
  status: "draft|review|approved|published",
  content: {
    hero: { headline: "", subheadline: "", cta: "" },
    sections: [{ type: "", content: {} }]
  },
  feedback: [
    { date: ISODate, author: "partner|admin", message: "", resolved: Boolean }
  ],
  versions: [
    { version: 1, date: ISODate, content: {} }
  ],
  created_at: ISODate,
  updated_at: ISODate,
  approved_at: ISODate,
  published_url: "https://..."
}
```

---

## 10. API ENDPOINTS PRINCIPALI

### Autenticazione
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Utente corrente

### Partner
- `GET /api/partners` - Lista partner (admin)
- `GET /api/partners/{id}` - Dettaglio partner
- `PATCH /api/partners/{id}` - Aggiorna partner

### Chat VALENTINA
- `POST /api/chat` - Invia messaggio a VALENTINA

### Agent Tasks
- `POST /api/agent-tasks` - Crea task
- `GET /api/agent-tasks/dashboard` - Lista task

### Systeme.io
- `GET /api/systeme/contacts/{partner_id}` - Contatti
- `POST /api/systeme/tag/add` - Aggiungi tag
- `POST /api/systeme/sync` - Sincronizza

### ORION
- `GET /api/orion/segments` - Segmenti lead
- `GET /api/orion/score/{email}` - Score lead

---

## 11. DOMANDE PER DEFINIRE LE ISTRUZIONI AGENTI

### VALENTINA
1. Come deve rispondere quando non può eseguire un'azione?
2. Come deve coordinare il workflow landing page?
3. Deve avere personalità diversa con admin vs partner?
4. Come gestisce le richieste ambigue?

### ORION
1. Quali metriche deve calcolare automaticamente?
2. Come definisce i segmenti (soglie score)?
3. Deve suggerire azioni proattivamente?

### MARTA
1. Quali KPI deve tracciare?
2. Come calcola le previsioni?
3. Deve generare report periodici?

### STEFANIA
1. Quali tipi di copy deve generare?
2. Deve usare tone of voice specifico per partner?
3. Come gestisce le revisioni del copy?

### ANDREA
1. Quali operazioni di editing deve supportare?
2. Usa template predefiniti?
3. Come gestisce video di durata diversa?

### GAIA
1. Quali automazioni email deve poter triggerare?
2. Come sincronizza i dati con Systeme.io?
3. Gestisce la creazione delle landing (export)?

---

## 12. CREDENZIALI E ACCESSI (per testing)

- **Admin:** claudio@evolutionpro.it / Evolution2026!
- **Partner test:** testf0@evolutionpro.it / password
- **MongoDB Atlas:** Configurato in .env
- **Systeme.io API:** Configurato in .env
- **Emergent LLM Key:** Configurato in .env

---

## 13. CONCLUSIONE

Il sistema ha una base solida con:
- ✅ Infrastruttura backend funzionante
- ✅ Integrazione Systeme.io per tag/email
- ✅ Sistema agenti con action dispatcher
- ✅ Background worker per task asincroni
- ✅ Chat VALENTINA funzionante

Manca:
- ❌ Istruzioni dettagliate per ogni agente
- ❌ Landing Page Builder
- ❌ Sistema Preview/Approvazione
- ❌ Video Editing automatico
- ❌ Workflow completo definito

Il prossimo passo è definire le istruzioni precise per ogni agente, partendo da VALENTINA come orchestratrice centrale.
