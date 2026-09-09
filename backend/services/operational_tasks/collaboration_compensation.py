"""Prospetti compensi/provvigioni/bonus: calcolo deterministico (T25).

Calcola ESCLUSIVAMENTE da regole validate (T23) e da ore approvate + eventi (T24). Non
inventa importi. Distingue **stimato / maturato / approvato / pagato**; ogni voce è
spiegabile (base, formula, clausola, evento, periodo). L'attribuzione di una vendita è per
**evento** (`event_id` + `attributed_collaborator_id` verificato), mai dedotta da un nome.
Nessun pagamento viene lanciato: `pagato` risulta solo da una conferma autorizzata con
evidenza. Una regola mancante/non calcolabile resta tale (mai zero). Un periodo chiuso è una
versione immutabile con approvazione; una modifica successiva è una **rettifica esplicita**,
non un ricalcolo silenzioso.

Riusa l'arrotondamento monetario di `services/collaborator_settlements.py` (Decimal, HALF_UP).
"""

from __future__ import annotations

import hashlib
import json
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, List, Mapping, Optional

# Stati di una voce del prospetto.
STIMATO = "stimato"
MATURATO = "maturato"
APPROVATO = "approvato"
PAGATO = "pagato"
NON_CALCOLABILE = "non_calcolabile"


def _money(value: Any) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _f(dec: Decimal) -> float:
    return float(dec)


def _attributed(event: Mapping[str, Any], collaborator_id: str) -> bool:
    """Vendita attribuita a QUESTO collaboratore solo per evento verificato, mai per nome."""
    return (
        event.get("attributed_collaborator_id") == collaborator_id
        and event.get("attribution_verified") is True
    )


def _line(kind, base, formula, amount: Decimal, status, clause_ref, *, event_ref=None, period=None, reason=""):
    return {
        "kind": kind,
        "base": base,
        "formula": formula,
        "amount": _f(amount),
        "status": status,
        "clause_ref": clause_ref,
        "event_ref": event_ref,
        "period": period,
        "reason": reason,
    }


def compute_prospetto(
    collaborator_id: str,
    validated_artifact: Mapping[str, Any],
    inputs: Mapping[str, Any],
    period: Mapping[str, Any],
    *,
    period_approved: bool = False,
    payments: Optional[List[Mapping[str, Any]]] = None,
) -> dict:
    """Costruisce il prospetto. `validated_artifact` è l'output di T23
    (`collaboration.validate_rules`); `inputs` porta ore approvate ed eventi verificati."""
    rules = [r for r in validated_artifact.get("validated_rules", []) if r.get("status") == "validated"]
    non_calcolabile = list(validated_artifact.get("non_calcolabile", []))
    payments = payments or []
    lines: List[dict] = []

    for rule in rules:
        kind = rule.get("kind")
        clause = rule.get("clause_ref")
        basis = rule.get("basis") or {}

        if kind == "hourly":
            minutes = int(inputs.get("approved_minutes") or 0)
            rate = _money(basis.get("hourly_rate"))
            amount = _money((Decimal(minutes) / Decimal(60)) * rate)
            # ore approvate = maturato; senza ore approvate resta stimato a 0-base
            status = MATURATO if minutes > 0 else STIMATO
            lines.append(_line(kind, {"approved_minutes": minutes, "hourly_rate": _f(rate)},
                               "approved_minutes/60 * hourly_rate", amount, status, clause, period=dict(period)))

        elif kind == "fixed":
            amount = _money(basis.get("amount"))
            lines.append(_line(kind, {"amount": _f(amount), "period": basis.get("period")},
                               "importo fisso per periodo", amount, MATURATO, clause, period=dict(period)))

        elif kind == "commission":
            percent = basis.get("percent")
            seen_events = set()
            for event in inputs.get("sale_events") or []:
                event_id = event.get("event_id")
                if not event_id or event_id in seen_events:
                    continue  # dedup: un evento conta una volta
                seen_events.add(event_id)
                if not _attributed(event, collaborator_id):
                    continue  # non attribuito per evento verificato → non conta
                base_amount = _money(event.get("base_amount"))
                gross = _money(base_amount * Decimal(str(percent or 0)) / Decimal(100))
                if event.get("refunded") is True:
                    # storno: la provvigione si inverte secondo contratto
                    lines.append(_line(kind, {"base_amount": _f(base_amount), "percent": percent},
                                       "storno su rimborso", -gross, MATURATO, clause,
                                       event_ref=event_id, period=dict(period), reason="rimborso"))
                    continue
                # maturazione: matura solo se l'evento è riconciliato (es. on_payment)
                status = MATURATO if event.get("reconciled") is True else STIMATO
                lines.append(_line(kind, {"base_amount": _f(base_amount), "percent": percent},
                                   "base_amount * percent/100", gross, status, clause,
                                   event_ref=event_id, period=dict(period)))

        elif kind == "bonus":
            bonus = inputs.get("bonus") or {}
            amount = _money(basis.get("amount"))
            if not bonus.get("condition_met"):
                lines.append(_line(kind, {"amount": _f(amount)}, "bonus se condizione soddisfatta",
                                   _money(0), STIMATO, clause, period=dict(period), reason="condizione non soddisfatta"))
            else:
                # bonus discrezionale: senza approvazione resta stimato, mai approvato in automatico
                status = APPROVATO if bonus.get("approved") is True else STIMATO
                lines.append(_line(kind, {"amount": _f(amount)}, "bonus a condizione soddisfatta",
                                   amount, status, clause, period=dict(period)))

    # Regole non calcolabili → voce esplicita, esclusa dai totali (mai zero).
    for nc in non_calcolabile:
        lines.append(_line(nc.get("kind"), None, None, _money(0), NON_CALCOLABILE,
                           nc.get("clause_ref"), reason="; ".join(nc.get("reasons") or [])))

    # Approvazione del periodo: le voci maturate diventano approvate.
    if period_approved:
        for ln in lines:
            if ln["status"] == MATURATO:
                ln["status"] = APPROVATO

    # Pagamenti: solo da conferma autorizzata con evidenza; il modulo non lancia pagamenti.
    for pay in payments:
        if not (pay.get("authorized") is True and pay.get("evidence_ref")):
            continue
        for ln in lines:
            if ln["kind"] == pay.get("kind") and ln.get("event_ref") == pay.get("event_ref") and ln["status"] == APPROVATO:
                ln["status"] = PAGATO
                ln["proof_ref"] = pay.get("evidence_ref")
                break

    def _total(status):
        return _f(sum((_money(ln["amount"]) for ln in lines if ln["status"] == status), Decimal("0.00")))

    return {
        "collaborator_id": collaborator_id,
        "period": dict(period),
        "lines": lines,
        "totals": {
            STIMATO: _total(STIMATO),
            MATURATO: _total(MATURATO),
            APPROVATO: _total(APPROVATO),
            PAGATO: _total(PAGATO),
        },
        "non_calcolabile": [nc.get("kind") for nc in non_calcolabile],
        "closed": False,
    }


def _prospetto_hash(prospetto: Mapping[str, Any]) -> str:
    payload = json.dumps(prospetto.get("lines"), sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def close_period(prospetto: Mapping[str, Any], *, approver: str, version: str) -> dict:
    """Chiude il periodo in una versione IMMUTABILE approvata. Non modifica il prospetto."""
    snapshot = {
        "version": version,
        "approved_by": approver,
        "collaborator_id": prospetto.get("collaborator_id"),
        "period": prospetto.get("period"),
        "lines": [dict(ln) for ln in prospetto.get("lines", [])],
        "totals": dict(prospetto.get("totals", {})),
        "closed": True,
        "hash": _prospetto_hash(prospetto),
    }
    return snapshot


def rectify(closed_snapshot: Mapping[str, Any], *, delta_amount: float, kind: str, actor: str, reason: str) -> dict:
    """Rettifica esplicita di un periodo chiuso: NON ricalcola né modifica lo snapshot,
    produce una voce di rettifica che lo referenzia."""
    if not closed_snapshot.get("closed"):
        raise ValueError("si rettifica solo un periodo chiuso")
    if not reason or not reason.strip():
        raise ValueError("la rettifica richiede un motivo")
    return {
        "type": "rectification",
        "rectifies_version": closed_snapshot.get("version"),
        "rectifies_hash": closed_snapshot.get("hash"),
        "kind": kind,
        "delta_amount": _f(_money(delta_amount)),
        "actor": actor,
        "reason": reason,
    }
