"""Flusso Back office (T13): scadenza riconciliata e attività di recupero.

`back_office.check_due_item` legge un piano di pagamento reale (`PianoPagamento` in
`routers/ciak_admin.py`: tipo/rate_totali/rate_pagate/importo_rata/prossima_scadenza) e la
prova di pagamento, e classifica la rata dovuta:

- `atteso` — dovuta, nessuna prova. **Mai** dedotta come incassata dal solo trascorrere della data.
- `incassato_verificato` — prova riconciliata e importo combaciante.
- `esito_da_confermare` — c'è un movimento ma non riconciliato (importo diverso / non collegato).
- `sospeso` — solleciti sospesi (es. congelamento concordato): nessuna bozza di sollecito.
- anomalie: `rate_incoerenti` (rate_pagate > rate_totali, es. "rata 9 di 2"), `importo_mancante`
  (≠ importo 0, che è un valore reale), `scadenza_mancante` (rata priva di data).

Deterministico: NON incassa, NON paga, NON rimborsa, NON incrementa le rate. Classifica e, per
anomalia o scaduto, prepara UNA attività con documento e prossima azione (sollecito solo bozza).
"""

from __future__ import annotations

from typing import Any, List, Mapping, Optional

from .contracts import (
    ExecutionPolicy,
    TaskCapability,
    TaskInputError,
    TaskKind,
    build_idempotency_key,
    compute_input_version,
)

CHECK_DUE_ITEM = "back_office.check_due_item"
INPUT_VERSION = 1


def _norm(value: Any) -> Any:
    return value.strip() if isinstance(value, str) else value


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_due_item_input(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    if not isinstance(payload, Mapping):
        raise TaskInputError(CHECK_DUE_ITEM, "payload non valido")
    item = payload.get("due_item")
    if not isinstance(item, Mapping):
        raise TaskInputError(CHECK_DUE_ITEM, "manca il due_item")
    if not _norm(item.get("partner_id")):
        raise TaskInputError(CHECK_DUE_ITEM, "due_item senza partner_id")
    return {"due_item": dict(item)}


def check_due_item(validated: Mapping[str, Any]) -> Mapping[str, Any]:
    """Esecutore: classifica la rata dovuta. Deterministico, nessuna azione economica."""
    item = validated["due_item"]
    partner_id = _norm(item.get("partner_id"))
    version = compute_input_version(validated)
    check_ref = build_idempotency_key(CHECK_DUE_ITEM, {"partner_id": partner_id}, version)

    rate_totali = item.get("rate_totali")
    rate_pagate = item.get("rate_pagate")
    importo = item.get("importo_rata")
    scadenza = _norm(item.get("prossima_scadenza"))
    as_of = _norm(item.get("as_of"))
    suspended = bool(item.get("reminders_suspended"))
    proof = item.get("payment_proof")

    status: str
    anomaly: Optional[str] = None
    reasons: List[str] = []
    overdue = False

    if not (_is_number(rate_totali) and _is_number(rate_pagate)):
        status, anomaly = "anomaly", "piano_incompleto"
        reasons.append("piano senza rate_totali/rate_pagate numeriche")
    elif rate_pagate > rate_totali:
        status, anomaly = "anomaly", "rate_incoerenti"
        reasons.append(f"rata {int(rate_pagate)} di {int(rate_totali)}: piano incoerente")
    elif rate_pagate == rate_totali:
        status = "completed"
        reasons.append("tutte le rate risultano pagate")
    elif importo is None:
        status, anomaly = "anomaly", "importo_mancante"
        reasons.append("importo rata mancante (dato assente, diverso da zero)")
    elif not _is_number(importo):
        status, anomaly = "anomaly", "importo_non_valido"
        reasons.append("importo rata non numerico")
    elif not scadenza:
        status, anomaly = "anomaly", "scadenza_mancante"
        reasons.append("rata priva di data di scadenza")
    elif isinstance(proof, Mapping):
        reconciled = proof.get("reconciled") is True
        amount_ok = _is_number(proof.get("amount")) and proof.get("amount") == importo
        if reconciled and amount_ok:
            status = "incassato_verificato"
            reasons.append("prova riconciliata e importo combaciante")
        else:
            status = "esito_da_confermare"
            reasons.append("movimento presente ma non riconciliato (importo diverso o non collegato)")
    else:
        status = "atteso"
        overdue = bool(as_of and scadenza and as_of > scadenza)
        reasons.append("rata scaduta, nessun incasso registrato" if overdue
                       else "rata attesa entro la scadenza")

    # Solleciti sospesi: si segnala, ma nessuna bozza viene preparata.
    if suspended and status in ("atteso",):
        status = "sospeso"
        reasons.append("solleciti sospesi: nessuna bozza preparata")

    # UNA attività per anomalia o rata scaduta; sollecito solo come bozza, se consentito.
    activity = None
    reminder_draft = None
    if anomaly or (status == "atteso" and overdue):
        activity = {
            "owner_id": "back_office",
            "kind": anomaly or "rata_scaduta",
            "document_ref": build_idempotency_key("back_office.activity", {"partner_id": partner_id}, version),
            "next_action": "verificare e riconciliare a mano",
        }
        if status == "atteso" and overdue and not suspended:
            reminder_draft = {"type": "sollecito", "status": "draft", "channel": "da_confermare"}

    return {
        "check_ref": check_ref,
        "status": status,                 # atteso|incassato_verificato|esito_da_confermare|sospeso|completed|anomaly
        "anomaly": anomaly,
        "overdue": overdue,
        "explain": {
            "tipo": _norm(item.get("tipo")),
            "rata_corrente": (int(rate_pagate) + 1) if _is_number(rate_pagate) else None,
            "rate_totali": rate_totali if _is_number(rate_totali) else None,
            "importo_rata": importo if _is_number(importo) else None,
            "scadenza": scadenza,
        },
        "activity": activity,             # UNA attività, o None
        "reminder_draft": reminder_draft,  # bozza, mai inviata
        "reasons": reasons,
        "input_version": INPUT_VERSION,
    }


def verify_due_item(artifact: Mapping[str, Any], validated: Mapping[str, Any]) -> Mapping[str, Any]:
    ok = bool(
        isinstance(artifact, Mapping)
        and artifact.get("check_ref")
        and artifact.get("status")
        and artifact.get("reasons")
    )
    return {
        "verified": ok,
        "evidence_refs": [artifact["check_ref"]] if ok else [],
        "checks": {"has_status": bool(artifact.get("status")), "explainable": isinstance(artifact.get("explain"), Mapping)},
    }


CHECK_DUE_ITEM_CAPABILITY = TaskCapability(
    task_type=CHECK_DUE_ITEM,
    input_version=INPUT_VERSION,
    kind=TaskKind.AI,
    executor=check_due_item,
    verifier=verify_due_item,
    policy=ExecutionPolicy(requires_approval=False, external_effects=False),
    validate_input=validate_due_item_input,
)


def register(registry) -> None:
    """Abilita la capacità Back office. NON registrata nel DEFAULT_TASK_REGISTRY: l'attivazione
    in produzione è una scelta esplicita (T21)."""
    registry.register(CHECK_DUE_ITEM_CAPABILITY)
