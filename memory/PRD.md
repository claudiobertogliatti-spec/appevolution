# Evolution PRO OS - Product Requirements Document

## Progetto
**Evolution PRO OS** - Applicazione web proprietaria per automazione workflow aziendali con sistema multi-agente AI.

---

## GENERAZIONE ANALISI STRATEGICA AI ✅ AGGIORNATO

### Struttura Documento (1200-1800 parole)

**PARTE 1 — STANDARD (identica per tutti)**
- CHE COS'È QUESTA ANALISI
- IL PROBLEMA PIÙ COMUNE
  - Mancanza di posizionamento
  - Contenuti generici
  - Assenza di struttura
  - Mancanza di sistema acquisizione
- IL MODELLO EVOLUTION PRO
  - Fase 1: Posizionamento
  - Fase 2: Creazione Accademia
  - Fase 3: Lancio e acquisizione

**PARTE 2 — PERSONALIZZATA (basata su questionario)**
- SEZIONE 1: Sintesi del progetto
- SEZIONE 2: Analisi della competenza
- SEZIONE 3: Analisi del target
- SEZIONE 4: Presenza online
- SEZIONE 5: Esperienza di vendita
- SEZIONE 6: Ostacolo principale
- SEZIONE 7: Obiettivo e motivazione
- SEZIONE 8: Diagnosi strategica

**VALUTAZIONE FINALE**
- **Punteggio fattibilità: X/10**
- **Raccomandazione:**
  - "Consigliato procedere con la partnership"
  - "Consigliato lavoro preliminare sul posizionamento"
  - "Necessario consolidare alcuni aspetti"

### Prompt AI Consulente

```
RUOLO: Consulente strategico senior Evolution PRO

REGOLE:
- Scrivi professionale ma semplice
- NON scrivere testo promozionale
- NON inventare informazioni
- Usa SOLO i dati del questionario
- Lunghezza: 1200-1800 parole

DIAGNOSI (uno dei tre esiti):
A) Progetto con buon potenziale
B) Progetto interessante ma da chiarire
C) Progetto ancora acerbo
```

---

## FLUSSO COMPLETO CLIENTE

```
HOME APP (/)
    ↓
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
/analisi-in-preparazione (Video + Mini Corso)
    ↓
[Admin genera analisi AI]
    ↓
/dashboard-cliente (Stato 4: Analisi Pronta)
    ↓
Call strategica
```

---

## PANNELLO ADMIN CLIENTI ANALISI

### Tabella
| Colonna | Descrizione |
|---------|-------------|
| Nome | Nome cliente |
| Cognome | Cognome cliente |
| Contatti | Email + Telefono |
| Quest. | ✓ se questionario completato |
| Pag. | ✓ se pagamento ricevuto |
| Analisi | ✓ se analisi generata, ⚠ se da generare |
| Call | Stato: da_fissare / fissata / completata |
| Aggiornato | Data ultimo aggiornamento |
| Azioni | Pulsante "Apri" |

### Filtri Rapidi
- Tutti
- Questionario ✓
- Pagato
- Da generare
- Analisi pronte
- Call da fissare

### Stats Cards
- Totale clienti
- Questionario completato
- Da generare
- Analisi pronte
- Call da fissare
- Call completate

### Scheda Cliente (Modal)
1. **DATI CLIENTE**: Nome, Cognome, Email, Telefono, Data registrazione
2. **STATO PROCESSO**: questionario_compilato → pagamento_analisi → analisi_generata → call_stato
3. **RISPOSTE QUESTIONARIO**: 7 domande con risposte
4. **GENERAZIONE ANALISI**: Pulsante "Genera Analisi Strategica" (solo se pagato)
5. **PUNTEGGIO + RACCOMANDAZIONE**: Box colorato con score /10 e raccomandazione
6. **EDITOR ANALISI**: Textarea modificabile + Salva/Rigenera/PDF
7. **STATO CALL**: Pulsanti per aggiornare stato

---

## API ENDPOINTS

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/admin/clienti-analisi` | GET | Lista tutti i clienti con stats |
| `/api/admin/clienti-analisi/{id}` | GET | Dettaglio singolo cliente |
| `/api/admin/clienti-analisi/{id}/genera-analisi-ai` | POST | Genera analisi con Claude AI |
| `/api/admin/clienti-analisi/{id}/salva-analisi` | POST | Salva analisi nel database |
| `/api/admin/clienti-analisi/{id}/analisi-pdf` | GET | Scarica PDF |
| `/api/admin/clienti-analisi/{id}/stato-call` | POST | Aggiorna stato call |

---

## CREDENZIALI TEST

| Tipo | Email | Password |
|------|-------|----------|
| Admin | claudio.bertogliatti@gmail.com | Evoluzione74 |
| Cliente con analisi | att2_1773352332@test.com | TestCliente123 |

---

## CHANGELOG

### 13 Mar 2026
- ✅ **PROMPT AI AGGIORNATO** con struttura professionale completa
- ✅ Aggiunto **Punteggio Fattibilità** (1-10) nella risposta API
- ✅ Aggiunta **Raccomandazione Finale** 
- ✅ Frontend mostra score colorato + raccomandazione
- ✅ Template documento ~9000 caratteri

### 12 Mar 2026
- ✅ Pannello admin completo con filtri e scheda cliente
- ✅ Generazione AI, salvataggio, PDF, stato call

---

## PROJECT HEALTH
- **Backend:** ✅ Funzionante
- **Frontend:** ✅ Funzionante  
- **AI (Claude):** ✅ Funzionante
- **PDF (reportlab):** ✅ Funzionante
