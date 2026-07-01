"""Partner rewards: certificates, project book and bonus PDFs."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models.partner_journey_step import MACRO_PHASES_DEFINITION
from services.partner_rewards_pdf import (
    render_bonus_pdf,
    render_certificate_pdf,
    render_project_book_pdf,
)


router = APIRouter(prefix="/api/partner-rewards", tags=["partner-rewards"])
db = None


def set_db(database):
    global db
    db = database


PHASE_META = {
    "esamina": {
        "label": "Esamina",
        "result": "Il progetto ha fondamenta chiare: identita', storia, brand e posizionamento.",
        "next_step": "Ora trasformiamo questa direzione in masterclass, corso e sistema di vendita.",
        "bonus_title": "Mappa del tuo Posizionamento",
        "bonus_bullets": [
            "Chi sei e perche' il mercato dovrebbe ascoltarti.",
            "A chi parli: il pubblico che ha piu' bisogno della tua competenza.",
            "La promessa centrale da portare nella masterclass.",
        ],
    },
    "valida": {
        "label": "Valida",
        "result": "Il progetto e' diventato un sistema reale: masterclass, corso, funnel e lancio.",
        "next_step": "Da qui leggiamo i dati e miglioriamo il sistema con continuita'.",
        "bonus_title": "Checklist Lancio del tuo Modello Digitale",
        "bonus_bullets": [
            "Controlla video, pagine, checkout e comunicazioni prima del go-live.",
            "Prepara il pubblico con contenuti semplici e coerenti.",
            "Tieni pronta la traccia della live e il follow-up.",
        ],
    },
    "golive": {
        "label": "Go Live",
        "result": "Il modello digitale e' online e pronto a vendere.",
        "next_step": "Ora inizia la fase Ottimizza: dati, live ricorrenti, calendario e crescita.",
        "bonus_title": "Piano 90 Giorni per Crescere",
        "bonus_bullets": [
            "Mantieni un ritmo editoriale semplice tra una live e l'altra.",
            "Analizza cosa converte e migliora un punto alla volta.",
            "Usa la live ricorrente come motore prevedibile di vendita.",
        ],
    },
}


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _days_between(values: list[Any]) -> Optional[int]:
    dates = sorted([d for d in (_parse_dt(v) for v in values) if d])
    if len(dates) < 2:
        return None
    return max(1, (dates[-1] - dates[0]).days + 1)


async def _load_context(partner_id: str) -> dict[str, Any]:
    if db is None:
        raise HTTPException(500, "Database non inizializzato")

    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0}) or {}
    steps = await db.partner_journey_steps.find(
        {"partner_id": partner_id}, {"_id": 0}
    ).sort("step_number", 1).to_list(length=40)

    if not partner and not steps:
        raise HTTPException(404, "Partner non trovato")

    return {
        "partner": partner,
        "steps": steps,
        "steps_by_id": {s.get("step_id"): s for s in steps},
    }


def _phase_step_ids(phase: str) -> list[str]:
    if phase == "golive":
        return ["13-lancio"]
    for mp in MACRO_PHASES_DEFINITION:
        if mp["id"] == phase:
            return mp.get("step_ids", [])
    return []


def _is_step_done(step: dict[str, Any] | None) -> bool:
    return bool(step and step.get("status") in ("done", "skipped"))


def _phase_unlocked(ctx: dict[str, Any], phase: str) -> bool:
    steps_by_id = ctx["steps_by_id"]
    ids = _phase_step_ids(phase)
    if phase == "golive":
        step = steps_by_id.get("13-lancio")
        return _is_step_done(step) and bool((step.get("data") or {}).get("launched_at") or step.get("completed_at"))
    return bool(ids) and all(_is_step_done(steps_by_id.get(sid)) for sid in ids)


def _phase_days(ctx: dict[str, Any], phase: str) -> Optional[int]:
    ids = _phase_step_ids(phase)
    values = []
    for sid in ids:
        step = ctx["steps_by_id"].get(sid) or {}
        values.extend([step.get("started_at"), step.get("completed_at"), step.get("updated_at")])
    return _days_between(values)


def _partner_name(partner: dict[str, Any]) -> str:
    return partner.get("name") or partner.get("nome") or partner.get("business_name") or "Partner Ciak"


def _project_name(partner: dict[str, Any], steps_by_id: dict[str, Any]) -> str:
    brand = (steps_by_id.get("03-brand-kit") or {}).get("data") or {}
    pos = (steps_by_id.get("04-posizionamento") or {}).get("data") or {}
    return (
        brand.get("nome_progetto")
        or brand.get("brand_name")
        or pos.get("nome_progetto")
        or partner.get("project_name")
        or partner.get("business_name")
        or "Il tuo modello digitale"
    )


def _start_date(ctx: dict[str, Any]) -> str:
    dates = []
    for step in ctx["steps"]:
        dates.extend([_parse_dt(step.get("started_at")), _parse_dt(step.get("completed_at")), _parse_dt(step.get("updated_at"))])
    clean = sorted([d for d in dates if d])
    if not clean:
        return "In preparazione"
    return clean[0].strftime("%d/%m/%Y")


def _reward_state(ctx: dict[str, Any]) -> dict[str, Any]:
    phases = []
    for phase in ("esamina", "valida", "golive"):
        meta = PHASE_META[phase]
        unlocked = _phase_unlocked(ctx, phase)
        phases.append({
            "id": phase,
            "label": meta["label"],
            "unlocked": unlocked,
            "days": _phase_days(ctx, phase),
            "certificate_url": f"/api/partner-rewards/{ctx['partner_id']}/certificate/{phase}" if unlocked else None,
            "bonus_title": meta["bonus_title"],
            "bonus_url": f"/api/partner-rewards/{ctx['partner_id']}/bonus/{phase}" if unlocked else None,
        })
    return phases


def _project_sections(ctx: dict[str, Any]) -> list[dict[str, str]]:
    steps = ctx["steps_by_id"]
    partner = ctx["partner"]
    pos = (steps.get("04-posizionamento") or {}).get("data") or {}
    story = (steps.get("la-tua-storia") or {}).get("data") or {}
    brand = (steps.get("03-brand-kit") or {}).get("data") or {}
    masterclass = (steps.get("05-script-masterclass") or {}).get("data") or {}
    course = (steps.get("06-outline-lezioni") or {}).get("data") or {}
    funnel = (steps.get("09-funnel-asset") or {}).get("data") or {}
    calendar = (steps.get("11-calendario-30gg") or {}).get("data") or {}
    webinar = (steps.get("12-prezzo-webinar") or {}).get("data") or {}

    return [
        {"title": "Identita' professionale", "body": story.get("sintesi") or partner.get("bio") or "Questa sezione si completera' nella fase Esamina."},
        {"title": "Target", "body": pos.get("target") or pos.get("pubblico") or "Stiamo definendo il pubblico piu' adatto al progetto."},
        {"title": "Problema e promessa", "body": pos.get("promessa") or pos.get("problema") or "La promessa centrale verra' aggiornata dal posizionamento."},
        {"title": "Brand", "body": brand.get("descrizione") or brand.get("tono") or "Logo, colori e stile saranno raccolti qui."},
        {"title": "Masterclass", "body": masterclass.get("titolo") or masterclass.get("script_summary") or "La masterclass si completera' nella fase Valida."},
        {"title": "Corso", "body": course.get("titolo") or course.get("outline") or "La struttura del corso verra' aggiunta dopo l'outline."},
        {"title": "Sistema di vendita", "body": funnel.get("headline") or funnel.get("descrizione") or "Landing, pagina vendita e checkout saranno raccolti qui."},
        {"title": "Calendario di lancio", "body": str(calendar.get("calendario") or calendar.get("summary") or "Il piano contenuti verra' aggiunto quando generato.")},
        {"title": "Webinar e offerta", "body": str(webinar.get("strategia") or webinar.get("prezzo") or "Prezzo, bonus e live saranno raccolti qui.")},
    ]


@router.get("/{partner_id}/state")
async def get_rewards_state(partner_id: str):
    ctx = await _load_context(partner_id)
    ctx["partner_id"] = partner_id
    phases = _reward_state(ctx)
    return {
        "success": True,
        "partner_id": partner_id,
        "project_book": {
            "title": "Libretto di Progetto Ciak",
            "project_name": _project_name(ctx["partner"], ctx["steps_by_id"]),
            "download_url": f"/api/partner-rewards/{partner_id}/project-book",
            "unlocked_sections": sum(1 for phase in phases if phase["unlocked"]),
            "total_sections": 3,
        },
        "phases": phases,
    }


@router.get("/{partner_id}/certificate/{phase}")
async def download_certificate(partner_id: str, phase: str):
    if phase not in PHASE_META:
        raise HTTPException(404, "Fase non valida")
    ctx = await _load_context(partner_id)
    if not _phase_unlocked(ctx, phase):
        raise HTTPException(403, "Attestato non ancora sbloccato")
    meta = PHASE_META[phase]
    pdf = render_certificate_pdf({
        "partner_name": _partner_name(ctx["partner"]),
        "phase_label": meta["label"],
        "days": _phase_days(ctx, phase),
        "result": meta["result"],
        "next_step": meta["next_step"],
    })
    filename = f"attestato-ciak-{phase}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partner_id}/bonus/{phase}")
async def download_bonus(partner_id: str, phase: str):
    if phase not in PHASE_META:
        raise HTTPException(404, "Fase non valida")
    ctx = await _load_context(partner_id)
    if not _phase_unlocked(ctx, phase):
        raise HTTPException(403, "Bonus non ancora sbloccato")
    meta = PHASE_META[phase]
    pdf = render_bonus_pdf({
        "partner_name": _partner_name(ctx["partner"]),
        "title": meta["bonus_title"],
        "bullets": meta["bonus_bullets"],
    })
    filename = f"bonus-ciak-{phase}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partner_id}/project-book")
async def download_project_book(partner_id: str):
    ctx = await _load_context(partner_id)
    pdf = render_project_book_pdf({
        "partner_name": _partner_name(ctx["partner"]),
        "project_name": _project_name(ctx["partner"], ctx["steps_by_id"]),
        "start_date": _start_date(ctx),
        "sections": _project_sections(ctx),
    })
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="libretto-progetto-ciak.pdf"'},
    )
