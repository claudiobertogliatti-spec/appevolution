"""
EVOLUTION PRO — Workspace Valida · WORKSPACE 3 "Il tuo funnel" (step F-13, `10-sistema-vendita`).

Dal 1/10/2026 il funnel del partner vive FUORI da Systeme (codice su Vercel): il partner lo
guarda in anteprima e per ogni pagina dice "Va bene" o segnala il dato sbagliato.
Lo stato mostrato è calcolato da services/funnel_review.py; le azioni sono in
routers/funnel_review.py. Qui resta lo stato aggregato della schermata e i generatori Gaia
legacy (non più esposti nella schermata: i testi legali si rifanno con i dati veri del titolare).

Fonte di verita: collezione `partner_funnel` (campi `preview_url`, `preview_version`,
`preview_released`, `review`, `connections`, `team_ready`).
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partner-journey/workspace", tags=["workspace-valida"])
security = HTTPBearer(auto_error=False)

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
    """Stato della schermata F-13 "Il tuo funnel".

    Il funnel vive fuori da Systeme (Vercel): il partner lo guarda in anteprima e per ogni
    pagina dice "Va bene" oppure segnala il dato sbagliato. Gli stati sono VERI, letti dai
    dati: niente attività "completata" solo perché il funnel è stato generato.
    La logica è in services/funnel_review.py.
    """
    from services.funnel_review import legal_data_from_partner, review_state

    rec = await db.partner_funnel.find_one({"partner_id": partner_id}, {"_id": 0}) or {}
    partner = await db.partners.find_one(
        {"id": str(partner_id)}, {"_id": 0, "name": 1, "email": 1, "dati_burocrazia": 1}
    ) or {}
    review = review_state(rec, legal_data_from_partner(partner))
    return {
        "success": True,
        "workspace_id": "vendita",
        "workspace_index": 3,
        "workspace_total": 5,
        "title": "Il tuo funnel",
        "agent": "GAIA",
        "objective": "Guardare il tuo funnel e dirci se va bene: è la parte che porta le persone "
                     "dalla masterclass all'acquisto del tuo corso.",
        "intro": "Sono Gaia. Il tuo funnel è la strada che le persone percorrono per iscriversi, "
                 "guardare la masterclass e acquistare il corso. Tu devi solo guardarlo e dirci "
                 "se è tutto giusto. Alla parte tecnica pensiamo noi.",
        "has_funnel": _has_funnel(rec),
        "approved": bool(rec.get("blueprint_approved")),
        "published": bool(rec.get("published")),
        "review": review,
        "progress": review["progress"],
    }


@router.get("/{partner_id}/vendita")
async def get_workspace_vendita(
    partner_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from routers.partner_journey import require_partner_or_admin_for_partner
    await require_partner_or_admin_for_partner(partner_id, credentials)

    if db is None:
        raise HTTPException(503, "DB non inizializzato")
    return await _build_state(partner_id)


@router.post("/{partner_id}/vendita/generate/{task_id}")
async def generate_vendita_task(
    partner_id: str,
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from routers.partner_journey import require_partner_or_admin_for_partner
    await require_partner_or_admin_for_partner(partner_id, credentials)

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
