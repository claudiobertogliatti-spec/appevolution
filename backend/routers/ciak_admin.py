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
            "ex_motivo": p.get("ex_motivo"),
            "ex_data": p.get("ex_data"),
            "quarantena_tipo": p.get("quarantena_tipo"),
            "quarantena_motivo": p.get("quarantena_motivo"),
            "quarantena_data_inizio": p.get("quarantena_data_inizio"),
            "quarantena_ripresa_prevista": p.get("quarantena_ripresa_prevista"),
        })
    return {"total": len(partners), "items": partners}


class PartnerStatoRequest(BaseModel):
    stato: str = Field(..., description="attivo | quarantena | ex")
    motivo: Optional[str] = Field(None, description="Motivo uscita (es. 'Non rinnovato') — solo per stato=ex")
    data_fine: Optional[str] = Field(None, description="Data fine partnership ISO (es. '2026-06-03') — solo per stato=ex")
    # Quarantena: due nature distinte. "richiesta" = il partner ha chiesto di
    # sospendere pagamenti + contratto (pausa concordata, reversibile). "morosita"
    # = pagamenti fermi (churn potenziale). Distinte dal campo quarantena_tipo.
    quarantena_tipo: Optional[str] = Field(None, description="richiesta | morosita — solo per stato=quarantena")
    quarantena_motivo: Optional[str] = Field(None, description="Motivo sospensione — solo per stato=quarantena")
    data_inizio: Optional[str] = Field(None, description="Data inizio sospensione ISO — solo per stato=quarantena")
    ripresa_prevista: Optional[str] = Field(None, description="Data ripresa prevista ISO (opzionale) — solo per stato=quarantena")


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
    updates = {
        "stato": payload.stato,
        "stato_updated_at": datetime.now(timezone.utc).isoformat(),
        "stato_updated_by": getattr(admin, "email", None) or getattr(admin, "user_id", None),
    }
    if payload.stato == "ex":
        # Uscita pulita (es. "non rinnovato"), distinta dalla churn per morosità
        # che arriva da Quarantena. Motivo/data opzionali, settati solo se forniti.
        if payload.motivo:
            updates["ex_motivo"] = payload.motivo
        updates["ex_data"] = payload.data_fine or datetime.now(timezone.utc).date().isoformat()
    elif payload.stato == "quarantena":
        # Sospensione: default "richiesta" (pausa concordata su domanda del partner).
        updates["quarantena_tipo"] = payload.quarantena_tipo or "richiesta"
        if payload.quarantena_motivo:
            updates["quarantena_motivo"] = payload.quarantena_motivo
        updates["quarantena_data_inizio"] = payload.data_inizio or datetime.now(timezone.utc).date().isoformat()
        if payload.ripresa_prevista:
            updates["quarantena_ripresa_prevista"] = payload.ripresa_prevista
    res = await db.partners.update_one(
        {"id": partner_id},
        {"$set": updates},
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


# ─── Transactions Partnership €2.790 ──────────────────────────────────────

@router.get("/transactions-partnership")
async def ciak_transactions_partnership(
    admin=Depends(require_ciak_admin),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Acquisti Partnership Evolution €2.790. Sorgente: proposte con
    pagamento_completato=True. Amount = contract_params.corrispettivo
    (default 2790.0 se non override).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    items = []
    async for p in db.proposte.find(
        {"pagamento_completato": True}
    ).sort("pagamento_completato_at", -1):
        contract_params = p.get("contract_params", {}) or {}
        amount = float(contract_params.get("corrispettivo", 2790.0))
        items.append({
            "email": p.get("prospect_email"),
            "nome": p.get("prospect_nome"),
            "amount_euro": amount,
            "metodo": p.get("pagamento_metodo"),
            "at": p.get("pagamento_completato_at"),
            "partner_id": p.get("partner_id"),
            "stripe_session_id": p.get("stripe_session_id_conferma"),
            "token": p.get("token"),
            "contratto_firmato_at": p.get("contratto_firmato_at"),
        })

    total = len(items)
    page = items[offset:offset + limit]
    total_incassato_euro = sum(i["amount_euro"] for i in items)

    return {
        "total": total,
        "total_incassato_euro": total_incassato_euro,
        "limit": limit,
        "offset": offset,
        "items": page,
    }


# ─── Masterclass Analytics ─────────────────────────────────────────────────

@router.get("/masterclass-analytics")
async def ciak_masterclass_analytics(admin=Depends(require_ciak_admin)):
    """
    Vista analitica del funnel masterclass:
      - Funnel: opt-in → checkpoint → 8 domande → click €67 → acquisto
      - Distribuzione 4 stati (checkpoint + diagnostic)
      - Email checkpoint: sent / opened / open_rate per stato
      - Sorgenti opt-in (UTM source / source)
      - Trend ultimi 30 giorni
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    # ── Funnel cumulativo ──────────────────────────────────────────────
    opt_in = await db.ciak_leads.count_documents({})
    checkpoint_done = await db.ciak_checkpoint_events.count_documents({})
    diagnostic_started = await db.diagnostic_sessions.count_documents({})
    diagnostic_completed = await db.diagnostic_sessions.count_documents(
        {"current_state": {"$nin": ["lead_created", "ciak_started"]}}
    )
    clicked_67 = await db.diagnostic_sessions.count_documents(
        {"events.event": "clicked_67"}
    )
    purchased = await db.diagnostic_sessions.count_documents(
        {"current_state": {"$in": list(_PURCHASED_STATES)}}
    )

    # ── Distribuzione 4 stati (Checkpoint pre-acquisto) ────────────────
    checkpoint_per_stato = {"1": 0, "2": 0, "3": 0, "4": 0}
    async for row in db.ciak_checkpoint_events.aggregate([
        {"$match": {"stato_server": {"$ne": None}}},
        {"$group": {"_id": "$stato_server", "n": {"$sum": 1}}},
    ]):
        key = str(row["_id"])
        if key in checkpoint_per_stato:
            checkpoint_per_stato[key] = row["n"]

    # ── Distribuzione 4 stati (8 Domande post-acquisto) ────────────────
    diagnostic_per_stato = {"1": 0, "2": 0, "3": 0, "4": 0}
    async for row in db.diagnostic_sessions.aggregate([
        {"$match": {"scoring.stato_finale": {"$ne": None}}},
        {"$group": {"_id": "$scoring.stato_finale", "n": {"$sum": 1}}},
    ]):
        key = str(row["_id"])
        if key in diagnostic_per_stato:
            diagnostic_per_stato[key] = row["n"]

    # ── Email checkpoint: sent vs opened per stato ─────────────────────
    email_per_stato = {
        "1": {"sent": 0, "opened": 0},
        "2": {"sent": 0, "opened": 0},
        "3": {"sent": 0, "opened": 0},
        "4": {"sent": 0, "opened": 0},
    }
    # Documento ciak_checkpoint_emails: {tracking_token, sent: bool, opened_at: null|iso, stato, ...}
    # NB: il campo è "sent" (bool), non "sent_at". Tracking apertura: opened_at != null.
    async for row in db.ciak_checkpoint_emails.aggregate([
        {"$group": {
            "_id": "$stato",
            "sent": {"$sum": {"$cond": [{"$eq": ["$sent", True]}, 1, 0]}},
            "opened": {"$sum": {"$cond": [{"$ifNull": ["$opened_at", False]}, 1, 0]}},
        }},
    ]):
        key = str(row["_id"])
        if key in email_per_stato:
            email_per_stato[key] = {"sent": row["sent"], "opened": row["opened"]}
    # open rate
    for k, v in email_per_stato.items():
        v["open_rate_pct"] = round((v["opened"] / v["sent"]) * 100) if v["sent"] else 0

    # ── Sorgenti opt-in (source + utm_source) ──────────────────────────
    sources = {}
    async for row in db.ciak_leads.aggregate([
        {"$group": {
            "_id": {"$ifNull": ["$source", "unknown"]},
            "n": {"$sum": 1},
        }},
        {"$sort": {"n": -1}},
    ]):
        sources[row["_id"] or "unknown"] = row["n"]

    utm_sources = {}
    async for row in db.ciak_leads.aggregate([
        {"$group": {
            "_id": {"$ifNull": ["$utm.source", "(direct)"]},
            "n": {"$sum": 1},
        }},
        {"$sort": {"n": -1}},
        {"$limit": 10},
    ]):
        utm_sources[row["_id"] or "(direct)"] = row["n"]

    # ── Trend ultimi 30gg (opt-in per giorno) ──────────────────────────
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    trend_optin = {}
    async for row in db.ciak_leads.aggregate([
        {"$match": {"created_at": {"$gte": since}}},
        {"$project": {"day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "n": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]):
        trend_optin[row["_id"]] = row["n"]

    # ── Conversion rates ───────────────────────────────────────────────
    def _pct(curr, prev):
        return round((curr / prev) * 100, 1) if prev else 0

    return {
        "funnel": {
            "opt_in": opt_in,
            "checkpoint_done": checkpoint_done,
            "diagnostic_started": diagnostic_started,
            "diagnostic_completed": diagnostic_completed,
            "clicked_67": clicked_67,
            "purchased_67": purchased,
        },
        "conversion_pct": {
            "optin_to_checkpoint": _pct(checkpoint_done, opt_in),
            "checkpoint_to_diagnostic": _pct(diagnostic_started, checkpoint_done),
            "diagnostic_to_purchase": _pct(purchased, diagnostic_completed),
            "optin_to_purchase": _pct(purchased, opt_in),
        },
        "checkpoint_per_stato": checkpoint_per_stato,
        "diagnostic_per_stato": diagnostic_per_stato,
        "email_per_stato": email_per_stato,
        "sources": sources,
        "utm_sources": utm_sources,
        "trend_optin_30d": trend_optin,
    }


# ─── KB Matteo — system prompt editor ──────────────────────────────────────

class MatteoPromptCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=100)
    parent_id: Optional[str] = None
    activate: bool = True


@router.get("/matteo-prompt")
async def get_matteo_prompt(admin=Depends(require_ciak_admin)):
    """
    Ritorna prompt attivo + lista versioni storiche. Se nessuna versione in DB,
    `active` è None (l'inferenza userà il fallback hardcoded `_SYSTEM_PROMPT`).
    """
    from services import ciak_matteo_prompt_store
    from services.ciak_matteo import _SYSTEM_PROMPT as HARDCODED_PROMPT  # noqa

    active = await ciak_matteo_prompt_store.get_active_prompt()
    versions = await ciak_matteo_prompt_store.list_versions(limit=50)

    return {
        "active": active,
        "fallback_hardcoded": {
            "label": "v1.4 hardcoded (fallback)",
            "content": HARDCODED_PROMPT,
            "is_fallback": True,
        },
        "versions": versions,
    }


@router.post("/matteo-prompt")
async def create_matteo_prompt(
    body: MatteoPromptCreate,
    admin=Depends(require_ciak_admin),
):
    """Crea nuova versione. Se activate=True (default), diventa attiva."""
    from services import ciak_matteo_prompt_store

    author_email = getattr(admin, "email", None) or getattr(admin, "sub", "unknown")

    new = await ciak_matteo_prompt_store.create_version(
        content=body.content,
        label=body.label,
        author_email=author_email,
        parent_id=body.parent_id,
        activate=body.activate,
    )
    return {"success": True, "version": new}


@router.post("/matteo-prompt/{version_id}/activate")
async def activate_matteo_prompt(
    version_id: str,
    admin=Depends(require_ciak_admin),
):
    """Rollback: riattiva una versione storica."""
    from services import ciak_matteo_prompt_store
    activated = await ciak_matteo_prompt_store.activate_version(version_id)
    if not activated:
        raise HTTPException(404, "Versione non trovata")
    return {"success": True, "active": activated}


# ─── Site config (Cal.com booking URL, ecc.) ───────────────────────────────
# Collection ciak_site_config: 1 doc per chiave (key, value, updated_at, updated_by)

class SiteConfigUpdate(BaseModel):
    value: str = Field(..., max_length=2000)


SITE_CONFIG_KEYS = {
    "calcom_booking_url": "URL Cal.com booking Ciak Blueprint (60 min). Es: https://cal.com/claudio-bertogliatti/ciak-blueprint-60",
    "calcom_booking_url_stato4": "URL Cal.com booking Ciak Blueprint esteso (90 min, solo Stato 4). Opzionale, fallback su calcom_booking_url se vuoto.",
}


@router.get("/site-config")
async def get_site_config(admin=Depends(require_ciak_admin)):
    """Ritorna tutte le chiavi di config configurabili + valori attuali."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    items = {}
    async for doc in db.ciak_site_config.find({}):
        items[doc["key"]] = {
            "value": doc.get("value", ""),
            "updated_at": doc.get("updated_at"),
            "updated_by": doc.get("updated_by"),
        }
    # Restituisci tutte le chiavi note, anche se non ancora settate
    result = {}
    for key, descr in SITE_CONFIG_KEYS.items():
        result[key] = {
            "description": descr,
            "value": items.get(key, {}).get("value", ""),
            "updated_at": items.get(key, {}).get("updated_at"),
            "updated_by": items.get(key, {}).get("updated_by"),
        }
    return result


@router.put("/site-config/{key}")
async def set_site_config(
    key: str,
    body: SiteConfigUpdate,
    admin=Depends(require_ciak_admin),
):
    """Upsert valore per una chiave di config."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if key not in SITE_CONFIG_KEYS:
        raise HTTPException(400, f"Chiave sconosciuta. Note: {list(SITE_CONFIG_KEYS.keys())}")
    author = getattr(admin, "email", None) or getattr(admin, "sub", "unknown")
    await db.ciak_site_config.update_one(
        {"key": key},
        {"$set": {
            "value": body.value.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": author,
        }},
        upsert=True,
    )
    return {"success": True, "key": key, "value": body.value.strip()}


# ─── Partner setup pending (magic link recovery per admin) ────────────────

@router.get("/partner-setup-pending")
async def partner_setup_pending(
    admin=Depends(require_ciak_admin),
    include_consumed: bool = Query(False, description="Includi anche partner che hanno già completato setup"),
):
    """
    Lista partner che hanno ricevuto un magic link di setup ma non l'hanno
    ancora consumato (o tutti, se include_consumed=true).

    Use case: se Systeme non manda l'email per qualunque motivo (workflow non
    attivo, contatto sconosciuto, deliverability), Claudio recupera il magic
    link da qui e lo copincolla manualmente al partner via WhatsApp o altro.

    Solo partner attivi (role=partner). Token censurato in mid (xxxxxx) per
    sicurezza visuale, ma l'URL completo è restituito copiabile.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    query: dict = {"role": "partner", "partner_setup_token": {"$exists": True, "$ne": None}}
    if not include_consumed:
        query["partner_setup_consumed_at"] = None

    items = []
    async for u in db.users.find(query, {
        "_id": 0, "id": 1, "email": 1, "name": 1,
        "partner_setup_token": 1,
        "partner_setup_expires_at": 1,
        "partner_setup_created_at": 1,
        "partner_setup_consumed_at": 1,
    }).sort("partner_setup_created_at", -1).limit(100):
        token = u.get("partner_setup_token") or ""
        # Censura visuale del token: xxxxxx, ma URL completo nei dati
        token_preview = f"{token[:6]}…{token[-4:]}" if len(token) > 12 else "***"
        items.append({
            "partner_id": u.get("id"),
            "email": u.get("email"),
            "nome": u.get("name"),
            "token_preview": token_preview,
            "setup_url": f"https://www.ciak.io/partner/setup-password?token={token}" if token else None,
            "created_at": u.get("partner_setup_created_at"),
            "expires_at": u.get("partner_setup_expires_at"),
            "consumed_at": u.get("partner_setup_consumed_at"),
            "status": "consumed" if u.get("partner_setup_consumed_at") else "pending",
        })

    # Conta pending vs consumed per stat top
    pending_count = sum(1 for i in items if i["status"] == "pending")

    return {
        "total": len(items),
        "pending": pending_count,
        "consumed": len(items) - pending_count,
        "items": items,
    }


# Endpoint PUBBLICO per il frontend (no auth — solo letture pubbliche selezionate)
@router.get("/public-config", include_in_schema=False)
async def get_public_config():
    """Subset PUBBLICO delle config (no admin auth richiesto). Restituisce
    solo chiavi sicure da esporre nel frontend."""
    if db is None:
        return {"calcom_booking_url": "", "calcom_booking_url_stato4": ""}
    result = {"calcom_booking_url": "", "calcom_booking_url_stato4": ""}
    async for doc in db.ciak_site_config.find({"key": {"$in": list(result.keys())}}):
        result[doc["key"]] = doc.get("value", "")
    return result
