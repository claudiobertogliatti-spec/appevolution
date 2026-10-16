"""Flusso Delivery (T12): posizionamento versionato e prove per i casi studio.

Due capacità deterministiche (nessun effetto, nessuna pubblicazione automatica):

- `delivery.generate_positioning` — coordina la catena canonica: prerequisiti → artefatto
  **versionato** → revisione prevista → disponibilità al partner SOLO dopo approvazione della
  stessa versione. Input mancante = richiesta interna precisa. Il video è un'attività **figlia
  monitorata** (pipeline reale `video_pipeline_task`), NON il vecchio fallback Andrea. Nessuna
  riapprovazione automatica di una nuova versione.
- `delivery.case_study_evidence_check` — raccoglie prova misurata + consenso + approvazione ed
  emette `candidate` / `verifiable` / `blocked`. Un caso studio senza consenso o senza prova non
  è pubblicabile: `blocked`. MAI una testimonianza pubblicata in automatico.
"""

from __future__ import annotations

from typing import Any, List, Mapping

from .contracts import (
    ExecutionPolicy,
    TaskCapability,
    TaskInputError,
    TaskKind,
    build_idempotency_key,
    compute_input_version,
)

GENERATE_POSITIONING = "delivery.generate_positioning"
CASE_STUDY_EVIDENCE = "delivery.case_study_evidence_check"
INPUT_VERSION = 1


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


# ─────────────────────────── delivery.generate_positioning ───────────────────────────

def validate_positioning_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    if not isinstance(payload, Mapping):
        raise TaskInputError(GENERATE_POSITIONING, "payload non valido")
    deliverable = payload.get("deliverable")
    if not isinstance(deliverable, Mapping):
        raise TaskInputError(GENERATE_POSITIONING, "manca il deliverable")
    if not _norm(deliverable.get("partner_id")):
        raise TaskInputError(GENERATE_POSITIONING, "deliverable senza partner_id")
    return {"deliverable": dict(deliverable)}


def _missing_prerequisites(deliverable: Mapping[str, Any]) -> List[str]:
    prereq = deliverable.get("prerequisites") or {}
    required = prereq.get("required") or []
    present = set(prereq.get("present") or [])
    return [r for r in required if r not in present]


def generate_positioning(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: coordina la catena del posizionamento. Deterministico, nessun effetto."""
    deliverable = validated["deliverable"]
    partner_id = _norm(deliverable.get("partner_id"))
    # La versione è del CONTENUTO, non della metadata di revisione: così `approved_version`
    # può combaciare con la versione approvata (niente circolarità).
    content_key = {
        "partner_id": partner_id,
        "content_ref": _norm(deliverable.get("content_ref")),
        "prerequisites": dict(deliverable.get("prerequisites") or {}),
        "includes_video": bool(deliverable.get("includes_video")),
        "video_ref": _norm(deliverable.get("video_ref")),
    }
    version = compute_input_version(content_key)
    version_ref = build_idempotency_key(GENERATE_POSITIONING, {"partner_id": partner_id}, version)

    missing = _missing_prerequisites(deliverable)
    if missing:
        return {
            "version_ref": version_ref,
            "version": version,
            "status": "blocked_missing_input",
            "availability": "unavailable",
            "missing_input": missing,
            "next_action": {"owner_id": "delivery", "request": f"fornire: {', '.join(missing)}"},
            "reasons": [f"prerequisiti canonici mancanti: {', '.join(missing)}"],
            "input_version": INPUT_VERSION,
        }

    content_ref = _norm(deliverable.get("content_ref"))
    review_state = _norm(deliverable.get("review_state"))
    approved_version = _norm(deliverable.get("approved_version"))

    child_activities = []
    if deliverable.get("includes_video"):
        video_ref = _norm(deliverable.get("video_ref")) or partner_id
        child_activities.append({
            "type": "video",
            "task_type": "video.render",          # pipeline reale, NON fallback Andrea
            "monitored": True,
            "idempotency_key": build_idempotency_key("video.render", {"video": video_ref}, version),
        })

    # Disponibilità al partner SOLO se la STESSA versione è stata approvata e il file esiste.
    approved_this_version = review_state == "approved" and approved_version == version
    if review_state == "rejected":
        status, availability, reasons = "changes_requested", "unavailable", ["revisione rifiutata: nuova versione richiesta"]
    elif approved_this_version and content_ref:
        status, availability, reasons = "available", "available", ["approvato e disponibile al partner"]
    elif approved_this_version and not content_ref:
        status, availability, reasons = "ready_for_review", "unavailable", ["approvato ma file non disponibile: da rigenerare"]
    else:
        # pending, o approvazione riferita a una versione diversa (nuovo input) → niente riapprovazione automatica
        status, availability = "ready_for_review", "pending_review"
        reasons = ["versione in attesa di revisione (nessuna riapprovazione automatica)"]

    artifact = {
        "version_ref": version_ref,
        "version": version,
        "status": status,
        "availability": availability,
        "requires_review": True,
        "content_ref": content_ref,
        "child_activities": child_activities,
        "reasons": reasons,
        "input_version": INPUT_VERSION,
    }
    if availability == "available":
        artifact["availability_ref"] = build_idempotency_key("positioning.available", {"partner_id": partner_id}, version)
    return artifact


def verify_positioning(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("version_ref")
        and artifact.get("status")
        and artifact.get("reasons")
    )
    # La prova è la disponibilità quando c'è, altrimenti il riferimento di versione prodotto.
    evidence = artifact.get("availability_ref") or artifact.get("version_ref")
    return {
        "verified": ok,
        "evidence_refs": [evidence] if ok else [],
        "checks": {"has_version": bool(artifact.get("version_ref")), "has_status": bool(artifact.get("status"))},
    }


# ─────────────────────────── delivery.case_study_evidence_check ───────────────────────────

def validate_case_study_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    if not isinstance(payload, Mapping):
        raise TaskInputError(CASE_STUDY_EVIDENCE, "payload non valido")
    cs = payload.get("case_study")
    if not isinstance(cs, Mapping):
        raise TaskInputError(CASE_STUDY_EVIDENCE, "manca il case_study")
    if not _norm(cs.get("partner_id")):
        raise TaskInputError(CASE_STUDY_EVIDENCE, "case_study senza partner_id")
    return {"case_study": dict(cs)}


def case_study_evidence_check(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: emette candidate/verifiable/blocked. Mai pubblicazione automatica."""
    cs = validated["case_study"]
    partner_id = _norm(cs.get("partner_id"))
    version = compute_input_version(validated)
    check_ref = build_idempotency_key(CASE_STUDY_EVIDENCE, {"partner_id": partner_id}, version)

    consent = bool(cs.get("consent"))
    # `prova` = risultato concreto misurato (chiave reale di case_study_engine). Vuota = nessuna prova.
    risultato = cs.get("risultato") or {}
    measured = bool(_norm(risultato.get("prova")) if isinstance(risultato, Mapping) else None)
    approved = bool(cs.get("approved"))

    if not consent:
        status, reasons = "blocked", ["consenso mancante: nessuna testimonianza pubblicabile"]
    elif not measured:
        status, reasons = "blocked", ["risultato senza prova misurata: non usabile come caso studio"]
    elif approved:
        status, reasons = "verifiable", ["consenso + prova + approvazione: usabile (solo approvato)"]
    else:
        status, reasons = "candidate", ["consenso + prova presenti: candidato, serve approvazione"]

    evidence_refs = []
    if status in ("verifiable", "candidate"):
        evidence_refs.append(build_idempotency_key("case_study.proof", {"partner_id": partner_id}, version))
    if consent:
        evidence_refs.append(build_idempotency_key("case_study.consent", {"partner_id": partner_id}, version))

    return {
        "check_ref": check_ref,
        "status": status,               # candidate | verifiable | blocked — MAI "published"
        "published": False,             # esplicito: nessuna pubblicazione automatica
        "consent": consent,
        "measured_proof": measured,
        "approved": approved,
        "evidence_refs": evidence_refs,
        "reasons": reasons,
        "input_version": INPUT_VERSION,
    }


def verify_case_study(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("check_ref")
        and artifact.get("status") in ("candidate", "verifiable", "blocked")
        and artifact.get("reasons")
        and artifact.get("published") is False
    )
    return {
        "verified": ok,
        "evidence_refs": [artifact["check_ref"]] if ok else [],
        "checks": {"never_published": artifact.get("published") is False, "has_status": bool(artifact.get("status"))},
    }


GENERATE_POSITIONING_CAPABILITY = TaskCapability(
    task_type=GENERATE_POSITIONING,
    input_version=INPUT_VERSION,
    kind=TaskKind.AI,
    executor=generate_positioning,
    verifier=verify_positioning,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_positioning_input,
)

CASE_STUDY_EVIDENCE_CAPABILITY = TaskCapability(
    task_type=CASE_STUDY_EVIDENCE,
    input_version=INPUT_VERSION,
    kind=TaskKind.AI,
    executor=case_study_evidence_check,
    verifier=verify_case_study,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_case_study_input,
)


def register(registry) -> None:
    """Abilita le capacità Delivery. NON registrate nel DEFAULT_TASK_REGISTRY: l'attivazione
    in produzione è una scelta esplicita (T21)."""
    registry.register(GENERATE_POSITIONING_CAPABILITY)
    registry.register(CASE_STUDY_EVIDENCE_CAPABILITY)
