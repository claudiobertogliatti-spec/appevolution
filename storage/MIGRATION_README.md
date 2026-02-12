# Evolution PRO OS - Guida alla Migrazione

## 📦 Contenuto dell'archivio

```
evolution_pro_FULL_MIGRATION/
├── backend/                    # FastAPI Backend
│   ├── server.py              # Server principale (4800+ righe)
│   ├── video_processor.py     # Processing video FFmpeg
│   ├── file_storage.py        # Gestione file storage
│   ├── youtube_uploader.py    # YouTube Data API v3
│   ├── tts_generator.py       # OpenAI Text-to-Speech
│   ├── ads_api_integration.py # Meta/LinkedIn Ads API
│   ├── requirements.txt       # Dipendenze Python
│   ├── .env                   # Variabili ambiente (DA CONFIGURARE)
│   └── tests/                 # Test unitari
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── App.js             # Applicazione principale
│   │   ├── App.css            # Stili globali
│   │   ├── index.js           # Entry point
│   │   ├── index.css          # Tailwind imports
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn/UI components
│   │   │   ├── common/        # Componenti condivisi
│   │   │   ├── admin/         # Dashboard admin
│   │   │   └── partner/       # Dashboard partner
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   └── data/              # Costanti e dati
│   ├── public/
│   ├── package.json           # Dipendenze Node.js
│   ├── tailwind.config.js     # Configurazione Tailwind
│   ├── craco.config.js        # Configurazione CRACO
│   └── .env                   # Variabili ambiente frontend
│
└── memory/
    └── PRD.md                 # Documentazione progetto
```

---

## 🚀 Istruzioni per la Migrazione

### 1. Requisiti di Sistema

```bash
# Backend
- Python 3.10+
- MongoDB 6.0+
- FFmpeg (per video processing)

# Frontend
- Node.js 18+
- Yarn (consigliato) o npm
```

### 2. Setup Database MongoDB

```bash
# Crea database e utente
mongosh
> use evolution_pro_db
> db.createUser({user: "evolution", pwd: "YOUR_PASSWORD", roles: ["readWrite"]})
```

**Collections create automaticamente:**
- `partners`, `agents`, `alerts`, `chat_messages`
- `video_jobs`, `systeme_templates`, `brand_kits`
- `masterclass_scripts`, `gaia_deployments`, `calendars`
- `copy_factory_batches`, `ad_campaigns`, `ltv_dashboard`
- `atlas_students`, `atlas_feedback`, `atlas_referrals`
- `course_outlines`, `systeme_credentials`, `systeme_contacts`

### 3. Configurazione Backend

```bash
cd backend

# Crea virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure: venv\Scripts\activate  # Windows

# Installa dipendenze
pip install -r requirements.txt

# Installa emergentintegrations (per LLM)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

**Configura `.env` backend:**
```env
MONGO_URL=mongodb://evolution:YOUR_PASSWORD@localhost:27017/evolution_pro_db
DB_NAME=evolution_pro_db
EMERGENT_LLM_KEY=your_emergent_key_here  # Per Claude/GPT integrations

# Opzionali (per funzionalità avanzate)
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
OPENAI_API_KEY=your_openai_key  # Per TTS/Whisper
```

**Avvia backend:**
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Configurazione Frontend

```bash
cd frontend

# Installa dipendenze
yarn install
# oppure: npm install
```

**Configura `.env` frontend:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
# oppure per produzione:
REACT_APP_BACKEND_URL=https://your-domain.com
```

**Avvia frontend (development):**
```bash
yarn start
# oppure: npm start
```

**Build per produzione:**
```bash
yarn build
# I file statici saranno in /build
```

### 5. Deploy in Produzione

#### Docker (Consigliato)

**Dockerfile Backend:**
```dockerfile
FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Dockerfile Frontend:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

#### Nginx Configuration (proxy)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://backend:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔑 API Keys Necessarie

| Servizio | Variabile | Dove ottenerla |
|----------|-----------|----------------|
| MongoDB | `MONGO_URL` | MongoDB Atlas o self-hosted |
| Emergent LLM | `EMERGENT_LLM_KEY` | platform.emergentagent.com |
| YouTube API | `YOUTUBE_*` | console.cloud.google.com |
| OpenAI | `OPENAI_API_KEY` | platform.openai.com |
| Systeme.io | (inserito da UI) | systeme.io → Settings → API |

---

## 📊 Endpoints API Principali

### Core
- `GET /api/agents` - Lista agenti AI
- `GET /api/partners` - Lista partner
- `POST /api/chat` - Chat con VALENTINA

### Video (ANDREA)
- `POST /api/andrea/process` - Processa video
- `POST /api/youtube/upload/{job_id}` - Upload YouTube

### Copy (STEFANIA)
- `POST /api/stefania/copyfactory/generate` - Genera copy
- `POST /api/stefania/course-builder/generate` - Genera corso

### Marketing (GAIA)
- `GET /api/gaia/templates` - Template funnel
- `POST /api/gaia/deploy` - Deploy funnel

### CRM (ATLAS)
- `GET /api/atlas/ltv-dashboard/{partner_id}` - Dashboard LTV
- `POST /api/atlas/feedback` - Salva feedback

### Systeme.io
- `POST /api/systeme/credentials` - Salva API key
- `POST /api/systeme/sync` - Sincronizza contatti
- `GET /api/systeme/stats/{partner_id}` - Statistiche

---

## ⚠️ Note Importanti

1. **Emergent LLM Key**: Funziona SOLO per OpenAI, Anthropic, Gemini text/image. Non per altri servizi.

2. **FFmpeg**: Necessario per il video processing. Installare con:
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Mac
   brew install ffmpeg
   
   # Windows
   choco install ffmpeg
   ```

3. **Hot Reload**: Il backend supporta hot reload con `--reload`. Il frontend con `yarn start`.

4. **Storage**: I file uploadati vanno in `/app/storage/`. Configurare volume persistente in produzione.

5. **CORS**: Già configurato per tutti gli origin (`*`). Restringere in produzione.

---

## 🆘 Supporto

Per problemi tecnici, consulta:
- `/app/memory/PRD.md` - Documentazione completa
- `/app/test_reports/` - Report test automatici

---

*Generato automaticamente - Evolution PRO OS v10.0*
