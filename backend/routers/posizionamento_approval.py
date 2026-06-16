"""Ponte Posizionamento → I Miei File + coda approvazione admin.

Endpoint partner:
  POST /api/partner/posizionamento/finalize
  GET  /api/partner/posizionamento/document/{partner_id}

Endpoint admin (registrati separatamente — IN ARRIVO Bundle 3):
  GET  /api/admin/approvazioni/queue
  POST /api/admin/approvazioni/{file_id}/approve
  POST /api/admin/approvazioni/{file_id}/reject

Vedi spec: docs/superpowers/specs/2026-05-30-ponte-posizionamento-approvazione-design.md
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from services.posizionamento_pdf_renderer import genera_posizionamento_pdf
from services.posizionamento_statement import (
    build_brand_positioning_statement,
    genera_documento_definitivo,
)
from services.posizionamento_storage import upload_posizionamento_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner/posizionamento", tags=["partner-posizionamento"])
admin_router = APIRouter(prefix="/api/admin/approvazioni", tags=["admin-approvazioni"])

mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "evolution_pro")
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

STEP_ID = "04-posizionamento"

# Le 15 chiavi del wizard Posizionamento con min_char di validazione.
# Le ultime 3 (sezione "Contro chi giochi") alimentano il Brand Positioning
# Statement con il metodo De Veglia.
# Vedi spec docs/superpowers/specs/2026-05-30-wizard-posizionamento-12-domande-design.md
POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR = {
    "nicchia": 30,
    "momento_di_vita": 25,
    "livello_consapevolezza": 25,
    "promessa": 40,
    "trasformazione_90gg": 50,
    "prezzo_e_formato": 30,
    "metodo_nome": 5,
    "metodo_step": 80,
    "prova_sociale_concreta": 50,
    "origin_story": 80,
    "contrarian_view": 50,
    "differenza_riconoscibile": 40,
    "paure_avatar": 40,
    "desideri_avatar": 40,
    "costo_del_no": 40,
    "concorrenti_principali": 30,
    "mercato_affollato": 40,
    "obiezione_principale": 50,
    "limite_onesto": 40,
    "spazio_specialista": 40,
}


async def _complete_journey_step(partner_id: str, step_id: str, data: dict) -> None:
    """Chiama internamente la stessa logica di complete_operativo_step:
    mark step done, notifica admin requires_approval, advance prossimo.
    Import lazy per evitare hard-coupling fra router al load time
    (e per facilitare patching nei test futuri)."""
    from routers.partner_journey import (
        complete_operativo_step as _impl,
        _OperativoCompleteBody,
    )
    await _impl(partner_id, step_id, _OperativoCompleteBody(data=data))


class FinalizeBody(BaseModel):
    partner_id: str


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _filename_for(partner_id: str) -> str:
    ts = _now_utc().strftime("%Y%m%d-%H%M%S")
    safe_pid = re.sub(r"[^A-Za-z0-9_-]", "_", partner_id)[:64]
    return f"posizionamento-{safe_pid}-{ts}.pdf"


async def _get_partner_or_404(partner_id: str) -> dict:
    p = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Partner non trovato")
    return p


async def _get_step_or_400(partner_id: str) -> dict:
    s = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": STEP_ID}, {"_id": 0}
    )
    if not s:
        raise HTTPException(400, f"Step {STEP_ID} non trovato per {partner_id}")
    return s


async def _current_file(partner_id: str) -> Optional[dict]:
    """File 'corrente' (non-superseded) della categoria posizionamento, più recente."""
    return await db.files.find_one(
        {"partner_id": partner_id, "category": "posizionamento", "superseded": {"$ne": True}},
        {"_id": 0},
        sort=[("uploaded_at", -1)],
    )


async def _compute_prefill_from_ciak(partner_id: str) -> dict:
    """Calcola pre-fill da diagnostic_sessions (Ciak gate) per Step04.

    Mappa Q1 Ciak (competenza_raw) → 'nicchia'
    Mappa Q6 Ciak (problema_raw) → 'promessa' (con frase fatta)
    Solo testi liberi — gli enum di Q4/Q5 producono UX awkward.
    Se partner senza email o senza diagnostic_session → ritorna {}.
    """
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "email": 1})
    if not partner or not partner.get("email"):
        return {}
    session = await db.diagnostic_sessions.find_one(
        {"email": partner["email"]},
        {"_id": 0, "answers": 1, "competenza_raw": 1, "problema_raw": 1},
        sort=[("created_at", -1)],
    )
    if not session:
        return {}
    competenza = (session.get("competenza_raw") or
                  (session.get("answers") or {}).get("competenza", "")).strip()
    problema = (session.get("problema_raw") or
                (session.get("answers") or {}).get("problema", "")).strip()
    out = {}
    if competenza:
        out["nicchia"] = competenza
    if problema:
        out["promessa"] = f"Aiuto le persone a risolvere questo problema: {problema}."
    return out


@router.post("/finalize")
async def finalize_posizionamento(body: FinalizeBody) -> dict:
    partner = await _get_partner_or_404(body.partner_id)
    step = await _get_step_or_400(body.partner_id)

    answers = (step.get("data") or {}).get("answers") or {}
    missing = [
        k for k, min_chars in POSIZIONAMENTO_REQUIRED_KEYS_MIN_CHAR.items()
        if len((answers.get(k) or "").strip()) < min_chars
    ]
    if missing:
        raise HTTPException(
            400,
            f"Risposte mancanti o troppo brevi: {', '.join(missing)}",
        )

    # Idempotenza
    existing = await _current_file(body.partner_id)
    if existing:
        if existing.get("status") == "under_review":
            return {
                "file_id": existing["file_id"],
                "internal_url": existing.get("internal_url", ""),
                "status": "under_review",
                "approval_status": "pending_review",
            }
        if existing.get("status") == "approved":
            raise HTTPException(
                409,
                "Documento già approvato; per modificarlo chiedi al team di riaprire lo step",
            )
        # status rejected → procedi, vecchio file viene marcato superseded sotto

    # Sintesi Brand Positioning Statement (De Veglia) — best-effort, non blocca:
    # build_* ricade da solo sul fallback deterministico e non solleva mai.
    statement = await build_brand_positioning_statement(answers)

    # Revisione di Valentina: documento strategico definitivo (avatar, consapevolezza,
    # 3 obiezioni) dalle risposte grezze. Best-effort: fallback deterministico interno.
    revisione = await genera_documento_definitivo(answers, partner.get("name", "Partner"))

    # Render PDF (se fallisce, NO side effects)
    try:
        pdf_bytes = await genera_posizionamento_pdf(answers, partner.get("name", "Partner"), statement, revisione)
    except Exception as e:
        logger.exception(f"[POSIZIONAMENTO] PDF render failed for {body.partner_id}: {e}")
        try:
            await db.alerts.insert_one({
                "id": uuid.uuid4().hex,
                "agent": "STEFANIA",
                "type": "BLOCCO",
                "msg": f"Render PDF posizionamento fallito per {partner.get('name', body.partner_id)}",
                "partner": partner.get("name", body.partner_id),
                "partner_id": body.partner_id,
                "resolved": False,
                "created_at": _now_utc().isoformat(),
            })
        except Exception:
            pass
        raise HTTPException(500, "Errore tecnico durante la generazione del documento. Riprova tra qualche minuto.")

    filename = _filename_for(body.partner_id)
    upload = await upload_posizionamento_pdf(pdf_bytes, body.partner_id, filename)

    # Marca vecchi rejected come superseded
    await db.files.update_many(
        {"partner_id": body.partner_id, "category": "posizionamento",
         "status": "rejected", "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    # Insert nuovo file record
    file_id = uuid.uuid4().hex
    now = _now_utc()
    file_doc = {
        "file_id": file_id,
        "partner_id": body.partner_id,
        "category": "posizionamento",
        "file_type": "document",
        "original_name": f"Documento di Posizionamento - {partner.get('name', 'Partner')}.pdf",
        "stored_name": filename,
        "internal_url": upload["url"],
        "public_id": upload["public_id"],
        "status": "under_review",
        "step_ref": STEP_ID,
        "rejection_note": None,
        "approved_by": None,
        "approved_at": None,
        "rejected_at": None,
        "superseded": False,
        "uploaded_at": now.isoformat(),
        "size": len(pdf_bytes),
        "size_readable": f"{len(pdf_bytes) // 1024} KB",
    }
    await db.files.insert_one(file_doc)

    # Aggiorna journey step con approval_status PRIMA del complete,
    # così l'alert generato dal complete trova già il file_id collegato
    await db.partner_journey_steps.update_one(
        {"partner_id": body.partner_id, "step_id": STEP_ID},
        {"$set": {
            "approval_status": "pending_review",
            "approval_file_id": file_id,
            "approval_note": None,
            "approval_resolved_at": None,
            "updated_at": now,
        }},
    )

    # Riusa logica esistente: mark done + notifica admin requires_approval=true + advance
    try:
        await _complete_journey_step(body.partner_id, STEP_ID, {"answers": answers})
    except Exception as e:
        logger.exception(f"[POSIZIONAMENTO] complete_operativo_step failed: {e}")
        # Non blocchiamo: file creato, admin lo vedrà comunque nella coda

    # Arricchisci l'alert appena creato col file_id (per deep-link Apri PDF dalla coda).
    # Cerca il più recente non ancora arricchito; protegge contro vecchi alert pending
    # rimasti non resolved da run precedenti.
    latest_alert = await db.alerts.find_one(
        {"partner_id": body.partner_id, "kind": "partner_activity",
         "requires_approval": True, "resolved": False, "file_id": {"$exists": False}},
        {"_id": 0, "id": 1},
        sort=[("created_at", -1)],
    )
    if latest_alert:
        await db.alerts.update_one(
            {"id": latest_alert["id"]},
            {"$set": {"file_id": file_id}},
        )

    return {
        "file_id": file_id,
        "internal_url": file_doc["internal_url"],
        "status": "under_review",
        "approval_status": "pending_review",
    }


@router.get("/document/{partner_id}")
async def get_document_metadata(partner_id: str) -> Optional[dict]:
    f = await _current_file(partner_id)
    if not f:
        return None
    return {
        "file_id": f["file_id"],
        "internal_url": f.get("internal_url", ""),
        "status": f.get("status"),
        "rejection_note": f.get("rejection_note"),
        "uploaded_at": f.get("uploaded_at"),
    }


@router.get("/prefill/{partner_id}")
async def get_prefill(partner_id: str) -> dict:
    """Ritorna pre-fill suggerito per Step04 dalle risposte Ciak gate.

    Il frontend chiama questo SOLO se step.data.answers è vuoto.
    Ritorna {nicchia?, promessa?} — solo i campi con dati Ciak disponibili.
    """
    return await _compute_prefill_from_ciak(partner_id)


# ─── ADMIN: queue + approve + reject ────────────────────────────────────────────

CATEGORY_LABELS = {
    "posizionamento": "Documento di Posizionamento",
    "brand-kit": "Brand Kit",
}

STEP_LABELS = {
    "04-posizionamento": "Posizionamento",
    "03-brand-kit": "Brand Kit",
}


class RejectBody(BaseModel):
    note: str = Field(..., min_length=10, max_length=2000)


def _age_human(iso_ts: str) -> str:
    try:
        when = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
        delta = _now_utc() - when
        secs = int(delta.total_seconds())
        if secs < 3600:
            return f"{max(1, secs // 60)} min fa"
        if secs < 86400:
            return f"{secs // 3600} h fa"
        return f"{secs // 86400} g fa"
    except Exception:
        return "—"


def _admin_email(headers) -> str:
    # Pattern degli altri endpoint admin di questo repo: header X-Admin-Email con
    # fallback. Sostituire con dipendenza auth quando il middleware admin sarà disponibile.
    return headers.get("X-Admin-Email", "admin@evolution-pro")


@admin_router.get("/queue")
async def queue_pending(category: str = "all") -> dict:
    q: dict = {"status": "under_review", "superseded": {"$ne": True}}
    if category != "all":
        q["category"] = category

    cursor = db.files.find(q, {"_id": 0}).sort("uploaded_at", 1)
    files = await cursor.to_list(200)

    items = []
    for f in files:
        partner = await db.partners.find_one(
            {"id": f["partner_id"]}, {"_id": 0, "name": 1, "email": 1}
        ) or {}
        items.append({
            "file_id": f["file_id"],
            "partner_id": f["partner_id"],
            "partner_name": partner.get("name", "—"),
            "partner_email": partner.get("email", ""),
            "category": f.get("category"),
            "category_label": CATEGORY_LABELS.get(f.get("category", ""), f.get("category", "")),
            "step_ref": f.get("step_ref"),
            "step_label": STEP_LABELS.get(f.get("step_ref", ""), f.get("step_ref", "")),
            "internal_url": f.get("internal_url", ""),
            "uploaded_at": f.get("uploaded_at"),
            "age_human": _age_human(f.get("uploaded_at", "")),
        })

    return {"total": len(items), "items": items}


@admin_router.post("/{file_id}/approve")
async def admin_approve(file_id: str, request: Request) -> dict:
    admin = _admin_email(request.headers)
    now = _now_utc()

    res = await db.files.update_one(
        {"file_id": file_id, "status": "under_review"},
        {"$set": {
            "status": "approved",
            "approved_by": admin,
            "approved_at": now.isoformat(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(409, "Già processato")

    f = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not f:
        raise HTTPException(404, "File non trovato")

    await db.partner_journey_steps.update_one(
        {"partner_id": f["partner_id"], "step_id": f["step_ref"]},
        {"$set": {
            "approval_status": "approved",
            "approval_resolved_at": now,
            "updated_at": now,
        }},
    )

    await db.alerts.update_many(
        {"file_id": file_id, "resolved": False},
        {"$set": {"resolved": True, "resolved_at": now.isoformat()}},
    )

    return {"success": True, "status": "approved"}


@admin_router.post("/{file_id}/reject")
async def admin_reject(file_id: str, body: RejectBody, request: Request) -> dict:
    admin = _admin_email(request.headers)
    now = _now_utc()
    note = body.note.strip()

    res = await db.files.update_one(
        {"file_id": file_id, "status": "under_review"},
        {"$set": {
            "status": "rejected",
            "rejection_note": note,
            "rejected_at": now.isoformat(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(409, "Già processato")

    f = await db.files.find_one({"file_id": file_id}, {"_id": 0})
    if not f:
        raise HTTPException(404, "File non trovato")

    # Riapri lo step
    await db.partner_journey_steps.update_one(
        {"partner_id": f["partner_id"], "step_id": f["step_ref"]},
        {"$set": {
            "status": "in_progress",
            "completed_at": None,
            "approval_status": "rejected",
            "approval_note": note,
            "approval_resolved_at": now,
            "updated_at": now,
        }},
    )

    # Risolvi alert collegati
    await db.alerts.update_many(
        {"file_id": file_id, "resolved": False},
        {"$set": {"resolved": True, "resolved_at": now.isoformat()}},
    )

    # Posta messaggio bot nella chat agente del partner (riusa la collezione
    # stefania_conversations — single source of truth per le chat agente,
    # vedi routers/stefania_chat.py:325-346).
    # Labels parametrizzate per categoria (admin queue è category-agnostic).
    category_label = CATEGORY_LABELS.get(f.get("category", ""), "documento")
    step_label = STEP_LABELS.get(f.get("step_ref", ""), "step")
    chat_msg = (
        f"Il team ha lasciato delle note sul tuo {category_label}.\n\n"
        f"{note}\n\n"
        f"Quando vuoi, torna allo step {step_label}, aggiornalo e re-invialo. "
        "Resto qui se hai dubbi."
    )
    now_iso = now.isoformat()
    partner = await db.partners.find_one(
        {"id": f["partner_id"]}, {"_id": 0, "name": 1, "telegram_chat_id": 1}
    ) or {}
    try:
        await db.stefania_conversations.update_one(
            {"partner_id": str(f["partner_id"])},
            {
                "$set": {
                    "partner_id": str(f["partner_id"]),
                    "partner_name": partner.get("name", "Partner"),
                    "updated_at": now_iso,
                },
                "$push": {
                    "messages": {
                        "role": "assistant",
                        "content": chat_msg,
                        "ts": now_iso,
                        "kind": "rejection_note",
                        "agent": "VALENTINA",
                    }
                },
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"[POSIZIONAMENTO] Failed to post chat note: {e}")

    # Telegram al partner se ha chat_id (best-effort)
    # Carica i campi mancanti se non già presenti dal lookup precedente
    if "telegram_chat_id" not in partner:
        tg_lookup = await db.partners.find_one(
            {"id": f["partner_id"]}, {"_id": 0, "telegram_chat_id": 1, "name": 1}
        ) or {}
        partner = {**partner, **tg_lookup}
    tg_id = partner.get("telegram_chat_id")
    if tg_id:
        try:
            import httpx
            tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
            if tg_token:
                async with httpx.AsyncClient(timeout=5) as http:
                    await http.post(
                        f"https://api.telegram.org/bot{tg_token}/sendMessage",
                        json={
                            "chat_id": tg_id,
                            "text": (
                                f"📋 Il team ha lasciato note sul tuo {step_label}. "
                                "Apri Ciak per leggerle nella chat di Valentina."
                            ),
                        },
                    )
        except Exception as e:
            logger.warning(f"[POSIZIONAMENTO] Telegram partner notify failed: {e}")

    return {"success": True, "status": "rejected"}
