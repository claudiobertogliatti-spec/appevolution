# GUIDA — Integrazione finale in server.py

## COSA AGGIUNGERE A server.py

Cerca in `server.py` la sezione degli import e degli `include_router`.
Aggiungi queste righe nei posti indicati:

---

### 1. IMPORT (in cima al file, con gli altri import)

```python
from routers.agents_router import router as agents_router
from scheduler import start_scheduler, stop_scheduler
```

---

### 2. REGISTRA IL ROUTER (dove ci sono gli altri app.include_router)

```python
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
```

---

### 3. AVVIA LO SCHEDULER (nell'evento startup dell'app)

Cerca nel file qualcosa come `@app.on_event("startup")` o `lifespan`.

Se esiste già un evento startup:
```python
@app.on_event("startup")
async def startup_event():
    # ... codice esistente ...
    start_scheduler()  # ← aggiungi questa riga
```

Se NON esiste, aggiungilo prima della prima route:
```python
@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()
```

---

### 4. INSTALLA DIPENDENZA (nel terminale Emergent)

```bash
pip install apscheduler httpx
```

---

## ENDPOINT DISPONIBILI DOPO IL DEPLOY

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | /api/agents/marco/checkin | Check-in settimanale (lunedì/venerdì) |
| POST | /api/agents/marco/message | Risposta MARCO a messaggio diretto |
| POST | /api/agents/gaia/support | Richiesta supporto tecnico |
| POST | /api/agents/stefania/route | Routing messaggio → agente corretto |
| GET  | /api/agents/stefania/daily-report | Report giornaliero |
| POST | /api/agents/stefania/monitor | Trigger manuale monitoraggio |

---

## JOB AUTOMATICI ATTIVI DOPO IL DEPLOY

| Agente | Giorno/Ora | Azione |
|--------|-----------|--------|
| MARCO | Lunedì 08:30 | Check-in settimanale a tutti i partner |
| MARCO | Venerdì 17:00 | Recap settimanale a tutti i partner |
| STEFANIA | Ogni giorno 07:00 | Monitoraggio inattivi, alert, scadenze |

---

## NOTA SU database.py

I file `helper_functions.py` e `scheduler.py` importano funzioni da `database.py`:
- `get_all_active_partners()`
- `get_open_alerts()`

Verifica che queste funzioni esistano nel tuo database.py.
Se si chiamano diversamente, aggiorna gli import nei due file.
