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
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

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


# ─── Partners list (per la "vista admin" dell'area partner Ciak) ──────────

@router.get("/partners")
async def ciak_partners_list(
    admin=Depends(require_ciak_admin),
    stato: Optional[str] = Query(None, description="Filtra per stato: attivo | quarantena | ex"),
    con_piano: bool = Query(False, description="Solo partner con un piano di pagamento rateale"),
):
    """
    Lista partner — usata dal selettore "vista admin" dell'area partner Ciak
    e dalle pagine Quarantena/Ex Partner. Restituisce id + nome + fase + stato
    + piano_pagamento.

    `stato` (campo `partner.stato`): "attivo" (default se assente) / "quarantena"
    (pagamenti rateali sospesi) / "ex" (partnership conclusa/risolta).

    `piano_pagamento` (campo `partner.piano_pagamento`): presente solo per i
    partner su piano rateale tracciato — tipo "mensile" (vecchio contratto) o
    "rate_concordate" (rate concordate fuori-Klarna). Klarna e saldo unico NON
    sono tracciati (l'importo è già incassato per intero).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    partners = []
    async for p in db.partners.find({}).sort("name", 1):
        st = p.get("stato") or "attivo"
        piano = p.get("piano_pagamento")
        if stato and st != stato:
            continue
        if con_piano and not piano:
            continue
        partners.append({
            "id": p.get("id"),
            "name": p.get("name"),
            "email": p.get("email"),
            "phase": p.get("phase"),
            "niche": p.get("niche") or p.get("nicchia"),
            "revenue": p.get("revenue"),
            "contract_signed": bool(p.get("contract_signed")),
            "contract": p.get("contract"),  # data contratto (string) o struttura
            "stato": st,
            "piano_pagamento": piano,
        })
    return {"total": len(partners), "items": partners}


class PartnerStatoRequest(BaseModel):
    stato: str = Field(..., description="attivo | quarantena | ex")


@router.post("/partner/{partner_id}/stato")
async def ciak_set_partner_stato(
    partner_id: str,
    payload: PartnerStatoRequest,
    admin=Depends(require_ciak_admin),
):
    """
    Cambia lo stato di un partner: attivo / quarantena (pagamenti sospesi) / ex.
    Flag manuale gestito dall'admin (non c'è un segnale automatico dei pagamenti
    rateali Klarna). Registra anche timestamp + chi ha fatto la modifica.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if payload.stato not in ("attivo", "quarantena", "ex"):
        raise HTTPException(400, "stato non valido (attivo | quarantena | ex)")
    res = await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "stato": payload.stato,
            "stato_updated_at": datetime.now(timezone.utc).isoformat(),
            "stato_updated_by": getattr(admin, "email", None) or getattr(admin, "user_id", None),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Partner non trovato")
    return {"ok": True, "partner_id": partner_id, "stato": payload.stato}


class PianoPagamentoRequest(BaseModel):
    # tipo: "mensile" (vecchio contratto) | "rate_concordate" (fuori-Klarna).
    # Klarna e saldo unico NON si tracciano (importo già incassato).
    tipo: str = Field(..., description="mensile | rate_concordate")
    rate_totali: int = Field(..., ge=1, le=120)
    rate_pagate: int = Field(0, ge=0, le=120)
    importo_rata: Optional[float] = Field(None, ge=0)
    prossima_scadenza: Optional[str] = None
    note: Optional[str] = Field(None, max_length=1000)


@router.post("/partner/{partner_id}/piano-pagamento")
async def ciak_set_piano_pagamento(
    partner_id: str,
    payload: PianoPagamentoRequest,
    admin=Depends(require_ciak_admin),
):
    """
    Crea/aggiorna il piano di pagamento rateale di un partner (mensilità da
    vecchio contratto o rate concordate fuori-Klarna). Dato manuale gestito
    dall'admin — non c'è una fonte automatica per questi piani.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if payload.tipo not in ("mensile", "rate_concordate"):
        raise HTTPException(400, "tipo non valido (mensile | rate_concordate)")
    if payload.rate_pagate > payload.rate_totali:
        raise HTTPException(400, "rate_pagate non può superare rate_totali")
    piano = {
        "tipo": payload.tipo,
        "rate_totali": payload.rate_totali,
        "rate_pagate": payload.rate_pagate,
        "importo_rata": payload.importo_rata,
        "prossima_scadenza": payload.prossima_scadenza,
        "note": payload.note,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.partners.update_one(
        {"id": partner_id}, {"$set": {"piano_pagamento": piano}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Partner non trovato")
    return {"ok": True, "partner_id": partner_id, "piano_pagamento": piano}


@router.delete("/partner/{partner_id}/piano-pagamento")
async def ciak_remove_piano_pagamento(partner_id: str, admin=Depends(require_ciak_admin)):
    """Rimuove il piano di pagamento da un partner (es. passato a saldo unico)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    res = await db.partners.update_one(
        {"id": partner_id}, {"$unset": {"piano_pagamento": ""}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Partner non trovato")
    return {"ok": True, "partner_id": partner_id}


@router.delete("/partner/{partner_id}")
async def ciak_delete_partner(partner_id: str, admin=Depends(require_ciak_admin)):
    """
    Elimina un partner: rimuove il record `partners` e l'account utente
    collegato (se presente). Operazione irreversibile — il frontend chiede
    conferma esplicita prima di chiamarla.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(404, "Partner non trovato")
    user_id = partner.get("user_id")
    pr = await db.partners.delete_one({"id": partner_id})
    users_deleted = 0
    if user_id:
        ur = await db.users.delete_one({"id": user_id})
        users_deleted = ur.deleted_count
    return {
        "ok": True,
        "partner_id": partner_id,
        "partners_deleted": pr.deleted_count,
        "users_deleted": users_deleted,
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


# ─── Pipeline kanban (da memory: ciak_technical_spec.md, state machine 10 stati) ──

# Pipeline Prospect — pre-acquisto €67. Colonne in ordine di funnel.
_PROSPECT_COLUMNS = [
    ("iscritto", "Iscritto masterclass"),
    ("checkpoint", "Checkpoint compilato"),
    ("diagnostica", "8 Domande completate"),
    ("report", "Report Matteo"),
    ("click_67", "Click checkout €67"),
]
_PROSPECT_RANK = {k: i for i, (k, _) in enumerate(_PROSPECT_COLUMNS)}
_PROSPECT_STATE_TO_STAGE = {
    "lead_created": "iscritto",
    "ciak_started": "iscritto",
    "ciak_completed": "diagnostica",
    "report_generated": "report",
    "clicked_67": "click_67",
}

# Pipeline Blueprint — post-acquisto €67. Colonne in ordine di funnel.
_BLUEPRINT_COLUMNS = [
    ("acquistato", "Blueprint acquistato"),
    ("call_prenotata", "Call prenotata"),
    ("call_fatta", "Call fatta"),
    ("in_trattativa", "In trattativa"),
    ("contratto_pagato", "Contratto firmato + pagato"),
]
_BLUEPRINT_RANK = {k: i for i, (k, _) in enumerate(_BLUEPRINT_COLUMNS)}
_BLUEPRINT_STATE_TO_STAGE = {
    "purchased_67": "acquistato",
    "call_booked": "call_prenotata",
    "call_done": "call_fatta",
    "partner_approved": "contratto_pagato",
    "partner_active": "contratto_pagato",
}


def _columns_from_entries(entries: dict, columns_def: list) -> list:
    """entries: email → {email, nome, stage, updated_at, session_token}.
    Restituisce la struttura colonne per il kanban."""
    by_stage: dict = {k: [] for k, _ in columns_def}
    for e in entries.values():
        st = e.get("stage")
        if st in by_stage:
            by_stage[st].append(e)
    for items in by_stage.values():
        items.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return [
        {"id": k, "label": label, "count": len(by_stage[k]), "items": by_stage[k]}
        for k, label in columns_def
    ]


@router.get("/pipeline-prospect")
async def pipeline_prospect(admin=Depends(require_ciak_admin)):
    """
    Pipeline Prospect — funnel PRE-acquisto €67 in formato kanban.
    Unisce ciak_leads + ciak_checkpoint_events + diagnostic_sessions per email,
    calcola lo stadio più avanzato. Esclude chi ha già acquistato (→ Pipeline Blueprint).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    # Email che hanno già acquistato → fuori da questa pipeline
    purchased = set()
    async for d in db.diagnostic_sessions.find(
        {"current_state": {"$in": list(_PURCHASED_STATES)}}, {"user_email": 1}
    ):
        if d.get("user_email"):
            purchased.add(d["user_email"])

    entries: dict = {}

    def _bump(email, stage, nome=None, updated_at=None, token=None):
        if not email or email in purchased:
            return
        e = entries.get(email)
        if e is None:
            e = {"email": email, "nome": nome, "stage": stage,
                 "updated_at": updated_at, "session_token": token}
            entries[email] = e
            return
        if _PROSPECT_RANK.get(stage, -1) > _PROSPECT_RANK.get(e["stage"], -1):
            e["stage"] = stage
            e["updated_at"] = updated_at or e["updated_at"]
            if token:
                e["session_token"] = token
        if nome and not e.get("nome"):
            e["nome"] = nome

    async for l in db.ciak_leads.find({}):
        _bump(l.get("email"), "iscritto", l.get("nome"), l.get("created_at"))
    async for c in db.ciak_checkpoint_events.find({}):
        _bump(c.get("email"), "checkpoint", None, c.get("created_at"))
    async for d in db.diagnostic_sessions.find({}):
        stage = _PROSPECT_STATE_TO_STAGE.get(d.get("current_state"))
        if stage:
            _bump(d.get("user_email"), stage, d.get("user_name"),
                  d.get("created_at"), d.get("session_token"))

    columns = _columns_from_entries(entries, _PROSPECT_COLUMNS)
    return {"columns": columns, "total": sum(c["count"] for c in columns)}


@router.get("/pipeline-blueprint")
async def pipeline_blueprint(admin=Depends(require_ciak_admin)):
    """
    Pipeline Blueprint — journey POST-acquisto €67 in formato kanban.
    Fonte: diagnostic_sessions (state machine) + ciak_orphan_purchases.
    Arricchimento "in trattativa" / "contratto pagato" da `proposte` (best-effort, per email).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    # Proposte indicizzate per email (best-effort: prova più campi email)
    proposte_by_email: dict = {}
    async for p in db.proposte.find({}):
        em = p.get("prospect_email") or p.get("email") or p.get("user_email")
        if em:
            proposte_by_email[em] = p

    entries: dict = {}

    def _bump(email, stage, nome=None, updated_at=None, token=None):
        if not email:
            return
        e = entries.get(email)
        if e is None:
            entries[email] = {"email": email, "nome": nome, "stage": stage,
                              "updated_at": updated_at, "session_token": token}
            return
        if _BLUEPRINT_RANK.get(stage, -1) > _BLUEPRINT_RANK.get(e["stage"], -1):
            e["stage"] = stage
            e["updated_at"] = updated_at or e["updated_at"]
            if token:
                e["session_token"] = token
        if nome and not e.get("nome"):
            e["nome"] = nome

    async for d in db.diagnostic_sessions.find(
        {"current_state": {"$in": list(_PURCHASED_STATES)}}
    ):
        stage = _BLUEPRINT_STATE_TO_STAGE.get(d.get("current_state"), "acquistato")
        em = d.get("user_email")
        _bump(em, stage, d.get("user_name"), d.get("created_at"), d.get("session_token"))
        # Arricchimento da proposta collegata
        prop = proposte_by_email.get(em) if em else None
        if prop:
            if prop.get("pagamento_completato"):
                _bump(em, "contratto_pagato", None, prop.get("contratto_firmato_at"))
            elif prop.get("stato") in ("inviata", "vista", "accettata", "contratto_firmato"):
                _bump(em, "in_trattativa", None, prop.get("accettato_at") or prop.get("visto_at"))

    # Acquisti orfani — colonna "acquistato"
    async for o in db.ciak_orphan_purchases.find({}):
        _bump(o.get("customer_email"), "acquistato", None, o.get("created_at"))

    columns = _columns_from_entries(entries, _BLUEPRINT_COLUMNS)
    return {"columns": columns, "total": sum(c["count"] for c in columns)}
