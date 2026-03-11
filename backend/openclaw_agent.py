"""
openclaw_agent.py
Agente OpenClaw per Evolution PRO OS.
Connette Systeme.io alla dashboard e notifica Claudio su Telegram.
"""
import os
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List

# ── CONFIGURAZIONE ───────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "") or os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "")
SYSTEME_API_KEY = os.environ.get("SYSTEME_API_KEY", "")

OPENCLAW_CONFIG = {
    "id": "OPENCLAW",
    "role": "Data Intelligence & Notifiche",
    "status": "ACTIVE",
    "category": "Sistema",
    "description": "Connette Systeme.io alla dashboard. Notifica Claudio su Telegram.",
    "check_interval_minutes": 30,
}


# ── TELEGRAM ─────────────────────────────────────────────────
async def send_telegram(message: str, chat_id: str = None) -> dict:
    """Invia un messaggio Telegram a Claudio."""
    cid = chat_id or TELEGRAM_CHAT_ID
    if not TELEGRAM_BOT_TOKEN or not cid:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non configurati"}

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": cid,
        "text": message,
        # NO parse_mode — evita errori con caratteri speciali
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=payload)
            return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── SYSTEME.IO ───────────────────────────────────────────────
async def fetch_systeme_contacts(limit: int = 100) -> list:
    """Recupera i contatti da Systeme.io."""
    if not SYSTEME_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.systeme.io/api/contacts",
                headers={"X-API-Key": SYSTEME_API_KEY, "accept": "application/json"},
                params={"limit": limit}
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("items", data if isinstance(data, list) else [])
    except Exception as e:
        print(f"[OpenClaw] Errore Systeme contacts: {e}")
    return []


async def fetch_systeme_orders() -> list:
    """Recupera gli ordini da Systeme.io."""
    if not SYSTEME_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                "https://api.systeme.io/api/orders",
                headers={"X-API-Key": SYSTEME_API_KEY, "accept": "application/json"},
                params={"limit": 100}
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("items", data if isinstance(data, list) else [])
    except Exception as e:
        print(f"[OpenClaw] Errore Systeme orders: {e}")
    return []


# ── LOGICA PRINCIPALE ────────────────────────────────────────
async def run_openclaw(db=None) -> dict:
    """
    Esegue un ciclo OpenClaw:
    1. Legge dati da Systeme.io
    2. Aggiorna la dashboard in MongoDB
    3. Invia notifiche Telegram per eventi rilevanti
    Ritorna un summary dell'esecuzione.
    """
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "contacts_found": 0,
        "orders_found": 0,
        "mrr": 0,
        "new_orders_24h": 0,
        "notifications_sent": 0,
        "errors": []
    }

    # 1. Recupera dati
    contacts = await fetch_systeme_contacts()
    orders = await fetch_systeme_orders()

    result["contacts_found"] = len(contacts)
    result["orders_found"] = len(orders)

    # 2. Calcola MRR dagli ordini (somma ordini ultimi 30 giorni)
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    day_ago = now - timedelta(days=1)

    mrr = 0
    new_orders_24h = []

    for order in orders:
        try:
            # Gestisci diversi formati data Systeme.io
            created_raw = order.get("createdAt") or order.get("created_at") or order.get("date") or ""
            if created_raw:
                # Normalizza il formato data
                if isinstance(created_raw, str):
                    created_raw = created_raw.replace("Z", "+00:00")
                    if "+" not in created_raw and "-" not in created_raw[-6:]:
                        created_raw += "+00:00"
                    created = datetime.fromisoformat(created_raw.split("+")[0]).replace(tzinfo=timezone.utc)
                else:
                    created = created_raw
                
                amount = float(order.get("total") or order.get("amount") or order.get("price") or 0)
                if created > month_ago:
                    mrr += amount
                if created > day_ago:
                    new_orders_24h.append(order)
        except Exception as e:
            result["errors"].append(f"parse order: {e}")

    result["mrr"] = round(mrr, 2)
    result["new_orders_24h"] = len(new_orders_24h)

    # 3. Aggiorna MongoDB se disponibile
    if db is not None:
        try:
            await db.dashboard_stats.update_one(
                {"_id": "overview"},
                {"$set": {
                    "mrr": mrr,
                    "total_contacts": len(contacts),
                    "total_orders": len(orders),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            # Salva log esecuzione
            await db.openclaw_logs.insert_one({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "cycle",
                "result": result
            })
        except Exception as e:
            result["errors"].append(f"db update: {e}")

    # 4. Notifiche Telegram per nuovi ordini
    for order in new_orders_24h:
        try:
            nome = order.get("customer", {}).get("name") or order.get("contactName") or "Cliente"
            email = order.get("customer", {}).get("email") or order.get("contactEmail") or ""
            amount = order.get("total") or order.get("amount") or 0
            product = order.get("product", {}).get("name") or order.get("productName") or "prodotto"

            msg = (
                f"NUOVO ORDINE\n"
                f"Cliente: {nome}\n"
                f"Email: {email}\n"
                f"Prodotto: {product}\n"
                f"Importo: {amount} EUR\n"
                f"Data: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
            )
            tg_result = await send_telegram(msg)
            if tg_result.get("ok"):
                result["notifications_sent"] += 1
        except Exception as e:
            result["errors"].append(f"notify order: {e}")

    return result


async def get_openclaw_status() -> dict:
    """Ritorna lo stato corrente di OpenClaw."""
    return {
        "agent": "OPENCLAW",
        "status": "ACTIVE",
        "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID),
        "systeme_configured": bool(SYSTEME_API_KEY),
        "config": OPENCLAW_CONFIG
    }
