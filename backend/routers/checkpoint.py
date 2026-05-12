"""
Ciak — Checkpoint Strategico router.

Endpoint per ricevere i risultati del Checkpoint Strategico (5 domande a fine
masterclass). Funzioni:

  1. Audit log su MongoDB (`ciak_checkpoint_events`) — score + answers + stato
  2. Emissione tag Systeme.io `ciak_checkpoint_stato_<n>` (fire-and-forget)
  3. (Opzionale) link con eventuale `diagnostic_sessions` esistente via email,
     così Antonella può confrontare delta Stato Checkpoint vs Stato 8 Domande.

Riferimento: memory/ciak_brand_copy_framework.md (Checkpoint Strategico spec
+ delta Stati come intelligence commerciale).

Spec scoring (vedi components/CheckpointStrategico.jsx):
  - 5 domande, ognuna con 4 opzioni (score 0-3)
  - Totale 0-15, mapping:
      0-3  → Stato 1 (Definizione)
      4-8  → Stato 2 (Strutturazione)
      9-12 → Stato 3 (Validazione)
      13-15→ Stato 4 (Evoluzione Strategica)
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from services.ciak_systeme import ciak_emit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/checkpoint", tags=["checkpoint"])

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


class CheckpointResultRequest(BaseModel):
    email: Optional[EmailStr] = None
    answers: List[int] = Field(..., min_length=5, max_length=5)
    stato_finale: int = Field(..., ge=1, le=4)
    total_score: int = Field(..., ge=0, le=15)
    source: str = Field(default="masterclass")


class CheckpointResultResponse(BaseModel):
    ok: bool
    stato: int


def _classify_stato(total: int) -> int:
    if total <= 3:
        return 1
    if total <= 8:
        return 2
    if total <= 12:
        return 3
    return 4


@router.post("/result", response_model=CheckpointResultResponse)
async def submit_checkpoint_result(payload: CheckpointResultRequest):
    """
    Riceve il risultato del Checkpoint Strategico dal frontend.

    Idempotenza: il frontend chiama fire-and-forget, quindi accettiamo
    duplicati silenziosamente (multiple submission dello stesso lead non
    sono un errore). Il tag Systeme viene riapplicato (Systeme dedupe lato
    suo per tag già presente sul contatto).

    Validazione: ricalcoliamo lo Stato lato server dal total_score per
    proteggere da tampering frontend (l'utente potrebbe modificare gli
    score via DevTools). Lo stato_finale del payload è informativo,
    il server lo ricalcola.
    """
    # Validazione server-side dello scoring
    expected_total = sum(payload.answers)
    if expected_total != payload.total_score:
        logger.warning(
            "[CHECKPOINT] Score mismatch: payload.total_score=%d but sum(answers)=%d (email=%s)",
            payload.total_score, expected_total, payload.email
        )
    server_stato = _classify_stato(expected_total)

    # Audit log su MongoDB (best-effort, non bloccante)
    if db is not None:
        try:
            await db.ciak_checkpoint_events.insert_one({
                "email": payload.email,
                "answers": payload.answers,
                "total_score": expected_total,
                "stato_client": payload.stato_finale,
                "stato_server": server_stato,
                "source": payload.source,
                "created_at": datetime.now(timezone.utc),
            })
        except Exception as e:
            logger.warning("[CHECKPOINT] Audit log failed: %s", e)

    # Tag Systeme.io (fire-and-forget, non blocca request)
    if payload.email:
        asyncio.create_task(_emit_checkpoint_tag(payload.email, server_stato, expected_total))

    return CheckpointResultResponse(ok=True, stato=server_stato)


async def _emit_checkpoint_tag(email: str, stato: int, score: int) -> None:
    """Emette tag Systeme `ciak_checkpoint_stato_<n>` + tag generico `ciak_checkpoint_done`."""
    try:
        await ciak_emit_event(
            email=email,
            event_name=f"ciak_checkpoint_stato_{stato}",
            extra_tags=["ciak_checkpoint_done"],
            metadata={"score": score, "stato": stato, "source": "checkpoint_strategico"},
        )
    except Exception as e:
        logger.warning("[CHECKPOINT] Systeme tag emission failed (email=%s): %s", email, e)
