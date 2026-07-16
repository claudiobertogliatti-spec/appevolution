# Evolution PRO OS - Guida Completa alla Migrazione

## 📋 Overview

**Evolution PRO OS** è una piattaforma web per l'automazione di workflow business, con:
- **Frontend**: React 19 + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python 3.11+)
- **Database**: MongoDB Atlas
- **AI**: Claude (Anthropic) via Emergent Integrations

---

## 🗂️ Struttura del Progetto

```
/app
├── backend/                      # FastAPI Backend
│   ├── server.py                 # Main app (~11K linee)
│   ├── valentina_ai.py           # AI Orchestrator (VALENTINA)
│   ├── valentina_memory.py       # Memoria persistente AI
│   ├── valentina_actions.py      # Action dispatcher
│   ├── routers/
│   │   ├── clienti.py            # Funnel clienti (Analisi Strategica)
│   │   ├── auth.py               # Autenticazione
│   │   └── orion.py              # Lead scoring
│   ├── services/
│   │   └── pdf_generator.py      # Generazione PDF branded
│   ├── cloudinary_service.py     # Upload media
│   ├── tts_generator.py          # Text-to-Speech
│   ├── video_processor.py        # Elaborazione video
│   ├── youtube_uploader.py       # YouTube API
│   ├── systeme_mcp.py            # Systeme.io API
│   ├── requirements.txt
│   ├── .env                      # Environment variables
│   └── assets/
│       └── logo_evolutionpro.png # Logo per PDF
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── App.js                # Router principale
│   │   ├── components/
│   │   │   ├── admin/            # Pannelli amministrazione
│   │   │   ├── partner/          # Dashboard partner
│   │   │   ├── cliente/          # Funnel clienti
│   │   │   ├── auth/             # Login/autenticazione
│   │   │   ├── chat/             # Chat VALENTINA
│   │   │   └── ui/               # Shadcn components
│   │   └── utils/
│   │       └── api-config.js     # Configurazione API
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
├── storage/                      # File storage
└── memory/
    └── PRD.md                    # Product Requirements
```

---

## 🔧 Backend - Dettaglio File

### Core Files

| File | Descrizione | Linee |
|------|-------------|-------|
| `server.py` | Main FastAPI app con tutti gli endpoint | ~11,000 |
| `valentina_ai.py` | Orchestratore AI (VALENTINA) con Claude | ~800 |
| `valentina_memory.py` | Sistema di memoria persistente per AI | ~300 |
| `valentina_actions.py` | Dispatcher azioni automatiche | ~400 |

### Routers

| File | Descrizione |
|------|-------------|
| `routers/clienti.py` | API funnel "Analisi Strategica" (registrazione, questionario, Stripe) |
| `routers/auth.py` | Autenticazione JWT |
| `routers/orion.py` | Lead scoring system |

### Services

| File | Descrizione |
|------|-------------|
| `services/pdf_generator.py` | Generazione PDF con ReportLab |
| `cloudinary_service.py` | Upload/gestione media su Cloudinary |
| `tts_generator.py` | Text-to-Speech |
| `video_processor.py` | Elaborazione video |
| `youtube_uploader.py` | Upload YouTube |
| `systeme_mcp.py` | Integrazione Systeme.io |

---

## 🎨 Frontend - Dettaglio Componenti

### Admin (`/components/admin/`)

| Componente | Descrizione |
|------------|-------------|
| `AdminClientiPanel.jsx` | Gestione clienti con analisi AI |
| `AdminSidebarLight.jsx` | Sidebar amministrazione |
| `AgentDashboard.jsx` | Dashboard agenti AI |
| `OrionLeadScoring.jsx` | Dashboard lead scoring |
| `SystemeIODashboard.jsx` | Dashboard Systeme.io |
| `WebhookDashboard.jsx` | Monitoraggio webhook |
| `OnboardingDashboard.jsx` | Onboarding partner |

### Partner (`/components/partner/`)

| Componente | Descrizione |
|------------|-------------|
| `PartnerDashboardSimplified.jsx` | Dashboard partner principale |
| `PartnerSidebar.jsx` | Sidebar con fasi programma |
| `WizardPosizionamento.jsx` | Wizard posizionamento |
| `BrandKitEditor.jsx` | Editor brand kit |
| `CourseBuilderWizard.jsx` | Builder struttura corso |
| `MasterclassBuilder.jsx` | Builder masterclass |
| `ContrattoPartnership.jsx` | Contratto partnership |
| `DatiPersonali.jsx` | Profilo personale |
| `PartnerFilesPage.jsx` | Gestione file partner |
| `ServiziExtra.jsx` | Servizi aggiuntivi |

### Cliente (`/components/cliente/`)

| Componente | Descrizione |
|------------|-------------|
| `AnalisiStrategicaApp.jsx` | Controller funnel analisi |
| `AnalisiStrategicaLanding.jsx` | Landing page pubblica |
| `AnalisiRegistrazione.jsx` | Form registrazione |
| `AnalisiQuestionario.jsx` | Questionario 8 domande |
| `ClienteDashboard.jsx` | Dashboard post-acquisto |

### Chat (`/components/chat/`)

| Componente | Descrizione |
|------------|-------------|
| `ValentinaChat.jsx` | Chat con AI VALENTINA |
| `StefaniaChat.jsx` | Chat con agente STEFANIA |
| `AndreaChat.jsx` | Chat con agente ANDREA |

---

## ⚙️ Variabili d'Ambiente

### Backend (`/backend/.env`)

```env
# Database
MONGO_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/
DB_NAME=evolution_pro

# Authentication
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# AI (Emergent Integration)
EMERGENT_LLM_KEY=sk-emergent-xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=xxxxx:yyyyy
TELEGRAM_BOT_USERNAME=valentina_evo_bot
TELEGRAM_ADMIN_CHAT_ID=123456789

# Stripe
STRIPE_API_KEY=sk_live_xxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Systeme.io
SYSTEME_API_KEY=xxxxx
SYSTEME_MCP_KEY=xxxxx
SYSTEME_WEBHOOK_SECRET=xxxxx

# HeyGen (Avatar AI)
HEYGEN_API_KEY=xxxxx

# CORS
CORS_ORIGINS=*
```

### Frontend (`/frontend/.env`)

```env
# Backend API URL
REACT_APP_BACKEND_URL=https://your-api-domain.com

# WebSocket (per development)
WDS_SOCKET_PORT=443
```

---

## 🗄️ Database Collections (MongoDB)

| Collection | Descrizione |
|------------|-------------|
| `partners` | Dati partner (profilo, fase, documenti) |
| `clienti` | Clienti funnel analisi strategica |
| `users` | Utenti admin |
| `agents` | Configurazione agenti AI |
| `chat_history` | Storico conversazioni |
| `valentina_memories` | Memoria persistente VALENTINA |
| `systeme_contacts` | Contatti da Systeme.io |
| `systeme_tags` | Tag Systeme.io |
| `videos` | Job elaborazione video |
| `files` | Metadati file uploadati |
| `payments` | Transazioni Stripe |
| `telegram_admins` | Admin Telegram |
| `telegram_conversations` | Log conversazioni bot |
| `webhook_logs` | Log webhook ricevuti |
| `notifications` | Notifiche sistema |

---

## 🔌 API Endpoints Principali

### Autenticazione
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrazione
- `GET /api/auth/me` - Profilo utente

### Partner
- `GET /api/partners` - Lista partner
- `GET /api/partners/{id}` - Dettaglio partner
- `PUT /api/partners/{id}` - Aggiorna partner
- `POST /api/partners/{id}/phase` - Avanza fase

### Clienti (Funnel Analisi)
- `POST /api/clienti/register` - Registrazione cliente
- `POST /api/clienti/create-checkout-session` - Checkout Stripe
- `POST /api/clienti/{id}/questionnaire` - Invio questionario
- `GET /api/clienti/admin/list` - Lista clienti (admin)
- `POST /api/clienti/admin/{id}/generate-analysis` - Genera analisi AI
- `GET /api/clienti/admin/{id}/analysis/pdf` - Download PDF

### Chat AI
- `POST /api/chat` - Chat con VALENTINA
- `GET /api/chat/history/{partner_id}` - Storico chat

### Telegram
- `POST /api/telegram/webhook` - Webhook Telegram
- `POST /api/telegram/set-webhook` - Configura webhook
- `GET /api/telegram/webhook-info` - Info webhook

### Health
- `GET /api/health` - Health check

---

## 🚀 Come Avviare l'Applicazione

### Backend

```bash
cd backend

# Crea virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure: venv\Scripts\activate  # Windows

# Installa dipendenze
pip install -r requirements.txt

# Configura .env
cp .env.example .env
# Modifica .env con le tue credenziali

# Avvia server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend

# Installa dipendenze
yarn install  # oppure: npm install

# Configura .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Avvia development server
yarn start  # oppure: npm start
```

---

## 🔗 Integrazioni Esterne

| Servizio | Uso | Documentazione |
|----------|-----|----------------|
| **MongoDB Atlas** | Database | https://www.mongodb.com/atlas |
| **Stripe** | Pagamenti | https://stripe.com/docs |
| **Cloudinary** | Media storage | https://cloudinary.com/documentation |
| **Telegram Bot API** | Bot notifiche | https://core.telegram.org/bots/api |
| **Systeme.io** | CRM/Funnel | https://systeme.io/api |
| **Claude (Anthropic)** | AI via Emergent | Usa `emergentintegrations` library |
| **YouTube Data API** | Upload video | https://developers.google.com/youtube |
| **HeyGen** | Avatar AI | https://heygen.com |

---

## ⚠️ Note Importanti per la Migrazione

1. **Emergent LLM Key**: Se migri fuori da Emergent, dovrai sostituire `emergentintegrations` con l'SDK ufficiale Anthropic/OpenAI

2. **MongoDB Atlas**: Le credenziali nel file sono per l'istanza di sviluppo. Crea una nuova istanza per produzione.

3. **Telegram Webhook**: Dopo il deploy, riconfigura il webhook con:
   ```
   POST /api/telegram/set-webhook?webhook_url=https://TUO_DOMINIO/api/telegram/webhook
   ```

4. **Stripe**: Usa chiavi test (`sk_test_`) per sviluppo, live (`sk_live_`) per produzione

5. **CORS**: In produzione, specifica i domini esatti invece di `*`

6. **File Storage**: I file sono su Cloudinary, non nel server locale

---

## 📞 Supporto

Per domande sulla migrazione, contatta il team Evolution PRO.

---

*Documento generato il 8 Marzo 2026*
