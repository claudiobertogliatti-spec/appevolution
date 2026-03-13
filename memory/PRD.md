# Evolution PRO OS - Product Requirements Document

## SISTEMA CONTATTO CLIENTE ✅ COMPLETATO

### Quando analisi_generata = true

**Dashboard Cliente mostra:**
- Badge: "Analisi completata"
- Titolo: "La tua Analisi Strategica è pronta"
- Testo: "Abbiamo completato lo studio del tuo progetto. Ora possiamo analizzarlo insieme durante la call strategica."
- CTA prominente: "Prenota la tua call strategica" → Calendly

**Email automatica inviata (quando admin salva analisi):**
- Oggetto: "La tua Analisi Strategica è pronta"
- Corpo: Messaggio + CTA "Prenota il tuo orario qui"

**Reminder 24h:**
- Se call non prenotata dopo 24 ore → email reminder
- Endpoint: `POST /api/admin/clienti-analisi/send-reminders`

---

## FLUSSO COMPLETO

```
/analisi-strategica (Registrazione)
    ↓
/questionario (7 Domande)
    ↓
/analisi-attivazione (Pagamento €67)
    ↓
[Stripe Checkout]
    ↓
/analisi-in-preparazione (Video + Mini Corso)
    ↓
[Admin genera analisi AI]
    ↓
Dashboard: "La tua Analisi Strategica è pronta" ← NUOVO
    ↓
[Email automatica al cliente]
    ↓
Prenota call
    ↓
Call con Claudio (presentazione analisi)
    ↓
Proposta partnership
```

---

## STATI DASHBOARD CLIENTE

| Stato | Condizione | Cosa vede |
|-------|------------|-----------|
| 1 | questionario=false | "Benvenuto" + CTA Questionario |
| 2 | questionario=true, pagamento=false | "Progetto ricevuto" + CTA Pagamento |
| 3A | pagamento=true, analisi=false | "Analisi in preparazione" |
| 3B | pagamento=true, analisi=true | **"Analisi pronta" + CTA Prenota Call** |

---

## LOGIN UNIFICATO

Il pulsante "Accedi" in homepage ora supporta:
- Clienti → redirect a `/dashboard-cliente`
- Partner/Admin → redirect a `/dashboard-partner`

---

## API EMAIL

| Endpoint | Descrizione |
|----------|-------------|
| `POST /admin/clienti-analisi/{id}/salva-analisi` | Salva + invia email automatica |
| `POST /admin/clienti-analisi/send-reminders` | Invia reminder 24h |

**Configurazione Resend:**
- `RESEND_API_KEY` in .env
- `SENDER_EMAIL` in .env (default: onboarding@resend.dev)

---

## CREDENZIALI TEST

| Tipo | Email | Password |
|------|-------|----------|
| Admin | claudio.bertogliatti@gmail.com | Evoluzione74 |
| Cliente con analisi | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

### 13 Mar 2026 - Sistema Contatto Cliente
- ✅ Dashboard cliente mostra "Analisi pronta" quando analisi_generata=true
- ✅ CTA prominente "Prenota la tua call strategica"
- ✅ Email automatica quando admin salva analisi (Resend)
- ✅ Endpoint reminder 24h
- ✅ Login unificato per clienti e partner
- ✅ auth.py aggiornato per restituire campi cliente

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **Email (Resend):** ⚠️ Logica implementata, chiave da configurare
