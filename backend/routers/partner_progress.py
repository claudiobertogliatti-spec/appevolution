"""
Router per la gestione del progresso dettagliato dei partner.
Micro-step tracking per admin con sincronizzazione automatica della fase.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/admin/partners", tags=["partner-progress"])
db = None

def set_db(database):
    global db
    db = database

# ── Definizione micro-step per ogni macro step ──────────────────────
MICRO_STEPS_CONFIG = {
    "posizionamento": [
        {"id": "questionario", "label": "Questionario compilato"},
        {"id": "revisione_pos", "label": "Revisione posizionamento"},
        {"id": "approvazione_pos", "label": "Approvazione posizionamento"},
    ],
    "masterclass": [
        {"id": "script_scrittura", "label": "Scrittura script"},
        {"id": "script_revisione", "label": "Revisione script"},
        {"id": "registrazione_mc", "label": "Registrazione video"},
        {"id": "upload_mc", "label": "Caricamento file"},
        {"id": "approvazione_mc", "label": "Approvazione finale"},
    ],
    "videocorso": [
        {"id": "struttura_corso", "label": "Struttura corso definita"},
        {"id": "contenuti_moduli", "label": "Scrittura contenuti moduli"},
        {"id": "registrazione_vc", "label": "Registrazione lezioni"},
        {"id": "upload_vc", "label": "Caricamento lezioni"},
        {"id": "revisione_vc", "label": "Revisione e montaggio"},
        {"id": "approvazione_vc", "label": "Approvazione finale"},
    ],
    "funnel": [
        {"id": "copy_landing", "label": "Copy landing page"},
        {"id": "setup_funnel", "label": "Impostazione funnel"},
        {"id": "config_pagamento", "label": "Configurazione pagamento"},
        {"id": "revisione_fn", "label": "Revisione funnel"},
        {"id": "pubblicazione", "label": "Approvazione e pubblicazione"},
    ],
    "lancio": [
        {"id": "calendario", "label": "Calendario editoriale"},
        {"id": "contenuti_pronti", "label": "Contenuti pronti"},
        {"id": "campagne_ads", "label": "Campagne ads impostate"},
        {"id": "test_completo", "label": "Test completo"},
        {"id": "go_live", "label": "Go live"},
    ],
}

# Mappa macro-step completato → fase successiva
PHASE_AFTER_COMPLETION = {
    "posizionamento": "F3",
    "masterclass": "F4",
    "videocorso": "F6",
    "funnel": "F7",
    "lancio": "LIVE",
}

# Mappa macro-step → fase "in corso"
PHASE_FOR_STEP = {
    "posizionamento": "F2",
    "masterclass": "F3",
    "videocorso": "F4",
    "funnel": "F6",
    "lancio": "F7",
}


def build_default_progress():
    """Genera la struttura di default per un nuovo partner."""
    result = {}
    for step_id, micros in MICRO_STEPS_CONFIG.items():
        result[step_id] = {
            "status": "not_started",
            "micro_steps": {
                m["id"]: {"status": "not_started", "label": m["label"], "updated_at": None}
                for m in micros
            }
        }
    return result


def compute_macro_status(micro_steps: dict) -> str:
    """Calcola lo stato del macro step in base ai micro-step."""
    statuses = [ms.get("status", "not_started") for ms in micro_steps.values()]
    if all(s == "completed" for s in statuses):
        return "completed"
    if any(s in ("completed", "in_progress") for s in statuses):
        return "in_progress"
    return "not_started"


def compute_phase_from_progress(progress: dict) -> str:
    """Calcola la fase corrente in base allo stato dei macro step."""
    step_order = ["posizionamento", "masterclass", "videocorso", "funnel", "lancio"]
    for step_id in reversed(step_order):
        step_data = progress.get(step_id, {})
        if step_data.get("status") == "completed":
            return PHASE_AFTER_COMPLETION[step_id]
        if step_data.get("status") == "in_progress":
            return PHASE_FOR_STEP[step_id]
    return "F2"  # Default: posizionamento in corso


# ── Modelli ─────────────────────────────────────────────────────────

class MicroStepUpdate(BaseModel):
    macro_step: str
    micro_step_id: str
    status: str  # not_started, in_progress, completed


class PhaseOverride(BaseModel):
    phase: str


# ── Endpoint: GET progress ──────────────────────────────────────────

@router.get("/{partner_id}/progress")
async def get_partner_progress(partner_id: str):
    if db is None:
        raise HTTPException(500, "Database non configurato")

    partner = await db.partners.find_one(
        {"id": partner_id},
        {"_id": 0, "id": 1, "name": 1, "phase": 1, "progress_details": 1}
    )
    if not partner:
        raise HTTPException(404, "Partner non trovato")

    progress = partner.get("progress_details")
    if not progress:
        progress = build_default_progress()
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"progress_details": progress}}
        )

    # Assicura che tutti i micro-step esistano (per evitare mismatch dopo aggiornamenti config)
    for step_id, micros_config in MICRO_STEPS_CONFIG.items():
        if step_id not in progress:
            progress[step_id] = {
                "status": "not_started",
                "micro_steps": {
                    m["id"]: {"status": "not_started", "label": m["label"], "updated_at": None}
                    for m in micros_config
                }
            }
        else:
            for mc in micros_config:
                if mc["id"] not in progress[step_id].get("micro_steps", {}):
                    progress[step_id].setdefault("micro_steps", {})[mc["id"]] = {
                        "status": "not_started", "label": mc["label"], "updated_at": None
                    }

    return {
        "partner_id": partner["id"],
        "partner_name": partner.get("name", ""),
        "phase": partner.get("phase", "F2"),
        "progress": progress,
        "config": MICRO_STEPS_CONFIG,
    }


# ── Endpoint: PATCH micro-step ──────────────────────────────────────

@router.patch("/{partner_id}/progress")
async def update_micro_step(partner_id: str, body: MicroStepUpdate):
    if db is None:
        raise HTTPException(500, "Database non configurato")

    if body.macro_step not in MICRO_STEPS_CONFIG:
        raise HTTPException(400, f"Macro step '{body.macro_step}' non valido")

    valid_ids = [m["id"] for m in MICRO_STEPS_CONFIG[body.macro_step]]
    if body.micro_step_id not in valid_ids:
        raise HTTPException(400, f"Micro step '{body.micro_step_id}' non valido")

    if body.status not in ("not_started", "in_progress", "completed"):
        raise HTTPException(400, f"Stato '{body.status}' non valido")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(404, "Partner non trovato")

    progress = partner.get("progress_details") or build_default_progress()

    # Assicura struttura
    if body.macro_step not in progress:
        progress[body.macro_step] = {
            "status": "not_started",
            "micro_steps": {
                m["id"]: {"status": "not_started", "label": m["label"], "updated_at": None}
                for m in MICRO_STEPS_CONFIG[body.macro_step]
            }
        }

    # Aggiorna micro-step
    progress[body.macro_step]["micro_steps"][body.micro_step_id] = {
        "status": body.status,
        "label": next(
            (m["label"] for m in MICRO_STEPS_CONFIG[body.macro_step] if m["id"] == body.micro_step_id),
            body.micro_step_id
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Ricalcola stato macro
    progress[body.macro_step]["status"] = compute_macro_status(
        progress[body.macro_step]["micro_steps"]
    )

    # Ricalcola fase globale
    new_phase = compute_phase_from_progress(progress)

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {
            "progress_details": progress,
            "phase": new_phase,
        }}
    )

    return {
        "success": True,
        "partner_id": partner_id,
        "new_phase": new_phase,
        "macro_step_status": progress[body.macro_step]["status"],
        "progress": progress,
    }


# ── Endpoint: PATCH fase manuale ────────────────────────────────────

@router.patch("/{partner_id}/phase")
async def override_phase(partner_id: str, body: PhaseOverride):
    if db is None:
        raise HTTPException(500, "Database non configurato")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(404, "Partner non trovato")

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {"phase": body.phase}}
    )

    return {"success": True, "partner_id": partner_id, "phase": body.phase}
