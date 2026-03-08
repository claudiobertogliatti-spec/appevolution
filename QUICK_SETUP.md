# Evolution PRO OS - Quick Setup Guide

## 🚀 Setup Rapido

### 1. Clona il repository
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd evolution-pro-os
```

### 2. Setup Backend
```bash
cd backend

# Virtual environment
python -m venv venv
source venv/bin/activate

# Dipendenze
pip install -r requirements.txt

# Crea .env (copia da esempio sotto)
nano .env
```

### 3. Setup Frontend
```bash
cd frontend

# Dipendenze
yarn install

# Crea .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

### 4. Avvia
```bash
# Terminal 1 - Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend && yarn start
```

---

## 📋 Template .env Backend

```env
# === DATABASE ===
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=evolution_pro

# === AUTHENTICATION ===
JWT_SECRET_KEY=genera-una-chiave-segreta-lunga-e-casuale
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# === AI (Claude via Emergent) ===
# Se usi Emergent:
EMERGENT_LLM_KEY=sk-emergent-xxxxx
# Se usi Anthropic direttamente, modifica valentina_ai.py per usare:
# ANTHROPIC_API_KEY=sk-ant-xxxxx

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=xxxxx:yyyyy
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_ADMIN_CHAT_ID=your_chat_id
OPENCLAW_CHAT_ID=your_chat_id

# === STRIPE ===
# Test keys per sviluppo:
STRIPE_API_KEY=sk_test_xxxxx
# Live keys per produzione:
# STRIPE_API_KEY=sk_live_xxxxx

# === CLOUDINARY ===
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# === SYSTEME.IO ===
SYSTEME_API_KEY=xxxxx
SYSTEME_MCP_KEY=xxxxx
SYSTEME_WEBHOOK_SECRET=xxxxx

# === HEYGEN (opzionale) ===
HEYGEN_API_KEY=xxxxx

# === CORS ===
# Sviluppo:
CORS_ORIGINS=*
# Produzione (specifica i domini):
# CORS_ORIGINS=https://app.tuodominio.com,https://tuodominio.com
```

---

## 🔄 Migrazione da Emergent

Se migri l'AI da Emergent a Anthropic diretto:

### Modifica `valentina_ai.py`:

```python
# PRIMA (con Emergent):
from emergentintegrations.llm.chat import LlmChat, UserMessage

# DOPO (con Anthropic diretto):
import anthropic
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Modifica la funzione chat() per usare:
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=system_prompt,
    messages=[{"role": "user", "content": message}]
)
```

---

## 🐳 Docker (opzionale)

### Dockerfile Backend
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Dockerfile Frontend
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    env_file:
      - ./backend/.env
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend
```

---

## ✅ Checklist Post-Deploy

- [ ] MongoDB Atlas: IP whitelist configurato
- [ ] Variabili ambiente: tutte configurate
- [ ] CORS: domini produzione specificati
- [ ] Telegram webhook: riconfigurato con nuovo URL
- [ ] Stripe webhook: configurato su dashboard Stripe
- [ ] Cloudinary: account configurato
- [ ] SSL/HTTPS: certificato attivo
- [ ] Health check: `/api/health` risponde

---

*Evolution PRO OS - Guida Setup Rapido*
