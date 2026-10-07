"""Gettoni di Mariangela Caccia (procacciatrice a gettone, non a ore).

Calcolo puro: nessun accesso al database. Riceve sessioni diagnostiche, clienti e
attribuzioni manuali già letti dal router e restituisce gli eventi che maturano un gettone
nel mese richiesto.

Importi: decisione di Claudio del 7/9/2026 sul listino Start €390 / Partnership €2.990
(Allegato A v2). ⚠️ La rifirma dell'Allegato A v2 non risulta verificata: gli importi sono
un'impostazione di lavoro, non un documento firmato. Il gettone sulla call vale solo per la
call FATTA (presentata), mai per quella solo fissata (confermato da Claudio 6/10/2026).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Iterable, Optional

COLLABORATOR_ID = "mariangela"
UTM_SOURCE = "mariangela"

RATES = {
    "id": "allegato-a-v2",
    "valido_dal": "2026-09-07",
    "fonte": "Decisione Claudio 7/9/2026 (Allegato A v2). Firma dell'Allegato non verificata.",
    "importi_cents": {
        "call_fatta": 1500,
        "start": 5000,
        "partnership": 25000,
        "upgrade": 20000,
    },
}

LABELS = {
    "call_fatta": "Call fatta",
    "start": "Esito Ciak Start",
    "partnership": "Esito Partnership",
    "upgrade": "Upgrade Start → Partnership",
}


def _iso(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value or "")


def _in_month(value: Any, month: str) -> bool:
    return _iso(value)[:7] == month


def state_ts(doc: dict, state: str) -> Optional[str]:
    for item in reversed(doc.get("state_history") or []):
        if item.get("state") == state:
            return _iso(item.get("timestamp")) or None
    return None


def _utm(doc: dict) -> str:
    return str((doc.get("tracking") or {}).get("utm_source") or "").strip().lower()


def attribution_of(doc: dict, email: str, manual_emails: set[str]) -> Optional[str]:
    if email in manual_emails:
        return "manuale"
    if _utm(doc) == UTM_SOURCE:
        return "link"
    return None


def pay_by(month: str) -> str:
    """Il contratto paga entro il 10 del mese successivo sul fatturato incassato."""
    year, mon = int(month[:4]), int(month[5:7])
    year, mon = (year + 1, 1) if mon == 12 else (year, mon + 1)
    return f"{year:04d}-{mon:02d}-10"


def _event(kind: str, email: str, name: str, when: str, how: Optional[str]) -> dict:
    return {
        "tipo": kind,
        "etichetta": LABELS[kind],
        "email": email,
        "nome": name,
        "data": when,
        "importo_cents": RATES["importi_cents"][kind],
        "attribuzione": how,
    }


def month_bounds_ok(month: str) -> bool:
    try:
        datetime.strptime(month, "%Y-%m")
        return True
    except (TypeError, ValueError):
        return False


def build_gettoni(
    month: str,
    diagnostics: Iterable[dict],
    clients_by_email: dict[str, dict],
    manual_emails: set[str],
) -> dict:
    events: list[dict] = []
    to_verify: list[dict] = []

    for d in diagnostics:
        email = str(d.get("user_email") or "").strip().lower()
        if not email:
            continue
        name = d.get("user_name") or d.get("nome") or email
        how = attribution_of(d, email, manual_emails)

        call_done = state_ts(d, "call_done")
        if call_done and _in_month(call_done, month):
            if how:
                events.append(_event("call_fatta", email, name, call_done, how))
            else:
                to_verify.append({"email": email, "nome": name, "data": call_done})

        if not how:
            continue

        client = clients_by_email.get(email) or {}
        start_at = client.get("start_purchased_at")
        partner_at = client.get("partnership_purchased_at")
        if start_at and _in_month(start_at, month):
            events.append(_event("start", email, name, _iso(start_at), how))
        if partner_at and _in_month(partner_at, month):
            is_upgrade = bool(start_at) and _iso(start_at) < _iso(partner_at)
            events.append(_event("upgrade" if is_upgrade else "partnership", email, name, _iso(partner_at), how))

    events.sort(key=lambda e: e["data"])
    totals = {k: 0 for k in RATES["importi_cents"]}
    for e in events:
        totals[e["tipo"]] += e["importo_cents"]

    return {
        "month": month,
        "rates": RATES,
        "events": events,
        "totals_cents": totals,
        "total_cents": sum(totals.values()),
        "pay_by": pay_by(month),
        "to_verify": to_verify,
    }
