"""
EVOLUTION PRO — Workspace Valida (Fase 2 del Metodo EVO)
---------------------------------------------------------
La fase "Valida" del percorso partner è organizzata in 5 Workspace, ciascuno con
una struttura fissa a 8 componenti (intro agente, obiettivo, task AI, attività
partner, upload, deliverable, pulsante principale, avanzamento).

Questo router gestisce il WORKSPACE 1 — "Creiamo la tua Masterclass".

Principio di design: NON duplica i motori esistenti. Lo script masterclass si
genera con l'endpoint già collaudato `/api/partner-journey/masterclass/generate-script`,
l'upload video usa il flusso GCS resumable (`/video/request-upload-session` +
`/video/confirm-upload`) e la pipeline Celery. Qui si aggiunge:
  - lo STATO AGGREGATO del workspace (task AI + task partner + deliverable + %)
  - i 4 generatori AI mancanti: storyboard, specifica slide, indicazioni di regia,
    checklist di registrazione — ciascuno produce un deliverable PDF scaricabile.

Fonte di verità dati: collezione `masterclass_factory` (campo `production_kit` per
i nuovi output) + `db.files` per i deliverable + lo stato pipeline video.

Brand voice (non negoziabile): tono diretto, italiano semplice, anti-fuffa, frasi
brevi. Vietato il registro guru/coach-speak.
"""
import logging
import re as _re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/workspace", tags=["workspace-valida"])

# Database reference (set from server.py, stesso pattern degli altri router)
db = None


def set_db(database):
    global db
    db = database


# ═══════════════════════════════════════════════════════════════════════════════
# DEFINIZIONE WORKSPACE 1 — task AI, task partner, deliverable
# ═══════════════════════════════════════════════════════════════════════════════

# Le 10 task AI nell'ordine della spec. Le prime 6 sono prodotte/implicite dal
# motore script (analisi brand+posizionamento già fatte in fase Esamina, strategia,
# titolo e promessa fanno parte dello script). Le ultime 4 sono generatori dedicati.
AI_TASKS_W1 = [
    {"id": "analisi_brand",        "label": "Analisi del brand",            "kind": "auto"},
    {"id": "analisi_posiz",        "label": "Analisi del posizionamento",   "kind": "auto"},
    {"id": "strategia",            "label": "Strategia della masterclass",  "kind": "auto"},
    {"id": "titolo",               "label": "Titolo",                       "kind": "auto"},
    {"id": "promessa",             "label": "Promessa",                     "kind": "auto"},
    {"id": "script",               "label": "Script completo",              "kind": "script"},
    {"id": "storyboard",           "label": "Storyboard",                   "kind": "gen"},
    {"id": "slide_spec",           "label": "Specifica tecnica slide",      "kind": "gen"},
    {"id": "regia",                "label": "Indicazioni di regia",         "kind": "gen"},
    {"id": "checklist",            "label": "Checklist registrazione",      "kind": "gen"},
]

# I 4 generatori AI dedicati: chiave production_kit, categoria db.files, titolo deliverable.
GEN_TASKS = {
    "storyboard": {
        "kit_key": "storyboard",
        "category": "masterclass_storyboard",
        "deliverable": "Storyboard masterclass",
    },
    "slide_spec": {
        "kit_key": "slide_spec",
        "category": "masterclass_slide",
        "deliverable": "Specifica slide masterclass",
    },
    "regia": {
        "kit_key": "regia",
        "category": "masterclass_regia",
        "deliverable": "Indicazioni di regia",
    },
    "checklist": {
        "kit_key": "checklist",
        "category": "masterclass_checklist",
        "deliverable": "Checklist di registrazione",
    },
}

PARTNER_TASKS_W1 = [
    {"id": "leggere_script", "label": "Leggere lo script"},
    {"id": "registrare",     "label": "Registrare la masterclass"},
    {"id": "caricare_video", "label": "Caricare il video grezzo"},
]


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT DEI 4 GENERATORI (brand voice: diretto, italiano semplice, anti-fuffa)
# ═══════════════════════════════════════════════════════════════════════════════

_VOICE = (
    "Scrivi in italiano semplice e diretto. Frasi brevi. Niente registro guru o "
    "motivazionale, niente parole vuote (es. 'mindset', 'sbloccare il potenziale'). "
    "Parla a una persona poco digitalizzata che deve registrare un video con lo "
    "smartphone. Concreto e pratico."
)

GEN_PROMPTS = {
    "storyboard": (
        "Sei Andrea, il coach video di Evolution PRO. Dallo script qui sotto crea uno "
        "STORYBOARD: per ogni blocco dello script indica in una riga cosa si vede a schermo "
        "(inquadratura del relatore, slide, esempio mostrato), il tono e cosa deve trasmettere. "
        "Usa un elenco numerato per blocco. " + _VOICE
    ),
    "slide_spec": (
        "Sei Andrea, il coach video di Evolution PRO. Dallo script qui sotto crea la SPECIFICA "
        "DELLE SLIDE: elenca le slide necessarie, una per riga, con titolo della slide e i 2-3 "
        "punti di testo che deve contenere. Slide pulite, poco testo, un'idea per slide. " + _VOICE
    ),
    "regia": (
        "Sei Andrea, il coach video di Evolution PRO. Dallo script qui sotto scrivi le INDICAZIONI "
        "DI REGIA pratiche per girare con lo smartphone: ritmo, dove guardare, quando fare una pausa, "
        "come stare davanti alla camera, errori da evitare. Indicazioni brevi e azionabili. " + _VOICE
    ),
    "checklist": (
        "Sei Andrea, il coach video di Evolution PRO. Crea una CHECKLIST DI REGISTRAZIONE pronta da "
        "spuntare prima e durante la registrazione della masterclass: attrezzatura minima (smartphone, "
        "supporto, luce, audio), ambiente, aspetto, prove. Elenco di voci spuntabili, ognuna su una riga "
        "che inizia con '- '. " + _VOICE
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def _script_text(mc: Dict[str, Any]) -> str:
    """Ricava il testo dello script dalla collezione masterclass_factory."""
    if not mc:
        return ""
    if mc.get("script") and isinstance(mc["script"], str):
        return mc["script"]
    sezioni = mc.get("script_sections") or mc.get("sezioni") or []
    parts = []
    for s in sezioni:
        title = s.get("title") or s.get("blocco") or ""
        content = s.get("content") or s.get("cosa_dire") or ""
        if title or content:
            parts.append(f"{title}\n{content}".strip())
    return "\n\n".join(parts)


def _has_script(mc: Dict[str, Any]) -> bool:
    return bool(_script_text(mc).strip())


async def _llm_generate(system: str, user_text: str) -> str:
    """Genera testo con Claude. Riusa il wrapper compat ciak_llm."""
    try:
        from services.ciak_llm import LlmChat, UserMessage
    except Exception:
        from ciak_llm import LlmChat, UserMessage  # type: ignore
    chat = LlmChat(system_message=system).with_max_tokens(2500)
    return await chat.send_message(UserMessage(text=user_text))


def _kit_to_html(title: str, body: str, partner_name: str) -> str:
    """HTML brandizzato (antracite + giallo) per il deliverable PDF."""
    safe = (body or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe = safe.replace("\n", "<br/>")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body {{ font-family: 'Poppins', Arial, sans-serif; color:#1A1F24; margin:0; padding:40px; }}
  .hd {{ background:#1A1F24; color:#fff; padding:24px 28px; border-radius:12px; }}
  .hd .tag {{ color:#FFD24D; font-size:12px; letter-spacing:.08em; text-transform:uppercase; }}
  .hd h1 {{ margin:6px 0 0; font-size:22px; }}
  .hd .who {{ color:#9aa3ad; font-size:13px; margin-top:4px; }}
  .body {{ margin-top:24px; font-size:14px; line-height:1.7; }}
</style></head><body>
  <div class="hd"><div class="tag">Evolution PRO · Masterclass</div>
  <h1>{title}</h1><div class="who">{partner_name}</div></div>
  <div class="body">{safe}</div>
</body></html>"""


async def _save_kit_deliverable(partner_id: str, category: str, title: str,
                                body_html_title: str, body: str) -> Optional[str]:
    """Render PDF + upload Cloudinary + record db.files. Ritorna file_id o None."""
    try:
        from cloudinary_service import upload_file_direct, is_cloudinary_configured
    except Exception:
        logger.warning("[WS1] cloudinary_service non disponibile")
        return None
    try:
        from services.ciak_pdf import html_to_pdf
    except Exception:
        from ciak_pdf import html_to_pdf  # type: ignore

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0}) or {}
    nome = partner.get("name") or partner.get("nome") or "Partner"

    html = _kit_to_html(body_html_title, body, nome)
    pdf_bytes = await html_to_pdf(html)

    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d-%H%M%S")
    safe_pid = _re.sub(r"[^A-Za-z0-9_-]", "_", str(partner_id))[:64]
    filename = f"{category}-{safe_pid}-{ts}.pdf"

    if not is_cloudinary_configured():
        raise RuntimeError("Cloudinary non configurato")

    res = await upload_file_direct(
        file_data=pdf_bytes,
        filename=filename,
        resource_type="raw",
        folder=f"evolution-pro/partners/{partner_id}/masterclass",
    )
    if not res.get("success"):
        raise RuntimeError(res.get("error", "upload Cloudinary fallito"))

    internal_url = res.get("secure_url") or res.get("url", "")
    public_id = res.get("public_id", "")

    await db.files.update_many(
        {"partner_id": str(partner_id), "category": category, "superseded": {"$ne": True}},
        {"$set": {"superseded": True}},
    )

    file_id = uuid.uuid4().hex
    await db.files.insert_one({
        "file_id": file_id,
        "partner_id": str(partner_id),
        "category": category,
        "file_type": "document",
        "original_name": f"{title} - {nome}.pdf",
        "stored_name": filename,
        "internal_url": internal_url,
        "public_id": public_id,
        "status": "approved",
        "step_ref": "05-masterclass",
        "superseded": False,
        "uploaded_at": now.isoformat(),
        "size": len(pdf_bytes),
        "size_readable": f"{len(pdf_bytes) // 1024} KB",
    })
    logger.info(f"[WS1] Deliverable {category} salvato per {partner_id}: {file_id}")
    return file_id


async def _build_state(partner_id: str) -> Dict[str, Any]:
    """Costruisce lo stato aggregato del Workspace 1."""
    mc = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    kit = mc.get("production_kit") or {}
    has_script = _has_script(mc)

    pipeline_status = mc.get("video_pipeline_status") or ""
    video_submitted = bool(
        mc.get("video_raw_url") or mc.get("video_url") or mc.get("video_uploaded")
        or (pipeline_status and pipeline_status not in ("", "none"))
    )
    video_ready = pipeline_status in ("ready_for_review", "approved")
    video_approved = bool(mc.get("video_approved")) or pipeline_status == "approved"

    # ── Task AI ──────────────────────────────────────────────────────────────
    ai_tasks: List[Dict[str, Any]] = []
    for t in AI_TASKS_W1:
        kind = t["kind"]
        if kind == "auto" or kind == "script":
            status = "completata" if has_script else "da_iniziare"
        else:  # gen
            done = bool(kit.get(GEN_TASKS[t["id"]]["kit_key"]))
            status = "completata" if done else ("da_iniziare" if has_script else "bloccata")
        ai_tasks.append({"id": t["id"], "label": t["label"], "kind": kind, "status": status})

    # ── Task partner ─────────────────────────────────────────────────────────
    read_done = bool(mc.get("partner_read_script"))
    partner_tasks = [
        {"id": "leggere_script", "label": "Leggere lo script",
         "status": "completata" if read_done else ("da_iniziare" if has_script else "bloccata")},
        {"id": "registrare", "label": "Registrare la masterclass",
         "status": "completata" if video_submitted else ("da_iniziare" if has_script else "bloccata")},
        {"id": "caricare_video", "label": "Caricare il video grezzo",
         "status": "completata" if video_submitted else ("da_iniziare" if has_script else "bloccata")},
    ]

    # ── Deliverable (da db.files) ────────────────────────────────────────────
    cats = ["masterclass"] + [g["category"] for g in GEN_TASKS.values()]
    cursor = db.files.find(
        {"partner_id": str(partner_id), "category": {"$in": cats}, "superseded": {"$ne": True}},
        {"_id": 0, "file_id": 1, "original_name": 1, "category": 1, "internal_url": 1,
         "size_readable": 1, "uploaded_at": 1},
    )
    deliverables = [d async for d in cursor]

    # ── Avanzamento ──────────────────────────────────────────────────────────
    all_items = ai_tasks + partner_tasks
    total = len(all_items)
    done = sum(1 for i in all_items if i["status"] == "completata")
    progress = round(done / total * 100) if total else 0

    return {
        "success": True,
        "workspace_id": "masterclass",
        "workspace_index": 1,
        "workspace_total": 5,
        "title": "Creiamo la tua Masterclass",
        "agent": "ANDREA",
        "objective": "Avere una masterclass gratuita che presenta il metodo e porta "
                     "naturalmente le persone a volere il corso.",
        "intro": "Sono Andrea. Costruiamo insieme la tua masterclass gratuita: è la "
                 "lezione che presenta il tuo metodo e accompagna le persone verso il "
                 "corso. Penso io a strategia, titolo, script e regia — a te resta solo "
                 "registrare.",
        "has_script": has_script,
        "ai_tasks": ai_tasks,
        "partner_tasks": partner_tasks,
        "deliverables": deliverables,
        "video": {
            "submitted": video_submitted,
            "pipeline_status": pipeline_status,
            "ready_for_review": video_ready,
            "approved": video_approved,
            "youtube_url": mc.get("video_youtube_url") or "",
            "embed_url": mc.get("video_embed_url") or "",
        },
        "progress": progress,
        "done_count": done,
        "total_count": total,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

class GenerateTaskRequest(BaseModel):
    partner_id: str


@router.get("/{partner_id}/masterclass")
async def get_workspace_masterclass(partner_id: str):
    """Stato aggregato del Workspace 1."""
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    return await _build_state(partner_id)


@router.post("/{partner_id}/masterclass/generate/{task_id}")
async def generate_task(partner_id: str, task_id: str):
    """
    Genera una task AI dedicata (storyboard | slide_spec | regia | checklist).
    Lo 'script' NON passa di qui: il frontend usa l'endpoint collaudato
    /api/partner-journey/masterclass/generate-script.
    """
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    if task_id not in GEN_TASKS:
        raise HTTPException(400, f"Task non generabile qui: {task_id}")

    mc = await db.masterclass_factory.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    script = _script_text(mc)
    if not script.strip():
        raise HTTPException(400, "Genera prima lo script della masterclass.")

    cfg = GEN_TASKS[task_id]
    system = GEN_PROMPTS[task_id]
    user_text = f"SCRIPT DELLA MASTERCLASS:\n\n{script}"

    try:
        body = await _llm_generate(system, user_text)
    except Exception as e:
        logger.error(f"[WS1] generazione {task_id} fallita per {partner_id}: {e}")
        raise HTTPException(500, "Errore nella generazione. Riprova tra poco.")

    file_id = None
    try:
        file_id = await _save_kit_deliverable(
            partner_id, cfg["category"], cfg["deliverable"], cfg["deliverable"], body
        )
    except Exception as e:
        logger.warning(f"[WS1] deliverable {task_id} non salvato per {partner_id}: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {
            f"production_kit.{cfg['kit_key']}": body,
            f"production_kit.{cfg['kit_key']}_file_id": file_id,
            f"production_kit.{cfg['kit_key']}_at": now,
            "updated_at": now,
        }},
        upsert=True,
    )

    state = await _build_state(partner_id)
    return {"success": True, "task_id": task_id, "content": body, "file_id": file_id, "state": state}


@router.post("/{partner_id}/masterclass/mark-read")
async def mark_script_read(partner_id: str):
    """Segna come fatta la task partner 'Leggere lo script'."""
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    await db.masterclass_factory.update_one(
        {"partner_id": partner_id},
        {"$set": {"partner_read_script": True,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"success": True, "state": await _build_state(partner_id)}
