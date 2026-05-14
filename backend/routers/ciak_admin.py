"""
Ciak — Admin panel router.

Endpoint admin-only per il pannello di gestione Ciak (ciak.io/admin). MVP:
  - GET  /api/admin/ciak/stats        → conteggi funnel per la dashboard
  - GET  /api/admin/ciak/leads        → lista leads (merge ciak_leads + diagnostic + checkpoint)
  - GET  /api/admin/ciak/lead         → dettaglio singolo lead (by email)
  - GET  /api/admin/ciak/transactions → transazioni Stripe Ciak Blueprint €67

Auth: riusa il role `admin` esistente (Claudio + Antonella). Niente nuovo role.
Pattern auth identico a routers/admin_stefania.py (require_admin).

Collection lette (sola lettura — questo router non scrive nulla):
  - ciak_leads             (opt-in masterclass)
  - diagnostic_sessions    (8 Domande Ciak + scoring + report Matteo + state machine)
  - ciak_checkpoint_events (Checkpoint Strategico 5 domande)
  - ciak_orphan_purchases  (acquisti Stripe senza diagnostic session collegata)

Riferimento: memory/ciak_brand_copy_framework.md (bridge Ciak → Partnership),
memory/ciak_technical_spec.md (state machine, scoring).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak", tags=["ciak-admin"])
security = HTTPBearer(auto_error=False)

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


# ─── Auth ──────────────────────────────────────────────────────────────────

async def require_ciak_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Identico pattern a routers/admin_stefania.py — role admin/superadmin."""
    from auth import decode_token
    if not credentials:
        raise HTTPException(status_code=401, detail="Token non fornito")
    data = decode_token(credentials.credentials)
    if not data or data.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return data


# ─── Helpers ───────────────────────────────────────────────────────────────

def _clean(doc: Optional[dict]) -> Optional[dict]:
    """Rimuove _id ObjectId (non serializzabile JSON) da un doc Mongo."""
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


# Stati funnel "post-acquisto" (hanno pagato i €67)
_PURCHASED_STATES = {
    "purchased_67", "call_booked", "call_done",
    "partner_approved", "partner_active",
}


# ─── Stats ─────────────────────────────────────────────────────────────────

@router.get("/stats")
async def ciak_stats(admin=Depends(require_ciak_admin)):
    """Conteggi rapidi per la dashboard admin (header KPI + funnel)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")

    leads_total = await db.ciak_leads.count_documents({})
    checkpoint_total = await db.ciak_checkpoint_events.count_documents({})
    diagnostic_total = await db.diagnostic_sessions.count_documents({})

    # Funnel per current_state della diagnostic session
    funnel = {}
    async for row in db.diagnostic_sessions.aggregate([
        {"$group": {"_id": "$current_state", "n": {"$sum": 1}}},
    ]):
        funnel[row["_id"] or "unknown"] = row["n"]

    # Distribuzione Stato finale (1-4)
    stati = {}
    async for row in db.diagnostic_sessions.aggregate([
        {"$match": {"scoring.stato_finale": {"$ne": None}}},
        {"$group": {"_id": "$scoring.stato_finale", "n": {"$sum": 1}}},
    ]):
        stati[str(row["_id"])] = row["n"]

    purchased = await db.diagnostic_sessions.count_documents(
        {"current_state": {"$in": list(_PURCHASED_STATES)}}
    )
    orphan_purchases = await db.ciak_orphan_purchases.count_documents({})

    return {
        "leads_total": leads_total,
        "checkpoint_completati": checkpoint_total,
        "diagnostiche_avviate": diagnostic_total,
        "acquisti_67": purchased,
        "acquisti_orfani": orphan_purchases,
        "funnel_by_state": funnel,
        "distribuzione_stati": stati,
    }


# ─── Leads list ────────────────────────────────────────────────────────────

@router.get("/leads")
async def ciak_leads_list(
    admin=Depends(require_ciak_admin),
    q: Optional[str] = Query(None, description="Ricerca per email (substring)"),
    state: Optional[str] = Query(None, description="Filtra per current_state diagnostic"),
    stato: Optional[int] = Query(None, ge=1, le=4, description="Filtra per Stato finale 1-4"),
    only_purchased: bool = Query(False, description="Solo chi ha acquistato i €67"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Lista leads. Entità primaria = ciak_leads (opt-in masterclass), arricchita
    in-app con la diagnostic_session e il checkpoint event per la stessa email.

    Strategia: 1 query paginata su ciak_leads + 2 query batch ($in sulle email)
    su diagnostic_sessions e ciak_checkpoint_events. Merge in memoria.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    lead_filter: dict = {}
    if q:
        lead_filter["email"] = {"$regex": q.strip().lower(), "$options": "i"}

    total = await db.ciak_leads.count_documents(lead_filter)

    leads = []
    async for doc in (
        db.ciak_leads.find(lead_filter)
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    ):
        leads.append(_clean(doc))

    emails = [l["email"] for l in leads if l.get("email")]

    # Batch: ultima diagnostic_session per email
    diag_by_email: dict = {}
    if emails:
        async for d in db.diagnostic_sessions.find(
            {"user_email": {"$in": emails}}
        ).sort("created_at", -1):
            em = d.get("user_email")
            if em and em not in diag_by_email:  # tieni la più recente
                diag_by_email[em] = d

    # Batch: ultimo checkpoint event per email
    cp_by_email: dict = {}
    if emails:
        async for c in db.ciak_checkpoint_events.find(
            {"email": {"$in": emails}}
        ).sort("created_at", -1):
            em = c.get("email")
            if em and em not in cp_by_email:
                cp_by_email[em] = c

    items = []
    for lead in leads:
        em = lead.get("email")
        diag = diag_by_email.get(em)
        cp = cp_by_email.get(em)
        scoring = (diag or {}).get("scoring", {}) or {}
        report = (diag or {}).get("report", {}) or {}
        items.append({
            "email": em,
            "nome": lead.get("nome"),
            "source": lead.get("source"),
            "utm": lead.get("utm", {}),
            "created_at": lead.get("created_at"),
            # Checkpoint (pre-acquisto)
            "checkpoint_stato": (cp or {}).get("stato_server"),
            "checkpoint_at": (cp or {}).get("created_at"),
            # Diagnostic / 8 Domande (post-acquisto)
            "diagnostic_state": (diag or {}).get("current_state"),
            "stato_finale": scoring.get("stato_finale"),
            "score_numerico": scoring.get("score_numerico"),
            "has_report": bool(report.get("report_markdown")),
            "session_token": (diag or {}).get("session_token"),
            "purchased": (diag or {}).get("current_state") in _PURCHASED_STATES,
        })

    # Filtri post-merge (su campi derivati dalla diagnostic)
    if state:
        items = [i for i in items if i["diagnostic_state"] == state]
    if stato is not None:
        items = [i for i in items if i["stato_finale"] == stato]
    if only_purchased:
        items = [i for i in items if i["purchased"]]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }


# ─── Lead detail ───────────────────────────────────────────────────────────

@router.get("/lead")
async def ciak_lead_detail(
    email: str = Query(..., description="Email del lead"),
    admin=Depends(require_ciak_admin),
):
    """
    Dettaglio completo di un lead: record ciak_leads + tutte le diagnostic_sessions
    + tutti i checkpoint events + transazioni. Vista 360° per la call e per
    decidere se generare la Proposta Partnership.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    email = email.strip().lower()
    lead = _clean(await db.ciak_leads.find_one({"email": email}))

    diagnostics = []
    async for d in db.diagnostic_sessions.find(
        {"user_email": email}
    ).sort("created_at", -1):
        diagnostics.append(_clean(d))

    checkpoints = []
    async for c in db.ciak_checkpoint_events.find(
        {"email": email}
    ).sort("created_at", -1):
        checkpoints.append(_clean(c))

    if not lead and not diagnostics and not checkpoints:
        raise HTTPException(404, "Lead non trovato")

    # Lead "qualificato" per la Proposta Partnership: ha fatto la call (call_done)
    # ed è Stato 3-4. Il bottone "Genera Proposta" nel frontend usa questo flag.
    qualified_for_proposta = False
    latest_diag = diagnostics[0] if diagnostics else None
    if latest_diag:
        st = latest_diag.get("current_state")
        stato_finale = (latest_diag.get("scoring", {}) or {}).get("stato_finale")
        qualified_for_proposta = (
            st in ("call_done", "call_booked")
            and stato_finale in (3, 4)
        )

    return {
        "email": email,
        "lead": lead,
        "diagnostics": diagnostics,
        "checkpoints": checkpoints,
        "latest_diagnostic": latest_diag,
        "qualified_for_proposta": qualified_for_proposta,
    }


# ─── Transactions ──────────────────────────────────────────────────────────

@router.get("/transactions")
async def ciak_transactions(
    admin=Depends(require_ciak_admin),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Transazioni Ciak Blueprint €67. Due fonti:
      1. diagnostic_sessions con evento stripe_payment_completed (acquisti collegati)
      2. ciak_orphan_purchases (acquisti senza diagnostic session — da gestire a mano)
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    transactions = []

    # Fonte 1 — diagnostic_sessions con pagamento completato
    async for d in db.diagnostic_sessions.find(
        {"events.event": "stripe_payment_completed"}
    ).sort("created_at", -1):
        pay_events = [
            e for e in d.get("events", [])
            if e.get("event") == "stripe_payment_completed"
        ]
        ev = pay_events[-1] if pay_events else {}
        meta = ev.get("metadata", {}) or {}
        transactions.append({
            "type": "linked",
            "email": d.get("user_email"),
            "nome": d.get("user_name"),
            "stripe_session_id": meta.get("stripe_session_id"),
            "amount_total": meta.get("amount_total"),
            "at": ev.get("timestamp"),
            "current_state": d.get("current_state"),
            "session_token": d.get("session_token"),
        })

    # Fonte 2 — acquisti orfani
    async for o in db.ciak_orphan_purchases.find({}).sort("created_at", -1):
        transactions.append({
            "type": "orphan",
            "email": o.get("customer_email"),
            "nome": None,
            "stripe_session_id": o.get("stripe_session_id"),
            "amount_total": o.get("amount_total"),
            "at": o.get("created_at"),
            "current_state": None,
            "session_token": None,
        })

    # Ordina per data desc (string ISO → ordinabile lessicograficamente)
    transactions.sort(key=lambda t: t.get("at") or "", reverse=True)

    total = len(transactions)
    page = transactions[offset:offset + limit]
    total_incassato = sum(
        (t.get("amount_total") or 0) for t in transactions
    )

    return {
        "total": total,
        "total_incassato_cent": total_incassato,
        "limit": limit,
        "offset": offset,
        "items": page,
    }
