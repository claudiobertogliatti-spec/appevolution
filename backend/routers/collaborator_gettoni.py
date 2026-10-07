"""Gettoni di Mariangela nel Back office → Collaboratori."""

import re
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from routers.collaborator_settlements import require_billing_admin
from services.collaborator_gettoni import COLLABORATOR_ID, build_gettoni, month_bounds_ok

router = APIRouter(prefix="/api/admin/ciak/collaboratori/mariangela", tags=["collaborator-gettoni"])
db = None
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def set_db(database):
    global db
    db = database


class Attribution(BaseModel):
    """Lead di Mariangela inserito o corretto a mano (anche fuori dal funnel Ciak)."""
    email: str = Field(min_length=3)
    nome: str = Field(default="", max_length=120)
    nota: str = Field(default="", max_length=500)
    call_fatta_il: Optional[str] = None  # YYYY-MM-DD, solo per call fatte fuori da Ciak
    esito_start_il: Optional[str] = None  # YYYY-MM-DD, pacchetto su misura pagato con link personalizzato
    mese: Optional[str] = None  # YYYY-MM, mese di ingresso del lead (default: quello del primo contatto o di oggi)


def _email(value) -> str:
    return (value or "").strip().lower()


def _actor(admin):
    return getattr(admin, "email", None) or getattr(admin, "user_id", None) or "admin"


def _past_date(value, what: str) -> str:
    """Data YYYY-MM-DD opzionale, mai nel futuro. Vuota = nessuna data."""
    value = (value or "").strip()
    if not value:
        return ""
    try:
        day = date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, f"Data {what} non valida (YYYY-MM-DD)")
    if day > datetime.now(timezone.utc).date():
        raise HTTPException(422, f"La data dell'{what} non può essere nel futuro" if what == "acquisto" else f"La {what} non può essere nel futuro")
    return value


def _ci(email: str) -> dict:
    return {"$regex": f"^{re.escape(email)}$", "$options": "i"}


@router.get("/gettoni")
async def gettoni(month: str = Query(default=None), admin=Depends(require_billing_admin)):
    month = month or datetime.now(timezone.utc).strftime("%Y-%m")
    if not month_bounds_ok(month):
        raise HTTPException(422, "Mese non valido (YYYY-MM)")
    manual = {
        _email(a.get("email")): {
            "nome": a.get("nome") or "",
            "nota": a.get("nota") or "",
            "call_fatta_il": a.get("call_fatta_il") or "",
            "esito_start_il": a.get("esito_start_il") or "",
            "mese": a.get("mese") or str(a.get("created_at") or "")[:7],
        }
        async for a in db.collaborator_attributions.find({"collaborator_id": COLLABORATOR_ID}, {"_id": 0})
    }
    diagnostics = [d async for d in db.diagnostic_sessions.find({}, {"_id": 0}).sort("created_at", -1)]
    seen, latest, first_contact = set(), [], {}
    for d in diagnostics:  # una sola sessione per lead: la più recente
        em = _email(d.get("user_email"))
        if not em:
            continue
        created = str(d.get("created_at") or "")
        if created and (em not in first_contact or created < first_contact[em]):
            first_contact[em] = created  # le sessioni arrivano dalla piu recente: tengo la piu vecchia
        if em not in seen:
            seen.add(em)
            latest.append(d)
    for d in latest:
        d["lead_since"] = first_contact.get(_email(d.get("user_email")), "")
    clients = {
        _email(c.get("email")): c
        async for c in db.ciak_clients.find(
            {}, {"_id": 0, "email": 1, "name": 1, "nome": 1, "start_purchased_at": 1, "partnership_purchased_at": 1})
    }
    return build_gettoni(month, latest, clients, manual)


@router.post("/attribuzioni", status_code=201)
async def save_attribution(req: Attribution, admin=Depends(require_billing_admin)):
    """Aggiunge un lead a Mariangela oppure ne corregge la scheda (stessa email = stesso lead)."""
    email = _email(req.email)
    if not _EMAIL_RE.match(email):
        raise HTTPException(422, "Email non valida")
    call_fatta_il = _past_date(req.call_fatta_il, "call")
    esito_start_il = _past_date(req.esito_start_il, "acquisto")
    nome = req.nome.strip()
    this_month = datetime.now(timezone.utc).strftime("%Y-%m")
    existing = await db.collaborator_attributions.find_one({"collaborator_id": COLLABORATOR_ID, "email": email}) or {}
    mese = (req.mese or "").strip()
    if mese:
        if not month_bounds_ok(mese):
            raise HTTPException(422, "Mese non valido (YYYY-MM)")
        if mese > this_month:
            raise HTTPException(422, "Il mese di ingresso non può essere nel futuro")
    known = await db.diagnostic_sessions.find_one({"user_email": _ci(email)}) or await db.ciak_clients.find_one({"email": _ci(email)})
    if not known and not nome:
        raise HTTPException(422, "Lead sconosciuto a Ciak: indica anche il nome")
    if not mese:
        # nessun mese indicato: tengo quello gia salvato; altrimenti il primo contatto reale del lead; altrimenti oggi
        created = [str(d.get("created_at") or "") async for d in db.diagnostic_sessions.find({"user_email": _ci(email)}, {"_id": 0, "created_at": 1})]
        created = [c for c in created if c]
        first = min(created)[:7] if created else ""
        mese = existing.get("mese") or first or this_month
    now = datetime.now(timezone.utc).isoformat()
    await db.collaborator_attributions.update_one(
        {"collaborator_id": COLLABORATOR_ID, "email": email},
        {
            "$set": {"nome": nome, "nota": req.nota.strip(), "call_fatta_il": call_fatta_il, "esito_start_il": esito_start_il, "mese": mese,
                     "updated_by": _actor(admin), "updated_at": now},
            "$setOnInsert": {"created_by": _actor(admin), "created_at": now},
        },
        upsert=True,
    )
    return {"ok": True, "email": email}


@router.delete("/attribuzioni/{email}")
async def remove_attribution(email: str, admin=Depends(require_billing_admin)):
    """Toglie il lead da Mariangela. Non cancella il lead né nessun dato di Ciak."""
    res = await db.collaborator_attributions.delete_one({"collaborator_id": COLLABORATOR_ID, "email": _email(email)})
    return {"ok": True, "removed": res.deleted_count}
