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

Spec scoring (LOCK 13/5/2026 — vedi memory/ciak_brand_copy_framework.md):
  - 5 domande, ognuna con 4 opzioni (S1=0 / S2=1 / S3=2 / S4=3)
  - answers = lista degli SCORE scelti per Q1..Q5 (in ordine fisso, indipendente
    dal de-ordering visuale frontend)
  - Totale 0-15, mapping:
      0-3   → Stato 1 (Definizione)
      4-7   → Stato 2 (Strutturazione)
      8-11  → Stato 3 (Validazione)
      12-15 → Stato 4 (Evoluzione Strategica)
  - Override (più severi delle 8 Domande post-acquisto: il Checkpoint non deve
    sovrastimare). Applicati DOPO lo score:
      Q1=S1 (answers[0]==0) → MAX Stato 2
      Q2=S1 (answers[1]==0) → MAX Stato 2
      Q3=S1 (answers[2]==0) → MAX Stato 2
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field, field_validator

from services.ciak_systeme import ciak_emit_event
from services.ciak_checkpoint_email import send_checkpoint_email_async, register_email_opened

# GIF 1x1 trasparente (43 byte) servita come pixel di tracking apertura email.
# Decodificata in-memory una sola volta a import-time.
import base64 as _b64
_TRANSPARENT_GIF_1X1 = _b64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/checkpoint", tags=["checkpoint"])

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


class CheckpointResultRequest(BaseModel):
    email: Optional[EmailStr] = None
    nome: Optional[str] = Field(None, max_length=120)
    answers: List[int] = Field(..., min_length=5, max_length=5)
    stato_finale: int = Field(..., ge=1, le=4)
    total_score: int = Field(..., ge=0, le=15)
    source: str = Field(default="masterclass")

    @field_validator("answers")
    @classmethod
    def _answers_in_range(cls, v: List[int]) -> List[int]:
        # Ogni risposta è lo score di un'opzione: S1=0 / S2=1 / S3=2 / S4=3.
        if any(s < 0 or s > 3 for s in v):
            raise ValueError("ogni score in answers deve essere tra 0 e 3")
        return v


class CheckpointResultResponse(BaseModel):
    ok: bool
    stato: int


def _classify_stato(total: int) -> int:
    """Stato base dal punteggio 0-15 (soglie lockate 13/5/2026)."""
    if total <= 3:
        return 1
    if total <= 7:
        return 2
    if total <= 11:
        return 3
    return 4


def _apply_overrides(stato_base: int, answers: List[int]) -> tuple[int, List[str]]:
    """
    Override pre-acquisto: Q1/Q2/Q3 = S1 (score 0) → MAX Stato 2.

    answers è la lista degli score scelti per Q1..Q5. answers[i]==0 significa
    che per quella domanda è stata scelta l'opzione S1.

    Restituisce (stato_finale, lista_override_applicati).
    """
    overrides: List[str] = []
    stato = stato_base
    for idx, label in ((0, "Q1=S1"), (1, "Q2=S1"), (2, "Q3=S1")):
        if idx < len(answers) and answers[idx] == 0:
            overrides.append(label)
    if overrides and stato > 2:
        stato = 2
    return stato, overrides


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
    stato_base = _classify_stato(expected_total)
    server_stato, overrides = _apply_overrides(stato_base, payload.answers)

    # Lookup nome: il frontend dovrebbe inviarlo (preso da localStorage
    # ciak_lead_name), ma fallback su ciak_leads se per qualche motivo manca.
    # Questo garantisce che l'email parta personalizzata anche per lead vecchi.
    nome = (payload.nome or "").strip() or None
    if not nome and payload.email and db is not None:
        try:
            lead = await db.ciak_leads.find_one({"email": payload.email.lower()}, {"nome": 1, "_id": 0})
            if lead and lead.get("nome"):
                nome = lead["nome"]
        except Exception as e:
            logger.warning("[CHECKPOINT] lead nome lookup failed: %s", e)

    # Audit log su MongoDB (best-effort, non bloccante)
    if db is not None:
        try:
            await db.ciak_checkpoint_events.insert_one({
                "email": payload.email,
                "nome": nome,
                "answers": payload.answers,
                "total_score": expected_total,
                "stato_client": payload.stato_finale,
                "stato_base": stato_base,
                "stato_server": server_stato,
                "override_applicati": overrides,
                "source": payload.source,
                "created_at": datetime.now(timezone.utc),
            })
        except Exception as e:
            logger.warning("[CHECKPOINT] Audit log failed: %s", e)

    # Tag Systeme.io (fire-and-forget, non blocca request).
    # NB: il tag resta utile per segmentazione/audit/dashboard Systeme, anche
    # se l'email del checkpoint la mandiamo direttamente noi via SMTP.
    if payload.email:
        asyncio.create_task(_emit_checkpoint_tag(payload.email, server_stato, expected_total))
        # Email diretta SMTP (sostituisce workflow Systeme.io): parte subito,
        # NO dipendenza da automation Systeme. Vedi services/ciak_checkpoint_email.py
        asyncio.create_task(send_checkpoint_email_async(
            email=payload.email,
            nome=nome,
            stato=server_stato,
            score=expected_total,
        ))

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


# ─── Pixel di tracking apertura email ─────────────────────────────────

@router.get("/email-opened/{token}.gif")
async def email_opened_pixel(token: str):
    """
    Pixel 1x1 invisibile incluso nell'HTML delle email Checkpoint.
    Quando il client email carica l'immagine, registriamo l'apertura:
      - opened_at su ciak_checkpoint_emails (idempotente)
      - tag Systeme `ciak_checkpoint_email_opened_stato_<n>`

    Ritorna sempre 200 + GIF trasparente (anche se token sconosciuto: evita
    di rompere il rendering email + non rivela validità token a scanner).

    Cache-Control: no-cache per registrare ogni apertura (il client email
    NON deve cachare il pixel, altrimenti aperture successive saltano).
    """
    # Fire-and-forget: register_email_opened è async, ma non vogliamo
    # bloccare la risposta del pixel.
    try:
        await register_email_opened(token)
    except Exception as e:
        logger.warning("[CHECKPOINT-PIXEL] register failed for token=%s: %s", token[:8], e)

    return Response(
        content=_TRANSPARENT_GIF_1X1,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
