# GUIDA — Come applicare i prompt degli agenti su Emergent

## ISTRUZIONI GENERALI

Su Emergent, apri il progetto Evolution PRO OS.
Vai nella sezione "Files" o "Code" e naviga nella struttura del backend.
La cartella è: `/app/backend/`

---

## 1. VALENTINA (modifica file esistente)

**File:** `/app/backend/valentina_ai.py`

**Cosa fare:**
1. Apri il file su Emergent.
2. Cerca la variabile che contiene il system prompt di Valentina.
   Potrebbe chiamarsi: `SYSTEM_PROMPT`, `VALENTINA_PROMPT`, `system_prompt`, o simile.
3. Sostituisci l'intero valore della variabile con il contenuto di `VALENTINA_system_prompt.py`.
4. Salva il file.
5. Clicca "Deploy" o "Run" per aggiornare l'app.

---

## 2. ANDREA (modifica file esistente o crea nuovo)

**File:** `/app/backend/andrea_ai.py` (o equivalente se già esiste)

**Cosa fare:**
1. Se esiste già un file per ANDREA: cerca e sostituisci il system prompt come sopra.
2. Se non esiste: crea un nuovo file `andrea_ai.py` e incolla il contenuto di `ANDREA_system_prompt.py`.
3. Verifica che il file sia importato in `server.py` o nel router corretto.

---

## 3. MARCO (nuovo agente — da creare da zero)

**File da creare:** `/app/backend/marco_ai.py`

**Cosa fare:**
1. Crea un nuovo file `marco_ai.py` nel backend.
2. Incolla il contenuto di `MARCO_system_prompt.py`.
3. Modella la struttura sul pattern di `valentina_ai.py` (stesso schema: system prompt + funzione di chiamata API).
4. Aggiungi il riferimento a MARCO in `server.py` e nell'Agent Hub dell'admin.

**Schema minimo da replicare da valentina_ai.py:**
```python
import anthropic

MARCO_SYSTEM_PROMPT = """..."""  # incolla qui il prompt

client = anthropic.Anthropic()

def ask_marco(user_message: str, context: dict) -> str:
    prompt_with_context = MARCO_SYSTEM_PROMPT.format(**context)
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=prompt_with_context,
        messages=[{"role": "user", "content": user_message}]
    )
    return message.content[0].text
```

---

## 4. GAIA (riproporre da agente esistente)

**File esistente:** probabilmente `funnel_ai.py` o `incident_ai.py`

**Cosa fare:**
1. Crea un nuovo file `gaia_ai.py` (oppure rinomina quello esistente).
2. Incolla il contenuto di `GAIA_system_prompt.py` come nuovo system prompt.
3. Mantieni la stessa struttura di chiamata API.
4. Aggiorna il riferimento nell'Agent Hub per mostrare "GAIA - Supporto Tecnico".

---

## 5. STEFANIA (riproporre da agente esistente)

**File esistente:** probabilmente `copy_ai.py` o `traffico_ai.py`

**Cosa fare:**
1. Crea un nuovo file `stefania_ai.py`.
2. Incolla il contenuto di `STEFANIA_system_prompt.py`.
3. NOTA IMPORTANTE: Stefania è un agente di background — non ha una chat diretta con i partner.
   Va attivata tramite cron job o trigger automatici nel backend.
4. Valuta con Emergent se aggiungere un endpoint `/api/orchestration/daily-check` per il report giornaliero.

---

## AGENTI DA IBERNARE (azzerare budget, non eliminare)

Nell'Agent Hub dell'admin, imposta budget = €0 per:
- ORION
- MARTA
- LUCA
- ATLAS

Non eliminare i file — mantienili per riattivazione futura.

---

## ORDINE DI PRIORITÀ CONSIGLIATO

1. ✅ VALENTINA (modifica prompt — impatto immediato)
2. ✅ ANDREA (modifica prompt — impatto immediato)
3. ✅ GAIA (rinomina + nuovo prompt)
4. 🆕 MARCO (nuovo agente — richiede test)
5. 🆕 STEFANIA (orchestrazione — da implementare con cron job)
6. 💤 Ibernare ORION/MARTA/LUCA/ATLAS
