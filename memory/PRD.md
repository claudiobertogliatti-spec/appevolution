# Evolution PRO OS - Product Requirements Document

## CONFIGURAZIONE EMAIL E CALENDARIO ✅

### Email: Systeme.io
Le notifiche email sono gestite tramite **Systeme.io** usando i tag:
- `analisi_pronta` → Triggera email "La tua Analisi è pronta"
- `reminder_analisi` → Triggera email reminder dopo 24h

**Configurazione Systeme.io:**
- Creare automazione che invia email quando tag `analisi_pronta` viene aggiunto
- Creare automazione per `reminder_analisi`
- Template email con link: https://calendar.app.google/ip1MfDcfcrju1WFh6

### Calendario: Google Calendar
Link prenotazione call: `https://calendar.app.google/ip1MfDcfcrju1WFh6`

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
/analisi-in-preparazione
    ↓
[Admin genera analisi AI]
    ↓
[Systeme.io: tag "analisi_pronta" → email automatica]
    ↓
Dashboard: "La tua Analisi Strategica è pronta"
    ↓
Prenota call (Google Calendar)
    ↓
[24h senza prenotazione → Systeme.io: tag "reminder_analisi"]
    ↓
Call con Claudio
```

---

## API ENDPOINTS

| Endpoint | Descrizione |
|----------|-------------|
| `POST /admin/clienti-analisi/{id}/salva-analisi` | Salva + aggiunge tag `analisi_pronta` in Systeme.io |
| `POST /admin/clienti-analisi/send-reminders` | Aggiunge tag `reminder_analisi` a chi non ha prenotato |

---

## SETUP RICHIESTO IN SYSTEME.IO

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
| Cliente test | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

### 13 Mar 2026
- ✅ Email tramite Systeme.io (tag `analisi_pronta`, `reminder_analisi`)
- ✅ Calendario Google: https://calendar.app.google/ip1MfDcfcrju1WFh6
- ✅ Rimosso Resend, integrato con Systeme.io esistente

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **Systeme.io:** ✅ Integrato (API key configurata)
- **Google Calendar:** ✅ Link configurato
