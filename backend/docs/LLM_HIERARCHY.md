# Gerarchia Potenza LLM - Evolution PRO OS

## Principio Guida
> **"Usa l'intelligenza giusta per il compito giusto"**

---

## 🔴 Claude Opus (Cloud) - Massima Intelligenza

**Quando usare:** Task strategici, creativi, che richiedono sfumature e ragionamento complesso.

| Agente/Task | Utilizzo | Motivazione |
|-------------|----------|-------------|
| **Valentina Strategica** | Conversazioni complesse, obiezioni, negoziazione | Richiede empatia e adattamento |
| **Marco Coaching** | Sessioni di coaching 1:1 | Richiede comprensione profonda |
| **Analisi 21 Sezioni** | Analisi strategica completa | Task critico, alta qualità richiesta |
| **Generazione Script Alta Conversione** | Script di vendita personalizzati | Persuasione richiede intelligenza |
| **Valentina First Contact** | Messaggi outreach personalizzati | Primo contatto deve essere perfetto |

**Costo:** ~$0.015/1K tokens input, ~$0.075/1K tokens output
**Latenza:** 2-5 secondi

---

## 🟢 Ollama / Llama 3 (Locale) - Velocità e Costo Zero

**Quando usare:** Task ripetitivi, alto volume, che richiedono velocità e zero costi.

| Agente/Task | Utilizzo | Motivazione |
|-------------|----------|-------------|
| **Gaia - Scraping HTML** | Estrazione dati da siti web | Alto volume, schema fisso |
| **Discovery - Pulizia Lead** | Deduplica, validazione dati | Operazione batch ripetitiva |
| **Micro-post Generation** | Post social brevi | Template-based, alto volume |
| **Data Validation** | Normalizzazione dati | Regole fisse, zero creatività |
| **Gaia - Analisi Sito** | Estrazione info base da HTML | Pattern recognition |

**Costo:** €0.00 (zero)
**Latenza:** 0.5-2 secondi
**Token:** Infiniti

---

## Configurazione Tecnica

### Ollama Setup
```bash
# Host (macchina locale con GPU)
ollama serve

# Modello consigliato
ollama pull llama3:8b
```

### Environment Variables
```env
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=llama3:8b
OLLAMA_TIMEOUT=120
```

### API Endpoints

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/ollama/status` | Verifica stato Ollama |
| `POST /api/ollama/test` | Test generazione |
| `POST /api/ollama/extract-lead-html` | Estrai dati da HTML |
| `POST /api/ollama/clean-leads` | Pulizia lead |
| `POST /api/ollama/generate-micropost` | Genera micro-post |
| `POST /api/ollama/validate-data` | Valida dati |

---

## Logica di Fallback

```
Task → Ollama disponibile?
         ├── SÌ → Usa Llama 3 locale
         └── NO → Fallback a Claude (con warning log)
```

Il sistema verifica automaticamente la disponibilità di Ollama. Se non raggiungibile, usa Claude come fallback per garantire continuità del servizio.

---

## Metriche da Monitorare

1. **Token Claude risparmiati/mese** - Target: >80% task spostati su Ollama
2. **Latenza media Ollama** - Target: <2s per task standard
3. **Fallback rate** - Target: <5% chiamate che usano Claude fallback
4. **Errori Ollama** - Target: <1% failure rate

---

*Ultimo aggiornamento: 18 Marzo 2026*
