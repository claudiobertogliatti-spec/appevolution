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


def _purchases(client: dict, month: str) -> list[tuple[str, str]]:
    """(tipo, data) degli acquisti Start/Partnership di un cliente nel mese."""
    out = []
    start_at = client.get("start_purchased_at")
    partner_at = client.get("partnership_purchased_at")
    if start_at and _in_month(start_at, month):
        out.append(("start", _iso(start_at)))
    if partner_at and _in_month(partner_at, month):
        is_upgrade = bool(start_at) and _iso(start_at) < _iso(partner_at)
        out.append(("upgrade" if is_upgrade else "partnership", _iso(partner_at)))
    return out


def build_gettoni(
    month: str,
    diagnostics: Iterable[dict],
    clients_by_email: dict[str, dict],
    manual,
) -> dict:
    """`manual`: {email: {"nome", "nota", "call_fatta_il"}} (anche un semplice set di email).

    Un lead attribuito a mano puo non avere nessuna sessione diagnostica (contatto portato
    fuori dal funnel): in quel caso la call fatta e quella dichiarata nell'attribuzione.
    """
    if not isinstance(manual, dict):
        manual = {e: {} for e in manual}
    events: list[dict] = []
    to_verify: list[dict] = []
    purchases_to_verify: list[dict] = []

    docs = list(diagnostics)
    present = {str(d.get("user_email") or "").strip().lower() for d in docs}
    for email, m in manual.items():
        if email not in present:
            docs.append({"user_email": email, "user_name": m.get("nome") or "", "state_history": []})
    seen: set[str] = set()

    for d in docs:
        email = str(d.get("user_email") or "").strip().lower()
        if not email:
            continue
        seen.add(email)
        m = manual.get(email) or {}
        client = clients_by_email.get(email) or {}
        name = d.get("user_name") or d.get("nome") or m.get("nome") or client.get("name") or client.get("nome") or email
        how = attribution_of(d, email, set(manual))

        call_done = state_ts(d, "call_done") or (m.get("call_fatta_il") or None)
        if call_done and _in_month(call_done, month):
            if how:
                events.append(_event("call_fatta", email, name, _iso(call_done), how))
            else:
                to_verify.append({"email": email, "nome": name, "data": _iso(call_done)})

        for kind, when in _purchases(client, month):
            if how:
                events.append(_event(kind, email, name, when, how))
            else:
                purchases_to_verify.append({
                    "email": email, "nome": name, "tipo": kind, "etichetta": LABELS[kind],
                    "data": when, "importo_cents": RATES["importi_cents"][kind],
                })

    # Clienti che hanno comprato nel mese senza nessuna sessione diagnostica ne attribuzione
    for email, client in clients_by_email.items():
        if email in seen:
            continue
        name = client.get("name") or client.get("nome") or email
        for kind, when in _purchases(client, month):
            purchases_to_verify.append({
                "email": email, "nome": name, "tipo": kind, "etichetta": LABELS[kind],
                "data": when, "importo_cents": RATES["importi_cents"][kind],
            })

    events.sort(key=lambda e: e["data"])
    purchases_to_verify.sort(key=lambda e: e["data"])
    totals = {k: 0 for k in RATES["importi_cents"]}
    for e in events:
        totals[e["tipo"]] += e["importo_cents"]

    # Un riga per lead: chi ha eventi nel mese + tutti gli attribuiti a mano (anche senza
    # eventi), cosi un'attribuzione si puo sempre aprire, modificare o rimuovere.
    by_lead: dict[str, dict] = {}
    for e in events:
        row = by_lead.setdefault(e["email"], {
            "email": e["email"], "nome": e["nome"], "attribuzione": e["attribuzione"],
            "eventi": [], "totale_cents": 0,
        })
        row["eventi"].append({"tipo": e["tipo"], "etichetta": e["etichetta"], "data": e["data"], "importo_cents": e["importo_cents"]})
        row["totale_cents"] += e["importo_cents"]
    for email, m in manual.items():
        row = by_lead.setdefault(email, {"email": email, "nome": m.get("nome") or email, "eventi": [], "totale_cents": 0})
        row["attribuzione"] = "manuale"
        row["nome"] = m.get("nome") or row["nome"]
        row["nota"] = m.get("nota") or ""
        row["call_fatta_il"] = m.get("call_fatta_il") or ""
        row["manuale"] = True
    leads = sorted(by_lead.values(), key=lambda r: (-r["totale_cents"], r["nome"].lower()))

    return {
        "month": month,
        "rates": RATES,
        "leads": leads,
        "events": events,
        "totals_cents": totals,
        "total_cents": sum(totals.values()),
        "pay_by": pay_by(month),
        "to_verify": to_verify,
        "purchases_to_verify": purchases_to_verify,
    }
