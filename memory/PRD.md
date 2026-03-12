# Evolution PRO OS - Product Requirements Document

## Progetto
**Evolution PRO OS** - Applicazione web proprietaria per automazione workflow aziendali con sistema multi-agente AI.

---

## ADMIN - GESTIONE CLIENTI ANALISI ✅ COMPLETATO

### Flusso Operativo
```
Cliente compila questionario
    ↓
Cliente paga €67
    ↓
Admin apre scheda cliente
    ↓
Admin genera analisi AI
    ↓
Admin salva analisi
    ↓
Admin scarica PDF
    ↓
Admin segna pronto per call
```

### Sezione Admin: "Clienti Analisi"

**Colonne Tabella:**
- Nome
- Cognome
- Email / Telefono
- Questionario ✓
- Pagamento ✓
- Analisi ✓
- Stato Call
- Data Aggiornamento
- Azioni (Apri)

**Filtri Rapidi:**
- Tutti
- Questionario completato
- Pagato
- Da generare
- Analisi pronte
- Call da fissare

### Scheda Cliente (Modal)

**SEZIONE 1 - Dati Cliente:**
- Nome, Cognome, Email, Telefono, Data registrazione

**SEZIONE 2 - Stato Processo:**
- questionario_compilato → pagamento_analisi → analisi_generata → call_stato

**SEZIONE 3 - Risposte Questionario:**
1. expertise
2. cliente_target
3. risultato_promesso
4. pubblico_esistente
5. esperienze_vendita
6. ostacolo_principale
7. motivazione

### Generazione Analisi AI

**Condizioni per abilitare il pulsante:**
- `questionario_compilato = true`
- `pagamento_analisi = true`

**Template Analisi Strategica:**
- Copertina
- Introduzione
- Cos'è Evolution PRO
- Perché il fai-da-te fallisce
- Le tre strade possibili
- Sintesi del progetto (personalizzata AI)
- Analisi profilo professionale (AI)
- Cliente ideale (AI)
- Presenza online (AI)
- Esperienza vendita (AI)
- Ostacolo principale (AI)
- Motivazione (AI)
- Diagnosi strategica finale (AI)
- Prossimi passi
- Contatti

**Output:**
- Editor testo modificabile
- Pulsante Salva
- Pulsante Rigenera
- Pulsante Scarica PDF

### Gestione Stato Call

**Stati disponibili:**
- `da_fissare`
- `fissata`
- `completata`
- `annullata`

---

## API ENDPOINTS ADMIN

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/admin/clienti-analisi` | GET | Lista tutti i clienti con stats |
| `/api/admin/clienti-analisi/{id}` | GET | Dettaglio singolo cliente |
| `/api/admin/clienti-analisi/{id}/genera-analisi-ai` | POST | Genera analisi con Claude AI |
| `/api/admin/clienti-analisi/{id}/salva-analisi` | POST | Salva analisi nel database |
| `/api/admin/clienti-analisi/{id}/analisi-pdf` | GET | Scarica PDF (reportlab) |
| `/api/admin/clienti-analisi/{id}/stato-call` | POST | Aggiorna stato call |

---

## FLUSSO CLIENTE COMPLETO

```
/analisi-strategica (Registrazione)
    ↓
/dashboard-cliente (Stato 1: Pre-Questionario)
    ↓
/questionario (7 Domande)
    ↓
/analisi-attivazione (Pagamento €67)
    ↓
[Stripe Checkout]
    ↓
/analisi-in-preparazione (Conferma + Video + Mini Corso)
    ↓
[Admin genera analisi]
    ↓
/dashboard-cliente (Stato 4: Analisi Pronta → Prenota Call)
```

---

## FILE PRINCIPALI

### Admin
- `/app/frontend/src/components/admin/AdminClientiAnalisiPanel.jsx` - **AGGIORNATO** - Pannello completo
- `/app/backend/server.py` - Endpoints linee 1566-1850

### Cliente
- `/app/frontend/src/components/cliente/AttivazioneAnalisi.jsx`
- `/app/frontend/src/components/cliente/AnalisiInPreparazione.jsx`
- `/app/frontend/src/components/cliente/DashboardCliente.jsx`
- `/app/frontend/src/components/cliente/QuestionarioCliente.jsx`

---

## CHANGELOG

### 12 Mar 2026 - Sessione 3 (Finale)
- ✅ **ADMIN COMPLETO**: Pannello gestione clienti analisi con tutte le funzionalità
  - Tabella con 9 colonne
  - 6 filtri rapidi
  - Scheda cliente con 3 sezioni
  - Generazione analisi AI (Claude)
  - Salvataggio nel database
  - Download PDF (reportlab)
  - Gestione stato call
- ✅ Backend: 5 nuovi endpoints API
- ✅ Test: 100% passati (13 backend + frontend verificato)

### 12 Mar 2026 - Sessione 3
- ✅ Pagina /analisi-in-preparazione con 6 sezioni
- ✅ Pagina /analisi-attivazione

---

## CREDENZIALI

| Tipo | Email | Password |
|------|-------|----------|
| Admin | claudio.bertogliatti@gmail.com | Evoluzione74 |
| Cliente test | att2_1773352332@test.com | TestCliente123 |

---

## TECNOLOGIE USATE

- **AI**: Claude Sonnet 4.5 via emergentintegrations (Emergent LLM Key)
- **PDF**: reportlab
- **Pagamenti**: Stripe
- **Database**: MongoDB Atlas

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **AI Generation:** ✅ Funzionante (Claude)
- **PDF Export:** ✅ Funzionante (reportlab)
- **Stripe:** ✅ Checkout funzionante
