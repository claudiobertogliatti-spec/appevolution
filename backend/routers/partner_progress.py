"""
Router per la gestione del progresso dettagliato dei partner.
Micro-step tracking per admin con sincronizzazione automatica della fase.
"""
from fastapi import APIRouter, HTTPException
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
        {"id": "risposte_complete", "label": "Risposte complete e verificate"},
        {"id": "revisione_pos", "label": "Revisione posizionamento"},
        {"id": "approvazione_pos", "label": "Approvazione posizionamento"},
    ],
    "masterclass": [
        {"id": "script_generato", "label": "Script generato"},
        {"id": "script_revisionato", "label": "Script revisionato"},
        {"id": "script_approvato", "label": "Script approvato"},
        {"id": "video_registrato", "label": "Video registrato"},
        {"id": "video_caricato", "label": "Video caricato"},
        {"id": "controllo_qualita_mc", "label": "Controllo qualita"},
    ],
    "videocorso": [
        {"id": "struttura_corso", "label": "Struttura corso definita"},
        {"id": "contenuti_moduli", "label": "Scrittura contenuti moduli"},
        {"id": "registrazione_vc", "label": "Registrazione lezioni"},
        {"id": "upload_vc", "label": "Caricamento lezioni"},
        {"id": "revisione_montaggio", "label": "Revisione e montaggio"},
        {"id": "controllo_qualita_vc", "label": "Controllo qualita"},
        {"id": "approvazione_vc", "label": "Approvazione finale"},
    ],
    "funnel": [
        {"id": "landing_creata", "label": "Landing page creata"},
        {"id": "copy_inserito", "label": "Copy inserito"},
        {"id": "email_sequence", "label": "Email sequence configurata"},
        {"id": "checkout_config", "label": "Checkout configurato"},
        {"id": "test_funnel", "label": "Test completo funnel"},
    ],
    "lancio": [
        {"id": "calendario", "label": "Calendario editoriale pronto"},
        {"id": "contenuti_pronti", "label": "Contenuti social pronti"},
        {"id": "campagne_ads", "label": "Campagne ads impostate"},
        {"id": "test_completo", "label": "Test completo pre-lancio"},
        {"id": "go_live", "label": "Go live"},
    ],
}

# Mappa macro-step completato -> fase successiva
PHASE_AFTER_COMPLETION = {
    "posizionamento": "F3",
    "masterclass": "F4",
    "videocorso": "F6",
    "funnel": "F7",
    "lancio": "LIVE",
}

# Mappa macro-step -> fase "in corso"
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
                m["id"]: {
                    "status": "not_started",
                    "label": m["label"],
                    "updated_at": None,
                    "note": "",
                }
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
    return "F2"


# ── Modelli ─────────────────────────────────────────────────────────

class MicroStepUpdate(BaseModel):
    macro_step: str
    micro_step_id: str
    status: str  # not_started, in_progress, completed

class MicroStepNoteUpdate(BaseModel):
    macro_step: str
    micro_step_id: str
    note: str

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
    needs_save = False

    if not progress:
        progress = build_default_progress()
        needs_save = True

    # Assicura che tutti i micro-step dalla config esistano (merge forward-compatible)
    for step_id, micros_config in MICRO_STEPS_CONFIG.items():
        if step_id not in progress:
            progress[step_id] = {
                "status": "not_started",
                "micro_steps": {
                    m["id"]: {"status": "not_started", "label": m["label"], "updated_at": None, "note": ""}
                    for m in micros_config
                }
            }
            needs_save = True
        else:
            existing_micros = progress[step_id].get("micro_steps", {})
            for mc in micros_config:
                if mc["id"] not in existing_micros:
                    existing_micros[mc["id"]] = {
                        "status": "not_started", "label": mc["label"], "updated_at": None, "note": ""
                    }
                    needs_save = True
                else:
                    # Ensure note field exists on old records
                    if "note" not in existing_micros[mc["id"]]:
                        existing_micros[mc["id"]]["note"] = ""
                        needs_save = True
                    # Update label if config changed
                    if existing_micros[mc["id"]].get("label") != mc["label"]:
                        existing_micros[mc["id"]]["label"] = mc["label"]
                        needs_save = True
            progress[step_id]["micro_steps"] = existing_micros
            # Remove micro-steps no longer in config
            valid_ids = {m["id"] for m in micros_config}
            removed = [k for k in existing_micros if k not in valid_ids]
            for k in removed:
                del existing_micros[k]
                needs_save = True

    # Ricalcola stato macro dopo merge (nuovi micro-step possono invalidare un "completed")
    for step_id in MICRO_STEPS_CONFIG:
        if step_id in progress:
            new_macro = compute_macro_status(progress[step_id].get("micro_steps", {}))
            if progress[step_id].get("status") != new_macro:
                progress[step_id]["status"] = new_macro
                needs_save = True

    if needs_save:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"progress_details": progress}}
        )

    return {
        "partner_id": partner["id"],
        "partner_name": partner.get("name", ""),
        "phase": partner.get("phase", "F2"),
        "progress": progress,
        "config": MICRO_STEPS_CONFIG,
    }


# ── Endpoint: PATCH micro-step status ───────────────────────────────

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
                m["id"]: {"status": "not_started", "label": m["label"], "updated_at": None, "note": ""}
                for m in MICRO_STEPS_CONFIG[body.macro_step]
            }
        }

    # Preserve existing note
    existing = progress[body.macro_step]["micro_steps"].get(body.micro_step_id, {})
    existing_note = existing.get("note", "")

    progress[body.macro_step]["micro_steps"][body.micro_step_id] = {
        "status": body.status,
        "label": next(
            (m["label"] for m in MICRO_STEPS_CONFIG[body.macro_step] if m["id"] == body.micro_step_id),
            body.micro_step_id
        ),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "note": existing_note,
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


# ── Endpoint: PATCH micro-step note ─────────────────────────────────

@router.patch("/{partner_id}/progress/note")
async def update_micro_step_note(partner_id: str, body: MicroStepNoteUpdate):
    if db is None:
        raise HTTPException(500, "Database non configurato")

    if body.macro_step not in MICRO_STEPS_CONFIG:
        raise HTTPException(400, f"Macro step '{body.macro_step}' non valido")

    valid_ids = [m["id"] for m in MICRO_STEPS_CONFIG[body.macro_step]]
    if body.micro_step_id not in valid_ids:
        raise HTTPException(400, f"Micro step '{body.micro_step_id}' non valido")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(404, "Partner non trovato")

    progress = partner.get("progress_details") or build_default_progress()

    if body.macro_step not in progress:
        raise HTTPException(400, "Macro step non presente nel progresso")

    micro = progress[body.macro_step].get("micro_steps", {}).get(body.micro_step_id)
    if not micro:
        raise HTTPException(400, "Micro step non presente")

    micro["note"] = body.note
    micro["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.partners.update_one(
        {"id": partner_id},
        {"$set": {f"progress_details.{body.macro_step}.micro_steps.{body.micro_step_id}": micro}}
    )

    return {"success": True, "partner_id": partner_id, "macro_step": body.macro_step, "micro_step_id": body.micro_step_id}


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
