# Master Prompt Analisi Strategica - Documentazione

## Versione: 2.0 (21 Sezioni)
## Data: 16 Marzo 2026
## Prezzo Analisi: €67

---

## Panoramica

Il sistema di generazione analisi è stato completamente aggiornato per implementare il **Master Prompt di Configurazione** con le seguenti caratteristiche:

### 1. Struttura 21 Sezioni

L'analisi è ora strutturata in **21 sezioni ordinate**:

| # | Sezione | Tipo |
|---|---------|------|
| 01 | Introduzione all'Analisi | Standard |
| 02 | Chi è Evolution PRO | Standard |
| 03 | Come Funziona Questa Analisi | Standard |
| 04 | Glossario | Standard |
| 05 | Disclaimer | Standard |
| 06 | Il Tuo Profilo Professionale | Personalizzato |
| 07 | Il Problema che Risolvi | Personalizzato |
| 08 | Il Tuo Target Ideale | Personalizzato |
| 09 | La Tua Proposta di Valore | Personalizzato |
| 10 | Analisi del Mercato | Personalizzato + OpenClaw |
| 11 | Posizionamento Attuale | Personalizzato + OpenClaw |
| 12 | Analisi dei Competitor | Personalizzato + OpenClaw |
| 13 | Strategia di Differenziazione | Personalizzato |
| 14 | Criticità e Aree di Rischio | Personalizzato |
| 15 | Ipotesi Struttura del Corso | Personalizzato |
| 16 | Modello di Monetizzazione | Personalizzato |
| 17 | Il Costo di Non Agire | Personalizzato |
| 18 | Roadmap Dettagliata | Personalizzato |
| 19 | Investimento Richiesto | Personalizzato |
| 20 | Valutazione Finale di Fattibilità | Personalizzato |
| 21 | Prossimi Passi | Standard |

---

### 2. OpenClaw Research Engine

Sistema di Web Intelligence interno che:

- **Ricerca Google**: Cerca il partner e i competitor su Google
- **Scraping Siti Web**: Estrae informazioni dai siti dei competitor
- **Analisi Mercato**: Valuta trend e dimensione del mercato
- **Sintesi Claude**: Usa Claude per sintetizzare i dati in insight

#### File: `/app/backend/openclaw_research.py`

```python
# Funzioni principali
run_strategic_research()        # Ricerca completa per analisi
autocomplete_missing_data()     # Autocompletamento dati mancanti
synthesize_research_with_claude() # Sintesi AI dei risultati
```

---

### 3. Data-Gap Protocol

Se i dati del questionario sono insufficienti:

1. **Verifica Completezza**: Calcola % di completezza del questionario
2. **Alert Generazione**: Inserisce `[ANALISI SOSPESA: DATI MANCANTI]` nelle sezioni pertinenti
3. **Autocompletamento**: Se completezza < 70%, attiva ricerca web automatica
4. **Segnalazione**: Indica chiaramente i dati recuperati via web

#### File: `/app/backend/master_prompt_analisi.py`

```python
# Funzioni principali
verifica_completezza_questionario()  # Verifica dati
genera_data_gap_alert()              # Genera alert per campo mancante
```

---

### 4. Honesty Policy (Verità Brutale)

Il sistema applica una politica di onestà rigorosa:

- **No Flattery**: Zero adulazione
- **Criticità Esplicite**: Se il modello è insostenibile, viene segnalato
- **Alert Box**: Box di allerta rosso per criticità gravi
- **Indicatori**: ✅ (positivo), ⚠️ (attenzione), ❌ (critico)

---

## Endpoint API

### GET `/api/flusso-analisi/config-status`

Verifica configurazione:

```json
{
  "master_prompt_available": true,
  "openclaw_available": true,
  "versione_prompt": "2.0_21_sezioni",
  "sezioni_disponibili": 21,
  "features": {
    "deep_research": true,
    "data_gap_protocol": true,
    "autocompletamento_investigativo": true,
    "tabelle_competitor": true
  }
}
```

### POST `/api/flusso-analisi/genera-analisi-auto/{user_id}`

Genera analisi con parametri:

- `use_21_sezioni` (bool, default: true): Usa Master Prompt 21 sezioni
- `use_openclaw` (bool, default: true): Attiva Deep Research

---

## File Creati

1. `/app/backend/openclaw_research.py` - Engine di Web Research
2. `/app/backend/master_prompt_analisi.py` - Configurazione Master Prompt
3. `/app/backend/docs/MASTER_PROMPT_ANALISI.md` - Questa documentazione

## File Modificati

1. `/app/backend/routers/flusso_analisi.py` - Aggiunta nuova funzione 21 sezioni
2. `/app/backend/requirements.txt` - Aggiunte dipendenze (beautifulsoup4, playwright, lxml)

---

## Note Tecniche

- **Playwright**: Usa browser headless per scraping
- **Claude Sonnet 4**: Modello AI per sintesi e generazione
- **Emergent LLM Key**: Chiave universale per accesso LLM
- **Fallback**: Se il nuovo sistema fallisce, usa la versione legacy (12 sezioni)
