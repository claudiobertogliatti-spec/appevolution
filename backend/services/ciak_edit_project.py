"""
Ciak Edit Project — la lezione come "progetto di montaggio vivo".

Implementa il modello dati `edit_project` della spec
`docs/specs/2026-07-11-ciak-editing-studio-design.md` come helper PURI:
nessun I/O DB, nessuna rete, tutto testabile in isolamento.

Perché esiste: oggi lo stato del montaggio è sparso su campi piatti del documento
lezione (`review_transcript`, `review_words`, `review_cut_segments`, `output_version`…).
Quella forma non ha posto per più sorgenti, intro/outro, patch di overdub o scene —
cioè per nessuno dei moduli previsti dopo la Fase 1.

⚠️ STRATEGIA ADDITIVA: `edit_project` si scrive **in aggiunta** ai campi legacy, mai al
loro posto. Il frontend (`MasterclassReview.jsx`) legge ancora i campi piatti e non deve
rompersi. `read_edit_project()` fa il contrario: se `edit_project` non c'è, lo ricostruisce
al volo dai campi legacy, così i consumatori nuovi funzionano anche sui documenti vecchi.
"""
from __future__ import annotations

from typing import Any, Optional

SCHEMA_VERSION = 2

# Stati ammessi da edit_project (spec §Architettura).
REVIEW_STATUS = ("da_revisionare", "montaggio", "pronto", "pubblicato", "error")

# I pipeline_status reali usati da video_pipeline_task.py -> stato edit_project.
_STATUS_MAP = {
    "da_revisionare": "da_revisionare",
    "downloading": "montaggio",
    "cutting_fillers": "montaggio",
    "burning_subtitles": "montaggio",
    "uploading_gcs": "montaggio",
    "uploading_youtube": "montaggio",
    "ready_for_review": "pronto",
    "completed": "pronto",
    "published": "pubblicato",
    "approved": "pubblicato",
}


def map_pipeline_status(status: Optional[str]) -> str:
    """Traduce un `pipeline_status` della pipeline nello stato di edit_project.
    Qualsiasi stato che inizia per 'error' → 'error'. Ignoto → 'da_revisionare'."""
    s = (status or "").strip().lower()
    if s.startswith("error"):
        return "error"
    return _STATUS_MAP.get(s, "da_revisionare")


def build_source(
    *,
    source_id: str = "src_01",
    gcs_path: Optional[str] = None,
    original_name: Optional[str] = None,
    duration_s: Optional[float] = None,
    transcript: str = "",
    words: Optional[list] = None,
    filler_report: Optional[dict] = None,
    cut_segments: Optional[list] = None,
    order: int = 0,
    added_at: Optional[str] = None,
) -> dict:
    """Un elemento di `sources[]`. In Fase 1/2 ne esiste sempre uno solo."""
    return {
        "source_id": source_id,
        "gcs_path": gcs_path,
        "original_name": original_name,
        "duration_s": float(duration_s) if duration_s is not None else None,
        "transcript": transcript or "",
        "words": list(words or []),
        "filler_report": filler_report or {"count": 0, "segments": [], "time_saved_s": 0},
        "cut_segments": list(cut_segments or []),
        "order": int(order),
        "added_at": added_at,
    }


def build_edit_project(
    *,
    sources: Optional[list] = None,
    version: int = 1,
    review_status: str = "da_revisionare",
    intro: Optional[dict] = None,
    outro: Optional[dict] = None,
    output: Optional[dict] = None,
    updated_at: Optional[str] = None,
) -> dict:
    """Struttura completa. Il modello è quello finale (multi-clip + intro/outro);
    le Fasi 1-2 ne popolano il sottoinsieme a singola sorgente."""
    status = review_status if review_status in REVIEW_STATUS else "da_revisionare"
    return {
        "version": int(version),
        "sources": list(sources or []),
        "intro": intro or {"enabled": False, "script": "", "generated": False, "media_gcs": None},
        "outro": outro or {"enabled": False, "script": "", "media_gcs": None},
        "review_status": status,
        "output": output or {"gcs_path": None, "ciak_url": None, "duration_s": None, "montaged_at": None},
        "updated_at": updated_at,
    }


def from_legacy(doc: dict) -> dict:
    """Ricostruisce `edit_project` dai campi piatti di un documento lezione/masterclass.

    Accetta sia il documento lezione (`lessons.{id}`) sia quello masterclass: i nomi dei
    campi coincidono, tranne lo stato (`pipeline_status` vs `video_pipeline_status`).
    """
    doc = doc or {}
    status = doc.get("pipeline_status") or doc.get("video_pipeline_status")
    # Un documento senza girato NON ha una sorgente vuota: non ha sorgenti.
    # (chi legge usa primary_source(), che ha il suo fallback)
    if not any((doc.get("video_raw_url"), doc.get("review_transcript"),
                doc.get("video_transcript"), doc.get("review_words"))):
        return build_edit_project(sources=[], review_status=map_pipeline_status(status),
                                  updated_at=doc.get("updated_at"))
    src = build_source(
        gcs_path=doc.get("video_raw_url"),
        original_name=doc.get("video_original_name"),
        duration_s=doc.get("video_raw_duration_s"),
        transcript=doc.get("review_transcript") or doc.get("video_transcript") or "",
        words=doc.get("review_words"),
        filler_report=doc.get("review_filler_report") or doc.get("video_filler_report"),
        cut_segments=doc.get("review_cut_segments"),
        added_at=doc.get("review_created_at"),
    )
    return build_edit_project(
        sources=[src],
        version=int(doc.get("output_version") or 0) or 1,
        review_status=map_pipeline_status(status),
        output={
            "gcs_path": doc.get("output_gcs_url"),
            "ciak_url": doc.get("video_ciak_url") or doc.get("video_embed_url"),
            "duration_s": doc.get("video_final_duration_s"),
            "montaged_at": doc.get("pipeline_completed_at"),
        },
        updated_at=doc.get("updated_at"),
    )


def read_edit_project(doc: dict) -> dict:
    """Legge `edit_project` da un documento. Se assente, lo ricostruisce dai campi legacy.
    👉 È l'unico punto da cui i consumatori nuovi dovrebbero leggere lo stato del montaggio."""
    doc = doc or {}
    ep = doc.get("edit_project")
    if isinstance(ep, dict) and ep.get("sources"):
        return ep
    return from_legacy(doc)


def primary_source(doc_or_project: dict) -> dict:
    """La sorgente principale (`order` più basso). In Fase 1/2 è l'unica."""
    ep = doc_or_project if "sources" in (doc_or_project or {}) else read_edit_project(doc_or_project)
    srcs = sorted((ep or {}).get("sources") or [], key=lambda s: s.get("order", 0))
    return srcs[0] if srcs else build_source()


def enabled_cuts(doc_or_project: dict) -> list:
    """I soli tagli attivi della sorgente principale, ordinati per `start`.
    Stessa semantica del filtro che la pipeline applica oggi sui campi legacy."""
    segs = [s for s in (primary_source(doc_or_project).get("cut_segments") or []) if s.get("enabled")]
    segs.sort(key=lambda x: x.get("start", 0))
    return segs


def mongo_set_fields(edit_project: dict, *, lesson_key: Optional[str] = None) -> dict:
    """Il frammento `$set` per scrivere edit_project.

    `lesson_key` = "lessons.{lesson_id}" per il videocorso; None per la masterclass
    (che vive alla radice di `masterclass_factory`).
    ⚠️ Scrive SOLO `edit_project`: i campi legacy vanno scritti a parte, come oggi.
    """
    prefix = f"{lesson_key}." if lesson_key else ""
    return {f"{prefix}edit_project": edit_project}


def safe_set_fields(builder, *, lesson_key: Optional[str] = None, **kwargs) -> dict:
    """Costruisce il frammento `$set` per edit_project **senza poter mai sollevare**.

    Se qualcosa va storto ritorna `{}`: la pipeline prosegue e scrive i soli campi
    legacy, esattamente come faceva prima. È la rete di sicurezza che rende davvero
    additiva questa introduzione — un bug qui non deve bloccare il video di un partner.

    `builder` è una delle funzioni `project_*` di questo modulo.
    """
    try:
        return mongo_set_fields(builder(**kwargs), lesson_key=lesson_key)
    except Exception:  # noqa: BLE001 — volutamente ampio: mai propagare
        return {}


def project_from_pipeline(
    *,
    doc: dict,
    video_url: Optional[str] = None,
    raw_duration_s: Optional[float] = None,
    transcript: str = "",
    words: Optional[list] = None,
    filler_report: Optional[dict] = None,
    cut_segments: Optional[list] = None,
    pipeline_status: Optional[str] = None,
    updated_at: Optional[str] = None,
) -> dict:
    """Aggiorna il progetto con quello che la pipeline ha appena prodotto, preservando
    ciò che c'è già (intro/outro configurati, output di montaggi precedenti).
    Gli argomenti a None non sovrascrivono: si tiene il valore esistente."""
    current = read_edit_project(doc)
    src = primary_source(current)
    merged = build_source(
        source_id=src.get("source_id") or "src_01",
        gcs_path=video_url if video_url is not None else src.get("gcs_path"),
        original_name=src.get("original_name"),
        duration_s=raw_duration_s if raw_duration_s is not None else src.get("duration_s"),
        transcript=transcript if transcript else src.get("transcript", ""),
        words=words if words is not None else src.get("words"),
        filler_report=filler_report if filler_report is not None else src.get("filler_report"),
        cut_segments=cut_segments if cut_segments is not None else src.get("cut_segments"),
        order=src.get("order", 0),
        added_at=src.get("added_at") or updated_at,
    )
    return build_edit_project(
        sources=[merged],
        version=current.get("version", 1),
        review_status=map_pipeline_status(pipeline_status) if pipeline_status else current.get("review_status", "da_revisionare"),
        intro=current.get("intro"),
        outro=current.get("outro"),
        output=current.get("output"),
        updated_at=updated_at or current.get("updated_at"),
    )


def project_after_montage(
    *,
    doc: dict,
    gcs_path: Optional[str] = None,
    ciak_url: Optional[str] = None,
    final_duration_s: Optional[float] = None,
    montaged_at: Optional[str] = None,
    version: Optional[int] = None,
) -> dict:
    """Chiude il montaggio: scrive `output`, porta lo stato a 'pronto' e bumpa `version`."""
    current = read_edit_project(doc)
    new_version = int(version) if version is not None else int(current.get("version", 1)) + 1
    return build_edit_project(
        sources=current.get("sources"),
        version=new_version,
        review_status="pronto",
        intro=current.get("intro"),
        outro=current.get("outro"),
        output={
            "gcs_path": gcs_path,
            "ciak_url": ciak_url,
            "duration_s": float(final_duration_s) if final_duration_s is not None else None,
            "montaged_at": montaged_at,
        },
        updated_at=montaged_at,
    )
