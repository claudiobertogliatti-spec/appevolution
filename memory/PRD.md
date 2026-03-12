# Evolution PRO OS - Product Requirements Document

## Progetto
**Evolution PRO OS** - Applicazione web proprietaria per automazione workflow aziendali con sistema multi-agente AI.

## Obiettivi Principali
1. Sistema multi-agente AI (VALENTINA, ANDREA, GAIA, MARCO, STEFANIA) funzionante
2. Integrazione OpenClaw per automazioni GUI locali
3. Funnel acquisizione clienti per servizio "Analisi Strategica" (€67)
4. Dashboard partner/admin con gestione completa onboarding

## Architettura Tecnica
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **AI**: Claude via emergentintegrations (Emergent LLM Key)
- **Pagamenti**: Stripe
- **Automazioni**: Telegram Bot + Systeme.io

---

## STRUTTURA ROUTES

### Routes Pubbliche
| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/` | Homepage.jsx | Punto di ingresso - scelta tra Cliente/Partner |
| `/analisi-strategica` | AnalisiStrategicaLanding.jsx | Registrazione cliente |
| `/partner-login` | PartnerLogin.jsx | Login partner |

### Routes Cliente (Autenticate)
| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/dashboard-cliente` | DashboardCliente.jsx | Dashboard dinamica 4 stati |
| `/questionario` | QuestionarioCliente.jsx | 7 domande strategiche |
| `/sblocca-analisi` | SbloccaAnalisi.jsx | Pagamento Stripe €67 |

### Routes Partner/Admin (Autenticate)
| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/dashboard-partner` | Dashboard principale | Area partner/admin |

---

## DUE FLUSSI SEPARATI (Implementato 12 Mar 2026)

### FLUSSO 1: CLIENTE ANALISI

| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/analisi-strategica` | AnalisiStrategicaLanding.jsx | Landing + Registrazione |
| `/dashboard-cliente` | DashboardCliente.jsx | Dashboard dinamica basata su stato |
| `/questionario` | QuestionarioCliente.jsx | 7 domande strategiche |
| `/sblocca-analisi` | SbloccaAnalisi.jsx | Pagamento Stripe €67 |

**Dashboard Cliente - 4 Stati Dinamici:**

| Stato | Condizione | Contenuto |
|-------|------------|-----------|
| 1 | questionario_compilato=false | "Benvenuto in Evolution PRO" + CTA Questionario |
| 2 | questionario_compilato=true, pagamento_analisi=false | "Il tuo progetto è stato ricevuto" + CTA Pagamento €67 |
| 3 | pagamento_analisi=true, analisi_generata=false | "Analisi in preparazione" + Video + Mini Corso 7 moduli |
| 4 | analisi_generata=true | "Analisi pronta" + CTA Prenota Call |

**Progress Bar Cliente:**
1. Registrazione ✓
2. Questionario
3. Analisi Strategica
4. Call con Claudio

**Database Fields:**
- `user_type: "cliente_analisi"`
- `questionario_compilato: boolean`
- `pagamento_analisi: boolean`
- `analisi_generata: boolean`

### FLUSSO 2: PARTNER

| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/partner-login` | PartnerLogin.jsx | Login dedicato partner |
| `/dashboard-partner` | Dashboard admin/partner | Dashboard con fasi F0-F10 |

**Fasi Programma Partner:**
- F0 Pre-Onboarding → F10 Scalabilità

---

## 7 DOMANDE QUESTIONARIO

1. **In cosa sei riconosciuto/a come esperto/a?**
   - Descrivi in modo semplice la tua competenza principale.

2. **Chi è il tuo cliente ideale?**
   - Descrivi la persona che vorresti aiutare con la tua accademia: età o fase della vita, professione, problema principale, situazione attuale.

3. **Quale risultato concreto vorresti aiutarlo a ottenere?**
   - Dopo il tuo percorso, cosa cambia per questa persona? Quale trasformazione prometti?

4. **Hai già un pubblico o persone che ti seguono?**
   - Social, community, newsletter, clienti. Se non hai ancora un pubblico, scrivi "No".

5. **Hai già venduto qualcosa online o lavori già con clienti su questo tema?**
   - Consulenze, corsi, workshop, percorsi 1:1. Se è la prima volta, scrivi: "No, è la mia prima esperienza online".

6. **Qual è il principale ostacolo che finora ti ha bloccato dal digitalizzare la tua competenza?**
   - Es: mancanza di tempo, difficoltà tecniche, non sapere da dove iniziare, paura che non funzioni, mancanza di pubblico, difficoltà a strutturare il percorso.

7. **Perché proprio adesso?**
   - Cosa è cambiato rispetto ai mesi scorsi? Perché senti che questo è il momento giusto per costruire la tua Accademia Digitale?

---

## API ENDPOINTS CLIENTE ANALISI

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/cliente-analisi/register` | POST | Registrazione nuovo cliente |
| `/api/cliente-analisi/questionario` | POST | Salva risposte questionario |
| `/api/cliente-analisi/checkout` | POST | Crea sessione Stripe €67 |
| `/api/cliente-analisi/verify-payment` | POST | Verifica pagamento |
| `/api/cliente-analisi/status/{user_id}` | GET | Status utente |

---

## FILE PRINCIPALI

### Frontend
- `/app/frontend/src/App.js` - Routing e gestione flussi
- `/app/frontend/src/components/cliente/AnalisiStrategicaLanding.jsx` - Registrazione
- `/app/frontend/src/components/cliente/DashboardCliente.jsx` - Dashboard cliente
- `/app/frontend/src/components/cliente/QuestionarioCliente.jsx` - 7 domande
- `/app/frontend/src/components/cliente/SbloccaAnalisi.jsx` - Pagamento €67
- `/app/frontend/src/components/cliente/AnalisiInPreparazione.jsx` - Post-pagamento
- `/app/frontend/src/components/partner/PartnerLogin.jsx` - Login partner

### Backend
- `/app/backend/server.py` - Monolite backend (>11k righe)
- `/app/backend/valentina_actions.py` - Azioni AI + OpenClaw
- `/app/backend/genera_analisi_docx.py` - Generazione DOCX

---

## CREDENZIALI TEST
- **Admin**: claudio.bertogliatti@gmail.com / Evoluzione74
- **Cliente**: Registrazione via /analisi-strategica

---

## SICUREZZA

- Cliente analisi → accesso SOLO a /dashboard-cliente e flusso cliente
- Partner → accesso SOLO a /dashboard-partner e flusso partner
- Redirect automatico in base a user_type

---

## ISSUES NOTI

### P1 - Verifica Utente
- Test end-to-end OpenClaw da chat app → Telegram → automazione locale

### P1 - Bloccato
- Autonomia agenti via tag Systeme.io (in attesa creazione automazioni utente)

### P2 - Backlog
- Refactoring `server.py` (monolite critico >11k righe)
- Refactoring `ClienteDashboard.jsx` (>1200 righe - vecchio componente)
- Refresh token YouTube API
- Verifica template contratto partner

---

## CHANGELOG

### 12 Mar 2026 - Sessione 2
- ✅ Creata Homepage pubblica su `/` come punto di ingresso
- ✅ Header con logo e link partner
- ✅ Hero con titolo e sottotitolo
- ✅ 5 benefici con check
- ✅ CTA principale → /analisi-strategica
- ✅ CTA secondaria → /partner-login
- ✅ Footer con slogan e link sito
- ✅ Dashboard cliente dinamica con 4 stati basati su condizioni utente
- ✅ STATO 1: Benvenuto + CTA Questionario (questionario_compilato=false)
- ✅ STATO 2: Progetto ricevuto + CTA Pagamento €67 (questionario=true, pagamento=false)
- ✅ STATO 3: Analisi in preparazione + Video + Mini Corso (pagamento=true, analisi=false)
- ✅ STATO 4: Analisi pronta + CTA Prenota Call (analisi_generata=true)
- ✅ Aggiunto campo `analisi_generata` al modello utente

### 12 Mar 2026 - Sessione 1
- ✅ Implementato nuovo flusso CLIENTE ANALISI separato
- ✅ Creato `/analisi-strategica` landing + registrazione
- ✅ Creato `/dashboard-cliente` con progress bar 4 step
- ✅ Creato `/questionario` con 7 domande definitive
- ✅ Creato `/sblocca-analisi` con pagamento Stripe €67
- ✅ Creato `/analisi-in-preparazione` con video + mini corso
- ✅ Creato `/partner-login` separato per partner
- ✅ Implementato redirect automatico a `/dashboard-partner`
- ✅ Implementata sicurezza: separazione accessi cliente/partner
- ✅ Tutti i test passati (14/14 backend, 100% frontend)

### Sessione precedente
- ✅ Connesso VALENTINA a OpenClaw
- ✅ Redesignato funnel cliente (vecchio)
- ✅ Implementato template DOCX professionale
- ✅ Risolto problema Telegram Bot
