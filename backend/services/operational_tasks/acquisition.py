"""Flusso Acquisizione (T10): qualifica un contatto ESISTENTE e prepara la consegna a Vendite.

Nessun acquisto lista, nessun cold outreach: si legge un contatto già presente, si produce
una qualificazione **deterministica e motivata** (spiegabile, senza LLM opaco) e la **bozza**
del prossimo passo. Nessun invio: solo una consegna interna a Vendite quando i campi
obbligatori ci sono, altrimenti un'attività di integrazione dati con owner.

La capacità è registrabile nel motore (kind AI, nessun effetto esterno, nessuna approvazione):
gira via `completion.execute_and_verify_registered` e completa solo con l'artefatto verificato.
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

QUALIFY_CONTACT = "acquisition.qualify_contact"
QUALIFY_INPUT_VERSION = 1
# Obbligatori per poter passare a Vendite: identità + provenienza (consenso/fonte).
REQUIRED_FOR_HANDOFF = ("email", "source")
OPTIN_TAG = "ciak_optin_masterclass"
_CHANNEL_FIELDS = ("email", "telefono", "phone", "business_phone")


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def validate_qualify_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    """Serve un contatto identificabile (email o id) per poterlo LEGGERE. La
    qualificazione vera e propria avviene nell'esecutore."""
    if not isinstance(payload, Mapping):
        raise TaskInputError(QUALIFY_CONTACT, "payload non valido")
    contact = payload.get("contact")
    if not isinstance(contact, Mapping):
        raise TaskInputError(QUALIFY_CONTACT, "manca il contatto")
    if not (_norm(contact.get("email")) or _norm(contact.get("id"))):
        raise TaskInputError(QUALIFY_CONTACT, "contatto non identificabile: né email né id")
    return {"contact": dict(contact)}


def _missing_required(contact: Mapping[str, Any]) -> List[str]:
    return [f for f in REQUIRED_FOR_HANDOFF if not _norm(contact.get(f))]


def _reachable(contact: Mapping[str, Any]) -> bool:
    return any(_norm(contact.get(f)) for f in _CHANNEL_FIELDS)


def _has_optin(contact: Mapping[str, Any]) -> bool:
    tags = contact.get("tags")
    return isinstance(tags, (list, tuple)) and OPTIN_TAG in tags


def qualify_contact(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: produce la qualificazione (artefatto). Deterministico, nessun effetto esterno."""
    contact = validated["contact"]
    identity = _norm(contact.get("email")) or _norm(contact.get("id"))
    source = _norm(contact.get("source"))
    missing = _missing_required(contact)
    reachable = _reachable(contact)
    warm = _has_optin(contact)
    version = compute_input_version(validated)
    qualified = not missing and reachable

    reasons: List[str] = []
    if missing:
        reasons.append(f"campi obbligatori mancanti: {', '.join(missing)}")
    if not reachable:
        reasons.append("nessun canale raggiungibile (email/telefono)")
    if qualified:
        reasons.append("caldo: opt-in registrato" if warm
                       else "freddo: provenienza da verificare prima del contatto")

    ref = build_idempotency_key(QUALIFY_CONTACT, {"identity": identity}, version)
    if qualified:
        next_step = {
            "type": "handoff",
            "to_department": "vendite",
            "task_type": "sales.prepare_next_action",
            "entity_ref": {"type": "contact", "id": identity},
            "idempotency_key": ref,
            "warm": warm,
        }
    else:
        next_step = {
            "type": "data_integration",
            "owner_id": "acquisizione",
            "missing": missing,
            "needs_channel": not reachable,
        }

    return {
        "qualification_ref": ref,
        "qualified": qualified,
        "reasons": reasons,
        "missing_fields": missing,
        "warm": warm,
        "sources": [source] if source else [],
        "next_step": next_step,  # BOZZA: nessun invio qui
        "input_version": QUALIFY_INPUT_VERSION,
    }


def verify_qualification(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """La qualificazione è verificata se l'artefatto è ben formato (decisione motivata +
    riferimento + prossimo passo). Vale sia per qualificato sì che no."""
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("qualification_ref")
        and "qualified" in artifact
        and artifact.get("reasons")
        and isinstance(artifact.get("next_step"), Mapping)
    )
    return {
        "verified": ok,
        "evidence_refs": [artifact["qualification_ref"]] if ok else [],
        "checks": {
            "has_ref": bool(artifact.get("qualification_ref")),
            "has_decision": "qualified" in artifact,
            "has_next_step": isinstance(artifact.get("next_step"), Mapping),
        },
    }


QUALIFY_CONTACT_CAPABILITY = TaskCapability(
    task_type=QUALIFY_CONTACT,
    input_version=QUALIFY_INPUT_VERSION,
    kind=TaskKind.AI,
    executor=qualify_contact,
    verifier=verify_qualification,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_qualify_input,
)


def register(registry) -> None:
    """Abilita la capacità in un registry. NON viene registrata automaticamente nel
    DEFAULT_TASK_REGISTRY: l'attivazione in produzione è una scelta esplicita (T21)."""
    registry.register(QUALIFY_CONTACT_CAPABILITY)
