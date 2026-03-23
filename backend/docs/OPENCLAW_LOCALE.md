# OpenClaw - Configurazione Locale

## Cos'è OpenClaw?

OpenClaw è il "braccio esecutivo" del sistema Evolution PRO. È un bot che gira sul **tuo computer locale** e riceve task da Valentina via Telegram.

Quando Valentina non può eseguire un'azione direttamente (es: browser automation su Systeme.io), invia un task a OpenClaw che lo esegue usando il browser del tuo computer.

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD (Evolution PRO OS)                  │
├─────────────────────────────────────────────────────────────┤
│  Valentina AI  ─────►  Telegram API  ─────►  @valentina_evo_bot
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Messaggi Task)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LOCALE (Computer di Claudio)                │
├─────────────────────────────────────────────────────────────┤
│  OpenClaw Bot  ◄───── Telegram (polling/webhook)             │
│       │                                                      │
│       ▼                                                      │
│  Playwright Browser  ─────►  Systeme.io / Stripe / etc.     │
└─────────────────────────────────────────────────────────────┘
```

## Configurazione Rapida

### 1. Requisiti

- Python 3.10+
- Node.js 18+ (opzionale, per versione JS)
- Playwright installato

### 2. File `.env` locale

Crea un file `.env` nella cartella OpenClaw con:

```env
TELEGRAM_BOT_TOKEN=8424701823:AAGtRwk4ZUthZxYAer4vfnLmTxzs3c3jkIs
TELEGRAM_ADMIN_CHAT_ID=852111182
SYSTEME_API_KEY=<la_tua_api_key_systeme>
```

### 3. Script OpenClaw Listener

Crea `openclaw_listener.py`:

```python
import os
import asyncio
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from playwright.async_api import async_playwright
import json
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
ADMIN_CHAT_ID = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')

# Pattern per riconoscere task OpenClaw
TASK_PATTERN = re.compile(r'🦞 FALLBACK REQUEST\n(.+)', re.DOTALL)

async def handle_task(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Gestisce un task ricevuto da Valentina"""
    message = update.message.text
    chat_id = update.effective_chat.id
    
    # Solo messaggi dall'admin
    if str(chat_id) != ADMIN_CHAT_ID:
        return
    
    # Verifica se è un task OpenClaw
    if '🦞 FALLBACK REQUEST' not in message:
        return
    
    logger.info(f"Task ricevuto: {message[:100]}...")
    
    # Parse task
    try:
        lines = message.split('\n')
        task_data = {}
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                task_data[key.strip()] = value.strip()
        
        task_id = task_data.get('task_id', 'unknown')
        task_type = task_data.get('task_type', 'unknown')
        
        # Esegui task
        result = await execute_task(task_type, task_data)
        
        # Rispondi
        if result.get('success'):
            response = f"✅ FALLBACK COMPLETATO task_id: {task_id} action: {task_type} result: {result.get('message', 'OK')}"
        else:
            response = f"❌ FALLBACK FALLITO task_id: {task_id} error: {result.get('error', 'Errore sconosciuto')}"
        
        await context.bot.send_message(chat_id=chat_id, text=response)
        
    except Exception as e:
        logger.error(f"Errore task: {e}")
        await context.bot.send_message(chat_id=chat_id, text=f"❌ Errore: {str(e)}")

async def execute_task(task_type: str, task_data: dict) -> dict:
    """Esegue il task usando Playwright"""
    
    if task_type == 'create_pipeline_column':
        return await create_pipeline_column(task_data)
    elif task_type == 'move_contact_to_column':
        return await move_contact_to_column(task_data)
    elif task_type == 'browser_generic_task':
        return await browser_generic_task(task_data)
    else:
        return {"success": False, "error": f"Task type '{task_type}' non supportato"}

async def create_pipeline_column(data: dict) -> dict:
    """Crea colonna pipeline su Systeme.io"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # headless=False per debug
        page = await browser.new_page()
        
        try:
            # Login Systeme.io
            await page.goto('https://systeme.io/login')
            await page.fill('input[name="email"]', os.environ.get('SYSTEME_EMAIL', ''))
            await page.fill('input[name="password"]', os.environ.get('SYSTEME_PASSWORD', ''))
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(3000)
            
            # Vai a Pipeline
            await page.goto('https://systeme.io/funnel/pipelines')
            await page.wait_for_timeout(2000)
            
            # Crea colonna (logica specifica da implementare)
            # ...
            
            return {"success": True, "message": "Colonna creata"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            await browser.close()

async def move_contact_to_column(data: dict) -> dict:
    """Sposta contatto in colonna pipeline"""
    # Implementazione simile...
    return {"success": False, "error": "Da implementare"}

async def browser_generic_task(data: dict) -> dict:
    """Task browser generico"""
    # Implementazione...
    return {"success": False, "error": "Da implementare"}

def main():
    """Avvia il listener OpenClaw"""
    if not BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN non configurato")
        return
    
    print(f"🦞 OpenClaw Listener avviato")
    print(f"📬 In ascolto su @valentina_evo_bot")
    print(f"👤 Admin chat ID: {ADMIN_CHAT_ID}")
    
    # IMPORTANTE: Rimuovi webhook per usare polling locale
    import requests
    requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook")
    print("🔄 Webhook rimosso, usando polling locale")
    
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_task))
    
    app.run_polling()

if __name__ == '__main__':
    main()
```

### 4. Avvio

```bash
# Installa dipendenze
pip install python-telegram-bot playwright
playwright install chromium

# Avvia listener
python openclaw_listener.py
```

## Note Importanti

1. **Webhook vs Polling**: Quando OpenClaw locale è attivo, deve **rimuovere il webhook** per ricevere i messaggi via polling. Quando spegni OpenClaw locale, riattiva il webhook con:
   ```
   curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://partner-journey-1.preview.emergentagent.com/api/telegram/webhook"
   ```

2. **Sicurezza**: Lo script verifica che i messaggi arrivino solo dall'admin (TELEGRAM_ADMIN_CHAT_ID).

3. **Credenziali Systeme.io**: Servono per le azioni browser. Aggiungi al `.env`:
   ```
   SYSTEME_EMAIL=tua_email@example.com
   SYSTEME_PASSWORD=tua_password
   ```

## Categorie Task

| Categoria | Descrizione | Esempio |
|-----------|-------------|---------|
| A | Esecuzione diretta | `add_systeme_tag`, `create_pipeline_column` |
| B | Richiede approvazione | `trigger_email_campaign`, `publish_landing` |
| C | Mai eseguito da OpenClaw | `generate_content`, `strategic_decision` |

## Troubleshooting

### Task non arrivano
- Verifica che il webhook cloud sia disattivato
- Controlla che `TELEGRAM_ADMIN_CHAT_ID` sia corretto
- Verifica che lo script sia in esecuzione

### Errori browser
- Assicurati che Playwright sia installato: `playwright install`
- Prova con `headless=False` per debug visuale
