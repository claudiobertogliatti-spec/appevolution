"""
Ciak — Admin panel router.

Endpoint admin-only per il pannello di gestione Ciak (ciak.io/admin). MVP:
  - GET  /api/admin/ciak/stats        → conteggi funnel per la dashboard
  - GET  /api/admin/ciak/leads        → lista leads (merge ciak_leads + diagnostic + checkpoint)
  - GET  /api/admin/ciak/lead         → dettaglio singolo lead (by email)
  - GET  /api/admin/ciak/transactions → transazioni Stripe Ciak Blueprint €27

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
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/ciak", tags=["ciak-admin"])
security = HTTPBearer(auto_error=False)
from report_key_auth import require_admin_or_report_key

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


def _email(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _event_ts(doc: dict, event_name: str) -> Optional[str]:
    events = doc.get("events") or []
    for event in reversed(events):
        if event.get("event") == event_name:
            return event.get("timestamp")
    return None


def _state_ts(doc: dict, state: str) -> Optional[str]:
    history = doc.get("state_history") or []
    for item in reversed(history):
        if item.get("state") == state:
            return item.get("timestamp")
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _week_start(d: Optional[datetime] = None) -> str:
    current = d or datetime.now(timezone.utc)
    start = current - timedelta(days=current.weekday())
    return start.date().isoformat()


def _month_start_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _parse_iso_or_now(value: Optional[str]) -> datetime:
    return _parse_iso(value) or datetime.now(timezone.utc)


async def _stripe_webhook_observability_snapshot(database, now_iso: Optional[str] = None) -> dict:
    now = _parse_iso_or_now(now_iso)
    stuck_cutoff = (now - timedelta(minutes=10)).isoformat()
    events = database.stripe_webhook_events
    payments = database.payment_transactions

    event_total = await events.count_documents({})
    processed = await events.count_documents({"status": "processed"})
    failed = await events.count_documents({"status": "failed"})
    processing = await events.count_documents({"status": "processing"})
    stuck_processing = await events.count_documents({
        "status": "processing",
        "updated_at": {"$lt": stuck_cutoff},
    })

    paid = await payments.count_documents({"payment_status": "paid"})
    pending = await payments.count_documents({"payment_status": "pending"})

    recent_failures = await events.find(
        {"status": "failed"},
        {
            "_id": 0,
            "event_type": 1,
            "reference_id": 1,
            "tipo": 1,
            "error": 1,
            "updated_at": 1,
        },
    ).sort("updated_at", -1).limit(10).to_list(10)

    recent_processing = await events.find(
        {"status": "processing"},
        {
            "_id": 0,
            "event_type": 1,
            "reference_id": 1,
            "tipo": 1,
            "created_at": 1,
            "updated_at": 1,
        },
    ).sort("updated_at", 1).limit(10).to_list(10)

    return {
        "status": "attention" if failed or stuck_processing else "ok",
        "checked_at": now.isoformat(),
        "stuck_cutoff": stuck_cutoff,
        "events": {
            "total": event_total,
            "processed": processed,
            "failed": failed,
            "processing": processing,
            "stuck_processing": stuck_processing,
        },
        "payments": {
            "paid": paid,
            "pending": pending,
        },
        "recent_failures": recent_failures,
        "recent_processing": recent_processing,
    }


def _lead_item(email: str, name: Optional[str], updated_at: Optional[str], reason: str) -> dict:
    return {
        "email": email,
        "nome": name or email,
        "updated_at": updated_at,
        "reason": reason,
    }


_CLIENTI_CIAK_PUBLIC_FIELDS = {
    "id",
    "email",
    "name",
    "access_level",
    "blueprint_score",
    "recommended_offer",
    "offer_decision",
    "start_credit_amount",
    "start_purchased_at",
    "start_progress",
    "analysis_status",
    "created_at",
    "updated_at",
    "partnership_attiva",
    "stato_cliente",
}


_PARTNER_AREA_ACTIVE_STATES = {"partner_attivo", "convertito_partner"}


def _client_user_lookup_queries(client: dict) -> list[dict]:
    queries = []
    seen = set()

    def add(field: str, value) -> None:
        if value in (None, ""):
            return
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return
            if field == "email":
                value = value.lower()
        query = {field: value}
        key = tuple(sorted(query.items()))
        if key in seen:
            return
        seen.add(key)
        queries.append(query)

    add("email", doc_value(client, "email"))
    add("id", doc_value(client, "user_id"))
    add("id", doc_value(client, "linked_user_id"))
    add("id", doc_value(client, "id"))
    add("session_token", doc_value(client, "session_token"))
    add("session_token", doc_value(client, "diagnostic_session_token"))
    add("diagnostic_session_token", doc_value(client, "session_token"))
    add("diagnostic_session_token", doc_value(client, "diagnostic_session_token"))
    return queries


def doc_value(doc: dict, key: str):
    return doc.get(key)


async def _canonical_user_for_client(client: dict) -> Optional[dict]:
    users_collection = getattr(db, "users", None)
    if db is None or users_collection is None:
        return None
    for query in _client_user_lookup_queries(client):
        user = await users_collection.find_one(query, {"_id": 0})
        if user:
            return user
    return None


def _partner_area_available(doc: dict) -> bool:
    if doc.get("partnership_attiva") is True:
        return True
    stato_cliente = str(doc.get("stato_cliente") or "").strip().lower()
    if stato_cliente in _PARTNER_AREA_ACTIVE_STATES:
        return True
    return doc.get("access_level") == "partner"


def _effective_clienti_ciak_access_level(client: dict, user: Optional[dict]) -> Optional[str]:
    return _effective_clienti_ciak_snapshot(client, user).get("access_level")


def _effective_clienti_ciak_snapshot(client: dict, user: Optional[dict]) -> dict:
    effective = dict(client)
    if user:
        for field in ("partnership_attiva", "stato_cliente"):
            if user.get(field) is not None:
                effective[field] = user[field]
        if _partner_area_available(effective):
            effective["access_level"] = "partner"
    return effective


def _public_clienti_ciak_item(doc: dict, user: Optional[dict] = None) -> dict:
    effective = _effective_clienti_ciak_snapshot(doc, user)
    payload = {key: value for key, value in effective.items() if key in _CLIENTI_CIAK_PUBLIC_FIELDS}
    payload["access_level"] = effective.get("access_level")
    if user is None:
        payload.pop("partnership_attiva", None)
        payload.pop("stato_cliente", None)
    return payload


# Stati funnel "post-acquisto" (hanno pagato i €27)
_PURCHASED_STATES = {
    "purchased_67", "call_booked", "call_done",
    "partner_approved", "partner_active",
}


# ─── Partners list (per la "vista admin" dell'area partner Ciak) ──────────

@router.get("/partners")
async def ciak_partners_list(
    admin=Depends(require_ciak_admin),
    stato: Optional[str] = Query(None, description="Filtra per stato: attivo | sospeso | quarantena | ex"),
    con_piano: bool = Query(False, description="Solo partner con un piano di pagamento rateale"),
    include_profile: bool = Query(False, description="Include dati reali aggregati da partner_hub, brand kit e percorso"),
):
    """
    Lista partner — usata dal selettore "vista admin" dell'area partner Ciak
    e dalle pagine Quarantena/Ex Partner. Restituisce id + nome + fase + stato
    + piano_pagamento.

    `stato` (campo `partner.stato`): "attivo" (default se assente) / "sospeso"
    (pausa operativa) / "quarantena" (blocco critico o pagamenti sospesi) /
    "ex" (partnership conclusa/risolta).

    `piano_pagamento` (campo `partner.piano_pagamento`): presente solo per i
    partner su piano rateale tracciato — tipo "mensile" (vecchio contratto) o
    "rate_concordate" (rate concordate fuori-Klarna). Klarna e saldo unico NON
    sono tracciati (l'importo è già incassato per intero).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    query = {}
    if stato == "attivo":
        # I partner storici non hanno sempre `stato`: assenza/null vale attivo.
        query = {"$or": [{"stato": {"$exists": False}}, {"stato": None}, {"stato": "attivo"}]}
    elif stato:
        query = {"stato": stato}

    partners = []
    async for p in db.partners.find(query).sort("name", 1):
        st = p.get("stato") or "attivo"
        piano = p.get("piano_pagamento")
        if con_piano and not piano:
            continue
        item = {
            "id": p.get("id"),
            "name": p.get("name") or p.get("nome"),
            "email": p.get("email"),
            "phase": p.get("phase"),
            "niche": p.get("niche") or p.get("nicchia"),
            "revenue": p.get("revenue"),
            "bio": p.get("bio"),
            "phone": p.get("phone") or p.get("telefono"),
            "website": p.get("website") or p.get("social_website"),
            "instagram": p.get("instagram") or p.get("social_instagram"),
            "linkedin": p.get("linkedin") or p.get("social_linkedin"),
            "youtube": p.get("youtube") or p.get("social_youtube"),
            "systeme_subdomain": p.get("systeme_subdomain"),
            "youtube_playlist_id": p.get("youtube_playlist_id") or p.get("yt_playlist_id"),
            "kpi_manual": p.get("kpi_manual"),
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
        }
        partners.append(item)

    if include_profile and partners:
        partner_ids = [p["id"] for p in partners if p.get("id")]

        hub_by_partner = {}
        async for h in db.partner_hub.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
            hub_by_partner[h.get("partner_id")] = h

        brand_by_partner = {}
        async for b in db.partner_brand_kits.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
            brand_by_partner[b.get("partner_id")] = b

        journey_by_partner = {}
        async for s in db.partner_journey_steps.find(
            {"partner_id": {"$in": partner_ids}, "step_id": {"$in": ["03-brand-kit", "burocrazia"]}},
            {"_id": 0, "partner_id": 1, "step_id": 1, "data": 1},
        ):
            journey_by_partner.setdefault(s.get("partner_id"), {})[s.get("step_id")] = s.get("data") or {}

        for item in partners:
            pid = item.get("id")
            hub = hub_by_partner.get(pid) or {}
            brand = brand_by_partner.get(pid) or {}
            journey = journey_by_partner.get(pid) or {}
            buro = journey.get("burocrazia") or {}
            brand_step = journey.get("03-brand-kit") or {}

            full_name = f"{buro.get('nome', '')} {buro.get('cognome', '')}".strip()
            item["name"] = item.get("name") or hub.get("name") or full_name
            item["email"] = item.get("email") or hub.get("email") or buro.get("email")
            item["phone"] = item.get("phone") or hub.get("phone") or buro.get("telefono")
            item["city"] = hub.get("city") or buro.get("comune")
            item["bio"] = item.get("bio") or hub.get("bio")
            item["website"] = item.get("website") or hub.get("website") or buro.get("sito_web")
            item["instagram"] = item.get("instagram") or hub.get("instagram") or buro.get("instagram")
            item["linkedin"] = item.get("linkedin") or hub.get("linkedin") or buro.get("linkedin")
            item["youtube"] = item.get("youtube") or hub.get("youtube") or buro.get("youtube")
            item["whoYouAre"] = hub.get("whoYouAre")
            item["targetAudience"] = hub.get("targetAudience")
            item["problem"] = hub.get("problem")
            item["solution"] = hub.get("solution")
            item["pitch"] = hub.get("pitch")
            item["differentiator"] = hub.get("differentiator")
            item["offerName"] = hub.get("offerName")
            item["offerPrice"] = hub.get("offerPrice")
            item["logo"] = hub.get("logo") or brand.get("logo") or brand_step.get("logo_url")
            item["primaryColor"] = hub.get("primaryColor") or brand.get("primary_color")
            item["accentColor"] = hub.get("accentColor") or brand.get("accent_color")
            item["toneOfVoice"] = hub.get("toneOfVoice") or brand_step.get("tone_of_voice")

            keywords = hub.get("keywords")
            if not keywords and isinstance(brand_step.get("parole_chiave"), list):
                keywords = ", ".join([k for k in brand_step["parole_chiave"] if k])
            item["keywords"] = keywords
    return {"total": len(partners), "items": partners}


class PartnerStatoRequest(BaseModel):
    stato: str = Field(..., description="attivo | sospeso | quarantena | ex")
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
    Cambia lo stato di un partner: attivo / sospeso / quarantena / ex.
    Flag manuale gestito dall'admin (non c'è un segnale automatico dei pagamenti
    rateali Klarna). Registra anche timestamp + chi ha fatto la modifica.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if payload.stato not in ("attivo", "sospeso", "quarantena", "ex"):
        raise HTTPException(400, "stato non valido (attivo | sospeso | quarantena | ex)")
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


@router.delete("/lead")
async def ciak_delete_lead(
    email: str = Query(..., description="Email del lead da eliminare"),
    admin=Depends(require_ciak_admin),
):
    """
    Elimina un lead Ciak a cascata: record `ciak_leads` + tutte le
    `diagnostic_sessions` (8 Domande) + tutti i `ciak_checkpoint_events`
    per quell'email. Operazione irreversibile — il frontend chiede conferma
    esplicita. Stesse collezioni della vista dettaglio (GET /lead).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    email = email.strip().lower()
    leads_r = await db.ciak_leads.delete_many({"email": email})
    diag_r = await db.diagnostic_sessions.delete_many({"user_email": email})
    chk_r = await db.ciak_checkpoint_events.delete_many({"email": email})
    total = leads_r.deleted_count + diag_r.deleted_count + chk_r.deleted_count
    if total == 0:
        raise HTTPException(404, "Lead non trovato")
    return {
        "ok": True,
        "email": email,
        "ciak_leads_deleted": leads_r.deleted_count,
        "diagnostic_sessions_deleted": diag_r.deleted_count,
        "ciak_checkpoint_events_deleted": chk_r.deleted_count,
    }


# ─── Stats ─────────────────────────────────────────────────────────────────

# --- Mark EUR 27 paid (manuale) ---

class MarkPurchasedRequest(BaseModel):
    email: str = Field(..., description="Email del lead da segnare come acquirente EUR 27")
    amount_cent: int = Field(2700, ge=0, description="Importo in centesimi (default 2700 = EUR 27)")
    metodo: Optional[str] = Field("manuale", description="Metodo pagamento (manuale|bonifico|contanti|offline)")
    note: Optional[str] = Field(None, description="Nota interna facoltativa sul pagamento")


@router.post("/lead/mark-purchased")
async def ciak_mark_lead_purchased(
    payload: MarkPurchasedRequest,
    admin=Depends(require_ciak_admin),
):
    """
    Segna MANUALMENTE l'acquisto dell'analisi EUR 27 per un lead, senza passare
    da Stripe. Replica l'effetto del webhook checkout.session.completed:
    transizione diagnostic_session a purchased_67 + evento
    stripe_payment_completed (flag manual=True). Cosi' il lead compare in
    GET /transactions e nei conteggi acquisti_67. Serve a ricreare acquisti
    avvenuti offline.

    Idempotente: se la sessione e' gia' in uno stato post-acquisto non fa nulla.
    Richiede una diagnostic_session esistente per l'email (il lead deve aver
    completato almeno le 8 Domande Ciak). NON esegue alcun pagamento reale.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services.ciak_state_machine import (
        transition_to, add_event, STATE_PURCHASED_67,
    )

    email = payload.email.strip().lower()
    diag = await db.diagnostic_sessions.find_one(
        {"user_email": email}, sort=[("created_at", -1)]
    )
    if not diag:
        raise HTTPException(
            404,
            "Nessuna diagnostic session per questa email: il lead deve aver "
            "completato le 8 Domande Ciak prima di poter segnare l'acquisto.",
        )

    admin_id = getattr(admin, "email", None) or getattr(admin, "user_id", None)
    already = diag.get("current_state") in _PURCHASED_STATES

    if not already:
        now = datetime.now(timezone.utc)
        manual_id = "manual-" + now.strftime("%Y%m%d%H%M%S")
        meta = {
            "stripe_session_id": manual_id,
            "amount_total": payload.amount_cent,
            "manual": True,
            "marked_by": admin_id,
            "metodo": payload.metodo,
            "note": payload.note,
        }
        transition_to(diag, STATE_PURCHASED_67, event_metadata=meta)
        add_event(diag, "stripe_payment_completed", meta)
        diag["manual_purchase"] = {
            "marked_by": admin_id,
            "marked_at": now.isoformat(),
            "amount_total": payload.amount_cent,
            "metodo": payload.metodo,
            "note": payload.note,
        }
        await db.diagnostic_sessions.replace_one({"_id": diag["_id"]}, diag)

    return {
        "ok": True,
        "email": email,
        "current_state": diag.get("current_state"),
        "already_purchased": already,
        "manual": True,
        "session_token": diag.get("session_token"),
    }


@router.get("/clienti-ciak")
async def clienti_ciak(limit: int = 100, admin=Depends(require_ciak_admin)):
    """Lista pipeline clienti Ciak per il pannello admin."""
    if db is None:
        raise HTTPException(503, "Database non configurato")

    projection = {"_id": 0, **{field: 1 for field in _CLIENTI_CIAK_PUBLIC_FIELDS}}
    cur = db.ciak_clients.find({}, projection).sort("updated_at", -1).limit(limit)
    docs = await cur.to_list(limit)
    items = []
    for item in docs:
        user = await _canonical_user_for_client(item)
        items.append(_public_clienti_ciak_item(item, user))
    return {"items": items, "count": len(items)}


@router.get("/stats")
async def ciak_stats(admin=Depends(require_ciak_admin)):
    """Conteggi rapidi per la dashboard admin (header KPI + funnel)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")

    leads_total = await db.ciak_leads.count_documents({})
    checkpoint_total = len(await db.ciak_checkpoint_events.distinct("email"))
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


@router.get("/acquisizione-command-center")
async def acquisizione_command_center(admin=Depends(require_admin_or_report_key)):
    """
    CRM operativo Acquisizione.

    Traduce il funnel in numeri decisionali: quanto manca al target di 4
    partnership/mese e quali contatti vanno lavorati adesso.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    month_start = _month_start_iso()
    target_minimum = 3
    target_optimal = 4
    target_partnerships = target_optimal
    daily_new_contacts = 20
    weekly_new_contacts = 100
    monthly_new_contacts = 400

    discovery_total = await db.discovery_leads.count_documents({})
    discovery_hot = await db.discovery_leads.count_documents({"score_total": {"$gte": 75}})
    discovery_google_places = await db.discovery_leads.count_documents({"source": "google_places"})
    queue_pending = await db.systeme_daily_queue.count_documents({"status": "pending", "source": {"$ne": "lista_fredda"}})
    queue_imported = await db.systeme_daily_queue.count_documents({"status": "imported"})
    queue_failed = await db.systeme_daily_queue.count_documents({"status": "failed"})
    lista_fredda_pending_blocked = await db.systeme_daily_queue.count_documents({"status": "pending", "source": "lista_fredda"})
    last_systeme_import = await db.celery_job_logs.find_one(
        {"job": "daily_systeme_import"},
        {"_id": 0},
        sort=[("executed_at", -1)],
    )

    # Attività reale di oggi (input metrics: cosa si è mosso oggi vs target 20/giorno).
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    leads_today = await db.ciak_leads.count_documents({"created_at": {"$gte": today_start}})
    diagnostics_today = await db.diagnostic_sessions.count_documents({"created_at": {"$gte": today_start}})

    diagnostics_by_email: dict[str, dict] = {}
    async for d in db.diagnostic_sessions.find({}).sort("created_at", -1):
        em = _email(d.get("user_email"))
        if em and em not in diagnostics_by_email:
            diagnostics_by_email[em] = d

    checkpoints_by_email: dict[str, dict] = {}
    async for c in db.ciak_checkpoint_events.find({}).sort("created_at", -1):
        em = _email(c.get("email"))
        if em and em not in checkpoints_by_email:
            checkpoints_by_email[em] = c

    lead_names: dict[str, str] = {}
    async for lead in db.ciak_leads.find({}, {"email": 1, "nome": 1}):
        em = _email(lead.get("email"))
        if em:
            lead_names[em] = lead.get("nome") or em

    def _name(em: str, doc: Optional[dict] = None) -> str:
        if doc:
            return doc.get("user_name") or doc.get("nome") or lead_names.get(em) or em
        return lead_names.get(em) or em

    blueprint_month = 0
    call_booked_month = 0
    call_done_month = 0
    clicked_no_purchase = []
    completed_no_purchase = []
    purchased_no_call = []

    for em, d in diagnostics_by_email.items():
        state = d.get("current_state")
        purchased_ts = _state_ts(d, "purchased_67") or _event_ts(d, "stripe_payment_completed")
        call_booked_ts = _state_ts(d, "call_booked")
        call_done_ts = _state_ts(d, "call_done")

        if purchased_ts and purchased_ts >= month_start:
            blueprint_month += 1
        if call_booked_ts and call_booked_ts >= month_start:
            call_booked_month += 1
        if call_done_ts and call_done_ts >= month_start:
            call_done_month += 1

        if state == "clicked_67":
            clicked_no_purchase.append(
                _lead_item(
                    em,
                    _name(em, d),
                    _state_ts(d, "clicked_67") or d.get("created_at"),
                    "Ha cliccato il checkout del Blueprint ma non risulta pagamento.",
                )
            )
        elif state in ("ciak_completed", "report_generated"):
            completed_no_purchase.append(
                _lead_item(
                    em,
                    _name(em, d),
                    _state_ts(d, "report_generated") or d.get("created_at"),
                    "Ha completato le 8 domande: va riportato al Blueprint da 27 euro.",
                )
            )
        elif state == "purchased_67":
            purchased_no_call.append(
                _lead_item(
                    em,
                    _name(em, d),
                    purchased_ts or d.get("created_at"),
                    "Ha acquistato il Blueprint ma non ha ancora prenotato la call.",
                )
            )

    checkpoint_no_diagnostic = []
    for em, c in checkpoints_by_email.items():
        if em not in diagnostics_by_email:
            checkpoint_no_diagnostic.append(
                _lead_item(
                    em,
                    _name(em),
                    c.get("created_at"),
                    "Ha fatto il Checkpoint: invitalo a completare le 8 domande.",
                )
            )

    proposal_month = 0
    paid_contract_month = 0
    async for p in db.proposte.find({}):
        status = p.get("stato")
        proposal_ts = p.get("created_at") or p.get("inviata_at") or p.get("visto_at")
        paid_ts = p.get("pagamento_completato_at") or p.get("pagato_at") or p.get("contratto_firmato_at")
        if status in ("inviata", "vista", "accettata", "contratto_firmato") and proposal_ts and proposal_ts >= month_start:
            proposal_month += 1
        if p.get("pagamento_completato") and (not paid_ts or paid_ts >= month_start):
            paid_contract_month += 1

    partner_closed_emails = set()
    async for p in db.partners.find(
        {
            "$or": [
                {"contract_signed": True},
                {"partnership_pagata": True},
                {"stato": "attivo"},
            ]
        },
        {"email": 1, "created_at": 1, "contract_signed_at": 1, "partnership_pagata_at": 1},
    ):
        created = p.get("partnership_pagata_at") or p.get("contract_signed_at") or p.get("created_at")
        if created and created >= month_start:
            em = _email(p.get("email"))
            if em:
                partner_closed_emails.add(em)

    partnerships_month = max(paid_contract_month, len(partner_closed_emails))
    gap = max(target_partnerships - partnerships_month, 0)

    def _sort_limit(items: list[dict], limit: int = 8) -> list[dict]:
        return sorted(items, key=lambda x: x.get("updated_at") or "", reverse=True)[:limit]

    bottlenecks = []
    if blueprint_month < max(target_partnerships * 3, 8):
        bottlenecks.append({
            "level": "warning",
            "title": "Servono piu' Blueprint acquistati",
            "message": "Per chiudere 4 partnership al mese, la pipeline deve generare abbastanza call qualificate. Spingi Stato 3-4 verso il Blueprint.",
        })
    if call_booked_month < target_partnerships * 2:
        bottlenecks.append({
            "level": "warning",
            "title": "Call sotto ritmo",
            "message": "Il collo di bottiglia non e' solo traffico: chi acquista il Blueprint deve arrivare velocemente alla call con Claudio.",
        })
    if clicked_no_purchase:
        bottlenecks.append({
            "level": "hot",
            "title": "Checkout caldo non recuperato",
            "message": "Ci sono lead che hanno cliccato il checkout ma non hanno pagato. Sono i recuperi piu' vicini al fatturato.",
        })

    luca_routine = [
        {
            "id": "new_contacts",
            "title": "Seleziona e lavora 20 nuovi contatti mirati",
            "owner": "Luca + Valentina",
            "metric": f"{daily_new_contacts} contatti/giorno",
            "priority": "alta",
        },
        {
            "id": "hot_recoveries",
            "title": "Recupera checkout cliccati e Blueprint non pagati",
            "owner": "Luca + Marco",
            "metric": f"{len(clicked_no_purchase)} recuperi caldi",
            "priority": "critica" if clicked_no_purchase else "normale",
        },
        {
            "id": "diagnostic_recoveries",
            "title": "Porta chi ha completato le 8 Domande verso il Blueprint",
            "owner": "Luca + Andrea",
            "metric": f"{len(completed_no_purchase)} diagnosi da convertire",
            "priority": "alta" if completed_no_purchase else "normale",
        },
        {
            "id": "call_recoveries",
            "title": "Fai prenotare la call a chi ha acquistato il Blueprint",
            "owner": "Luca + Gaia",
            "metric": f"{len(purchased_no_call)} Blueprint senza call",
            "priority": "alta" if purchased_no_call else "normale",
        },
        {
            "id": "evening_report",
            "title": "Report serale a Claudio, Claude e Codex",
            "owner": "Luca",
            "metric": "priorita', blocchi, numeri del giorno",
            "priority": "normale",
        },
    ]

    channels = {
        "allowed": [
            "rete calda, WhatsApp, referral ed ex clienti",
            "LinkedIn organico con DM mirati",
            "contenuti Claudio con CTA verso Ciak Blueprint",
            "custom audience Meta dalla lista fredda",
        ],
        "blocked": [
            "email massive sulla lista fredda 13k",
            "drip email cold non personalizzate",
            "sequenze automatiche prima di validare messaggi e call",
        ],
    }

    partner_sales_engine = {
        "summary": "Acquisizione Evolution e' il progetto pilota madre. Il Motore Vendite Partner duplica lo stesso sistema adattandolo a target, promessa, contenuti, offerta e dati del partner.",
        "stable_parts": [
            "metodo",
            "struttura del percorso",
            "disciplina sui follow-up",
            "lettura dei dati",
            "ciclo Esamina, Valida, Ottimizza",
        ],
        "adapted_parts": [
            "target",
            "promessa",
            "linguaggio",
            "canale principale",
            "offerta",
            "script di vendita",
            "KPI specifici",
        ],
    }

    return {
        "target": {
            "minimum_monthly": target_minimum,
            "optimal_monthly": target_optimal,
            "partnerships_monthly": target_partnerships,
            "partnerships_closed": partnerships_month,
            "gap": gap,
            "month_start": month_start,
            "target_label": "minimo 3, ottimale 4 ingressi Metodo EVO/mese",
        },
        "funnel": {
            "blueprint_purchased": blueprint_month,
            "call_booked": call_booked_month,
            "call_done": call_done_month,
            "proposals_open": proposal_month,
            "contracts_paid": paid_contract_month,
        },
        "priorities": {
            "checkpoint_no_diagnostic": _sort_limit(checkpoint_no_diagnostic),
            "diagnostic_no_purchase": _sort_limit(completed_no_purchase),
            "clicked_no_purchase": _sort_limit(clicked_no_purchase),
            "purchased_no_call": _sort_limit(purchased_no_call),
        },
        "bottlenecks": bottlenecks,
        "routine": {
            "daily_new_contacts": daily_new_contacts,
            "weekly_new_contacts": weekly_new_contacts,
            "monthly_new_contacts": monthly_new_contacts,
            "today": luca_routine,
        },
        "channels": channels,
        "partner_sales_engine": partner_sales_engine,
        "discovery_engine": {
            "new_leads_total": discovery_total,
            "hot_leads_total": discovery_hot,
            "google_places_total": discovery_google_places,
            "queued_systeme_pending": queue_pending,
            "queued_systeme_imported": queue_imported,
            "queued_systeme_failed": queue_failed,
            "lista_fredda_pending_blocked": lista_fredda_pending_blocked,
            "last_import": last_systeme_import,
        },
        "activity_today": {
            "new_leads": leads_today,
            "diagnostics_completed": diagnostics_today,
            "target_new_contacts": daily_new_contacts,
        },
    }


# ─── Leads list ────────────────────────────────────────────────────────────

@router.get("/leads")
async def ciak_leads_list(
    admin=Depends(require_ciak_admin),
    q: Optional[str] = Query(None, description="Ricerca per email (substring)"),
    state: Optional[str] = Query(None, description="Filtra per current_state diagnostic"),
    stato: Optional[int] = Query(None, ge=1, le=4, description="Filtra per Stato finale 1-4"),
    only_purchased: bool = Query(False, description="Solo chi ha acquistato i €27"),
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

@router.get("/stripe-webhook-health")
async def ciak_stripe_webhook_health(admin=Depends(require_ciak_admin)):
    """
    Snapshot operativa dei webhook Stripe.

    Serve per capire in pochi secondi se ci sono eventi falliti, lock rimasti in
    processing o transazioni pagate/non pagate da riconciliare.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    return await _stripe_webhook_observability_snapshot(db)


# ─── Video pipeline: health + retry ──────────────────────────────────────────

@router.get("/video-pipeline-health")
async def ciak_video_pipeline_health(admin=Depends(require_ciak_admin)):
    """Stato operativo della pipeline video in un colpo d'occhio.

    Aggrega masterclass + lezioni videocorso nei bucket: da revisionare,
    in montaggio, bloccati (heartbeat vecchio/assente), errori YouTube, errori.
    Etichette semplici; il dettaglio tecnico sta nel campo `error` (collassabile).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services import video_health as vh
    now = datetime.now(timezone.utc)

    partner_names = {}
    async for p in db.partners.find({}, {"_id": 0, "id": 1, "name": 1}):
        if p.get("id"):
            partner_names[p["id"]] = p.get("name")

    items = []
    async for doc in db.masterclass_factory.find(
        {"video_pipeline_status": {"$nin": [None, "", "approved"]}}
    ):
        row = vh.item_from_masterclass(doc, partner_names, now)
        if row:
            items.append(row)
    async for doc in db.partner_videocorso.find({"lessons": {"$exists": True}}):
        items.extend(vh.items_from_videocorso(doc, partner_names, now))

    return vh.build_summary(items, now)


class VideoRetryRequest(BaseModel):
    partner_id: str
    video_type: str = "masterclass"      # "masterclass" | "videocorso" | "lesson"
    lesson_id: Optional[str] = None
    force_phase: Optional[str] = None     # "a" | "b" | None (auto)


@router.post("/video-pipeline-retry")
async def ciak_video_pipeline_retry(
    req: VideoRetryRequest,
    background_tasks: BackgroundTasks,
    admin=Depends(require_ciak_admin),
):
    """Rilancia una pipeline video. Sceglie automaticamente:
      - Fase A (process_partner_video) dal video grezzo;
      - Fase B (apply_approved_cuts) quando c'è montaggio/error_youtube con tagli
        approvati o video finale.
    Forzabile con force_phase = "a" | "b".
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services import video_health as vh

    vtype = (req.video_type or "masterclass").strip().lower()
    is_lesson = vtype in ("lesson", "videocorso") and bool(req.lesson_id)
    pipe_video_type = "masterclass" if vtype == "masterclass" else "videocorso"

    if vtype == "masterclass":
        doc = await db.masterclass_factory.find_one({"partner_id": req.partner_id})
        if not doc:
            raise HTTPException(404, "Nessun record masterclass")
        status = doc.get("video_pipeline_status")
        raw_url = doc.get("video_raw_url")
        segs = doc.get("review_cut_segments") or []
        has_final = bool(doc.get("video_youtube_url"))
    elif is_lesson:
        doc = await db.partner_videocorso.find_one({"partner_id": req.partner_id})
        if not doc:
            raise HTTPException(404, "Nessun record videocorso")
        lesson = (doc.get("lessons") or {}).get(req.lesson_id) or {}
        if not lesson:
            raise HTTPException(404, f"Lezione {req.lesson_id} non trovata")
        status = lesson.get("pipeline_status")
        raw_url = lesson.get("video_raw_url") or lesson.get("drive_file_id")
        segs = lesson.get("review_cut_segments") or []
        has_final = bool(lesson.get("video_youtube_url"))
    else:
        raise HTTPException(400, "Per il videocorso serve lesson_id")

    has_raw = bool(raw_url)
    has_cuts = any(s.get("enabled") for s in segs) if segs else False
    decision = vh.decide_retry_action(
        status=status, has_raw_url=has_raw, has_approved_cuts=has_cuts,
        has_final_video=has_final, force_phase=(req.force_phase or None),
    )
    action = decision["action"]
    if action == "none":
        raise HTTPException(400, decision["reason"])

    now = datetime.now(timezone.utc).isoformat()
    # Drive id nudo → URL completo (lezioni)
    if has_raw and not str(raw_url).startswith(("http", "gs://")):
        raw_url = f"https://drive.google.com/file/d/{raw_url}/view"

    lesson_arg = req.lesson_id if is_lesson else None

    if action == "fase_a":
        if vtype == "masterclass":
            await db.masterclass_factory.update_one(
                {"partner_id": req.partner_id},
                {"$set": {"video_pipeline_status": "queued",
                          "video_pipeline_error": None, "updated_at": now}},
            )
        else:
            lk = f"lessons.{req.lesson_id}"
            await db.partner_videocorso.update_one(
                {"partner_id": req.partner_id},
                {"$set": {f"{lk}.pipeline_status": "queued",
                          f"{lk}.pipeline_error": None, "updated_at": now}},
            )
        task_id = None
        try:
            from video_pipeline_task import process_partner_video
            task = process_partner_video.delay(
                partner_id=req.partner_id, video_url=raw_url,
                video_type=pipe_video_type, lesson_id=lesson_arg,
            )
            task_id = getattr(task, "id", None)
        except Exception:
            from video_pipeline_task import run_pipeline_background
            background_tasks.add_task(
                run_pipeline_background, partner_id=req.partner_id, video_url=raw_url,
                video_type=pipe_video_type, lesson_id=lesson_arg,
            )
        return {"success": True, "action": "fase_a", "reason": decision["reason"], "task_id": task_id}

    # action == "fase_b"
    if vtype == "masterclass":
        await db.masterclass_factory.update_one(
            {"partner_id": req.partner_id},
            {"$set": {"video_pipeline_status": "montaggio", "updated_at": now}},
        )
    else:
        lk = f"lessons.{req.lesson_id}"
        await db.partner_videocorso.update_one(
            {"partner_id": req.partner_id},
            {"$set": {f"{lk}.pipeline_status": "montaggio", "updated_at": now}},
        )
    task_id = None
    try:
        from video_pipeline_task import apply_approved_cuts
        task = apply_approved_cuts.delay(
            partner_id=req.partner_id, video_type=pipe_video_type, lesson_id=lesson_arg,
        )
        task_id = getattr(task, "id", None)
    except Exception:
        from video_pipeline_task import run_apply_background
        background_tasks.add_task(
            run_apply_background, partner_id=req.partner_id,
            video_type=pipe_video_type, lesson_id=lesson_arg,
        )
    return {"success": True, "action": "fase_b", "reason": decision["reason"], "task_id": task_id}


@router.get("/system-health")
async def ciak_system_health(admin=Depends(require_ciak_admin)):
    """Semaforo unico di salute sistema: backend, Celery, worker, YouTube,
    Stripe webhook, pipeline video, coda Systeme. Stato globale ok/attention/critical.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services import video_health as vh
    now = datetime.now(timezone.utc)

    components = {}

    # Backend: se rispondiamo, è vivo.
    components["backend"] = {"status": "ok", "label": "Backend attivo"}

    # Celery (processo backend) + worker atteso come servizio separato.
    celery_status = "attention"
    celery_detail = {}
    try:
        from celery_manager import get_celery_status
        celery_detail = get_celery_status()
        # Il worker gira come servizio separato (evolution-pro-worker): qui misuriamo
        # solo la raggiungibilità di Redis, che è condivisa tra backend e worker.
        celery_status = "ok" if celery_detail.get("redis_available") else "critical"
    except Exception as e:
        celery_detail = {"error": str(e)}
        celery_status = "attention"
    components["celery"] = {
        "status": celery_status,
        "label": "Redis raggiungibile" if celery_status == "ok" else "Redis non raggiungibile",
        "detail": celery_detail,
        "worker_service": "evolution-pro-worker (separato)",
    }

    # YouTube auth
    yt_ok = False
    try:
        import youtube_uploader
        yt_ok = bool(youtube_uploader.is_authenticated())
    except Exception:
        yt_ok = False
    components["youtube"] = {
        "status": "ok" if yt_ok else "critical",
        "label": "YouTube autenticato" if yt_ok else "YouTube NON autenticato",
    }

    # Stripe webhook
    try:
        stripe_snap = await _stripe_webhook_observability_snapshot(db)
        components["stripe"] = {
            "status": stripe_snap.get("status", "ok"),
            "label": "Webhook Stripe",
            "counts": stripe_snap.get("counts", {}),
        }
    except Exception as e:
        components["stripe"] = {"status": "attention", "label": "Webhook Stripe", "error": str(e)}

    # Video pipeline summary
    partner_names = {}
    async for p in db.partners.find({}, {"_id": 0, "id": 1, "name": 1}):
        if p.get("id"):
            partner_names[p["id"]] = p.get("name")
    v_items = []
    async for d in db.masterclass_factory.find({"video_pipeline_status": {"$nin": [None, "", "approved"]}}):
        r = vh.item_from_masterclass(d, partner_names, now)
        if r:
            v_items.append(r)
    async for d in db.partner_videocorso.find({"lessons": {"$exists": True}}):
        v_items.extend(vh.items_from_videocorso(d, partner_names, now))
    v_summary = vh.build_summary(v_items, now)
    components["video_pipeline"] = {
        "status": "attention" if v_summary["attention"] else "ok",
        "label": "Pipeline video",
        "counts": v_summary["counts"],
        "total_attention": v_summary["total_attention"],
    }

    # Coda Systeme (se presente)
    try:
        systeme_failed = await db.systeme_daily_queue.count_documents({"status": "failed"})
        components["systeme"] = {
            "status": "attention" if systeme_failed else "ok",
            "label": "Sync Systeme",
            "failed": systeme_failed,
        }
    except Exception:
        components["systeme"] = {"status": "ok", "label": "Sync Systeme", "failed": 0}

    overall = vh.aggregate_system_status([c["status"] for c in components.values()])
    return {
        "generated_at": now.isoformat(),
        "overall": overall,
        "components": components,
    }


@router.get("/transactions")
async def ciak_transactions(
    admin=Depends(require_ciak_admin),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Transazioni Ciak Blueprint €27. Due fonti:
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

# Pipeline Prospect — pre-acquisto €27. Colonne in ordine di funnel.
_PROSPECT_COLUMNS = [
    ("iscritto", "Iscritto masterclass"),
    ("checkpoint", "Checkpoint compilato"),
    ("diagnostica", "8 Domande completate"),
    ("report", "Report Matteo"),
    ("click_67", "Click checkout €27"),
]
_PROSPECT_RANK = {k: i for i, (k, _) in enumerate(_PROSPECT_COLUMNS)}
_PROSPECT_STATE_TO_STAGE = {
    "lead_created": "iscritto",
    "ciak_started": "iscritto",
    "ciak_completed": "diagnostica",
    "report_generated": "report",
    "clicked_67": "click_67",
}

# Pipeline Blueprint — post-acquisto €27. Colonne in ordine di funnel.
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
    Pipeline Prospect — funnel PRE-acquisto €27 in formato kanban.
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
    Pipeline Blueprint — journey POST-acquisto €27 in formato kanban.
    Fonte: diagnostic_sessions (state machine) + ciak_orphan_purchases.
    Arricchimento "in trattativa" / "contratto pagato" da `proposte` (best-effort, per email).
    I partner reali (contratto firmato / attivo) finiscono sempre in "contratto pagato",
    anche se chiusi offline senza proposta Stripe.
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

    # Partner reali → "contratto pagato" anche per chiusure offline (no proposta
    # Stripe). Bump SOLO le entry già presenti nel funnel, così non si aggiungono
    # partner storici privi di percorso diagnostico.
    partner_emails = set()
    async for p in db.partners.find(
        {}, {"email": 1, "contract_signed": 1, "partnership_pagata": 1, "stato": 1}
    ):
        em = (p.get("email") or "").strip().lower()
        if not em:
            continue
        if p.get("contract_signed") or p.get("partnership_pagata") or p.get("stato") == "attivo":
            partner_emails.add(em)
    if partner_emails:
        for em, e in entries.items():
            if (em or "").strip().lower() in partner_emails and \
               _BLUEPRINT_RANK["contratto_pagato"] > _BLUEPRINT_RANK.get(e.get("stage"), -1):
                e["stage"] = "contratto_pagato"

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
      - Funnel: opt-in → checkpoint → 8 domande → click €27 → acquisto
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
        "partner_setup_reason": 1,
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
            # "onboarding" = primo accesso post-pagamento; "password_reset" = il
            # partner ha usato "Password dimenticata". Senza questo, un reset si
            # legge come "non è mai entrato" e fa perdere tempo a chi guarda.
            "reason": u.get("partner_setup_reason") or "onboarding",
        })

    # Conta pending vs consumed per stat top
    pending_count = sum(1 for i in items if i["status"] == "pending")

    return {
        "total": len(items),
        "pending": pending_count,
        "consumed": len(items) - pending_count,
        "items": items,
    }


# ─── Collaboratori: Antonella ore effettive + task Stefania ───────────────

ANTONELLA_RATE = 25.0
ANTONELLA_WEEKLY_TARGET_MIN = 4 * 60
ANTONELLA_WEEKLY_MAX_MIN = 5 * 60


class AntonellaTaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    estimated_minutes: int = Field(60, ge=15, le=300)
    category: str = "contenuti"
    created_by_agent: str = "stefania"


class AntonellaTaskNote(BaseModel):
    note: Optional[str] = ""


class AntonellaTaskApproval(BaseModel):
    approved_minutes: Optional[int] = Field(None, ge=0, le=600)
    note: Optional[str] = ""


def _antonella_projection() -> dict:
    return {
        "_id": 0,
        "task_id": 1,
        "task_type": 1,
        "priority": 1,
        "status": 1,
        "created_by_agent": 1,
        "assigned_to": 1,
        "title": 1,
        "description": 1,
        "context": 1,
        "resolution_notes": 1,
        "resolved_by": 1,
        "created_at": 1,
        "updated_at": 1,
        "resolved_at": 1,
        "due_date": 1,
        "time_entries": 1,
        "active_timer_started_at": 1,
        "actual_minutes": 1,
        "estimated_minutes": 1,
        "approved_minutes": 1,
        "approved_amount": 1,
        "approved_at": 1,
        "approved_by": 1,
        "approval_note": 1,
        "work_category": 1,
        "week_start": 1,
        "hourly_rate": 1,
    }


def _task_minutes(task: dict) -> int:
    total = int(task.get("actual_minutes") or 0)
    active = _parse_iso(task.get("active_timer_started_at"))
    if active:
        total += max(0, int((datetime.now(timezone.utc) - active).total_seconds() // 60))
    return total


def _clean_antonella_task(task: dict) -> dict:
    task = _clean(task) or {}
    actual = _task_minutes(task)
    approved = int(task.get("approved_minutes") or 0)
    estimated = int(task.get("estimated_minutes") or task.get("context", {}).get("estimated_minutes") or 60)
    task["actual_minutes"] = actual
    task["estimated_minutes"] = estimated
    task["approved_minutes"] = approved
    task["approved_amount"] = round((approved / 60) * float(task.get("hourly_rate") or ANTONELLA_RATE), 2)
    task["is_timer_running"] = bool(task.get("active_timer_started_at"))
    task["work_category"] = task.get("work_category") or task.get("context", {}).get("category") or "contenuti"
    return task


async def _ensure_antonella_weekly_tasks() -> None:
    """Crea task base settimanali se Stefania non ha ancora popolato la settimana."""
    if db is None:
        return
    week = _week_start()
    existing = await db.agent_tasks.count_documents({
        "assigned_to": "antonella",
        "week_start": week,
        "context.source": "antonella_weekly_auto",
    })
    if existing:
        return

    templates = [
        ("Piano contenuti partner della settimana", "Controlla il calendario editoriale dei partner attivi e prepara le priorita contenuti della settimana.", 90, "contenuti", "high"),
        ("Revisione materiali in attesa", "Controlla materiali caricati dai partner e segnala cosa approvare, correggere o richiedere.", 60, "materiali", "high"),
        ("Casi studio e prove sociali", "Cerca risultati, screenshot o testimonianze trasformabili in contenuti o proof per vendite.", 60, "casi_studio", "medium"),
        ("Controllo campagne e KPI social", "Verifica alert campagne, CPL, lead e anomalie; proponi una correzione se serve.", 60, "campagne", "medium"),
    ]
    now = _now_iso()
    docs = []
    for title, description, minutes, category, priority in templates:
        import uuid
        task_id = f"ant_{uuid.uuid4().hex[:12]}"
        docs.append({
            "task_id": task_id,
            "task_type": "custom",
            "priority": priority,
            "status": "open",
            "created_by_agent": "stefania",
            "assigned_to": "antonella",
            "title": title,
            "description": description,
            "entity_type": "collaborator",
            "entity_id": "antonella",
            "entity_name": "Antonella",
            "context": {"source": "antonella_weekly_auto", "category": category, "estimated_minutes": minutes},
            "work_category": category,
            "estimated_minutes": minutes,
            "actual_minutes": 0,
            "approved_minutes": 0,
            "hourly_rate": ANTONELLA_RATE,
            "time_entries": [],
            "active_timer_started_at": None,
            "week_start": week,
            "resolution_notes": None,
            "resolved_by": None,
            "created_at": now,
            "updated_at": now,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=6)).date().isoformat(),
            "resolved_at": None,
            "escalated_at": None,
        })
    if docs:
        await db.agent_tasks.insert_many(docs)


@router.get("/collaboratori/antonella")
async def antonella_work_summary(
    admin=Depends(require_ciak_admin),
    month: Optional[str] = Query(None, description="YYYY-MM, default mese corrente"),
):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    await _ensure_antonella_weekly_tasks()
    current_month = month or datetime.now(timezone.utc).strftime("%Y-%m")
    week = _week_start()
    query = {"assigned_to": "antonella"}
    tasks = [
        _clean_antonella_task(t)
        async for t in db.agent_tasks.find(query, _antonella_projection()).sort("created_at", -1).limit(200)
    ]
    week_tasks = [t for t in tasks if t.get("week_start") == week and t.get("status") != "resolved"]
    month_tasks = [t for t in tasks if str(t.get("created_at") or "").startswith(current_month)]
    approved_minutes = sum(int(t.get("approved_minutes") or 0) for t in month_tasks)
    actual_minutes = sum(int(t.get("actual_minutes") or 0) for t in month_tasks)
    return {
        "collaborator": {
            "id": "antonella",
            "name": "Antonella",
            "role": "Social media manager",
            "agent": "Stefania",
            "hourly_rate": ANTONELLA_RATE,
            "weekly_target_minutes": ANTONELLA_WEEKLY_TARGET_MIN,
            "weekly_max_minutes": ANTONELLA_WEEKLY_MAX_MIN,
            "payment_model": "ore_effettive_approvate",
        },
        "week_start": week,
        "month": current_month,
        "summary": {
            "week_estimated_minutes_open": sum(int(t.get("estimated_minutes") or 0) for t in week_tasks),
            "month_actual_minutes": actual_minutes,
            "month_approved_minutes": approved_minutes,
            "month_amount_due": round((approved_minutes / 60) * ANTONELLA_RATE, 2),
            "pending_approval_count": len([t for t in month_tasks if t.get("status") == "completed" and not t.get("approved_at")]),
        },
        "tasks": tasks,
    }


@router.post("/collaboratori/antonella/tasks")
async def create_antonella_task(req: AntonellaTaskCreate, admin=Depends(require_ciak_admin)):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    import uuid
    now = _now_iso()
    task_id = f"ant_{uuid.uuid4().hex[:12]}"
    doc = {
        "task_id": task_id,
        "task_type": "custom",
        "priority": req.priority if req.priority in ("low", "medium", "high", "critical") else "medium",
        "status": "open",
        "created_by_agent": req.created_by_agent or "stefania",
        "assigned_to": "antonella",
        "title": req.title,
        "description": req.description,
        "entity_type": "collaborator",
        "entity_id": "antonella",
        "entity_name": "Antonella",
        "context": {"source": "manual", "category": req.category, "estimated_minutes": req.estimated_minutes},
        "work_category": req.category,
        "estimated_minutes": req.estimated_minutes,
        "actual_minutes": 0,
        "approved_minutes": 0,
        "hourly_rate": ANTONELLA_RATE,
        "time_entries": [],
        "active_timer_started_at": None,
        "week_start": _week_start(),
        "created_at": now,
        "updated_at": now,
        "due_date": None,
        "resolved_at": None,
        "resolution_notes": None,
        "resolved_by": None,
    }
    await db.agent_tasks.insert_one(doc)
    return {"ok": True, "task": _clean_antonella_task(doc)}


@router.post("/collaboratori/antonella/tasks/{task_id}/start")
async def start_antonella_task(task_id: str, admin=Depends(require_ciak_admin)):
    task = await db.agent_tasks.find_one({"task_id": task_id, "assigned_to": "antonella"})
    if not task:
        raise HTTPException(404, "Task non trovato")
    if task.get("active_timer_started_at"):
        return {"ok": True, "task": _clean_antonella_task(task)}
    now = _now_iso()
    await db.agent_tasks.update_one({"task_id": task_id}, {"$set": {"status": "in_progress", "active_timer_started_at": now, "updated_at": now}})
    task.update({"status": "in_progress", "active_timer_started_at": now, "updated_at": now})
    return {"ok": True, "task": _clean_antonella_task(task)}


@router.post("/collaboratori/antonella/tasks/{task_id}/stop")
async def stop_antonella_task(task_id: str, admin=Depends(require_ciak_admin)):
    task = await db.agent_tasks.find_one({"task_id": task_id, "assigned_to": "antonella"})
    if not task:
        raise HTTPException(404, "Task non trovato")
    start = _parse_iso(task.get("active_timer_started_at"))
    if not start:
        return {"ok": True, "task": _clean_antonella_task(task)}
    now_dt = datetime.now(timezone.utc)
    minutes = max(1, int((now_dt - start).total_seconds() // 60))
    entry = {"start": task.get("active_timer_started_at"), "stop": now_dt.isoformat(), "minutes": minutes}
    actual = int(task.get("actual_minutes") or 0) + minutes
    await db.agent_tasks.update_one(
        {"task_id": task_id},
        {"$set": {"actual_minutes": actual, "active_timer_started_at": None, "updated_at": now_dt.isoformat()}, "$push": {"time_entries": entry}},
    )
    task.update({"actual_minutes": actual, "active_timer_started_at": None, "updated_at": now_dt.isoformat()})
    task.setdefault("time_entries", []).append(entry)
    return {"ok": True, "task": _clean_antonella_task(task)}


@router.post("/collaboratori/antonella/tasks/{task_id}/complete")
async def complete_antonella_task(task_id: str, req: AntonellaTaskNote, admin=Depends(require_ciak_admin)):
    await stop_antonella_task(task_id, admin)
    now = _now_iso()
    await db.agent_tasks.update_one(
        {"task_id": task_id, "assigned_to": "antonella"},
        {"$set": {"status": "completed", "resolution_notes": req.note or "", "updated_at": now}},
    )
    return {"ok": True, "task_id": task_id}


@router.post("/collaboratori/antonella/tasks/{task_id}/approve")
async def approve_antonella_task(task_id: str, req: AntonellaTaskApproval, admin=Depends(require_ciak_admin)):
    task = await db.agent_tasks.find_one({"task_id": task_id, "assigned_to": "antonella"})
    if not task:
        raise HTTPException(404, "Task non trovato")
    actual = _task_minutes(task)
    approved = req.approved_minutes if req.approved_minutes is not None else actual
    amount = round((approved / 60) * ANTONELLA_RATE, 2)
    now = _now_iso()
    await db.agent_tasks.update_one(
        {"task_id": task_id},
        {"$set": {
            "status": "resolved",
            "actual_minutes": actual,
            "active_timer_started_at": None,
            "approved_minutes": approved,
            "approved_amount": amount,
            "approved_at": now,
            "approved_by": getattr(admin, "email", None) or getattr(admin, "user_id", None),
            "approval_note": req.note or "",
            "resolved_at": now,
            "updated_at": now,
        }},
    )
    return {"ok": True, "task_id": task_id, "approved_minutes": approved, "approved_amount": amount}


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


# ═══════════════════════════════════════════════════════════════════════════
# FATTURE (Back office · Valentina) — fatture di cortesia PDF, SENZA IVA.
#
# Evolution PRO LLC è società di diritto statunitense (Delaware): emette
# fatture senza IVA (reverse charge ove applicabile). Questo NON è invio
# elettronico allo SDI: è un PDF di cortesia numerato e archiviato.
#
# Sorgenti vendite fatturabili:
#   - Ciak Blueprint €27  → diagnostic_sessions (stripe_payment_completed) + ciak_orphan_purchases
#   - Partnership €2.790  → proposte (pagamento_completato)
#   - Servizi extra       → partner_servizi (catalogo SERVIZI_CATALOGO)
#
# Collezioni:
#   - ciak_invoices          (1 doc per fattura, include pdf_base64 durevole)
#   - ciak_invoice_counters  (_id=anno, seq) — numerazione progressiva atomica
#   - ciak_invoice_settings  (_id="default") — dati emittente override
# ═══════════════════════════════════════════════════════════════════════════

class InvoiceCliente(BaseModel):
    nome: Optional[str] = ""
    ragione_sociale: Optional[str] = ""
    indirizzo: Optional[str] = ""
    cap: Optional[str] = ""
    citta: Optional[str] = ""
    provincia: Optional[str] = ""
    paese: Optional[str] = "Italia"
    codice_fiscale: Optional[str] = ""
    partita_iva: Optional[str] = ""
    email: Optional[str] = ""
    pec: Optional[str] = ""


class InvoiceRiga(BaseModel):
    descrizione: str
    quantita: float = 1
    prezzo_unitario: float = 0
    importo: Optional[float] = None  # calcolato se assente: quantita * prezzo_unitario


class InvoiceCreate(BaseModel):
    cliente: InvoiceCliente
    righe: list[InvoiceRiga] = Field(default_factory=list)
    fonte: str = Field("manuale", description="blueprint_67 | ciak_start | partnership | upgrade | evo_s | servizio_extra | manuale")
    source_key: Optional[str] = Field(None, description="Chiave univoca sorgente, per evitare doppie fatture")
    data_emissione: Optional[str] = Field(None, description="ISO date; default oggi")
    note: Optional[str] = None
    valuta: str = "EUR"
    partner_id: Optional[str] = None
    # Metadati sorgente (per idempotenza/tracciabilità; assenti per fatture manuali)
    source_type: Optional[str] = None
    source_payment_id: Optional[str] = None
    source_subscription_id: Optional[str] = None
    billing_period: Optional[str] = None
    service_code: Optional[str] = None


async def _invoice_settings_doc() -> dict:
    """Dati emittente: default + override salvati in ciak_invoice_settings."""
    from services.invoice_pdf import EMITTENTE_DEFAULT
    base = dict(EMITTENTE_DEFAULT)
    if db is not None:
        doc = await db.ciak_invoice_settings.find_one({"_id": "default"})
        if doc:
            doc.pop("_id", None)
            base.update({k: v for k, v in doc.items() if v not in (None, "")})
    return base


async def _next_invoice_number(anno: int, prefix: str = "") -> str:
    """Numerazione progressiva atomica per anno: <prefix><anno>/NNN."""
    from pymongo import ReturnDocument
    doc = await db.ciak_invoice_counters.find_one_and_update(
        {"_id": anno},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = doc.get("seq", 1)
    return f"{prefix}{anno}/{seq:03d}"


async def _partner_cliente(partner_id: str) -> dict:
    """Costruisce il blocco cliente dai dati anagrafici/fiscali del partner."""
    if db is None or not partner_id:
        return {}
    p = await db.partners.find_one({"id": partner_id})
    if not p:
        return {}
    nome = p.get("name") or " ".join(x for x in [p.get("nome"), p.get("cognome")] if x)
    return {
        "nome": nome or "",
        "ragione_sociale": p.get("nome_azienda") or p.get("ragione_sociale") or "",
        "indirizzo": p.get("indirizzo") or "",
        "cap": p.get("cap") or "",
        "citta": p.get("citta") or "",
        "provincia": p.get("provincia") or "",
        "paese": p.get("paese") or "Italia",
        "codice_fiscale": p.get("codice_fiscale") or "",
        "partita_iva": p.get("partita_iva") or "",
        "email": p.get("email") or "",
        "pec": p.get("pec") or "",
    }


# ─── Settings emittente ─────────────────────────────────────────────────────

@router.get("/invoices/settings")
async def get_invoice_settings(admin=Depends(require_ciak_admin)):
    """Dati emittente correnti (default Evolution PRO LLC + override salvati)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    return await _invoice_settings_doc()


@router.put("/invoices/settings")
async def set_invoice_settings(body: dict, admin=Depends(require_ciak_admin)):
    """Salva override dei dati emittente (ragione sociale, IBAN, nota fiscale, prefisso numero, ...)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    allowed = {
        "ragione_sociale", "indirizzo", "citta", "paese", "file_number", "ein",
        "rappresentante", "sede_operativa", "email", "iban", "banca",
        "intestatario_conto", "nota_fiscale", "valuta", "numero_prefix",
    }
    payload = {k: v for k, v in (body or {}).items() if k in allowed}
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    payload["updated_by"] = getattr(admin, "email", None) or getattr(admin, "user_id", None)
    await db.ciak_invoice_settings.update_one(
        {"_id": "default"}, {"$set": payload}, upsert=True
    )
    return await _invoice_settings_doc()


# ─── Sorgenti fatturabili ──────────────────────────────────────────────────

def _client_cliente(client: dict) -> dict:
    """Blocco cliente dai dati di un ciak_clients (cliente Blueprint/Start/Partner)."""
    return {
        "nome": client.get("name") or client.get("nome") or "",
        "ragione_sociale": client.get("ragione_sociale") or client.get("nome_azienda") or "",
        "indirizzo": client.get("indirizzo") or "",
        "cap": client.get("cap") or "",
        "citta": client.get("citta") or "",
        "provincia": client.get("provincia") or "",
        "paese": client.get("paese") or "Italia",
        "codice_fiscale": client.get("codice_fiscale") or "",
        "partita_iva": client.get("partita_iva") or "",
        "email": client.get("email") or "",
        "pec": client.get("pec") or "",
    }


async def _build_all_sources(db) -> list[dict]:
    """
    Costruisce TUTTE le fonti fatturabili (offerte principali + EVO-S + servizi
    extra) con prezzi/descrizioni CANONICI dal catalogo backend. Condiviso tra
    GET /invoices/sources e il resolver usato in fase di creazione (anti-tamper).
    """
    from services.ciak_offers import MAIN_OFFERS, eur_from_cents
    from services.ciak_client_accounts import partnership_price_for_client, has_start_entitlement
    from services.evo_s_billing import build_evo_s_sources
    from services.ciak_invoice_sources import build_servizio_extra_source

    # source_key già fatturati (fatture non annullate)
    invoiced: set = set()
    async for inv in db.ciak_invoices.find(
        {"stato": {"$ne": "annullata"}, "source_key": {"$ne": None}},
        {"source_key": 1},
    ):
        invoiced.add(inv.get("source_key"))

    sources: list = []
    blueprint_offer = MAIN_OFFERS["CIAK-BLUEPRINT"]

    # ── Ciak Blueprint €27 — linked ──
    async for d in db.diagnostic_sessions.find({"events.event": "stripe_payment_completed"}):
        pay = [e for e in d.get("events", []) if e.get("event") == "stripe_payment_completed"]
        ev = pay[-1] if pay else {}
        meta = ev.get("metadata", {}) or {}
        sid = meta.get("stripe_session_id") or d.get("session_token")
        key = f"blueprint:{sid}"
        sources.append({
            "source_key": key, "source_type": "blueprint", "fonte": "blueprint_67",
            "fonte_label": "Ciak Blueprint €27", "service_code": blueprint_offer["code"],
            "descrizione": blueprint_offer["descrizione"], "periodicita": "una_tantum",
            "importo": eur_from_cents(blueprint_offer["amount_cents"]),
            "source_payment_id": sid, "data": ev.get("timestamp"),
            "cliente": {"nome": d.get("user_name") or "", "email": d.get("user_email") or "", "paese": "Italia"},
            "gia_fatturata": key in invoiced,
        })

    # ── Ciak Blueprint €27 — orfani ──
    async for o in db.ciak_orphan_purchases.find({}):
        sid = o.get("stripe_session_id")
        key = f"blueprint:{sid}"
        sources.append({
            "source_key": key, "source_type": "blueprint", "fonte": "blueprint_67",
            "fonte_label": "Ciak Blueprint €27 (orfano)", "service_code": blueprint_offer["code"],
            "descrizione": blueprint_offer["descrizione"], "periodicita": "una_tantum",
            "importo": eur_from_cents(blueprint_offer["amount_cents"]),
            "source_payment_id": sid, "data": o.get("created_at"),
            "cliente": {"nome": "", "email": o.get("customer_email") or "", "paese": "Italia"},
            "gia_fatturata": key in invoiced,
        })

    # ── Ciak Start €499 (ciak_clients che hanno acquistato lo Start) ──
    start_offer = MAIN_OFFERS["CIAK-START"]
    async for c in db.ciak_clients.find({"start_purchased_at": {"$ne": None}}):
        key = f"start:client:{c.get('id')}"
        sources.append({
            "source_key": key, "source_type": "ciak_start", "fonte": "ciak_start",
            "fonte_label": "Ciak Start", "service_code": start_offer["code"],
            "descrizione": start_offer["descrizione"], "periodicita": "una_tantum",
            "importo": eur_from_cents(start_offer["amount_cents"]),
            "source_payment_id": c.get("last_checkout_session_id"),
            "data": c.get("start_purchased_at"),
            "partner_id": c.get("partner_id"),
            "cliente": _client_cliente(c),
            "gia_fatturata": key in invoiced,
        })

    # ── Partnership €2.790 / Upgrade €2.291 (ciak_clients partner attivi) ──
    partnership_offer = MAIN_OFFERS["CIAK-PARTNERSHIP"]
    upgrade_offer = MAIN_OFFERS["CIAK-UPGRADE"]
    async for c in db.ciak_clients.find({"partnership_attiva": True}):
        is_upgrade = has_start_entitlement(c)
        offer = upgrade_offer if is_upgrade else partnership_offer
        pricing = partnership_price_for_client(c)
        key = f"partnership:client:{c.get('id')}"
        sources.append({
            "source_key": key, "source_type": "partnership",
            "fonte": "upgrade" if is_upgrade else "partnership",
            "fonte_label": "Upgrade Partnership" if is_upgrade else "Partnership Ciak",
            "service_code": offer["code"], "descrizione": offer["descrizione"],
            "periodicita": "una_tantum",
            "importo": eur_from_cents(pricing["due_amount_cents"]),
            "source_payment_id": c.get("last_checkout_session_id"),
            "data": c.get("partnership_purchased_at"),
            "partner_id": c.get("partner_id"),
            "cliente": _client_cliente(c),
            "gia_fatturata": key in invoiced,
        })

    # ── Partnership da proposte firmate (flusso Evolution/proposta) ──
    async for p in db.proposte.find({"pagamento_completato": True}):
        cp = p.get("contract_params", {}) or {}
        importo = float(cp.get("corrispettivo", eur_from_cents(partnership_offer["amount_cents"])))
        key = f"partnership:{p.get('token') or p.get('partner_id')}"
        cliente = await _partner_cliente(p.get("partner_id"))
        if not cliente.get("nome"):
            cliente = {"nome": p.get("prospect_nome") or "", "email": p.get("prospect_email") or "", "paese": "Italia"}
        sources.append({
            "source_key": key, "source_type": "partnership_proposta", "fonte": "partnership",
            "fonte_label": "Partnership (proposta)", "service_code": partnership_offer["code"],
            "descrizione": partnership_offer["descrizione"], "periodicita": "una_tantum",
            "importo": importo, "source_payment_id": p.get("token"),
            "data": p.get("pagamento_completato_at"),
            "partner_id": p.get("partner_id"), "cliente": cliente,
            "gia_fatturata": key in invoiced,
        })

    # ── Abbonamenti EVO-S PAGATI (evo_s_subscriptions) ──
    paid_subs = []
    async for s in db.evo_s_subscriptions.find({"status": "attivo"}):
        s.pop("_id", None)
        # arricchisci cliente da anagrafica partner se assente
        if not s.get("cliente") and s.get("partner_id"):
            pc = await _partner_cliente(s.get("partner_id"))
            if pc:
                s["cliente"] = pc
        paid_subs.append(s)
    sources.extend(build_evo_s_sources(paid_subs, invoiced))

    # ── Servizi extra (partner_servizi attivi) ──
    try:
        from routers.servizi_extra import SERVIZI_CATALOGO
        catalog = {s["id"]: s for s in SERVIZI_CATALOGO}
    except Exception:
        catalog = {}
    async for sv in db.partner_servizi.find({"stato": "attivo"}):
        cliente = await _partner_cliente(sv.get("partner_id"))
        sources.append(build_servizio_extra_source(sv, catalog, cliente, invoiced))

    sources.sort(key=lambda s: s.get("data") or "", reverse=True)
    return sources


@router.get("/invoices/sources")
async def invoice_sources(admin=Depends(require_ciak_admin)):
    """
    Vendite fatturabili da TUTTE le fonti (offerte principali, abbonamenti EVO-S,
    servizi extra), con flag `gia_fatturata` (match su source_key delle fatture
    già emesse e non annullate) e blocco `cliente` precompilato. Prezzi e
    descrizioni sono CANONICI dal catalogo backend.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    sources = await _build_all_sources(db)
    da_fatturare = [s for s in sources if not s.get("gia_fatturata")]
    return {
        "total": len(sources),
        "da_fatturare": len(da_fatturare),
        "items": sources,
        "gruppi": {
            "principali": [s for s in sources if s.get("fonte") in ("blueprint_67", "ciak_start", "partnership", "upgrade")],
            "evo_s": [s for s in sources if s.get("fonte") == "evo_s"],
            "servizi_extra": [s for s in sources if s.get("fonte") == "servizio_extra"],
        },
    }


# ─── Lista fatture emesse ──────────────────────────────────────────────────

@router.get("/invoices")
async def list_invoices(
    admin=Depends(require_ciak_admin),
    anno: Optional[int] = Query(None),
    stato: Optional[str] = Query(None, description="emessa | annullata"),
    limit: int = Query(200, ge=1, le=1000),
):
    """Elenco fatture emesse (senza il PDF base64, per leggerezza)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    q: dict = {}
    if anno:
        q["anno"] = anno
    if stato:
        q["stato"] = stato
    items = []
    tot_eur = 0.0
    async for inv in db.ciak_invoices.find(q, {"pdf_base64": 0}).sort("created_at", -1).limit(limit):
        inv.pop("_id", None)
        if inv.get("stato") != "annullata":
            tot_eur += float(inv.get("totale") or 0)
        items.append(inv)
    return {"total": len(items), "totale_fatturato_euro": round(tot_eur, 2), "items": items}


# ─── Crea fattura (da sorgente o manuale) ──────────────────────────────────

_INVOICE_INDEXES_READY = False


async def _ensure_invoice_indexes() -> None:
    """
    Indice univoco parziale anti-doppia-fatturazione. Copre SOLO le fatture con
    source_key stringa e stato 'emessa' → le fatture manuali (source_key assente)
    e quelle annullate restano fuori dall'indice (nessun blocco). Per le
    ricorrenze EVO-S il source_key incorpora già subscription+periodo.
    """
    global _INVOICE_INDEXES_READY
    if _INVOICE_INDEXES_READY or db is None:
        return
    try:
        await db.ciak_invoices.create_index(
            "source_key",
            name="uniq_source_key_emessa",
            unique=True,
            partialFilterExpression={"source_key": {"$type": "string"}, "stato": "emessa"},
        )
        _INVOICE_INDEXES_READY = True
    except Exception as e:  # best-effort: non blocca la creazione
        logger.warning(f"[INVOICE] create_index fallito (uso guardia applicativa): {e}")


async def _resolve_source_by_key(source_key: str) -> Optional[dict]:
    """Ritrova la fonte canonica (prezzo/descrizione dal catalogo) per source_key."""
    if not source_key:
        return None
    for s in await _build_all_sources(db):
        if s.get("source_key") == source_key:
            return s
    return None


@router.post("/invoices")
async def create_invoice(body: InvoiceCreate, admin=Depends(require_ciak_admin)):
    """
    Genera una fattura di cortesia: assegna il numero progressivo, renderizza il
    PDF (senza IVA) e lo archivia in ciak_invoices (PDF in base64, durevole).
    Idempotente per source_key: se esiste già una fattura non annullata per
    quella vendita → 409. Per le vendite con fonte server-side, prezzo e
    descrizione della prima riga vengono RICALCOLATI dal catalogo (anti-tamper).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services.invoice_pdf import render_invoice_pdf, upload_invoice_pdf_to_cloudinary
    import uuid as _uuid
    import base64 as _b64
    from pymongo.errors import DuplicateKeyError

    await _ensure_invoice_indexes()

    # Metadati sorgente (ricalcolati dal server quando c'è una fonte)
    source_type = body.source_type
    source_payment_id = body.source_payment_id
    source_subscription_id = body.source_subscription_id
    billing_period = body.billing_period
    service_code = body.service_code
    partner_id = body.partner_id
    fonte = body.fonte

    # Anti-duplicato (guardia applicativa; l'indice univoco fa da rete atomica)
    if body.source_key:
        existing = await db.ciak_invoices.find_one(
            {"source_key": body.source_key, "stato": {"$ne": "annullata"}}
        )
        if existing:
            raise HTTPException(409, f"Vendita già fatturata (n. {existing.get('numero')})")

    # Righe (server-side). Con fonte server-side la PRIMA riga è canonica: prezzo
    # e descrizione dal catalogo, ignorando eventuali valori manomessi dal client.
    body_righe = list(body.righe)
    if body.source_key:
        src = await _resolve_source_by_key(body.source_key)
        if src:
            fonte = src.get("fonte") or fonte
            source_type = src.get("source_type") or source_type
            source_payment_id = src.get("source_payment_id") or source_payment_id
            source_subscription_id = src.get("source_subscription_id") or source_subscription_id
            billing_period = src.get("billing_period") or billing_period
            service_code = src.get("service_code") or service_code
            partner_id = src.get("partner_id") or partner_id
            canonical = {
                "descrizione": src["descrizione"],
                "quantita": 1,
                "prezzo_unitario": float(src.get("importo") or 0),
                "importo": round(float(src.get("importo") or 0), 2),
            }
            # Sostituisce la prima riga (auto-compilata) con quella canonica;
            # eventuali righe aggiuntive (es. componente variabile) restano.
            extra = body_righe[1:] if body_righe else []
            body_righe = [InvoiceRiga(**canonical)] + extra

    # Righe + totale (calcolato lato server)
    righe = []
    totale = 0.0
    for r in body_righe:
        imp = r.importo if r.importo is not None else round(r.quantita * r.prezzo_unitario, 2)
        righe.append({
            "descrizione": r.descrizione,
            "quantita": r.quantita,
            "prezzo_unitario": r.prezzo_unitario,
            "importo": round(imp, 2),
        })
        totale += imp
    if not righe:
        raise HTTPException(400, "Almeno una riga è obbligatoria")
    totale = round(totale, 2)

    settings = await _invoice_settings_doc()
    now = datetime.now(timezone.utc)
    data_em = body.data_emissione or now.date().isoformat()
    try:
        anno = int(data_em[:4])
    except Exception:
        anno = now.year
    numero = await _next_invoice_number(anno, settings.get("numero_prefix", ""))

    cliente = body.cliente.dict()
    invoice_view = {
        "numero": numero,
        "data_emissione": data_em,
        "valuta": body.valuta or "EUR",
        "cliente": cliente,
        "righe": righe,
        "totale": totale,
        "note": body.note,
    }

    # Render PDF
    try:
        pdf_bytes = render_invoice_pdf(invoice_view, settings)
    except Exception as e:
        logger.error(f"[INVOICE] Errore render PDF: {e}")
        raise HTTPException(500, f"Errore generazione PDF: {e}")

    cloud_url = upload_invoice_pdf_to_cloudinary(pdf_bytes, numero)

    inv_id = str(_uuid.uuid4())
    doc = {
        "id": inv_id,
        "numero": numero,
        "anno": anno,
        "data_emissione": data_em,
        "fonte": fonte,
        "source_key": body.source_key,
        "source_type": source_type,
        "source_payment_id": source_payment_id,
        "source_subscription_id": source_subscription_id,
        "billing_period": billing_period,
        "service_code": service_code,
        "partner_id": partner_id,
        "cliente": cliente,
        "righe": righe,
        "totale": totale,
        "valuta": body.valuta or "EUR",
        "note": body.note,
        "stato": "emessa",
        "pdf_url": cloud_url,
        "pdf_base64": _b64.b64encode(pdf_bytes).decode("ascii"),
        "created_at": now.isoformat(),
        "created_by": getattr(admin, "email", None) or getattr(admin, "user_id", None),
    }
    try:
        await db.ciak_invoices.insert_one(doc)
    except DuplicateKeyError:
        # Rete atomica: due richieste concorrenti sulla stessa vendita
        existing = await db.ciak_invoices.find_one(
            {"source_key": body.source_key, "stato": "emessa"}, {"numero": 1}
        )
        raise HTTPException(409, f"Vendita già fatturata (n. {(existing or {}).get('numero')})")

    out = dict(doc)
    out.pop("_id", None)
    out.pop("pdf_base64", None)
    return out


# ─── Dettaglio / PDF / annulla ─────────────────────────────────────────────

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, admin=Depends(require_ciak_admin)):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    inv = await db.ciak_invoices.find_one({"id": invoice_id}, {"pdf_base64": 0})
    if not inv:
        raise HTTPException(404, "Fattura non trovata")
    inv.pop("_id", None)
    return inv


@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, admin=Depends(require_ciak_admin)):
    """Stream del PDF archiviato (dal base64 in DB — durevole)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    import base64 as _b64
    from fastapi.responses import Response
    inv = await db.ciak_invoices.find_one({"id": invoice_id})
    if not inv:
        raise HTTPException(404, "Fattura non trovata")
    b64 = inv.get("pdf_base64")
    if not b64:
        # Fallback: rigenera al volo dai dati salvati
        from services.invoice_pdf import render_invoice_pdf
        settings = await _invoice_settings_doc()
        pdf_bytes = render_invoice_pdf(inv, settings)
    else:
        pdf_bytes = _b64.b64decode(b64)
    safe = (inv.get("numero") or "fattura").replace("/", "-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="Fattura_{safe}.pdf"'},
    )


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_invoice(invoice_id: str, admin=Depends(require_ciak_admin)):
    """Annulla una fattura (resta a registro, ma esce dai totali e libera la sorgente)."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    inv = await db.ciak_invoices.find_one({"id": invoice_id}, {"source_key": 1})
    if not inv:
        raise HTTPException(404, "Fattura non trovata")
    update: dict = {"$set": {
        "stato": "annullata",
        "annullata_at": datetime.now(timezone.utc).isoformat(),
        "annullata_by": getattr(admin, "email", None) or getattr(admin, "user_id", None),
    }}
    # Libera il source_key dall'indice univoco parziale così la vendita può
    # essere rifatturata (preservando l'originale per tracciabilità).
    if inv.get("source_key"):
        update["$set"]["source_key_annullata"] = inv["source_key"]
        update["$unset"] = {"source_key": ""}
    await db.ciak_invoices.update_one({"id": invoice_id}, update)
    return {"ok": True, "id": invoice_id, "stato": "annullata"}


# ─── Delivery Audit (vista sintetica stato reale percorso EVO dei partner) ───

@router.get("/delivery-audit")
async def delivery_audit(admin=Depends(require_ciak_admin)):
    """
    Audit Delivery — una riga per partner attivo con lo stato reale del percorso EVO.

    Sola lettura. Aggrega partners + partner_hub + partner_journey_steps +
    masterclass_factory + partner_videocorso + partner_funnel per rispondere a:
    chi e' fermo, cosa manca (offerta / videocorso / funnel), prossima azione,
    chi deve muoversi (Claudio / Partner / Team).

    Serve a Stefania e Luca per la Delivery, senza aprire N schede full-data.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
    from services.partner_alignment import estimate_alignment

    STEP_META = {
        d["step_id"]: {
            "label": d["label"],
            "macro_phase": d["macro_phase"],
            "step_number": d["step_number"],
        }
        for d in JOURNEY_STEPS_DEFINITION
    }
    MACRO_LABEL = {"esamina": "Esamina", "valida": "Valida", "ottimizza": "Ottimizza"}
    # Step in cui la palla e' al partner (registra grezzo / invia dati); gli altri
    # sono a carico del team Evolution.
    PARTNER_ACTION_STEPS = {
        "01-contratto",
        "02-discovery-video",
        "burocrazia",
        "la-tua-storia",
        "07-registra-masterclass",
        "08-registra-lezioni",
    }
    STALE_DAYS = 7
    now = datetime.now(timezone.utc)

    def _iso(v):
        if not v:
            return None
        if isinstance(v, str):
            return v
        try:
            return v.isoformat()
        except Exception:
            return str(v)

    def _filled(v):
        return bool((v or "").strip()) if isinstance(v, str) else bool(v)

    def _step_done(steps, step_id: str) -> bool:
        return any(
            s.get("step_id") == step_id
            and s.get("status") in ("completed", "done", "approved")
            for s in steps
        )

    def _owner_from_alignment(responsabile: str | None) -> str:
        if responsabile == "Agente Ciak":
            return "Team"
        if responsabile in ("Claudio", "Luca", "Partner", "Team", "Team/Claudio"):
            return responsabile
        return "Team"

    # Partner attivi (stato "attivo" o assente).
    partners = []
    async for p in db.partners.find(
        {"$or": [{"stato": {"$exists": False}}, {"stato": None}, {"stato": "attivo"}]}
    ).sort("name", 1):
        partners.append(p)
    partner_ids = [p.get("id") for p in partners if p.get("id")]

    hub_by, mc_by, vc_by, funnel_by = {}, {}, {}, {}
    steps_by: dict[str, list] = {}
    async for h in db.partner_hub.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        hub_by[h.get("partner_id")] = h
    async for m in db.masterclass_factory.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        mc_by[m.get("partner_id")] = m
    async for v in db.partner_videocorso.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        vc_by[v.get("partner_id")] = v
    async for f in db.partner_funnel.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        funnel_by[f.get("partner_id")] = f
    async for s in db.partner_journey_steps.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        steps_by.setdefault(s.get("partner_id"), []).append(s)

    items = []
    counters = {
        "offerta_mancante": 0,
        "videocorso_zero": 0,
        "funnel_mancante": 0,
        "fermi": 0,
        "serve_claudio": 0,
        "incoerenze": 0,
    }

    for p in partners:
        pid = p.get("id")
        hub = hub_by.get(pid) or {}
        mc = mc_by.get(pid) or {}
        vc = vc_by.get(pid) or {}
        funnel = funnel_by.get(pid) or {}
        steps = sorted(steps_by.get(pid, []), key=lambda s: s.get("step_number") or 0)

        phase_legacy = p.get("phase") or "F1"
        is_live = phase_legacy in ("LIVE", "OTTIMIZZAZIONE")

        current = next((s for s in steps if s.get("status") == "in_progress"), None)
        if not current and steps:
            current = steps[-1]
        cur_id = current.get("step_id") if current else None
        cur_meta = STEP_META.get(cur_id or "", {})

        # Offerta (4 campi).
        offer_fields = [hub.get("offerName"), hub.get("offerPrice"), hub.get("offerIncludes"), hub.get("offerGuarantee")]
        offer_filled = sum(1 for x in offer_fields if _filled(x))
        offerta = "completa" if offer_filled == 4 else ("parziale" if offer_filled > 0 else "mancante")

        # Posizionamento (6 campi).
        pos_fields = [hub.get("whoYouAre"), hub.get("targetAudience"), hub.get("problem"), hub.get("solution"), hub.get("pitch"), hub.get("differentiator")]
        pos_filled = sum(1 for x in pos_fields if _filled(x))

        # Brand / dati base. Se lo step 03 e' completato, consideriamo il brand
        # pronto anche quando il dettaglio non e' normalizzato in partner_hub.
        brand_fields = [
            hub.get("logo"),
            hub.get("primaryColor"),
            hub.get("accentColor"),
            hub.get("toneOfVoice"),
            hub.get("keywords"),
        ]
        brand_ok = _step_done(steps, "03-brand-kit") or any(_filled(x) for x in brand_fields)
        dati_base_ok = bool(p.get("name") or hub.get("name")) and bool(p.get("email") or hub.get("email"))

        # Masterclass.
        mc_script = bool((mc.get("dyf_status") in ("pronto", "approvato")) or mc.get("full_script") or mc.get("script"))
        mc_video = bool((mc.get("pipeline_status") in ("ready_for_review", "approved", "da_revisionare", "montaggio")) or mc.get("video_youtube_url"))

        # Videocorso — lezioni.
        lessons = vc.get("lessons") or {}
        n_lessons = 0
        n_lessons_ready = 0
        if isinstance(lessons, dict):
            for lv in lessons.values():
                if not isinstance(lv, dict):
                    continue
                n_lessons += 1
                if lv.get("status") in ("ready_for_review", "approved", "done") or lv.get("youtube_url") or lv.get("video_youtube_url"):
                    n_lessons_ready += 1

        # Funnel Systeme del partner.
        funnel_url = funnel.get("funnel_systeme_url") or funnel.get("funnel_url")
        funnel_ok = bool(funnel_url)

        # KPI/vendite: segnali leggeri gia' presenti sul documento partner.
        # L'endpoint deve restare veloce: non interroga Systeme live.
        kpi_manual = p.get("kpi_manual") if isinstance(p.get("kpi_manual"), dict) else {}
        visite = float(kpi_manual.get("visite") or 0)
        contatti = float(kpi_manual.get("contatti") or 0)
        vendite = float(kpi_manual.get("vendite") or 0)
        revenue = float(p.get("revenue") or p.get("fatturato") or 0)
        kpi_ok = bool(visite > 0 or contatti > 0 or vendite > 0 or revenue > 0)
        vendite_ok = bool(vendite > 0 or revenue > 0)

        # Fermo / stale.
        cur_updated = _iso(current.get("updated_at")) if current else None
        stale = False
        if cur_updated:
            try:
                dt = datetime.fromisoformat(cur_updated.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                stale = (now - dt).days >= STALE_DAYS
            except Exception:
                stale = False
        approval = current.get("approval_status") if current else None
        blocked = bool(current and current.get("status") == "blocked") or (approval == "pending_review")

        alignment = estimate_alignment({
            "stato": p.get("stato") or "attivo",
            "phase": phase_legacy,
            "posizionamento_ok": pos_filled >= 6,
            "brand_ok": brand_ok,
            "dati_base_ok": dati_base_ok,
            "script_masterclass_ok": mc_script,
            "video_masterclass_ok": mc_video,
            "videocorso_ok": n_lessons > 0 and n_lessons_ready > 0,
            "funnel_ok": funnel_ok,
            "kpi_ok": kpi_ok,
            "vendite_ok": vendite_ok,
        })

        macro = (alignment.get("atto_evo") or ("Ottimizza" if is_live else cur_meta.get("macro_phase") or "Esamina")).lower()
        incoerenza = "Fase avanzata ma asset base incompleti" if alignment.get("incoerenza") else None

        # Chi deve muoversi.
        if approval == "pending_review":
            owner = "Team/Claudio"
        elif cur_id in PARTNER_ACTION_STEPS:
            owner = "Partner"
        else:
            owner = _owner_from_alignment(alignment.get("responsabile"))

        # Prossima azione: usa la stima deterministica, ma mantiene la priorita'
        # Claudio quando c'e' un'approvazione esplicita in sospeso.
        next_action = alignment.get("prossimo_step")
        if approval == "pending_review":
            next_action = f"Serve OK su: {cur_meta.get('label', cur_id)}"

        if offerta != "completa":
            counters["offerta_mancante"] += 1
        if n_lessons == 0:
            counters["videocorso_zero"] += 1
        if not funnel_ok:
            counters["funnel_mancante"] += 1
        if blocked or stale:
            counters["fermi"] += 1
        if owner == "Team/Claudio":
            counters["serve_claudio"] += 1
        if incoerenza:
            counters["incoerenze"] += 1

        items.append({
            "id": pid,
            "name": p.get("name") or hub.get("name"),
            "phase": phase_legacy,
            "macro_phase": macro,
            "macro_label": MACRO_LABEL.get(macro, macro),
            "niche": p.get("niche") or p.get("nicchia"),
            "current_step": cur_meta.get("label") or cur_id,
            "current_step_id": cur_id,
            "step_updated_at": cur_updated,
            "positioning_filled": pos_filled,
            "offerta": offerta,
            "offer_filled": offer_filled,
            "masterclass_script": mc_script,
            "masterclass_video": mc_video,
            "videocorso_lessons": n_lessons,
            "videocorso_lessons_ready": n_lessons_ready,
            "funnel_systeme": funnel_ok,
            "funnel_url": funnel_url,
            "blocked": blocked,
            "stale": stale,
            "incoerenza": incoerenza,
            "owner": owner,
            "next_action": next_action,
            "priorita": alignment.get("priorita"),
            "stato_reale": alignment.get("stato_reale"),
            "rischio": alignment.get("rischio"),
            "asset_flags": alignment.get("asset_flags"),
            "asset_mancanti": alignment.get("asset_mancanti"),
            "asset_presenti": alignment.get("asset_presenti"),
            "alignment": alignment,
        })

    return {
        "total": len(items),
        "counters": counters,
        "generated_at": now.isoformat(),
        "items": items,
    }


# ─── Motore Vendite Partner (vista setup + KPI per singolo partner) ────────

@router.get("/partner-sales-engine")
async def partner_sales_engine(admin=Depends(require_ciak_admin)):
    """
    Motore Vendite Partner — vista duplicabile per capire se ogni partner ha la
    macchina vendite installata: offerta, masterclass, videocorso, funnel
    Systeme, KPI e prime vendite.

    Riusa Delivery Audit come fonte dello stato reale EVO e aggiunge dati
    commerciali leggeri gia' presenti nel DB. Non interroga Systeme live: la
    pagina deve restare veloce e onesta sui dati disponibili.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    audit = await delivery_audit(admin)
    audit_items = audit.get("items") or []
    partner_ids = [i.get("id") for i in audit_items if i.get("id")]

    partners_by, funnel_by = {}, {}
    ott_by, calendar_by, live_by = {}, {}, {}
    async for p in db.partners.find(
        {"id": {"$in": partner_ids}},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "email": 1,
            "phase": 1,
            "niche": 1,
            "nicchia": 1,
            "revenue": 1,
            "fatturato": 1,
            "kpi_manual": 1,
            "systeme_course_id": 1,
            "systeme_account_email": 1,
            "data_pagamento_partnership": 1,
            "conversion_date": 1,
            "ads_budget_monthly": 1,
            "budget_ads_monthly": 1,
            "budget_ads": 1,
        },
    ):
        partners_by[p.get("id")] = p

    async for f in db.partner_funnel.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        funnel_by[f.get("partner_id")] = f
    async for o in db.partner_ottimizzazione.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        ott_by[o.get("partner_id")] = o
    async for cdoc in db.partner_quarterly_calendar.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        calendar_by[cdoc.get("partner_id")] = cdoc
    async for ldoc in db.partner_live_cycle.find({"partner_id": {"$in": partner_ids}}, {"_id": 0}):
        live_by[ldoc.get("partner_id")] = ldoc

    def _num(v):
        try:
            return float(v or 0)
        except Exception:
            return 0.0

    def _setup_item(key: str, label: str, ok: bool, missing: str) -> dict:
        return {
            "key": key,
            "label": label,
            "ok": bool(ok),
            "missing": None if ok else missing,
        }

    def _weeks_to(value) -> Optional[int]:
        dt = _parse_iso(value)
        if not dt:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = dt - datetime.now(timezone.utc)
        if delta.total_seconds() <= 0:
            return 0
        return max(0, int(delta.days // 7))

    def _months_since(value) -> Optional[int]:
        dt = _parse_iso(value)
        if not dt:
            return None
        now = datetime.now(timezone.utc)
        return max(0, (now.year - dt.year) * 12 + (now.month - dt.month))

    def _budget_ads(partner: dict, kpi_manual: dict) -> Optional[float]:
        for key in ("ads_budget_monthly", "budget_ads_monthly", "budget_ads", "ads_budget", "budget_pubblicita"):
            val = partner.get(key) if key in partner else kpi_manual.get(key)
            if val not in (None, ""):
                return _num(val)
        return None

    def _ads_plan(*, funnel_url: str | None, flags: dict, budget: Optional[float], contatti: float, vendite: float, revenue: float) -> dict:
        question = "Quanto puoi investire in pubblicità ogni mese per 90 giorni, senza mettere a rischio la tua serenità economica?"
        if not funnel_url or not flags.get("kpi"):
            return {
                "level": "no_ads",
                "label": "No ads",
                "budget_monthly": budget,
                "recommended_budget": "0€ finché asset e KPI non sono pronti",
                "risk": "Spendere ora confonde i dati e brucia budget.",
                "next_action": "Prima completa funnel, tracking e KPI base.",
                "question": question,
            }
        if budget is None or budget <= 0:
            return {
                "level": "ask_budget",
                "label": "Chiedere budget",
                "budget_monthly": None,
                "recommended_budget": "Definire budget sostenibile su 90 giorni",
                "risk": "Senza budget dichiarato non possiamo scegliere una strategia ads seria.",
                "next_action": "Chiedere al partner il budget mensile sostenibile per 90 giorni.",
                "question": question,
            }
        if vendite > 0 or revenue > 0:
            return {
                "level": "scaling" if budget >= 600 else "retargeting",
                "label": "Scaling controllato" if budget >= 600 else "Retargeting leggero",
                "budget_monthly": budget,
                "recommended_budget": "Aumentare gradualmente solo su creatività/funnel che convertono" if budget >= 600 else "5-10€/giorno su retargeting",
                "risk": "Scalare troppo presto sporca ciò che già funziona.",
                "next_action": "Partire da retargeting e aumentare budget solo se CPL/conversione reggono.",
                "question": question,
            }
        if contatti > 0 and budget >= 300:
            return {
                "level": "test",
                "label": "Test acquisizione",
                "budget_monthly": budget,
                "recommended_budget": "300-600€/mese per 90 giorni",
                "risk": "Il test va spento se i numeri non reggono entro 2-3 settimane.",
                "next_action": "Testare 2-3 angoli creativi con budget limitato e controllo settimanale.",
                "question": question,
            }
        return {
            "level": "retargeting",
            "label": "Retargeting leggero",
            "budget_monthly": budget,
            "recommended_budget": "5-10€/giorno",
            "risk": "Traffico freddo prematuro: meglio scaldare chi ha già interagito.",
            "next_action": "Spingere masterclass/live solo su viewer, visitatori ed engagement.",
            "question": question,
        }

    def _accelerator(status: str, ads_plan: dict, calendar_ready: bool, live_ready: bool, flags: dict) -> dict:
        if status == "setup_systeme":
            return {"type": "extra", "service_id": "setup-tecnico-extra", "label": "Setup tecnico extra", "reason": "Serve chiudere funnel, checkout e collegamenti prima di vendere."}
        if not calendar_ready:
            return {"type": "extra", "service_id": "calendario-pro", "label": "Calendario Editoriale PRO", "reason": "Manca il ritmo contenuti dei prossimi 90 giorni."}
        if not live_ready:
            return {"type": "extra", "service_id": "live-promo-3", "label": "Live Promo — 3 eventi", "reason": "Serve il primo ciclo live ogni 60 giorni per riattivare pubblico e lista."}
        if ads_plan.get("level") in ("test", "scaling"):
            return {"type": "extra", "service_id": "gestione-campagne", "label": "Gestione Campagne", "reason": "Il partner ha budget e asset: le ads vanno gestite con controllo settimanale."}
        if flags.get("kpi") and not flags.get("vendite"):
            return {"type": "extra", "service_id": "copywriting-premium", "label": "Copywriting premium", "reason": "Ci sono dati ma vendite basse/zero: offerta e pagina vanno corrette."}
        return {"type": "internal", "service_id": None, "label": "Azione interna Team Ciak", "reason": "Per ora basta esecuzione interna: lettura dati, contenuti e follow-up."}

    items = []
    counters = {
        "ready": 0,
        "missing_systeme": 0,
        "missing_kpi": 0,
        "no_sales": 0,
        "high_priority": 0,
        "optimize_rhythm_missing": 0,
        "ads_budget_missing": 0,
        "ads_ready": 0,
        "continuity_due": 0,
    }

    for row in audit_items:
        pid = row.get("id")
        partner = partners_by.get(pid) or {}
        funnel = funnel_by.get(pid) or {}
        ott = ott_by.get(pid) or {}
        calendar = calendar_by.get(pid) or {}
        live = live_by.get(pid) or {}
        flags = row.get("asset_flags") or {}

        kpi_manual = partner.get("kpi_manual") if isinstance(partner.get("kpi_manual"), dict) else {}
        visite = _num(kpi_manual.get("visite"))
        contatti = _num(kpi_manual.get("contatti"))
        vendite = _num(kpi_manual.get("vendite"))
        conversione = _num(kpi_manual.get("conversione"))
        revenue = _num(partner.get("revenue") or partner.get("fatturato"))
        kpi_fonte = "manuale" if any([visite, contatti, vendite, conversione]) else ("legacy_revenue" if revenue else "nessuna")
        ads_budget = _budget_ads(partner, kpi_manual)

        funnel_url = row.get("funnel_url") or funnel.get("funnel_systeme_url") or funnel.get("funnel_url")
        checkout_url = funnel.get("checkout_url") or funnel.get("checkout_systeme_url")
        sales_page_url = funnel.get("vendita_url") or funnel.get("sales_page_url")
        course_id = partner.get("systeme_course_id") or funnel.get("systeme_course_id")
        calendar_ready = bool(calendar.get("calendar"))
        live_ready = bool(live.get("cycle"))
        prossima_live_at = live.get("prossima_live_at")
        weeks_to_live = _weeks_to(prossima_live_at)

        setup = [
            _setup_item("offerta", "Offerta 4/4", row.get("offerta") == "completa", "Completa nome, prezzo, contenuto e garanzia."),
            _setup_item("masterclass", "Masterclass", row.get("masterclass_video"), "Completa script/video masterclass."),
            _setup_item("videocorso", "Videocorso", (row.get("videocorso_lessons_ready") or 0) > 0, "Carica e approva almeno le prime lezioni."),
            _setup_item("funnel_systeme", "Funnel Systeme", bool(funnel_url), "Costruisci o collega il funnel Systeme del partner."),
            _setup_item("kpi", "KPI", bool(flags.get("kpi")), "Inserisci visite, contatti e vendite dal dettaglio partner."),
            _setup_item("vendite", "Prime vendite", bool(flags.get("vendite")), "Analizza offerta/funnel e lavora sulle prime vendite."),
        ]
        completed = sum(1 for s in setup if s["ok"])
        total = len(setup)

        if completed == total:
            status = "attivo"
            next_action = "Mantieni ritmo Ottimizza: KPI, contenuti, live ogni 60 giorni."
        elif not funnel_url:
            status = "setup_systeme"
            next_action = "Installa o collega il funnel Systeme del partner."
        elif not flags.get("kpi"):
            status = "dati_mancanti"
            next_action = "Inserisci KPI iniziali: visite, contatti, vendite e conversione."
        elif not flags.get("vendite"):
            status = "prime_vendite"
            next_action = "Lavora il prossimo ciclo di vendita: contenuti, live, follow-up e offerta."
        else:
            status = "in_costruzione"
            next_action = row.get("next_action")

        ads = _ads_plan(
            funnel_url=funnel_url,
            flags=flags,
            budget=ads_budget,
            contatti=contatti,
            vendite=vendite,
            revenue=revenue,
        )
        accelerator = _accelerator(status, ads, calendar_ready, live_ready, flags)
        activation_date = partner.get("data_pagamento_partnership") or partner.get("conversion_date")
        month_in_partnership = _months_since(activation_date)
        continuity_due = month_in_partnership is not None and month_in_partnership >= 10

        if status == "attivo":
            counters["ready"] += 1
        if not funnel_url:
            counters["missing_systeme"] += 1
        if not flags.get("kpi"):
            counters["missing_kpi"] += 1
        if not flags.get("vendite"):
            counters["no_sales"] += 1
        if row.get("priorita") == "alta" or row.get("blocked") or row.get("stale"):
            counters["high_priority"] += 1
        if not (calendar_ready and live_ready):
            counters["optimize_rhythm_missing"] += 1
        if ads.get("level") == "ask_budget":
            counters["ads_budget_missing"] += 1
        if ads.get("level") in ("retargeting", "test", "scaling"):
            counters["ads_ready"] += 1
        if continuity_due:
            counters["continuity_due"] += 1

        items.append({
            "id": pid,
            "name": row.get("name") or partner.get("name") or pid,
            "niche": row.get("niche") or partner.get("niche") or partner.get("nicchia"),
            "phase": row.get("phase"),
            "macro_phase": row.get("macro_phase"),
            "macro_label": row.get("macro_label"),
            "status": status,
            "setup_completed": completed,
            "setup_total": total,
            "setup_percent": round((completed / total) * 100) if total else 0,
            "setup": setup,
            "systeme": {
                "account_email": partner.get("systeme_account_email"),
                "course_id": course_id,
                "funnel_url": funnel_url,
                "sales_page_url": sales_page_url,
                "checkout_url": checkout_url,
                "thankyou_url": funnel.get("thankyou_url"),
            },
            "kpi": {
                "visite": visite,
                "contatti": contatti,
                "vendite": vendite,
                "conversione": conversione,
                "revenue": revenue,
                "fonte": kpi_fonte,
            },
            "ottimizza": {
                "calendar_90_ready": calendar_ready,
                "calendar_generated_at": calendar.get("generated_at"),
                "live_60_ready": live_ready,
                "live_generated_at": live.get("generated_at"),
                "prossima_live_at": prossima_live_at,
                "settimane_alla_live": weeks_to_live,
                "protocollo_settimana": ott.get("protocollo_settimana"),
                "protocollo_updated_at": ott.get("protocollo_updated_at"),
                "giorni_da_ultima_azione": None,
                "ritmo_label": "Calendario 90gg + live 60gg pronti" if calendar_ready and live_ready else "Ritmo Ottimizza da impostare",
            },
            "ads_plan": ads,
            "accelerator": accelerator,
            "continuity": {
                "month_in_partnership": month_in_partnership,
                "due": continuity_due,
                "label": "EVO-S Pro" if continuity_due else "Non ancora",
                "reason": "Preparare proposta post partnership: il sistema resta del partner, il team può restare a supporto." if continuity_due else "Si valuta verso mese 10-12.",
            },
            "alignment": {
                "priorita": row.get("priorita"),
                "stato_reale": row.get("stato_reale"),
                "rischio": row.get("rischio"),
                "owner": row.get("owner"),
                "blocked": row.get("blocked"),
                "stale": row.get("stale"),
            },
            "next_action": next_action,
            "owner": row.get("owner"),
        })

    def _rank(item):
        status_rank = {
            "setup_systeme": 0,
            "dati_mancanti": 1,
            "prime_vendite": 2,
            "in_costruzione": 3,
            "attivo": 4,
        }
        priority_penalty = 0 if item["alignment"].get("priorita") == "alta" else 1
        return (priority_penalty, status_rank.get(item.get("status"), 9), -item.get("setup_percent", 0))

    return {
        "total": len(items),
        "generated_at": audit.get("generated_at") or _now_iso(),
        "counters": counters,
        "items": sorted(items, key=_rank),
    }


class PartnerAdsBudgetBody(BaseModel):
    budget_ads_monthly: Optional[float] = Field(None, ge=0, description="Budget ads mensile sostenibile per 90 giorni")
    note: Optional[str] = Field(None, description="Nota interna sul budget ads")


@router.patch("/partner/{partner_id}/ads-budget")
async def set_partner_ads_budget(
    partner_id: str,
    body: PartnerAdsBudgetBody,
    admin=Depends(require_ciak_admin),
):
    """Salva il budget ads mensile del partner per il Motore Vendite Partner."""
    if db is None:
        raise HTTPException(503, "Database non configurato")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "id": 1})
    if not partner:
        raise HTTPException(404, "Partner non trovato")

    now = datetime.now(timezone.utc).isoformat()
    admin_id = (
        getattr(admin, "email", None)
        or getattr(admin, "user_id", None)
        or getattr(admin, "id", None)
        or "admin"
    )

    set_fields = {
        "ads_budget_updated_at": now,
        "ads_budget_updated_by": str(admin_id),
    }
    unset_fields = {}

    if body.budget_ads_monthly is None:
        unset_fields["budget_ads_monthly"] = ""
    else:
        set_fields["budget_ads_monthly"] = float(body.budget_ads_monthly)

    if body.note is not None:
        note = body.note.strip()
        if note:
            set_fields["ads_budget_note"] = note
        else:
            unset_fields["ads_budget_note"] = ""

    update = {"$set": set_fields}
    if unset_fields:
        update["$unset"] = unset_fields

    await db.partners.update_one({"id": partner_id}, update)
    return {
        "ok": True,
        "partner_id": partner_id,
        "budget_ads_monthly": None if body.budget_ads_monthly is None else float(body.budget_ads_monthly),
        "updated_at": now,
    }


# ─── Partner Alignment — override manuali (innesto sul Delivery Audit) ───────
# Layer NON invasivo: il GET /delivery-audit resta invariato. Questi due endpoint
# leggono/scrivono le correzioni manuali (campi alignment_*) sul documento
# partner; la pagina Delivery Audit le sovrappone alla stima automatica.

@router.get("/partner-alignment/overrides")
async def partner_alignment_overrides(admin=Depends(require_ciak_admin)):
    """Override manuali di alignment per tutti i partner: { id: {alignment_*} }."""
    if db is None:
        raise HTTPException(503, "Database non configurato")
    from services.partner_alignment import OVERRIDE_FIELDS
    projection = {"_id": 0, "id": 1}
    for f in OVERRIDE_FIELDS + ["alignment_updated_at", "alignment_updated_by"]:
        projection[f] = 1
    out = {}
    async for p in db.partners.find({}, projection):
        ov = {k: v for k, v in p.items() if k.startswith("alignment_") and v not in (None, "")}
        if ov:
            out[p.get("id")] = ov
    return {"overrides": out}


class AlignmentOverrideBody(BaseModel):
    alignment_status_override: Optional[str] = Field(None, description="Stato reale forzato a mano")
    alignment_risk: Optional[str] = Field(None, description="Rischio principale forzato")
    alignment_next_step: Optional[str] = Field(None, description="Prossima azione forzata")
    alignment_owner: Optional[str] = Field(None, description="Chi muove: Claudio | Luca | Team | Partner")
    alignment_priority: Optional[str] = Field(None, description="alta | media | bassa")
    alignment_notes: Optional[str] = Field(None, description="Nota libera di regia")


@router.patch("/partner/{partner_id}/alignment")
async def set_partner_alignment(
    partner_id: str,
    body: AlignmentOverrideBody,
    admin=Depends(require_ciak_admin),
):
    """Salva/azzera gli override manuali di alignment sul documento partner.
    Stringa vuota o null su un campo lo azzera (torna alla stima automatica)."""
    from services.partner_alignment import build_override_update
    if db is None:
        raise HTTPException(503, "Database non configurato")
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "id": 1})
    if not partner:
        raise HTTPException(404, "Partner non trovato")
    payload = body.dict(exclude_unset=True)
    set_fields, unset_fields = build_override_update(payload)
    if not set_fields and not unset_fields:
        raise HTTPException(400, "Nessun campo alignment da aggiornare")
    now = datetime.now(timezone.utc).isoformat()
    set_fields["alignment_updated_at"] = now
    set_fields["alignment_updated_by"] = getattr(admin, "email", None) or getattr(admin, "user_id", None) or "admin"
    update: dict = {"$set": set_fields}
    if unset_fields:
        update["$unset"] = unset_fields
    await db.partners.update_one({"id": partner_id}, update)
    return {"ok": True, "partner_id": partner_id, "updated": list(set_fields.keys()), "cleared": list(unset_fields.keys())}


# ═══════════════════════════════════════════════════════════════════════════
#  CONSEGNE MANCATE — pagato ma non consegnato
# ═══════════════════════════════════════════════════════════════════════════
# Il sistema persisteva gia' ogni indizio di fallimento, ma nessuna schermata
# li leggeva: finalizzazione_partnership.<effetto>="failed", bozza_errore,
# ciak_client_access_recovery, ciak_orphan_purchases. Un cliente poteva pagare
# 2.790 EUR e restare senza account, senza che nessuno se ne accorgesse.

class RetryFinalizzazioneRequest(BaseModel):
    email: str


class RetryStartDeliveryRequest(BaseModel):
    recovery_id: str


@router.get("/consegne-mancate")
async def consegne_mancate(
    _admin=Depends(require_ciak_admin),
    max_items: int = Query(200, ge=1, le=1000),
):
    """Elenco unico di cio' che e' stato pagato e non consegnato."""
    from services.ciak_delivery_gaps import build_gap_report

    if db is None:
        raise HTTPException(503, "Database non configurato")

    proposte = await db.proposte.find(
        {"pagamento_completato": True}, {"_id": 0}
    ).sort("pagamento_completato_at", -1).to_list(max_items)

    # L'analisi e' "in ritardo" rispetto al pagamento: la data d'acquisto sta
    # sulla diagnostic session, non sul documento dell'analisi.
    analisi: list[tuple] = []
    async for doc in db.ciak_analisi.find(
        {"bozza_inviata_at": {"$in": [None, ""]}}, {"_id": 0}
    ).limit(max_items):
        session = await db.diagnostic_sessions.find_one(
            {"session_token": doc.get("session_token")},
            {"_id": 0, "events": 1, "created_at": 1},
        ) or {}
        purchased_at = session.get("created_at")
        for event in session.get("events") or []:
            if event.get("event") == "stripe_payment_completed":
                purchased_at = event.get("timestamp") or purchased_at
        if purchased_at:
            analisi.append((doc, purchased_at))

    access_recovery = await db.ciak_client_access_recovery.find(
        {"status": "pending"}, {"_id": 0}
    ).sort("created_at", -1).to_list(max_items)

    orphan_purchases = await db.ciak_orphan_purchases.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(max_items)

    return build_gap_report(
        proposte=proposte,
        analisi=analisi,
        access_recovery=access_recovery,
        orphan_purchases=orphan_purchases,
    )


@router.post("/consegne-mancate/retry-partnership")
async def retry_finalizzazione_partnership(
    body: RetryFinalizzazioneRequest,
    admin=Depends(require_ciak_admin),
):
    """Rilancia la finalizzazione Partnership per un cliente gia' pagante.

    Identificato per email, non per token: il token della proposta e' una
    credenziale (apre la pagina pubblica di firma e pagamento) e non deve
    passare da liste o form amministrativi.

    Idempotente per costruzione: finalize_partnership_payment riprende solo gli
    effetti non ancora riusciti, grazie al claim atomico per effetto.
    """
    from routers.proposta import finalize_partnership_payment

    if db is None:
        raise HTTPException(503, "Database non configurato")

    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(422, "Email mancante")

    proposta = await db.proposte.find_one(
        {"prospect_email": email, "pagamento_completato": True}, {"_id": 0}
    )
    if not proposta:
        raise HTTPException(404, "Nessuna proposta pagata per questa email")
    if (proposta.get("finalizzazione_partnership") or {}).get("complete") is True:
        return {"success": True, "already_complete": True, "email": email}

    actor = {
        "type": "admin_retry",
        "id": getattr(admin, "user_id", None),
        "email": getattr(admin, "email", None),
    }
    result = await finalize_partnership_payment(
        proposta,
        method=proposta.get("pagamento_metodo") or "stripe",
        reference=proposta.get("pagamento_riferimento") or "admin-retry",
        actor=actor,
    )
    logger.info("[CIAK_ADMIN] Retry finalizzazione Partnership per %s da %s", email, actor.get("email"))
    return {**result, "email": email}


@router.post("/consegne-mancate/retry-start")
async def retry_consegna_start(
    body: RetryStartDeliveryRequest,
    admin=Depends(require_ciak_admin),
):
    """Rigenera un link monouso e ritenta l'email per uno Start gia' pagato."""
    from services.ciak_start_delivery import deliver_start_access

    if db is None:
        raise HTTPException(503, "Database non configurato")
    recovery = await db.ciak_client_access_recovery.find_one(
        {"id": body.recovery_id, "tier": "start", "status": "pending"}, {"_id": 0}
    )
    if not recovery:
        raise HTTPException(404, "Recovery Start non trovata o gia' risolta")
    client = await db.ciak_clients.find_one({"id": recovery.get("client_id")}, {"_id": 0})
    if not client:
        raise HTTPException(409, "Cliente Start non trovato: verificare il pagamento")

    sent = await deliver_start_access(
        db,
        client_id=client["id"],
        email=client.get("email") or recovery.get("email") or "",
        name=client.get("name"),
        paid_at=client.get("start_purchased_at") or recovery.get("created_at") or datetime.now(timezone.utc).isoformat(),
        checkout_session_id=recovery.get("checkout_session_id") or f"admin-retry:{body.recovery_id}",
    )
    if not sent:
        raise HTTPException(502, "Email Start non consegnata: recovery ancora aperta")
    await db.ciak_client_access_recovery.update_one(
        {"id": body.recovery_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": getattr(admin, "email", None) or "admin",
        }},
    )
    return {"success": True, "recovery_id": body.recovery_id}
