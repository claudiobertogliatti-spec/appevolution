"""
Assistente dell'area partner (chat in streaming) + coda delle domande passate al team.

  POST /api/partner-assistente/{partner_id}/chat   partner (o admin in supervisione)

Stesso comportamento dell'assistente di Ciak Start (`routers/ciak_clients.py: start_assistente`):
temi delicati → risposta fissa senza chiamare il modello; se il modello non sa → frase di passaggio;
ogni passaggio al team lascia una riga in `partner_assistente`, letta in admin dalla scheda del
partner. Autenticazione: la stessa degli altri dati del partner (`require_partner_or_admin_for_partner`),
cosi' un partner non puo' scrivere come un altro. Un cliente Start NON entra qui: ha il suo assistente.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/partner-assistente", tags=["partner-assistente"])
security = HTTPBearer(auto_error=False)

db = None


def set_db(database):
    global db
    db = database


class AssistentePartnerRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    history: list = Field(default_factory=list)  # turni {role, content}: li ripulisce clean_history


_limiter = None


def _limiter_get():
    global _limiter
    if _limiter is None:
        from services.proposta_chat import ChatRateLimiter

        _limiter = ChatRateLimiter()
    return _limiter


async def _contesto(partner_id: str) -> tuple[str, str]:
    """(nome di battesimo, scheda dei dati reali). Una fonte che non risponde non diventa un dato."""
    from services.partner_assistente import scheda_partner

    nome = ""
    passi: list[dict] = []
    try:
        partner = await db.partners.find_one({"id": str(partner_id)}, {"_id": 0, "name": 1, "nome": 1})
        nome = (partner or {}).get("name") or (partner or {}).get("nome") or ""
    except Exception:  # noqa: BLE001
        logger.exception("[ASSISTENTE PARTNER] partner non letto")
    try:
        passi = [
            p
            async for p in db.partner_journey_steps.find(
                {"partner_id": str(partner_id)}, {"_id": 0, "step_id": 1, "status": 1, "step_number": 1}
            )
        ]
    except Exception:  # noqa: BLE001
        logger.exception("[ASSISTENTE PARTNER] passi non letti")
    return nome, scheda_partner(nome=nome, passi=passi)


@router.post("/{partner_id}/chat")
async def partner_assistente_chat(
    partner_id: str,
    body: AssistentePartnerRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    from routers.partner_journey import require_partner_or_admin_for_partner
    from services import partner_assistente as pa
    from services import proposta_chat

    if db is None:
        raise HTTPException(503, "Database non configurato")
    token = await require_partner_or_admin_for_partner(partner_id, credentials)
    if getattr(token, "role", None) not in ("partner", "admin", "superadmin"):
        raise HTTPException(403, "Questo assistente è per i partner")
    message = proposta_chat.clean_message(body.message)
    if not message:
        raise HTTPException(422, "Scrivi la tua domanda")
    history = proposta_chat.clean_history(body.history)
    allowed = _limiter_get().allow(f"partner:{partner_id}")
    da = getattr(token, "role", "partner")

    async def salva(risposta: str, passato: bool, motivo: str) -> None:
        try:
            riga = pa.riga_log(
                client_id=str(partner_id), domanda=message, risposta=risposta, passato=passato,
                motivo=motivo, at=datetime.now(timezone.utc).isoformat(),
            )
            riga["partner_id"] = riga.pop("client_id")
            riga["da"] = da  # "partner" oppure l'admin che sta guardando la sua vista
            await db.partner_assistente.insert_one(riga)
        except Exception:  # noqa: BLE001 - il log non deve rompere la risposta
            logger.exception("[ASSISTENTE PARTNER] riga non salvata")

    async def events():
        if not allowed:
            yield proposta_chat.sse({"t": proposta_chat.RATE_LIMIT_REPLY})
            yield proposta_chat.sse({"done": True})
            return
        if pa.argomento_delicato(message):
            yield proposta_chat.sse({"t": pa.RISPOSTA_DELICATA})
            await salva(pa.RISPOSTA_DELICATA, True, "argomento_delicato")
            yield proposta_chat.sse({"done": True, "passato": True})
            return
        pezzi: list[str] = []
        try:
            nome, contesto = await _contesto(partner_id)
            system = pa.build_system_blocks(first_name=(nome or "").split(" ")[0], contesto=contesto)
            async for piece in proposta_chat.stream_reply(system, history, message):
                pezzi.append(piece)
                yield proposta_chat.sse({"t": piece})
        except Exception:  # noqa: BLE001
            logger.exception("[ASSISTENTE PARTNER] errore")
            yield proposta_chat.sse({"error": proposta_chat.UNAVAILABLE_REPLY})
            await salva("", True, "errore_servizio")
            yield proposta_chat.sse({"done": True, "passato": True})
            return
        risposta = "".join(pezzi)
        passato = pa.passa_al_team(risposta)
        await salva(risposta, passato, "non_sa" if passato else "")
        yield proposta_chat.sse({"done": True, "passato": passato})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
