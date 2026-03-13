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

## FLUSSO CLIENTE

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
[Call con Claudio → Approvazione]
    ↓
/attivazione-partnership (5 Step)
```

---

## FLUSSO ATTIVAZIONE PARTNERSHIP ✅ NEW

Dopo la call strategica, se il cliente viene approvato, accede a `/attivazione-partnership`:

**5 Step:**
1. **Analisi Strategica** - Visualizza l'analisi generata dall'admin
2. **Conferma Partnership** - Legge e conferma la sintesi della collaborazione
3. **Firma Contratto** - Scarica e carica il contratto firmato
4. **Documenti Personali** - Upload carta d'identità + codice fiscale
5. **Pagamento** - €2.790 una tantum via Stripe o Bonifico

**Coordinate Bancarie (Bonifico):**
- Banca: Revolut Bank UAB
- IBAN: LT89 3250 0907 3099 5927
- BIC/SWIFT: REVOLT21
- Intestato a: Evolution PRO LLC

**PDF Contratto:** `/api/static/contratto-partnership-evolution-pro.pdf`

---

## API ENDPOINTS

| Endpoint | Descrizione |
|----------|-------------|
| `POST /admin/clienti-analisi/{id}/salva-analisi` | Salva + aggiunge tag `analisi_pronta` in Systeme.io |
| `POST /admin/clienti-analisi/send-reminders` | Aggiunge tag `reminder_analisi` a chi non ha prenotato |
| `GET /api/partnership/get-analisi` | Recupera analisi per attivazione partnership |
| `POST /api/partnership/update-step` | Aggiorna stato step (5 step possibili) |
| `POST /api/partnership/upload-documento` | Upload contratto/documenti personali |
| `POST /api/partnership/create-checkout-session` | Crea sessione Stripe €2.790 |
| `POST /api/partnership/verify-payment` | Verifica pagamento Stripe |
| `POST /api/partnership/convert-to-partner` | Converte cliente in partner |
| `GET /api/partnership/status/{user_id}` | Stato attuale processo partnership |

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
| Cliente test (con analisi) | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

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
