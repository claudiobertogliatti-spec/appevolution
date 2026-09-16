"""Deliverable finali Ciak Start, costruiti solo da evidenze reali disponibili."""
from __future__ import annotations

from typing import Any

from services.quarterly_calendar import build_quarterly_calendar
from services.start_profili_social import build_profili_social
from services.start_vetrina import build_vetrina


async def build_start_social(dati: dict[str, Any]) -> dict[str, Any]:
    """Testi profili social a partire dal posizionamento approvato.

    Wrapper sottile sul motore `build_profili_social` (che degrada da solo con
    fallback dichiarato): normalizza in un deliverable con `type`/`status`.
    """
    out = await build_profili_social(dati)
    return {**out, "type": "social_profiles", "status": "ready_for_review"}


async def build_start_vetrina(dati: dict[str, Any]) -> dict[str, Any]:
    """Pagina vetrina (HTML) + checklist DNS dal posizionamento/brand approvati.

    Wrapper sottile su `build_vetrina`. La `live_url` (pubblicazione) NON e' qui:
    la imposta il team all'approvazione, dopo aver messo online la pagina.
    """
    out = await build_vetrina(dati)
    return {**out, "type": "showcase", "status": "ready_for_review"}


async def build_start_content_plan(data: dict[str, Any]) -> dict[str, Any]:
    answers = data.get("answers") or {}
    outline = data.get("outline") or None
    calendar = await build_quarterly_calendar(answers, outline)
    return {
        "type": "content_plan_90d",
        "period_days": 90,
        "status": "ready_for_review",
        "calendar": calendar,
        "evidence": {
            "answers_present": bool(answers),
            "outline_present": bool(outline),
            "calendar_source": calendar.get("source"),
        },
    }


def build_partnership_readiness(data: dict[str, Any]) -> dict[str, Any]:
    checks = {
        "brand_kit": bool((data.get("brand_kit") or {}).get("approved_at")),
        "positioning": bool((data.get("positioning") or {}).get("approved_at")),
        "social_profiles": bool((data.get("social_profiles") or {}).get("approved_at")),
        "showcase": bool(
            (data.get("showcase") or {}).get("live_url")
            and (data.get("showcase") or {}).get("approved_at")
        ),
        "content_plan_90d": bool((data.get("content_plan") or {}).get("approved_at")),
    }
    missing = [name for name, ok in checks.items() if not ok]
    ready = not missing
    return {
        "type": "partnership_readiness",
        "ready": ready,
        "checks": checks,
        "missing": missing,
        "recommendation": "valuta_partnership" if ready else "completa_start",
        "note": (
            "Le fondazioni Start risultano documentate. Il passaggio alla Partnership resta una decisione condivisa."
            if ready else
            "Completa e approva le evidenze mancanti prima di valutare la Partnership."
        ),
    }
