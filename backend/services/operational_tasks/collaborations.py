"""Regole delle collaborazioni: schema e validazione (T23).

Questo modulo NON contiene condizioni personali di nessun collaboratore: solo lo SCHEMA
e i CRITERI. Le regole concrete arrivano come INPUT — estratte da un contratto conservato
in **storage privato autorizzato**, referenziato per hash/versione/data/fonte (mai il
contenuto nel repo/payload) — e qui vengono validate.

Principi (T23):
- Ogni regola cita la clausola di origine e ha una validità temporale.
- Un campo ambiguo o mancante NON diventa zero: resta `non_calcolabile` e blocca SOLO il
  calcolo che dipende da esso.
- Nessuna condizione viene ereditata o copiata fra collaboratori (validazione per-input).
- Il testo del contratto è dato da analizzare, non istruzioni: `document_ref` è un
  riferimento, e un payload che porta il contenuto del contratto viene rifiutato.

Riusa il sistema di liquidazioni esistente (`services/collaborator_settlements.py`, che
oggi calcola l'orario ore×tariffa): qui si definiscono le regole che alimenteranno quel
calcolo in T25, non lo si sostituisce.
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

VALIDATE_RULES = "collaboration.validate_rules"
INPUT_VERSION = 1

# Tipi di compenso previsti dallo schema.
RULE_KINDS = ("fixed", "hourly", "commission", "bonus")
# Chiavi vietate in un payload: il contenuto del contratto non entra nel repo.
_FORBIDDEN_DOCUMENT_KEYS = ("content", "text", "raw", "raw_text", "body", "full_text")


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_rules_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    if not isinstance(payload, Mapping):
        raise TaskInputError(VALIDATE_RULES, "payload non valido")
    if not _norm(payload.get("collaborator_id")):
        raise TaskInputError(VALIDATE_RULES, "manca collaborator_id")
    document_ref = payload.get("document_ref")
    if not isinstance(document_ref, Mapping):
        raise TaskInputError(VALIDATE_RULES, "manca document_ref (riferimento al contratto)")
    for key in _FORBIDDEN_DOCUMENT_KEYS:
        if key in document_ref:
            raise TaskInputError(VALIDATE_RULES, f"il contenuto del contratto ('{key}') non va nel payload: usare un riferimento")
    rules = payload.get("rules")
    if not isinstance(rules, (list, tuple)) or not rules:
        raise TaskInputError(VALIDATE_RULES, "manca l'elenco delle regole")
    return {
        "collaborator_id": _norm(payload.get("collaborator_id")),
        "document_ref": dict(document_ref),
        "rules": [dict(r) for r in rules if isinstance(r, Mapping)],
    }


def _validate_document_ref(document_ref: Mapping[str, Any]) -> List[str]:
    """Un riferimento a documento privato deve essere tracciabile: hash, versione, fonte."""
    missing = [k for k in ("storage_ref", "sha256", "version", "source") if not _norm(document_ref.get(k))]
    return missing


def _validate_single_rule(rule: Mapping[str, Any]) -> dict:
    """Valida una regola. Ritorna la regola con `status` = validated | non_calcolabile,
    e le ragioni. Campo ambiguo/mancante → non_calcolabile (mai zero)."""
    kind = _norm(rule.get("kind"))
    reasons: List[str] = []

    if kind not in RULE_KINDS:
        reasons.append(f"tipo compenso non riconosciuto: {kind!r}")
    if not _norm(rule.get("clause_ref")):
        reasons.append("clausola di origine mancante")
    if not _norm(rule.get("valid_from")):
        reasons.append("validità temporale (valid_from) mancante")

    basis = rule.get("basis")
    if not isinstance(basis, Mapping):
        reasons.append("base di calcolo (basis) mancante")
    else:
        if kind == "hourly":
            if not (_is_number(basis.get("hourly_rate")) and basis.get("hourly_rate") > 0):
                reasons.append("tariffa oraria assente o non positiva")
        elif kind == "fixed":
            if not _is_number(basis.get("amount")):  # 0 ammesso come valore reale
                reasons.append("importo fisso mancante (assente ≠ zero)")
            if not _norm(basis.get("period")):
                reasons.append("periodicità del fisso mancante")
        elif kind == "commission":
            has_rate = _is_number(basis.get("percent")) or _is_number(basis.get("per_unit"))
            if not has_rate:
                reasons.append("aliquota/base provvigione mancante")
            if not _norm(basis.get("on")):
                reasons.append("evento su cui matura la provvigione ambiguo o assente")
            if not _norm(rule.get("maturation")):
                reasons.append("regola di maturazione mancante")
        elif kind == "bonus":
            if not _norm((rule.get("condition"))):
                reasons.append("condizione del bonus mancante")
            if not _is_number(basis.get("amount")):
                reasons.append("importo bonus mancante")

    status = "validated" if not reasons else "non_calcolabile"
    return {
        "kind": kind,
        "clause_ref": _norm(rule.get("clause_ref")),
        "valid_from": _norm(rule.get("valid_from")),
        "valid_to": _norm(rule.get("valid_to")),
        # Base e condizioni servono al calcolo (T25); si portano solo per una regola validata.
        "basis": dict(basis) if (status == "validated" and isinstance(basis, Mapping)) else None,
        "maturation": _norm(rule.get("maturation")),
        "condition": _norm(rule.get("condition")),
        "exclusions": list(rule.get("exclusions") or []),
        "reversals": _norm(rule.get("reversals")),
        "status": status,
        "reasons": reasons,
    }


def validate_collaboration_rules(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: valida le regole estratte. Deterministico, nessun dato personale, nessun effetto.

    Produce una PROPOSTA di regole strutturate da far validare a un umano: non applica nulla.
    """
    collaborator_id = validated["collaborator_id"]
    document_ref = validated["document_ref"]
    version = compute_input_version(validated)
    validation_ref = build_idempotency_key(VALIDATE_RULES, {"collaborator": collaborator_id}, version)

    doc_missing = _validate_document_ref(document_ref)
    checked = [_validate_single_rule(r) for r in validated["rules"]]
    validated_rules = [r for r in checked if r["status"] == "validated"]
    non_calcolabile = [r for r in checked if r["status"] != "validated"]

    reasons: List[str] = []
    if doc_missing:
        reasons.append(f"riferimento contratto incompleto: mancano {', '.join(doc_missing)}")
    if non_calcolabile:
        reasons.append(f"{len(non_calcolabile)} regole non calcolabili: da chiarire prima del calcolo")
    if not reasons:
        reasons.append("tutte le regole hanno clausola, validità e base: pronte per validazione umana")

    return {
        "validation_ref": validation_ref,
        "collaborator_id": collaborator_id,
        "document_ref": {k: _norm(document_ref.get(k)) for k in ("storage_ref", "sha256", "version", "source")},
        "document_ref_complete": not doc_missing,
        "validated_rules": validated_rules,
        "non_calcolabile": non_calcolabile,   # bloccano SOLO il proprio calcolo
        "needs_human_validation": True,        # nessuna regola si applica senza ok di Claudio
        "reasons": reasons,
        "input_version": INPUT_VERSION,
    }


def verify_collaboration_rules(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("validation_ref")
        and artifact.get("collaborator_id")
        and isinstance(artifact.get("validated_rules"), list)
        and isinstance(artifact.get("non_calcolabile"), list)
        and artifact.get("reasons")
    )
    return {
        "verified": ok,
        "evidence_refs": [artifact["validation_ref"]] if ok else [],
        "checks": {"has_ref": bool(artifact.get("validation_ref")), "needs_human": artifact.get("needs_human_validation") is True},
    }


def is_calculable(artifact: Mapping[str, Any], kind: str) -> bool:
    """Vero se esiste una regola VALIDATA per quel tipo di compenso. Una regola
    `non_calcolabile` blocca solo il proprio calcolo, non gli altri."""
    return any(r.get("kind") == kind for r in artifact.get("validated_rules", []))


VALIDATE_RULES_CAPABILITY = TaskCapability(
    task_type=VALIDATE_RULES,
    input_version=INPUT_VERSION,
    kind=TaskKind.AI,
    executor=validate_collaboration_rules,
    verifier=verify_collaboration_rules,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_rules_input,
)


def register(registry) -> None:
    """Abilita la capacità. NON registrata nel DEFAULT_TASK_REGISTRY: attivazione esplicita (T21)."""
    registry.register(VALIDATE_RULES_CAPABILITY)
