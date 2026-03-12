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
| `/dashboard-partner` | PartnerDashboardSimplified | Dashboard partner con fasi F0-F10 |

---

## DUE FLUSSI SEPARATI

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
| 4 | analisi_generata=true | "La tua Analisi è pronta" + CTA Prenota Call |

### FLUSSO 2: PARTNER

| Route | Componente | Descrizione |
|-------|------------|-------------|
| `/partner-login` | PartnerLogin.jsx | Login dedicato partner |
| `/dashboard-partner` | PartnerDashboardSimplified.jsx | Dashboard con fasi F0-F10 |

**Fasi Programma Partner:**
- F0 Pre-Onboarding → F10 Scalabilità

---

## PANNELLO ADMIN - CLIENTI ANALISI STRATEGICA

### Funzionalità Implementate (12 Mar 2026)
- ✅ Lista tutti i clienti "cliente_analisi" registrati
- ✅ Statistiche: Totale, Questionario completato, Pagato, Analisi pronta
- ✅ Filtri per stato e ricerca per nome/email
- ✅ Modal dettagli cliente con tutte le risposte al questionario
- ✅ Pulsante "Segna analisi come completata" per clienti pagati
- ✅ Navigazione da menu laterale "Clienti Analisi"
- ✅ Card overview nella dashboard admin

### API Endpoints Admin
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/admin/clienti-analisi` | GET | Lista tutti i clienti analisi con stats |
| `/api/admin/clienti-analisi/{user_id}` | GET | Dettaglio singolo cliente |
| `/api/admin/clienti-analisi/{user_id}/genera-analisi` | POST | Segna analisi come completata |

---

## 7 DOMANDE QUESTIONARIO

1. **In cosa sei riconosciuto/a come esperto/a?**
2. **Chi è il tuo cliente ideale?**
3. **Quale risultato concreto vorresti aiutarlo a ottenere?**
4. **Hai già un pubblico o persone che ti seguono?**
5. **Hai già venduto qualcosa online o lavori già con clienti su questo tema?**
6. **Qual è il principale ostacolo che finora ti ha bloccato?**
7. **Perché proprio adesso?**

---

## FILE PRINCIPALI

### Frontend
- `/app/frontend/src/App.js` - Routing e gestione flussi
- `/app/frontend/src/components/Homepage.jsx` - Homepage pubblica
- `/app/frontend/src/components/cliente/DashboardCliente.jsx` - Dashboard cliente 4 stati
- `/app/frontend/src/components/cliente/QuestionarioCliente.jsx` - 7 domande
- `/app/frontend/src/components/partner/PartnerDashboardSimplified.jsx` - Dashboard partner F0-F10
- `/app/frontend/src/components/admin/AdminClientiAnalisiPanel.jsx` - Pannello admin clienti
- `/app/frontend/src/components/admin/AdminSidebarLight.jsx` - Menu laterale admin

### Backend
- `/app/backend/server.py` - Monolite backend (>11k righe)
- `/app/backend/auth.py` - Autenticazione JWT

---

## CREDENZIALI TEST
- **Admin**: claudio.bertogliatti@gmail.com / Evoluzione74
- **Partner**: testf0@evolutionpro.it / TestPartner123
- **Cliente con analisi pronta**: att2_1773352332@test.com / TestCliente123

---

## CHANGELOG

### 12 Mar 2026 - Sessione 3 (Fork)
- ✅ Completato pannello admin "Clienti Analisi Strategica"
- ✅ Aggiunto link navigazione nel menu laterale admin (clienti-analisi)
- ✅ Implementata dashboard partner dedicata per utenti con role="partner"
- ✅ Verificato Stato 4 dashboard cliente (analisi_generata=true)
- ✅ Test 100% passati: Admin panel, modal dettagli, pulsante genera analisi, partner dashboard, stato 4 cliente

### 12 Mar 2026 - Sessione 2
- ✅ Creata Homepage pubblica su `/` come punto di ingresso
- ✅ Dashboard cliente dinamica con 4 stati basati su condizioni utente
- ✅ STATO 1-4 implementati completamente

### 12 Mar 2026 - Sessione 1
- ✅ Implementato nuovo flusso CLIENTE ANALISI separato
- ✅ Creati componenti: AnalisiStrategicaLanding, DashboardCliente, QuestionarioCliente
- ✅ Implementato redirect automatico per partner/cliente

---

## ISSUES RISOLTI
- ✅ Pannello admin clienti analisi funzionante
- ✅ Dashboard partner dedicata per utenti partner
- ✅ Stato 4 dashboard cliente implementato

## ISSUES APERTI

### P1 - Verifica Utente
- Test end-to-end OpenClaw da chat app → Telegram → automazione locale

### P1 - Bloccato
- Autonomia agenti via tag Systeme.io (in attesa creazione automazioni utente)

### P2 - Backlog
- Refactoring `server.py` (monolite critico >11k righe)
- Refresh token YouTube API
- Verifica template contratto partner
- Test end-to-end flusso Stripe completo con webhook

---

## PROJECT HEALTH
- **Backend**: Funzionante (API testata)
- **Frontend**: Funzionante (tutti i flussi verificati)
- **Database**: MongoDB Atlas connesso
- **Pagamenti**: Stripe checkout funzionante (webhook da verificare)
- **YouTube API**: BROKEN (token scaduto)
