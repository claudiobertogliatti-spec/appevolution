# Guida Attivazione Celery per Evolution PRO

## Panoramica

Il sistema Celery è stato implementato per gestire in modo affidabile la pipeline video HeyGen → YouTube.
**Non richiede accesso SSH** - si attiva tramite variabili d'ambiente.

---

## STEP 1: Configurare Redis Cloud (OBBLIGATORIO)

Dato che non hai accesso SSH per installare Redis localmente, usa un servizio Redis cloud gratuito.

### Opzione A: Upstash (Consigliato - Gratuito)
1. Vai su https://upstash.com/
2. Crea account gratuito
3. Crea nuovo database Redis
4. Copia la **UPSTASH_REDIS_REST_URL** nel formato:
   ```
   redis://default:PASSWORD@ENDPOINT:PORT
   ```

### Opzione B: Redis Cloud (Alternativa)
1. Vai su https://redis.com/try-free/
2. Crea account gratuito (30MB free tier)
3. Crea database
4. Copia connection string

---

## STEP 2: Configurare Variabili d'Ambiente

Aggiungi queste variabili al file `backend/.env` tramite il pannello Emergent:

```env
# === CELERY CONFIGURATION ===
CELERY_ENABLED=true
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:YOUR_PORT
```

### Esempio con Upstash:
```env
CELERY_ENABLED=true
REDIS_URL=redis://default:AaBbCcDd1234@eu1-caring-fox-12345.upstash.io:6379
```

---

## STEP 3: Deploy

Dopo aver configurato le variabili:
1. Fai deploy dell'applicazione dal pannello Emergent
2. Il worker Celery si avvierà automaticamente con il backend

---

## Verifica Funzionamento

### Via API:
```bash
curl https://app.evolution-pro.it/api/celery/status
```

Risposta attesa se funziona:
```json
{
  "enabled": true,
  "redis_available": true,
  "worker_running": true,
  "beat_running": true,
  "worker_pid": 12345,
  "beat_pid": 12346
}
```

Risposta se Redis non configurato (usa fallback):
```json
{
  "enabled": true,
  "redis_available": false,
  "worker_running": false,
  "beat_running": false
}
```

---

## Come Funziona

1. **All'avvio del backend**: Il `celery_manager.py` verifica se:
   - `CELERY_ENABLED=true`
   - Redis è raggiungibile

2. **Se entrambi OK**: Avvia automaticamente:
   - Celery Worker (processa i job video)
   - Celery Beat (controlla job bloccati ogni 5 minuti)

3. **Se Redis non disponibile**: Usa automaticamente BackgroundTasks come fallback
   (meno affidabile ma funziona)

4. **Auto-restart**: Se il worker crasha, viene riavviato automaticamente

---

## Vantaggi di Celery vs BackgroundTasks

| Feature | BackgroundTasks | Celery |
|---------|-----------------|--------|
| Persistenza job | ❌ Persi al restart | ✅ Salvati in Redis |
| Retry automatico | ❌ No | ✅ 3 tentativi |
| Timeout handling | ❌ Blocca silenziosamente | ✅ 30 min max |
| Monitoraggio | ❌ No | ✅ Status endpoint |
| Job bloccati | ❌ Rimangono stuck | ✅ Auto-cleanup ogni 5 min |

---

## Troubleshooting

### "redis_available": false
- Verifica che REDIS_URL sia corretto
- Controlla che il database Redis sia attivo su Upstash/Redis Cloud
- Verifica che non ci siano firewall che bloccano la connessione

### "worker_running": false (con redis_available: true)
- Controlla i log del backend per errori Celery
- Riavvia l'applicazione dal pannello Emergent

### Pipeline video falliscono
- Verifica endpoint `/api/heygen/pipeline-jobs` per vedere lo stato
- Controlla che HeyGen API key sia valida
- Controlla che YouTube sia autenticato

---

## File di Riferimento

- `/app/backend/celery_app.py` - Configurazione Celery
- `/app/backend/celery_tasks.py` - Task definitions
- `/app/backend/celery_manager.py` - Auto-start manager
- `/app/backend/.env` - Variabili d'ambiente

---

## Costi Redis Cloud

| Provider | Free Tier | Sufficiente per Evolution PRO? |
|----------|-----------|-------------------------------|
| Upstash | 10K comandi/giorno | ✅ Sì |
| Redis Cloud | 30MB storage | ✅ Sì |
| Railway | $5 credito | ✅ Sì |

Per il volume attuale (pochi video/giorno), il tier gratuito è più che sufficiente.
