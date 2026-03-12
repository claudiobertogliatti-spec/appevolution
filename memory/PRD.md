# Evolution PRO OS - Product Requirements Document

## Progetto
**Evolution PRO OS** - Applicazione web proprietaria per automazione workflow aziendali con sistema multi-agente AI.

---

## FLUSSO CLIENTE ANALISI COMPLETO

```
/ (Homepage)
    ↓
/analisi-strategica (Registrazione)
    ↓
/dashboard-cliente (Stato 1: Pre-Questionario)
    ↓
/questionario (7 Domande)
    ↓
/analisi-attivazione (NEW - Pagina Attivazione €67)
    ↓
[Pagamento Stripe]
    ↓
/analisi-in-preparazione (Conferma + Video + Mini Corso)
    ↓
/dashboard-cliente (Stato 4: Analisi Pronta → Prenota Call)
```

---

## NUOVA PAGINA: /analisi-attivazione

### Implementata il 12 Mar 2026

**File:** `/app/frontend/src/components/cliente/AttivazioneAnalisi.jsx`

**Sezioni:**
1. **Progress Bar** - 3 step: Questionario ✓, Analisi Strategica (attivo), Call con Claudio (pending)
2. **Conferma Questionario** - "Perfetto, abbiamo ricevuto il tuo progetto"
3. **Cosa Include** - 6 elementi con icone (posizionamento, mercato, fattibilità, struttura, monetizzazione, call)
4. **Box Qualificazione** - Messaggio su idoneità progetto
5. **Investimento** - €67 una tantum
6. **CTA** - "ATTIVA LA TUA ANALISI STRATEGICA" → Stripe Checkout

**Logica Routing:**
- Se `questionario_compilato=false` → redirect a `/questionario`
- Se `pagamento_analisi=true` → redirect a `/analisi-in-preparazione`

---

## ROUTES CLIENTE

| Route | Condizione | Componente |
|-------|------------|------------|
| `/analisi-strategica` | Non autenticato | AnalisiStrategicaLanding |
| `/dashboard-cliente` | Autenticato | DashboardCliente (4 stati) |
| `/questionario` | questionario_compilato=false | QuestionarioCliente |
| `/analisi-attivazione` | questionario_compilato=true, pagamento=false | **AttivazioneAnalisi** (NEW) |
| `/analisi-in-preparazione` | pagamento_analisi=true | AnalisiInPreparazione |

---

## DASHBOARD CLIENTE - 4 STATI

| Stato | Condizione | Contenuto |
|-------|------------|-----------|
| 1 | questionario_compilato=false | "Benvenuto" + CTA Questionario |
| 2 | questionario_compilato=true, pagamento_analisi=false | "Progetto ricevuto" + CTA Pagamento €67 |
| 3 | pagamento_analisi=true, analisi_generata=false | "Analisi in preparazione" + Video + Mini Corso |
| 4 | analisi_generata=true | "Analisi pronta" + CTA Prenota Call |

---

## API ENDPOINTS

### Cliente Analisi
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/cliente-analisi/register` | POST | Registrazione nuovo cliente |
| `/api/cliente-analisi/questionario` | POST | Salva risposte questionario |
| `/api/cliente-analisi/checkout` | POST | Crea sessione Stripe €67 |
| `/api/cliente-analisi/verify-payment` | POST | Verifica pagamento completato |

### Admin
| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/admin/clienti-analisi` | GET | Lista tutti i clienti analisi |
| `/api/admin/clienti-analisi/{id}` | GET | Dettaglio singolo cliente |
| `/api/admin/clienti-analisi/{id}/genera-analisi` | POST | Segna analisi come completata |

---

## FILE DI RIFERIMENTO

### Frontend Cliente
- `/app/frontend/src/components/cliente/AttivazioneAnalisi.jsx` **NEW**
- `/app/frontend/src/components/cliente/AnalisiStrategicaLanding.jsx`
- `/app/frontend/src/components/cliente/DashboardCliente.jsx`
- `/app/frontend/src/components/cliente/QuestionarioCliente.jsx`
- `/app/frontend/src/components/cliente/AnalisiInPreparazione.jsx`

### Frontend Partner/Admin
- `/app/frontend/src/components/partner/PartnerDashboardSimplified.jsx`
- `/app/frontend/src/components/admin/AdminClientiAnalisiPanel.jsx`

### Backend
- `/app/backend/server.py` - Monolite principale (>11k righe)

---

## CHANGELOG

### 12 Mar 2026 - Sessione 3
- ✅ **NEW: Pagina /analisi-attivazione** - Pagina dedicata per conversione post-questionario
- ✅ Aggiornato routing: questionario → analisi-attivazione → Stripe → analisi-in-preparazione
- ✅ Aggiornata success_url Stripe per redirect a /analisi-in-preparazione
- ✅ Completato pannello admin "Clienti Analisi Strategica"
- ✅ Implementata dashboard partner dedicata per utenti partner
- ✅ Test 100% passati su pannello admin

### 12 Mar 2026 - Sessione 2
- ✅ Homepage pubblica su `/` con modals
- ✅ Dashboard cliente dinamica 4 stati
- ✅ Stati 1-4 implementati

### 12 Mar 2026 - Sessione 1
- ✅ Flusso cliente analisi separato
- ✅ Componenti: AnalisiStrategicaLanding, DashboardCliente, QuestionarioCliente

---

## CREDENZIALI TEST

- **Admin:** claudio.bertogliatti@gmail.com / Evoluzione74
- **Partner:** testf0@evolutionpro.it / TestPartner123
- **Cliente con questionario:** test_attiv3@example.com / Test12345

---

## ISSUES APERTI

### P1
- Test end-to-end OpenClaw (richiede verifica utente)
- Test completo Stripe webhook

### P2 - Backlog
- Refactoring `server.py` (>11k righe)
- Refactoring `App.js` (>1.4k righe)
- Refresh token YouTube API
- Autonomia agenti via Systeme.io (BLOCCATO)

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante
- **Database:** ✅ MongoDB Atlas connesso
- **Stripe:** ✅ Checkout funzionante
- **YouTube API:** ❌ Token scaduto
