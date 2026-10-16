"""Titoli YouTube chiari per videocorso + masterclass di un partner.

La playlist YouTube del partner e' un backup privato (di Claudio e del partner):
ci finiscono TUTTI i render, anche i montaggi vecchi/sbagliati, e non si capisce
piu' quale sia il video buono. Questo modulo costruisce, per ogni video FINALE
(quello con `video_youtube_id` registrato, cioe' quello pubblicato su Systeme),
un titolo chiaro e ordinabile, cosi' i finali si riconoscono a colpo d'occhio.

Convenzione decisa da Claudio (15/09/2026):
  - Lezione:     "{Cognome} · M01·L01 — {titolo lezione}"
  - Masterclass: "{Cognome} · MASTERCLASS — {titolo}"

Il modulo e' PURO e deterministico: nessuna chiamata di rete, nessun accesso a
YouTube o al DB. Riceve i documenti gia' letti e ritorna il piano di rinomina.
Cosi' e' testabile in isolamento e la rinomina vera (side-effect) resta fuori.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

# Accetta m1_l1, m01-l01, M12_L3, ecc.
_LESSON_RE = re.compile(r"m0*(\d+)[_\- ]*l0*(\d+)", re.IGNORECASE)


def partner_label(partner: Dict[str, Any]) -> str:
    """Cognome del partner = ultima parola del nome completo (es. 'Daniele
    Andolfi' -> 'Andolfi'). Fallback prudente se il nome manca."""
    name = (partner.get("name") or partner.get("nome") or "").strip()
    if not name:
        return "Partner"
    return name.split()[-1]


def youtube_id_from_url(url: Optional[str]) -> Optional[str]:
    """Estrae l'id video da un URL YouTube (watch?v=, youtu.be/, embed/)."""
    if not url:
        return None
    u = str(url)
    if "watch?v=" in u:
        return u.split("watch?v=")[-1].split("&")[0].strip() or None
    if "v=" in u:
        return u.split("v=")[-1].split("&")[0].strip() or None
    if "youtu.be/" in u:
        return u.split("youtu.be/")[-1].split("?")[0].split("&")[0].strip() or None
    if "/embed/" in u:
        return u.split("/embed/")[-1].split("?")[0].split("&")[0].strip() or None
    return None


def _lesson_numbers(lesson_id: str) -> Optional[tuple[int, int]]:
    m = _LESSON_RE.search(lesson_id or "")
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def _lesson_code(lesson_id: str) -> Optional[str]:
    nums = _lesson_numbers(lesson_id)
    if not nums:
        return None
    modulo, lezione = nums
    return f"M{modulo:02d}·L{lezione:02d}"


def lesson_title(label: str, lesson_id: str, lesson: Dict[str, Any]) -> Optional[str]:
    """Titolo di una lezione. None se il `lesson_id` non e' interpretabile:
    non si inventa una numerazione, si salta e lo si segnala a monte."""
    code = _lesson_code(lesson_id)
    if not code:
        return None
    titolo = (lesson.get("title") or lesson.get("titolo") or "").strip()
    if titolo:
        return f"{label} · {code} — {titolo}"
    return f"{label} · {code}"


def masterclass_title(label: str, masterclass: Dict[str, Any]) -> str:
    titolo = (masterclass.get("title") or masterclass.get("titolo") or "").strip()
    if titolo:
        return f"{label} · MASTERCLASS — {titolo}"
    return f"{label} · MASTERCLASS"


def _sort_key(item: tuple[str, Any]) -> tuple[int, int, str]:
    lesson_id, _lesson = item
    nums = _lesson_numbers(lesson_id)
    if nums:
        return (nums[0], nums[1], lesson_id)
    # Le lezioni con id non standard finiscono in coda, in ordine alfabetico.
    return (10_000, 10_000, lesson_id)


def build_title_plan(
    partner: Dict[str, Any],
    videocorso: Optional[Dict[str, Any]],
    masterclass: Optional[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Piano di rinomina: una voce per ogni video FINALE (con video_youtube_id).

    Ogni voce: {video_id, kind, lesson_id, target_title}. La masterclass per
    prima, poi le lezioni ordinate per modulo/lezione. I video senza id (mai
    caricati / senza finale) non compaiono: non c'e' niente da rinominare.
    """
    label = partner_label(partner)
    plan: List[Dict[str, Any]] = []

    if masterclass:
        mc_id = masterclass.get("video_youtube_id") or youtube_id_from_url(
            masterclass.get("video_youtube_url")
        )
        if mc_id:
            plan.append({
                "video_id": mc_id,
                "kind": "masterclass",
                "lesson_id": None,
                "target_title": masterclass_title(label, masterclass),
            })

    lessons = ((videocorso or {}).get("lessons")) or {}
    if isinstance(lessons, dict):
        for lesson_id, lesson in sorted(lessons.items(), key=_sort_key):
            if not isinstance(lesson, dict):
                continue
            vid = lesson.get("video_youtube_id") or youtube_id_from_url(
                lesson.get("video_youtube_url")
            )
            if not vid:
                continue
            title = lesson_title(label, lesson_id, lesson)
            if not title:
                continue
            plan.append({
                "video_id": vid,
                "kind": "lesson",
                "lesson_id": lesson_id,
                "target_title": title,
            })

    return plan


def playlist_removal_plan(keep_ids, playlist_items):
    """Item della playlist da rimuovere = quelli il cui video NON e' fra i finali
    da tenere (`keep_ids`). Puro: riceve la lista gia' letta da YouTube
    (dict con `video_id`, `playlist_item_id`, `title`) e ritorna i candidati.
    Un finale duplicato nella playlist si tiene (il suo video_id e' in keep).
    """
    keep = set(keep_ids or [])
    out = []
    for it in playlist_items or []:
        vid = it.get("video_id")
        item_id = it.get("playlist_item_id") or it.get("id")
        if not vid or not item_id:
            continue
        if vid in keep:
            continue
        out.append({
            "video_id": vid,
            "playlist_item_id": item_id,
            "title": it.get("title", ""),
        })
    return out
