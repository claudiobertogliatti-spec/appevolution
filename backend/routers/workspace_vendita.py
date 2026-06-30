"""
EVOLUTION PRO — Workspace Valida · WORKSPACE 3 "Costruiamo il Sistema di Vendita".

Stessa struttura a 8 componenti di WS1/WS2 (vedi workspace_valida.py / workspace_corso.py).
Assorbe gli step 09-funnel-asset + 10-funnel-team-work + il prezzo (da 12). Agente: Gaia.

Riusa i motori esistenti (NON duplicati), chiamati direttamente dal frontend:
  - genera funnel/blueprint: POST /api/partner-journey/funnel/generate
  - pubblica funnel (Systeme.io via automazione): POST /api/partner-journey/funnel/publish

Qui si aggiunge:
  - stato aggregato del workspace (task AI + attivita partner + deliverable + %)
  - generatori AI dedicati di Gaia (descrizione offerta, FAQ, privacy, cookie, termini),
    ciascuno produce un deliverable PDF scaricabile.

Fonte di verita: collezione `partner_funnel` (campi `generated`, `blueprint`,
`blueprint_approved`, `published`; `production_kit` per i nuovi output) + `db.files`.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/workspace", tags=["workspace-valida"])

db = None


def set_db(database):
    global db
    db = database


def _helpers():
    try:
        from routers.workspace_valida import _llm_generate, _save_kit_deliverable
    except Exception:
        from workspace_valida import _llm_generate, _save_kit_deliverable  # type: ignore
    return _llm_generate, _save_kit_deliverable


# Task automatiche: completate quando il funnel/blueprint e stato generato.
AI_TASKS_W3 = [
    {"id": "optin", "label": "Pagina di opt-in", "kind": "auto"},
    {"id": "landing", "label": "Pagina di vendita", "kind": "auto"},
    {"id": "email", "label": "Sequenza email", "kind": "auto"},
    {"id": "checkout", "label": "Pagina di pagamento", "kind": "auto"},
    {"id": "descrizione_offerta", "label": "Descrizione dell'offerta", "kind": "gen"},
    {"id": "faq", "label": "FAQ della pagina di vendita", "kind": "gen"},
    {"id": "privacy", "label": "Privacy Policy", "kind": "gen"},
    {"id": "cookie", "label": "Cookie Policy", "kind": "gen"},
    {"id": "termini", "label": "Termini e condizioni di vendita", "kind": "gen"},
]

GEN_TASKS = {
    "descrizione_offerta": {
        "kit_key": "descrizione_offerta", "category": "vendita_descrizione",
        "deliverable": "Descrizione dell'offerta",
        "prompt": "Sei Gaia, supporto funnel di Evolution PRO. Dal sistema di vendita qui sotto "
                  "scrivi la DESCRIZIONE DELL'OFFERTA per la pagina di vendita: cosa include, "
                  "il valore per il cliente, perche conviene ora. Niente promesse irrealistiche.",
    },
    "faq": {
        "kit_key": "faq", "category": "vendita_faq",
        "deliverable": "FAQ della pagina di vendita",
        "prompt": "Sei Gaia, supporto funnel di Evolution PRO. Dal sistema di vendita qui sotto "
                  "scrivi 6-8 DOMANDE FREQUENTI con risposta, quelle che sciolgono i dubbi prima "
                  "dell'acquisto (prezzo, garanzia, tempi, a chi serve, come si accede).",
    },
    "privacy": {
        "kit_key": "privacy", "category": "vendita_privacy",
        "deliverable": "Privacy Policy",
        "prompt": "Sei Gaia, supporto funnel di Evolution PRO. Scrivi una PRIVACY POLICY chiara e "
                  "standard per la pagina di vendita di un corso online: dati raccolti, finalita, "
                  "base giuridica, diritti dell'utente, contatti. Testo pronto da pubblicare.",
    },
    "cookie": {
        "kit_key": "cookie", "category": "vendita_cookie",
        "deliverable": "Cookie Policy",
        "prompt": "Sei Gaia, supporto funnel di Evolution PRO. Scrivi una COOKIE POLICY chiara e "
                  "standard: cosa sono i cookie, quali si usano (tecnici, analitici, marketing), "
                  "come gestirli. Testo pronto da pubblicare.",
    },
    "termini": {
        "kit_key": "termini", "category": "vendita_termini",
        "deliverable": "Termini e condizioni di vendita",
        "prompt": "Sei Gaia, supporto funnel di Evolution PRO. Scrivi i TERMINI E CONDIZIONI DI "
                  "VENDITA per un corso online: oggetto, prezzo e pagamento, accesso ai contenuti, "
                  "diritto di recesso, limitazioni. Testo pronto da pubblicare.",
    },
}

_VOICE_TAIL = (" Scrivi in italiano semplice e diretto, frasi brevi, niente registro guru o "
               "parole vuote. Parla a una persona poco digitalizzata.")


def _has_funnel(rec: Dict[str, Any]) -> bool:
    return bool(rec.get("generated")) or bool(rec.get("blueprint"))


def _funnel_text(rec: Dict[str, Any]) -> str:
    """Testo sintetico del funnel da passare ai generatori Gaia."""
    bp = rec.get("blueprint") or {}
    ls = bp.get("landing_sections") or rec.get("content") or {}
    parts = []
    hero = ls.get("hero") or {}
    if hero:
        parts.append(f"HEADLINE: {hero.get('headline', '')}\nSOTTOTITOLO: {hero.get('subheadline', '')}")
    for key in ("problema", "promessa", "garanzia"):
        sec = ls.get(key) or {}
        if sec:
            parts.append(f"{key.upper()}: {sec.get('headline', '')} — {sec.get('body', '')}")
    moduli = (ls.get("moduli") or {}).get("items") or []
    if moduli:
        parts.append("MODULI: " + "; ".join(str(m) for m in moduli[:12]))
    cta = ls.get("cta_finale") or {}
    if cta:
        parts.append(f"OFFERTA: {cta.get('offerta', '')} — PREZZO: {cta.get('prezzo', '')}")
    inputs = rec.get("inputs") or {}
    if inputs.get("garanzia"):
        parts.append(f"GARANZIA: {inputs.get('garanzia')}")
    return "\n\n".join(p for p in parts if p.strip()) or "Sistema di vendita del partner (dati minimi)."


async def _build_state(partner_id: str) -> Dict[str, Any]:
    rec = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    has_funnel = _has_funnel(rec)
    approved = bool(rec.get("blueprint_approved"))
    published = bool(rec.get("published"))
    kit = rec.get("production_kit") or {}

    ai_tasks = []
    for t in AI_TASKS_W3:
        if t["kind"] == "auto":
            status = "completata" if has_funnel else "da_iniziare"
        else:
            done = bool(kit.get(GEN_TASKS[t["id"]]["kit_key"]))
            status = "completata" if done else ("da_iniziare" if has_funnel else "bloccata")
        ai_tasks.append({"id": t["id"], "label": t["label"], "kind": t["kind"], "status": status})

    partner_tasks = [
        {"id": "revisiona", "label": "Controlla e approva il sistema di vendita",
         "status": "completata" if (approved or published) else ("da_iniziare" if has_funnel else "bloccata")},
        {"id": "pubblica", "label": "Pubblica il funnel online",
         "status": "completata" if published else ("da_iniziare" if has_funnel else "bloccata")},
    ]

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
        "workspace_id": "vendita",
        "workspace_index": 3,
        "workspace_total": 5,
        "title": "Costruiamo il Sistema di Vendita",
        "agent": "GAIA",
        "objective": "Avere il sistema che trasforma i visitatori in clienti: pagina di opt-in, "
                     "pagina di vendita, email e pagamento, pronti e online.",
        "intro": "Sono Gaia. Adesso costruiamo il tuo sistema di vendita: le pagine, le email e il "
                 "pagamento. Lo genero io sui tuoi contenuti — a te resta controllarlo e dare l'ok "
                 "per pubblicarlo.",
        "has_funnel": has_funnel,
        "approved": approved,
        "published": published,
        "blueprint": rec.get("blueprint") if has_funnel else None,
        "ai_tasks": ai_tasks,
        "partner_tasks": partner_tasks,
        "deliverables": deliverables,
        "progress": progress,
        "done_count": done,
        "total_count": total,
    }


@router.get("/{partner_id}/vendita")
async def get_workspace_vendita(partner_id: str):
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    return await _build_state(partner_id)


@router.post("/{partner_id}/vendita/generate/{task_id}")
async def generate_vendita_task(partner_id: str, task_id: str):
    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    if task_id not in GEN_TASKS:
        raise HTTPException(400, f"Task non generabile qui: {task_id}")

    rec = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    if not _has_funnel(rec):
        raise HTTPException(400, "Genera prima il sistema di vendita.")

    cfg = GEN_TASKS[task_id]
    llm_generate, save_deliverable = _helpers()
    system = cfg["prompt"] + _VOICE_TAIL
    user_text = "SISTEMA DI VENDITA:\n\n" + _funnel_text(rec)

    try:
        body = await llm_generate(system, user_text)
    except Exception as e:
        logger.error(f"[WS3] generazione {task_id} fallita per {partner_id}: {e}")
        raise HTTPException(500, "Errore nella generazione. Riprova tra poco.")

    file_id = None
    try:
        file_id = await save_deliverable(partner_id, cfg["category"], cfg["deliverable"],
                                         cfg["deliverable"], body)
    except Exception as e:
        logger.warning(f"[WS3] deliverable {task_id} non salvato per {partner_id}: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.partner_funnel.update_one(
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
