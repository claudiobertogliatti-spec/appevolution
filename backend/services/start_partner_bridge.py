"""Ponte di identita' fra il cliente Ciak Start e i motori partner esistenti.

Il problema che risolve: i deliverable dei primi due step di Ciak Start esistono
gia' e servono i partner — brand kit (`03-brand-kit`) e posizionamento
(`04-posizionamento`). Girano su `partner_journey_steps` e chiedono un record
`partners`. Un cliente Start ne era sprovvisto, quindi il suo percorso restava
sette etichette in sola lettura.

Non si costruisce un secondo mondo: si da' al cliente un'identita' che i motori
accettano gia', con `partners.tier = "start"` come unico asse di accesso.

Invarianti:
  - `partners.id == ciak_clients.id`: l'URL `/api/partner/.../{partner_id}` che
    il cliente chiama e' il suo stesso id, quello che sta nel `sub` del JWT
    emesso dal magic link;
  - `users.partner_id` punta allo stesso id, cosi' quando il cliente sale a
    Partnership e passa a un login con password la guardia partner lo risolve
    sullo stesso soggetto;
  - nessuna password viene scritta. In `users` esistono DUE campi hash
    (`hashed_password`, `password_hash`) e il login prende il primo valorizzato
    (`auth.py:211`): scriverne uno solo lascia l'utente fuori senza errori.
    Il cliente Start entra con magic link, quindi non ne serve nessuno;
  - `users.role` resta `cliente`. Il ruolo `partner` aprirebbe TUTTE le guardie
    dell'area partner a un cliente da 499 EUR.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from models.start_journey import (
    START_JOURNEY_STEPS_DEFINITION,
    TIER_START,
    normalize_tier,
    tier_rank,
)
from services.ciak_client_accounts import has_start_entitlement
from services.journey_seed import seed_partner_journey

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _nicchia_from_diagnostic(db, client: dict[str, Any], email: str) -> str:
    """Stessa mappatura del pre-fill del posizionamento
    (`posizionamento_approval._compute_prefill_from_ciak`): la competenza
    dichiarata nel Blueprint e' la nicchia di partenza. Se non c'e', si lascia
    vuoto — meglio un campo da compilare che una nicchia inventata.
    """
    session = None
    token = client.get("session_token") or client.get("diagnostic_session_token")
    if token:
        session = await db.diagnostic_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session and email:
        session = await db.diagnostic_sessions.find_one({"email": email}, {"_id": 0})
    if not session:
        return ""
    raw = session.get("competenza_raw") or (session.get("answers") or {}).get("competenza") or ""
    return str(raw).strip()


async def _link_user(db, client_id: str, email: str, name: str) -> None:
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user and client_id:
        user = await db.users.find_one({"id": client_id}, {"_id": 0})

    if user:
        if user.get("partner_id") != client_id:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"partner_id": client_id, "ciak_client_id": client_id}},
            )
        return

    # Nessun record `users`: lo si crea con lo STESSO id del cliente, cosi'
    # `users.id == ciak_clients.id == partners.id` come da modello ad area unica.
    await db.users.insert_one({
        "id": client_id,
        "evolution_id": "EVO-" + uuid.uuid4().hex[:8].upper(),
        "email": email,
        "name": name,
        "role": "cliente",
        "is_active": True,
        "created_at": _now_iso(),
        "created_from": "ciak_start_bridge",
        "ciak_client_id": client_id,
        "partner_id": client_id,
        # Espliciti a None: l'accesso e' il magic link, non una password.
        "hashed_password": None,
        "password_hash": None,
        "must_change_password": False,
    })


async def ensure_start_partner_bridge(db, client: dict[str, Any]) -> dict[str, Any]:
    """Rende il cliente Ciak Start un soggetto che i motori partner accettano.

    Idempotente: si puo' richiamare a ogni webhook o retry admin.
    Solleva `ValueError` se il cliente non ha davvero un entitlement Start.
    """
    client_id = str(client.get("id") or "").strip()
    email = str(client.get("email") or "").strip().lower()
    if not client_id:
        raise ValueError("cliente senza id: impossibile costruire il ponte Start")
    if not email:
        raise ValueError("cliente senza email: impossibile costruire il ponte Start")
    if not has_start_entitlement(client):
        raise ValueError(
            f"cliente {client_id} senza entitlement Ciak Start: nessun record partners creato"
        )

    name = str(client.get("name") or "").strip() or email
    existing = await db.partners.find_one({"id": client_id}, {"_id": 0}) or {}

    # Non si declassa mai chi e' gia' salito: un retry di un webhook vecchio
    # chiuderebbe fuori un partner che ha pagato la Partnership.
    tier = existing.get("tier")
    if tier_rank(tier) > tier_rank(TIER_START) and existing:
        effective_tier = normalize_tier(tier)
    else:
        effective_tier = TIER_START

    updates: dict[str, Any] = {
        "id": client_id,
        "name": name,
        "email": email,
        "tier": effective_tier,
        "active": True,
        "ciak_client_id": client_id,
        "updated_at": _now_iso(),
    }
    if not existing.get("nicchia"):
        nicchia = await _nicchia_from_diagnostic(db, client, email)
        if nicchia:
            updates["nicchia"] = nicchia
    if not existing:
        updates["created_at"] = _now_iso()
        updates["created_from"] = "ciak_start_bridge"

    await db.partners.update_one({"id": client_id}, {"$set": updates}, upsert=True)
    await _link_user(db, client_id, email, name)

    # Seed idempotente della journey del livello effettivo. Il primo step del
    # livello parte aperto; nulla di gia' scritto viene toccato.
    first_step_number = START_JOURNEY_STEPS_DEFINITION[0]["step_number"]
    try:
        await seed_partner_journey(
            db,
            client_id,
            start_step_number=first_step_number if effective_tier == TIER_START else 1,
            tier=effective_tier,
        )
    except Exception as exc:  # pragma: no cover - il ponte non deve mai bloccare l'accesso
        logger.exception(
            "[CIAK-START] seed journey fallito per %s: %s", client_id, exc
        )

    partner = await db.partners.find_one({"id": client_id}, {"_id": 0})
    logger.info(
        "[CIAK-START] ponte identita' pronto per %s (tier=%s)", client_id, effective_tier
    )
    return partner or dict(updates)
