"""
Ciak — EVO-S (abbonamenti post 12 mesi) + richieste Booster EVO.

Tre funzioni, un solo router (registrato in server.py vicino a servizi_extra):
  - POST /api/evo-booster/evo-s-checkout          → checkout Stripe abbonamento EVO-S
                                                     (prodotti propri, separati dal Growth System)
  - GET  /api/evo-booster/evo-s-eligibility/{id}  → gating "12 mesi" (legge partners.contract)
  - POST /api/evo-booster/booster-request         → registra richiesta Booster + notifica team
  - GET  /api/evo-booster/booster-requests        → lista richieste (admin Ciak)

Stripe è inizializzato come negli altri router (STRIPE_API_KEY). I prezzi EVO-S
sono creati al volo con price_data (recurring mensile): non servono Price ID
preconfigurati. La permanenza minima 6 mesi è contrattuale (comunicata nella UI),
non imposta da Stripe.
Collezioni: evo_s_requests (intenti checkout), booster_requests (richieste), alerts (notifica admin).
"""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evo-booster", tags=["evo-booster"])
security = HTTPBearer(auto_error=False)

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


async def require_ciak_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Stesso pattern di routers/ciak_admin.py — role admin/superadmin."""
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


stripe.api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.ciak.io")

# Piani EVO-S — importi in centesimi, ricorrenza mensile.
EVO_S_PLANS = {
    "start": {"name": "EVO-S Start", "amount": 29700},
    "grow": {"name": "EVO-S Grow", "amount": 49700},
    "scale": {"name": "EVO-S Scale", "amount": 79700},
}

# Mesi di percorso EVO prima di poter accedere a EVO-S.
EVO_MONTHS_REQUIRED = 12


# ═══════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════
class EvoSCheckoutRequest(BaseModel):
    partner_id: str
    plan: str  # "start" | "grow" | "scale"


class BoosterRequestIn(BaseModel):
    partner_id: str
    booster_id: str
    booster_name: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════
def _parse_contract_date(value):
    """partners.contract può essere stringa ISO ('2026-06-30' o con orario) o datetime."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        s = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                dt = datetime.strptime(s[:10], "%Y-%m-%d")
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
    return None


async def _notify_team_telegram(text: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")
    if not token or not chat_id:
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text},
            )
    except Exception as e:  # best-effort
        logger.warning("Telegram notify fallita: %s", e)


# ═══════════════════════════════════════════════════════════════════════════
# EVO-S — eligibility (gating 12 mesi)
# ═══════════════════════════════════════════════════════════════════════════
@router.get("/evo-s-eligibility/{partner_id}")
async def evo_s_eligibility(partner_id: str):
    partner = await db.partners.find_one({"id": partner_id}) if db is not None else None
    contract_dt = _parse_contract_date(partner.get("contract")) if partner else None

    now = datetime.now(timezone.utc)
    if not contract_dt:
        return {
            "partner_id": partner_id,
            "contract_date": None,
            "months_elapsed": None,
            "eligible": False,
            "months_remaining": None,
            "unlock_date": None,
        }

    days_elapsed = (now - contract_dt).days
    months_elapsed = round(days_elapsed / 30.44, 1)
    eligible = days_elapsed >= EVO_MONTHS_REQUIRED * 30.44
    unlock_dt = contract_dt + timedelta(days=int(EVO_MONTHS_REQUIRED * 30.44))
    months_remaining = max(0, round((unlock_dt - now).days / 30.44, 1)) if not eligible else 0

    return {
        "partner_id": partner_id,
        "contract_date": contract_dt.date().isoformat(),
        "months_elapsed": months_elapsed,
        "eligible": eligible,
        "months_remaining": months_remaining,
        "unlock_date": unlock_dt.date().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════
# EVO-S — checkout abbonamento (prodotti propri via price_data)
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/evo-s-checkout")
async def evo_s_checkout(payload: EvoSCheckoutRequest):
    plan = (payload.plan or "").lower()
    info = EVO_S_PLANS.get(plan)
    if not info:
        raise HTTPException(status_code=400, detail="Piano EVO-S non valido")

    # Registra l'intento (best-effort) per la vista admin.
    try:
        if db is not None:
            await db.evo_s_requests.insert_one({
                "id": str(uuid.uuid4()),
                "partner_id": payload.partner_id,
                "plan": plan,
                "amount": info["amount"],
                "status": "checkout_avviato",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        logger.warning("evo_s_requests insert fallita: %s", e)

    if not stripe.api_key:
        # Stripe non configurato → il frontend mostra il fallback "ti contattiamo".
        return {"checkout_url": None, "error": "stripe_non_configurato"}

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": info["name"], "description": "Abbonamento EVO-S — permanenza minima 6 mesi"},
                    "unit_amount": info["amount"],
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            metadata={"tipo": "evo_s", "plan": plan, "partner_id": payload.partner_id},
            subscription_data={"metadata": {"tipo": "evo_s", "plan": plan, "partner_id": payload.partner_id}},
            success_url=f"{FRONTEND_URL}/partner/evo-s?payment=success",
            cancel_url=f"{FRONTEND_URL}/partner/evo-s?payment=cancelled",
        )
        return {"checkout_url": session.url}
    except Exception as e:
        logger.error("Stripe EVO-S checkout fallito: %s", e)
        return {"checkout_url": None, "error": "checkout_fallito"}


# ═══════════════════════════════════════════════════════════════════════════
# BOOSTER — richiesta (registra + notifica team)
# ═══════════════════════════════════════════════════════════════════════════
@router.post("/booster-request")
async def booster_request(payload: BoosterRequestIn):
    if db is None:
        raise HTTPException(status_code=500, detail="DB non disponibile")

    partner = await db.partners.find_one({"id": payload.partner_id})
    partner_name = (partner or {}).get("name") or payload.partner_id
    booster_label = payload.booster_name or payload.booster_id
    now_iso = datetime.now(timezone.utc).isoformat()

    req_id = str(uuid.uuid4())
    await db.booster_requests.insert_one({
        "id": req_id,
        "partner_id": payload.partner_id,
        "partner_name": partner_name,
        "booster_id": payload.booster_id,
        "booster_name": booster_label,
        "status": "nuova",
        "created_at": now_iso,
    })

    # Alert visibile lato admin (stessa collezione usata dagli agenti).
    try:
        await db.alerts.insert_one({
            "id": str(uuid.uuid4()),
            "agent": "STEFANIA",
            "type": "RICHIESTA_BOOSTER",
            "msg": f"{partner_name} ha richiesto il Booster «{booster_label}».",
            "partner_id": payload.partner_id,
            "partner": partner_name,
            "resolved": False,
            "status": "open",
            "created_at": now_iso,
        })
    except Exception as e:
        logger.warning("alerts insert fallita: %s", e)

    await _notify_team_telegram(
        f"🔔 Nuova richiesta Booster\nPartner: {partner_name}\nBooster: {booster_label}"
    )

    return {"ok": True, "request_id": req_id}


@router.get("/booster-requests")
async def list_booster_requests(_admin=Depends(require_ciak_admin)):
    if db is None:
        raise HTTPException(status_code=500, detail="DB non disponibile")
    items = []
    async for r in db.booster_requests.find({}).sort("created_at", -1):
        r.pop("_id", None)
        items.append(r)
    return {"total": len(items), "items": items}
