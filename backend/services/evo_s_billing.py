"""
evo_s_billing.py — Riconoscimento affidabile degli abbonamenti EVO-S PAGATI.

Un semplice `checkout_avviato` (in evo_s_requests) NON e' ricavo fatturabile.
Questo modulo trasforma i pagamenti Stripe verificati lato server (webhook con
firma) in periodi fatturabili, con idempotenza per (subscription, periodo).

Collezione: `evo_s_subscriptions` — 1 doc per subscription Stripe, con
`billing_periods[]` (uno per mese pagato). Le funzioni pure qui sotto sono
testabili senza DB; le funzioni async fanno solo I/O Mongo.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from services.ciak_offers import evo_s_offer_for_plan, eur_from_cents


def compute_billing_period(dt: Optional[datetime] = None) -> str:
    """Periodo di competenza mensile in formato YYYY-MM (un pagamento/mese)."""
    d = dt or datetime.now(timezone.utc)
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.strftime("%Y-%m")


def merge_billing_period(existing: Optional[list[dict[str, Any]]], new_period: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Aggiunge un periodo fatturato in modo IDEMPOTENTE: se esiste gia' un record
    con lo stesso `period` non viene duplicato (arricchisce solo il payment id
    se mancava). Garantisce che lo stesso mese non generi due volte una fonte.
    """
    periods = [dict(p) for p in (existing or [])]
    key = new_period.get("period")
    for p in periods:
        if p.get("period") == key:
            if not p.get("invoice_payment_id") and new_period.get("invoice_payment_id"):
                p["invoice_payment_id"] = new_period["invoice_payment_id"]
            return periods
    periods.append(dict(new_period))
    return periods


def subscription_billable_sources(sub: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Traduce un doc `evo_s_subscriptions` PAGATO in una o piu' fonti fatturabili
    (una per periodo mensile pagato). Ritorna [] se la subscription non risulta
    pagata (nessun periodo) — cosi' un checkout mai completato non appare.
    """
    if not sub or sub.get("status") not in ("attivo", "pagato", "paid", "active"):
        return []
    subscription_id = sub.get("subscription_id") or sub.get("id")
    if not subscription_id:
        return []
    offer = evo_s_offer_for_plan(sub.get("plan")) or {}
    amount_cents = sub.get("amount_cents") or offer.get("amount_cents") or 0
    nome = sub.get("ragione_sociale") or sub.get("partner_nome") or sub.get("nome") or ""
    out: list[dict[str, Any]] = []
    for bp in sub.get("billing_periods", []) or []:
        period = bp.get("period")
        if not period:
            continue
        out.append({
            "source_key": f"evo_s:{subscription_id}:{period}",
            "source_type": "evo_s",
            "fonte": "evo_s",
            "fonte_label": "Abbonamento EVO-S",
            "service_code": offer.get("code") or sub.get("service_code"),
            "descrizione": offer.get("descrizione") or offer.get("nome") or "Abbonamento EVO-S",
            "piano": offer.get("nome") or sub.get("plan"),
            "plan": sub.get("plan"),
            "periodicita": "mensile",
            "billing_period": period,
            "importo": eur_from_cents(amount_cents),
            "importo_cents": int(amount_cents or 0),
            "valuta": (sub.get("currency") or "EUR").upper(),
            "data": bp.get("paid_at") or sub.get("activated_at"),
            "partner_id": sub.get("partner_id"),
            "source_subscription_id": subscription_id,
            "source_payment_id": bp.get("invoice_payment_id"),
            "stripe_customer_id": sub.get("customer_id"),
            "permanenza_minima_mesi": offer.get("permanenza_minima_mesi"),
            "cliente": dict(sub.get("cliente") or {"nome": nome, "email": sub.get("email") or "", "paese": "Italia"}),
        })
    return out


def build_evo_s_sources(paid_subscriptions: list[dict[str, Any]], invoiced_keys: set[str]) -> list[dict[str, Any]]:
    """Costruisce tutte le fonti EVO-S fatturabili dalle subscription pagate."""
    out: list[dict[str, Any]] = []
    for sub in paid_subscriptions or []:
        for src in subscription_billable_sources(sub):
            src["gia_fatturata"] = src["source_key"] in invoiced_keys
            out.append(src)
    return out


# ── I/O Mongo (async) ───────────────────────────────────────────────────────

async def _partner_billing_identity(db, partner_id: Optional[str]) -> dict[str, Any]:
    if db is None or not partner_id:
        return {}
    p = await db.partners.find_one({"id": partner_id})
    if not p:
        return {}
    nome = p.get("name") or " ".join(x for x in [p.get("nome"), p.get("cognome")] if x)
    return {
        "partner_nome": nome or "",
        "ragione_sociale": p.get("nome_azienda") or p.get("ragione_sociale") or "",
        "email": p.get("email") or "",
        "cliente": {
            "nome": nome or "",
            "ragione_sociale": p.get("nome_azienda") or p.get("ragione_sociale") or "",
            "indirizzo": p.get("indirizzo") or "",
            "cap": p.get("cap") or "",
            "citta": p.get("citta") or "",
            "provincia": p.get("provincia") or "",
            "paese": p.get("paese") or "Italia",
            "codice_fiscale": p.get("codice_fiscale") or "",
            "partita_iva": p.get("partita_iva") or "",
            "email": p.get("email") or "",
            "pec": p.get("pec") or "",
        },
    }


async def record_evo_s_payment(
    db,
    *,
    plan: Optional[str],
    partner_id: Optional[str],
    subscription_id: Optional[str],
    customer_id: Optional[str] = None,
    invoice_payment_id: Optional[str] = None,
    session_id: Optional[str] = None,
    paid_at: Optional[datetime] = None,
    currency: str = "EUR",
) -> Optional[dict[str, Any]]:
    """
    Registra un pagamento EVO-S verificato (webhook Stripe firmato) come periodo
    fatturabile. Idempotente per (subscription, periodo). L'importo NON viene
    letto dal client: si ricalcola dal catalogo (evo_s_offer_for_plan).
    """
    if db is None or not subscription_id:
        return None
    offer = evo_s_offer_for_plan(plan)
    if not offer:
        return None
    now = paid_at or datetime.now(timezone.utc)
    period = compute_billing_period(now)
    identity = await _partner_billing_identity(db, partner_id)

    existing = await db.evo_s_subscriptions.find_one({"subscription_id": subscription_id})
    period_record = {
        "period": period,
        "invoice_payment_id": invoice_payment_id,
        "paid_at": now.isoformat(),
    }
    billing_periods = merge_billing_period((existing or {}).get("billing_periods"), period_record)

    doc = {
        "subscription_id": subscription_id,
        "plan": (plan or "").lower(),
        "service_code": offer["code"],
        "partner_id": partner_id,
        "customer_id": customer_id or (existing or {}).get("customer_id"),
        "amount_cents": offer["amount_cents"],
        "currency": (currency or "EUR").upper(),
        "status": "attivo",
        "billing_periods": billing_periods,
        "last_session_id": session_id or (existing or {}).get("last_session_id"),
        "updated_at": now.isoformat(),
    }
    if identity:
        doc.update({k: v for k, v in identity.items() if v})
    if not existing:
        doc["activated_at"] = now.isoformat()
        doc["created_at"] = now.isoformat()

    await db.evo_s_subscriptions.update_one(
        {"subscription_id": subscription_id},
        {"$set": doc},
        upsert=True,
    )

    # Aggiorna anche l'intento in evo_s_requests (best-effort) per la vista admin.
    try:
        await db.evo_s_requests.update_many(
            {"partner_id": partner_id, "plan": (plan or "").lower(), "status": "checkout_avviato"},
            {"$set": {
                "status": "pagato",
                "subscription_id": subscription_id,
                "paid_at": now.isoformat(),
            }},
        )
    except Exception:
        pass

    return doc
