"""
EVOLUTION PRO — Workspace Valida · WORKSPACE 2 "Organizziamo il tuo Corso".

Stessa struttura a 8 componenti di WS1 (vedi workspace_valida.py). Assorbe gli step
06-outline-lezioni + 08-registra-lezioni. Agente di riferimento: Andrea.

Riusa i motori esistenti (NON duplicati):
  - struttura corso: POST /api/partner-journey/videocorso/generate-course
  - approvazione struttura: POST /api/partner-journey/videocorso/approve-course
  - upload lezione: flusso GCS resumable /video/request-upload-session + /video/confirm-upload
    (video_type="videocorso", lesson_id) → pipeline Celery
  - approvazione lezione: POST /api/partner-journey/videocorso/approve-lesson

Qui si aggiunge:
  - stato aggregato del workspace (task AI + lezioni + deliverable + %)
  - 4 generatori AI dedicati: script lezioni, testi descrittivi, materiali scaricabili,
    indicazioni di registrazione — ciascuno produce un deliverable PDF scaricabile.

Fonte di verità: collezione `partner_videocorso` (campo `production_kit` per i nuovi
output) + `db.files` per i deliverable.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/workspace", tags=["workspace-valida"])

db = None


def set_db(database):
    global db
    db = database


# Helper condivisi con WS1 (LLM + deliverable PDF). Import lazy/robusto.
def _helpers():
    try:
        from routers.workspace_valida import _llm_generate, _save_kit_deliverable
    except Exception:
        from workspace_valida import _llm_generate, _save_kit_deliverable  # type: ignore
    return _llm_generate, _save_kit_deliverable


# ═══════════════════════════════════════════════════════════════════════════════
# DEFINIZIONE WORKSPACE 2
# ═══════════════════════════════════════════════════════════════════════════════

AI_TASKS_W2 = [
    {"id": "struttura",   "label": "Struttura del corso",       "kind": "auto"},
    {"id": "moduli",      "label": "Moduli",                    "kind": "auto"},
    {"id": "lezioni",     "label": "Lezioni",                   "kind": "auto"},
    {"id": "outline",     "label": "Outline",                   "kind": "auto"},
    {"id": "script_lez",  "label": "Script delle lezioni",      "kind": "gen"},
    {"id": "testi",       "label": "Testi descrittivi",         "kind": "gen"},
    {"id": "bonus",       "label": "Bonus",                     "kind": "auto"},
    {"id": "materiali",   "label": "Materiali scaricabili",     "kind": "gen"},
    {"id": "risorse",     "label": "Risorse",                   "kind": "auto"},
    {"id": "regia_lez",   "label": "Indicazioni di registrazione", "kind": "gen"},
]

GEN_TASKS = {
    "script_lez": {
        "kit_key": "script_lez", "category": "videocorso_script",
        "deliverable": "Script delle lezioni",
        "prompt": "Sei Andrea, coach video di Evolution PRO. Dalla struttura del corso qui sotto "
                  "scrivi una traccia di SCRIPT per ogni lezione: per ciascuna lezione i punti da "
                  "dire nell'ordine, l'apertura, l'esempio pratico e la chiusura con il ponte alla "
                  "lezione successiva. Una lezione alla volta, titolo in grassetto.",
    },
    "testi": {
        "kit_key": "testi", "category": "videocorso_testi",
        "deliverable": "Testi descrittivi delle lezioni",
        "prompt": "Sei Andrea, coach video di Evolution PRO. Dalla struttura del corso qui sotto "
                  "scrivi i TESTI DESCRITTIVI: per ogni lezione 2-3 frasi che spiegano cosa impara "
                  "lo studente e perché serve. Tono diretto, da pagina del corso.",
    },
    "materiali": {
        "kit_key": "materiali", "category": "videocorso_materiali",
        "deliverable": "Materiali scaricabili",
        "prompt": "Sei Andrea, coach video di Evolution PRO. Dalla struttura del corso qui sotto "
                  "proponi i MATERIALI SCARICABILI utili (checklist, schede, template, esercizi): "
                  "per ogni modulo elenca 1-2 materiali con titolo e a cosa servono.",
    },
    "regia_lez": {
        "kit_key": "regia_lez", "category": "videocorso_regia",
        "deliverable": "Indicazioni di registrazione",
        "prompt": "Sei Andrea, coach video di Evolution PRO. Scrivi le INDICAZIONI DI REGISTRAZIONE "
                  "per girare le lezioni del corso con lo smartphone: come strutturare ogni lezione, "
                  "durata consigliata, ritmo, come tenere alta l'attenzione, errori da evitare.",
    },
}

_VOICE_TAIL = (" Scrivi in italiano semplice e diretto, frasi brevi, niente registro guru o "
               "parole vuote. Parla a una persona poco digitalizzata che registra con lo smartphone.")


def _course(rec: Dict[str, Any]) -> Dict[str, Any]:
    return (rec or {}).get("course_data") or {}


def _has_course(rec: Dict[str, Any]) -> bool:
    cd = _course(rec)
    return bool(cd.get("moduli"))


def _course_text(cd: Dict[str, Any]) -> str:
    """Serializza la struttura corso in testo per i prompt."""
    parts = [f"TITOLO: {cd.get('titolo','')}", f"DESCRIZIONE: {cd.get('descrizione','')}", ""]
    for m in cd.get("moduli", []):
        parts.append(f"Modulo {m.get('numero','')}: {m.get('titolo','')} — {m.get('obiettivo','')}")
        for l in m.get("lezioni", []):
            cont = l.get("contenuto")
            cont = "; ".join(cont) if isinstance(cont, list) else (cont or "")
            parts.append(f"  - Lezione {l.get('numero','')}: {l.get('titolo','')} ({l.get('durata','')}) {cont}")
    if cd.get("bonus"):
        parts.append("BONUS: " + "; ".join(cd.get("bonus", [])))
    if cd.get("risorse"):
        parts.append("RISORSE: " + "; ".join(cd.get("risorse", [])))
    return "\n".join(parts)


def _planned_lessons(cd: Dict[str, Any]) -> List[Dict[str, Any]]:
    out = []
    for m in cd.get("moduli", []):
        for l in m.get("lezioni", []):
            out.append({"modulo": m.get("titolo", ""), "numero": l.get("numero", ""),
                        "titolo": l.get("titolo", "")})
    return out


async def _build_state(partner_id: str) -> Dict[str, Any]:
    rec = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    cd = _course(rec)
    has_course = _has_course(rec)
    course_approved = bool(rec.get("course_approved"))
    kit = rec.get("production_kit") or {}

    lessons = rec.get("lessons") or {}
    planned = _planned_lessons(cd)
    n_planned = len(planned)
    uploaded = []
    for lid, l in lessons.items():
        uploaded.append({
            "lesson_id": lid,
            "title": l.get("title") or l.get("original_name") or lid,
            "pipeline_status": l.get("pipeline_status") or l.get("status") or "",
            "ready_for_review": (l.get("pipeline_status") or l.get("status")) in ("ready_for_review", "approved"),
            "approved": bool(l.get("video_approved")) or (l.get("status") == "approved"),
            "embed_url": l.get("video_embed_url") or "",
        })
    n_uploaded = len(uploaded)
    n_approved = sum(1 for u in uploaded if u["approved"])

    # Task AI
    ai_tasks = []
    for t in AI_TASKS_W2:
        if t["kind"] == "auto":
            status = "completata" if has_course else "da_iniziare"
        else:
            done = bool(kit.get(GEN_TASKS[t["id"]]["kit_key"]))
            status = "completata" if done else ("da_iniziare" if has_course else "bloccata")
        ai_tasks.append({"id": t["id"], "label": t["label"], "kind": t["kind"], "status": status})

    # Task partner (per-lezione, rappresentate in aggregato)
    all_recorded = n_planned > 0 and n_uploaded >= n_planned
    partner_tasks = [
        {"id": "registrare", "label": f"Registrare ogni lezione ({n_uploaded}/{n_planned or '?'})",
         "status": "completata" if all_recorded else ("da_iniziare" if course_approved else "bloccata")},
        {"id": "caricare", "label": "Caricare ogni video",
         "status": "completata" if all_recorded else ("da_iniziare" if course_approved else "bloccata")},
    ]

    # Deliverable
    cats = [g["category"] for g in GEN_TASKS.values()]
    cursor = db.files.find(
        {"partner_id": str(partner_id), "category": {"$in": cats}, "superseded": {"$ne": True}},
        {"_id": 0, "file_id": 1, "original_name": 1, "category": 1, "internal_url": 1},
    )
    deliverables = [d async for d in cursor]

    items = ai_tasks + partner_tasks
    total = len(items)
    done = sum(1 for i in items if i["status"] == "completata")
    progress = round(done / total * 100) if total else 0

    return {
        "success": True,
        "workspace_id": "corso",
        "workspace_index": 2,
        "workspace_total": 5,
        "title": "Organizziamo il tuo Corso",
        "agent": "ANDREA",
        "objective": "Avere il corso completo — struttura, lezioni e materiali — pronto da "
                     "registrare e da vendere.",
        "intro": "Sono Andrea. Adesso organizziamo il corso che venderai: la struttura, i moduli, "
                 "le lezioni e i materiali. Penso io all'impianto e ai testi — a te resta registrare "
                 "le lezioni, una alla volta.",
        "has_course": has_course,
        "course_approved": course_approved,
        "course_data": cd if has_course else None,
        "ai_tasks": ai_tasks,
        "partner_tasks": partner_tasks,
        "lessons": uploaded,
        "lessons_planned": n_planned,
        "lessons_uploaded": n_uploaded,
        "lessons_approved": n_approved,
        "deliverables": deliverables,
        "progress": progress,
        "done_count": done,
        "total_count": total,
    }


class _Req(BaseModel):
    partner_id: str


@router.get("/{partner_id}/corso")
async def get_workspace_corso(partner_id: str):
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    return await _build_state(partner_id)


@router.post("/{partner_id}/corso/generate/{task_id}")
async def generate_corso_task(partner_id: str, task_id: str):
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    if task_id not in GEN_TASKS:
        raise HTTPException(400, f"Task non generabile qui: {task_id}")

    rec = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    cd = _course(rec)
    if not cd.get("moduli"):
        raise HTTPException(400, "Genera prima la struttura del corso.")

    cfg = GEN_TASKS[task_id]
    llm_generate, save_deliverable = _helpers()
    system = cfg["prompt"] + _VOICE_TAIL
    user_text = "STRUTTURA DEL CORSO:\n\n" + _course_text(cd)

    try:
        body = await llm_generate(system, user_text)
    except Exception as e:
        logger.error(f"[WS2] generazione {task_id} fallita per {partner_id}: {e}")
        raise HTTPException(500, "Errore nella generazione. Riprova tra poco.")

    file_id = None
    try:
        file_id = await save_deliverable(partner_id, cfg["category"], cfg["deliverable"],
                                         cfg["deliverable"], body)
    except Exception as e:
        logger.warning(f"[WS2] deliverable {task_id} non salvato per {partner_id}: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.partner_videocorso.update_one(
        {"partner_id": partner_id},
        {"$set": {
            f"production_kit.{cfg['kit_key']}": body,
            f"production_kit.{cfg['kit_key']}_file_id": file_id,
            f"production_kit.{cfg['kit_key']}_at": now,
            "updated_at": now,
        }},
        upsert=True,
    )
    return {"success": True, "task_id": task_id, "content": body, "file_id": file_id,
            "state": await _build_state(partner_id)}
