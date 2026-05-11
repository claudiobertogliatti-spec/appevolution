"""
Ciak — Router diagnostic.

Endpoint pubblici per il flow utente Ciak (8 domande → scoring → Matteo → report).

Endpoint:
  POST   /api/diagnostic/start          → crea lead + sessione, ritorna session_token
  POST   /api/diagnostic/answer         → salva risposta a singola domanda
  POST   /api/diagnostic/complete       → calcola score+override, invoca Matteo
  GET    /api/diagnostic/report/{token} → legge report, emette report_viewed
  POST   /api/diagnostic/cta-clicked    → tracciamento click CTA 67€

Pattern coerente con repo (vedi routers/clienti.py):
  - db = None globale, inizializzato via set_db() chiamato da server.py
  - Modelli Pydantic inline
  - Async/await su Mongo (motor)

Riferimento:
  - memory/ciak_technical_spec.md (schema, scoring, state machine)
  - memory/matteo_prompt_engine.md (prompt v1.4)
  - memory/funnel_67_analisi.md (CTA differenziate per stato)
"""
import logging
import os
from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

import asyncio

from services.ciak_matteo import MatteoServiceError, generate_report
from services.ciak_scoring import calculate_scoring
from services.ciak_state_machine import (
    STATE_CIAK_COMPLETED, STATE_CIAK_STARTED, STATE_CLICKED_67,
    STATE_LEAD_CREATED, STATE_REPORT_GENERATED,
    add_event, has_event, transition_to,
)
from services.ciak_systeme import ciak_emit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/diagnostic", tags=["diagnostic"])

# Iniettato da server.py via set_db()
db = None


def set_db(database) -> None:
    global db
    db = database


# ─── Validation constants ───────────────────────────────────────────

OPEN_TEXT_MIN = 15
Q1_MAX = 500
Q6_MAX = 1000


# ─── Pydantic models inline ─────────────────────────────────────────

class TrackingInfo(BaseModel):
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    device_type: Literal["desktop", "mobile", "tablet", "unknown"] = "unknown"
    browser: Optional[str] = None
    ip_country: Optional[str] = None
    language: Optional[str] = None


class StartRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    tracking: TrackingInfo = Field(default_factory=TrackingInfo)


class StartResponse(BaseModel):
    session_token: str
    lead_id: str


QuestionId = Literal[
    "q1_competenza", "q2_esperienza", "q3_clienti", "q4_idea",
    "q5_target", "q6_problema", "q7_digitale", "q8_obiettivo",
]


class AnswerRequest(BaseModel):
    session_token: str
    question_id: QuestionId
    value: str


class CompleteRequest(BaseModel):
    session_token: str


class CompleteResponse(BaseModel):
    report_url: str
    stato: int
    session_token: str


class ReportResponse(BaseModel):
    report_markdown: str
    stato: int
    cta_variant: Literal["nurturing", "validate", "build", "extended"]


class CtaClickedRequest(BaseModel):
    session_token: str


# ─── Validation helpers ─────────────────────────────────────────────

def _validate_open_text(value: str, max_len: int, field_name: str) -> str:
    cleaned = value.strip()
    if len(cleaned) < OPEN_TEXT_MIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name}: risposta troppo breve (min {OPEN_TEXT_MIN} caratteri)",
        )
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len]
    return cleaned


_CTA_VARIANT_BY_STATE: dict[int, Literal["nurturing", "validate", "build", "extended"]] = {
    1: "nurturing",
    2: "validate",
    3: "build",
    4: "extended",
}


def _build_session_doc(req: StartRequest) -> dict:
    """Costruisce il documento iniziale per la nuova sessione."""
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "lead_id": str(uuid4()),
        "session_token": str(uuid4()),
        "created_at": now_iso,
        "completed_at": None,
        "user_email": req.email,
        "user_name": req.name,
        "responses": {
            "q1_competenza": None,
            "q2_esperienza": None,
            "q3_clienti": None,
            "q4_idea": None,
            "q5_target": None,
            "q6_problema": None,
            "q7_digitale": None,
            "q8_obiettivo": None,
        },
        "scoring": None,
        "report": None,
        "current_state": STATE_LEAD_CREATED,
        "state_history": [
            {"state": STATE_LEAD_CREATED, "timestamp": now_iso},
        ],
        "crm_tags": [],
        "events": [],
        "tracking": req.tracking.model_dump(),
    }


def _build_user_payload_for_matteo(session: dict, scoring: Any) -> dict:
    """Costruisce il payload JSON da passare a Matteo."""
    responses = session["responses"]
    return {
        "competenza": responses["q1_competenza"],
        "esperienza_anni": responses["q2_esperienza"],
        "clienti": responses["q3_clienti"],
        "idea": responses["q4_idea"],
        "target": responses["q5_target"],
        "problema": responses["q6_problema"],
        "digitale": responses["q7_digitale"],
        "obiettivo": responses["q8_obiettivo"],
        "score_numerico": scoring.score_numerico,
        "stato": scoring.stato_finale,
        "override_applicato": scoring.override_applicati,
        "input_language": "italiano",  # detection in W2 se serve
    }


# ═══════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — START
# ═══════════════════════════════════════════════════════════════════

@router.post("/start", response_model=StartResponse)
async def start_diagnostic(payload: StartRequest):
    """
    Crea una nuova diagnostic session.
    Stato finale dopo creazione: ciak_started.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    session = _build_session_doc(payload)

    # Transizione lead_created → ciak_started
    transition_to(session, STATE_CIAK_STARTED)

    await db.diagnostic_sessions.insert_one(session)

    # Fire-and-forget: emit tag Systeme.io (find_or_create contact + tag ciak_started).
    # No await: la response utente non aspetta Systeme. Errori loggati ma non bloccano.
    asyncio.create_task(ciak_emit_event(
        email=payload.email,
        event_name="ciak_started",
        first_name=payload.name,
        metadata={"lead_id": session["lead_id"], "session_token": session["session_token"]},
    ))

    return StartResponse(
        session_token=session["session_token"],
        lead_id=session["lead_id"],
    )


# ═══════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — ANSWER (singola domanda)
# ═══════════════════════════════════════════════════════════════════

@router.post("/answer", status_code=status.HTTP_204_NO_CONTENT)
async def answer_question(payload: AnswerRequest):
    """
    Salva la risposta a una singola domanda.
    Validazione length per Q1 (open text, min 15 / max 500).
    Validazione length per Q6 (open text, min 15 / max 1000).
    Le altre domande sono enum, validati al complete.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    session = await db.diagnostic_sessions.find_one(
        {"session_token": payload.session_token}
    )
    if not session:
        raise HTTPException(404, "session_token non trovato")

    qid = payload.question_id
    if qid == "q1_competenza":
        value = _validate_open_text(payload.value, Q1_MAX, "Competenza")
    elif qid == "q6_problema":
        value = _validate_open_text(payload.value, Q6_MAX, "Problema")
    else:
        # Validation enum implicit in scoring.calculate_scoring at /complete
        value = payload.value.strip()

    await db.diagnostic_sessions.update_one(
        {"session_token": payload.session_token},
        {"$set": {f"responses.{qid}": value}},
    )

    return None


# ═══════════════════════════════════════════════════════════════════
#  ENDPOINT 3 — COMPLETE (scoring + Matteo)
# ═══════════════════════════════════════════════════════════════════

@router.post("/complete", response_model=CompleteResponse)
async def complete_diagnostic(payload: CompleteRequest):
    """
    Sequenza:
      1. Carica sessione + verifica completezza risposte
      2. Calcola scoring (score 0-13 + override)
      3. Transizione a ciak_completed
      4. Invoca Matteo (può fallire → 503 con sessione salvata)
      5. Aggiunge tag segment + digital_level + obiettivo
      6. Transizione a report_generated
      7. Persist + ritorna URL del report
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    session = await db.diagnostic_sessions.find_one(
        {"session_token": payload.session_token}
    )
    if not session:
        raise HTTPException(404, "session_token non trovato")

    responses = session.get("responses", {})

    required = [
        "q1_competenza", "q2_esperienza", "q3_clienti", "q4_idea",
        "q5_target", "q6_problema", "q7_digitale", "q8_obiettivo",
    ]
    missing = [f for f in required if not responses.get(f)]
    if missing:
        raise HTTPException(400, f"Risposte mancanti: {', '.join(missing)}")

    if len(responses["q1_competenza"]) < OPEN_TEXT_MIN:
        raise HTTPException(400, "q1_competenza troppo breve")
    if len(responses["q6_problema"]) < OPEN_TEXT_MIN:
        raise HTTPException(400, "q6_problema troppo breve")

    # 1. Scoring + override
    try:
        scoring = calculate_scoring(
            q2=responses["q2_esperienza"],
            q3=responses["q3_clienti"],
            q4=responses["q4_idea"],
            q5=responses["q5_target"],
            q7=responses["q7_digitale"],
            q8=responses["q8_obiettivo"],
        )
    except ValueError as e:
        raise HTTPException(400, f"Risposta non valida: {e}")

    # 2. Transizione ciak_completed + tag stato_X
    transition_to(
        session,
        STATE_CIAK_COMPLETED,
        extra_tags=[f"stato_{scoring.stato_finale}"],
    )
    session["scoring"] = scoring.to_dict()
    session["completed_at"] = datetime.now(timezone.utc).isoformat()

    # Persist parziale: anche se Matteo fallisce, ho stato/scoring salvati
    await db.diagnostic_sessions.replace_one(
        {"session_token": payload.session_token},
        session,
    )

    # 3. Invoca Matteo
    user_payload = _build_user_payload_for_matteo(session, scoring)
    try:
        report = generate_report(
            user_payload=user_payload,
            user_name=session.get("user_name"),
        )
    except MatteoServiceError as e:
        logger.exception("[CIAK] Matteo failed for token=%s", payload.session_token)
        raise HTTPException(503, f"Matteo service unavailable: {e}")

    # 4. Tag aggiuntivi da Matteo
    matteo_tags = [
        report["tags"]["tag_segment"],
        report["tags"]["tag_digital_level"],
        report["tags"]["tag_obiettivo"],
    ]
    transition_to(session, STATE_REPORT_GENERATED, extra_tags=matteo_tags)
    session["report"] = report

    # 5. Persist finale
    await db.diagnostic_sessions.replace_one(
        {"session_token": payload.session_token},
        session,
    )

    # Fire-and-forget Systeme.io tag emission per ciak_completed.
    # Emette: ciak_completed + stato_<n> + segment_<x> + digital_level_<x> + obiettivo_<x>.
    # Triggera automaticamente l'email automation configurata su Systeme per quei tag.
    user_email = session.get("user_email")
    if user_email:
        asyncio.create_task(ciak_emit_event(
            email=user_email,
            event_name="ciak_completed",
            extra_tags=[
                f"stato_{scoring.stato_finale}",
                report["tags"]["tag_segment"],
                report["tags"]["tag_digital_level"],
                report["tags"]["tag_obiettivo"],
            ],
            first_name=session.get("user_name"),
            metadata={
                "score_numerico": scoring.score_numerico,
                "stato_finale": scoring.stato_finale,
                "session_token": payload.session_token,
            },
        ))

    frontend_base = os.environ.get("FRONTEND_URL_PROD", "https://ciak.io")
    return CompleteResponse(
        report_url=f"{frontend_base}/report/{payload.session_token}",
        stato=scoring.stato_finale,
        session_token=payload.session_token,
    )


# ═══════════════════════════════════════════════════════════════════
#  ENDPOINT 4 — REPORT (lettura + emit report_viewed)
# ═══════════════════════════════════════════════════════════════════

@router.get("/report/{session_token}", response_model=ReportResponse)
async def get_report(session_token: str):
    """
    Recupera il report per visualizzazione frontend.
    Emette report_viewed (idempotente: solo prima vista).
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    session = await db.diagnostic_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(404, "session_token non trovato")

    report = session.get("report")
    if not report:
        raise HTTPException(409, "Report non ancora generato")

    if not has_event(session, "report_viewed"):
        add_event(session, "report_viewed")
        await db.diagnostic_sessions.update_one(
            {"session_token": session_token},
            {"$set": {"events": session["events"]}},
        )

    stato = session["scoring"]["stato_finale"]
    return ReportResponse(
        report_markdown=report["report_markdown"],
        stato=stato,
        cta_variant=_CTA_VARIANT_BY_STATE[stato],
    )


# ═══════════════════════════════════════════════════════════════════
#  ENDPOINT 5 — CTA CLICKED
# ═══════════════════════════════════════════════════════════════════

@router.post("/cta-clicked", status_code=status.HTTP_204_NO_CONTENT)
async def cta_clicked(payload: CtaClickedRequest):
    """
    Traccia il click su CTA 67€ dal report.
    Transizione: → clicked_67 + tag ciak_clicked_67.
    """
    if db is None:
        raise HTTPException(503, "Database non configurato")

    session = await db.diagnostic_sessions.find_one(
        {"session_token": payload.session_token}
    )
    if not session:
        raise HTTPException(404, "session_token non trovato")

    transition_to(session, STATE_CLICKED_67)

    await db.diagnostic_sessions.replace_one(
        {"session_token": payload.session_token},
        session,
    )

    # Fire-and-forget Systeme.io tag emission per ciak_clicked_67.
    # Segnala alta intent di acquisto: utile per retargeting + email "non ha completato l'acquisto".
    user_email = session.get("user_email")
    if user_email:
        asyncio.create_task(ciak_emit_event(
            email=user_email,
            event_name="ciak_clicked_67",
            first_name=session.get("user_name"),
            metadata={"session_token": payload.session_token},
        ))

    return None
