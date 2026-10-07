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


def _event(kind: str, email: str, name: str, when: str, how: Optional[str], label: Optional[str] = None) -> dict:
    return {
        "tipo": kind,
        "etichetta": label or LABELS[kind],
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


def entry_month(doc: dict, manual_entry: dict) -> str:
    """Mese di ingresso del lead (YYYY-MM): quello dichiarato a mano, altrimenti il primo contatto."""
    declared = str((manual_entry or {}).get("mese") or "")
    if len(declared) == 7:
        return declared
    since = _iso(doc.get("lead_since") or doc.get("created_at"))[:7]
    return since if len(since) == 7 else ""


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
    """`manual`: {email: {"nome", "nota", "call_fatta_il", "esito_start_il"}} (anche un semplice set di email).

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
    entry: dict[str, str] = {}  # mese di ingresso del lead (YYYY-MM): in quel mese e SOLO li viene contato
    attributed: dict[str, str] = {}  # email -> "link" | "manuale"

    for d in docs:
        email = str(d.get("user_email") or "").strip().lower()
        if not email:
            continue
        seen.add(email)
        m = manual.get(email) or {}
        client = clients_by_email.get(email) or {}
        name = d.get("user_name") or d.get("nome") or m.get("nome") or client.get("name") or client.get("nome") or email
        how = attribution_of(d, email, set(manual))
        if how:
            attributed[email] = how
            entry[email] = entry_month(d, m)

        call_done = state_ts(d, "call_done") or (m.get("call_fatta_il") or None)
        if call_done and _in_month(call_done, month):
            if how:
                events.append(_event("call_fatta", email, name, _iso(call_done), how))
            else:
                to_verify.append({"email": email, "nome": name, "data": _iso(call_done)})

        purchases = _purchases(client, month)
        # Pacchetto su misura pagato fuori dal checkout Start (link Stripe personalizzato):
        # stesso gettone dello Start, dichiarato a mano. Una sola volta: se Ciak ha gia
        # registrato lo Start nel mese, vale quello.
        custom = m.get("esito_start_il")
        if how and custom and _in_month(custom, month) and not any(k == "start" for k, _ in purchases):
            events.append(_event("start", email, name, _iso(custom), how, "Esito pacchetto su misura"))
        for kind, when in purchases:
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
        e["lead_mese"] = entry.get(e["email"], "")

    # Scheda di ogni lead coinvolto (per aprirla, modificarla o rimuoverla da qualunque riga).
    def detail(email: str, name: str) -> dict:
        m = manual.get(email) or {}
        return {
            "email": email,
            "nome": m.get("nome") or name or email,
            "attribuzione": attributed.get(email) or "manuale",
            "manuale": email in manual,
            "nota": m.get("nota") or "",
            "call_fatta_il": m.get("call_fatta_il") or "",
            "esito_start_il": m.get("esito_start_il") or "",
            "mese": entry.get(email, ""),
        }

    names = {e["email"]: e["nome"] for e in events}
    lead_detail: dict[str, dict] = {}
    for e in events:
        lead_detail[e["email"]] = detail(e["email"], e["nome"])

    # Lead del mese: chi E ENTRATO in questo mese (un lead e contato una volta, nel suo mese).
    leads = []
    for email, how in attributed.items():
        if entry.get(email) != month:
            continue
        nome = names.get(email) or (manual.get(email) or {}).get("nome") or email
        for d in docs:
            if str(d.get("user_email") or "").strip().lower() == email:
                nome = (manual.get(email) or {}).get("nome") or d.get("user_name") or d.get("nome") or nome
                break
        row = detail(email, nome)
        row["pagato_nel_mese_cents"] = sum(e["importo_cents"] for e in events if e["email"] == email)
        leads.append(row)
        lead_detail[email] = row
    leads.sort(key=lambda r: r["nome"].lower())

    call_events = [e for e in events if e["tipo"] == "call_fatta"]
    bonus_events = [e for e in events if e["tipo"] != "call_fatta"]

    return {
        "month": month,
        "rates": RATES,
        "leads": leads,
        "lead_detail": lead_detail,
        "conteggio": {"lead": len(leads), "call_fatte": len(call_events), "bonus": len(bonus_events)},
        "da_pagare": {
            "lead": call_events,
            "lead_cents": sum(e["importo_cents"] for e in call_events),
            "bonus": bonus_events,
            "bonus_cents": sum(e["importo_cents"] for e in bonus_events),
        },
        "events": events,
        "totals_cents": totals,
        "total_cents": sum(totals.values()),
        "pay_by": pay_by(month),
        "to_verify": to_verify,
        "purchases_to_verify": purchases_to_verify,
    }
