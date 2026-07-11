"""
ciak_invoice_sources.py — Builder PURI (no DB) delle fonti fatturabili.

Centralizza la costruzione delle righe/fonti fattura in funzioni pure e
testabili. L'endpoint admin (routers/ciak_admin.py) fa le query Mongo e delega
a queste funzioni per prezzi/descrizioni CANONICI (mai dal frontend).
"""
from __future__ import annotations

from typing import Any, Optional

from services.ciak_offers import MAIN_OFFERS, eur_from_cents


def main_offer_source_line(code: str) -> Optional[dict[str, Any]]:
    """
    Riga canonica (descrizione + importo dal catalogo) per un'offerta
    principale. None se il codice non esiste.
    """
    offer = MAIN_OFFERS.get(code)
    if not offer:
        return None
    return {
        "service_code": offer["code"],
        "descrizione": offer["descrizione"],
        "nome": offer["nome"],
        "importo": eur_from_cents(offer["amount_cents"]),
        "importo_cents": offer["amount_cents"],
        "periodicita": offer["periodicita"],
    }


def build_servizio_extra_source(
    sv_doc: dict[str, Any],
    catalog_by_id: dict[str, dict[str, Any]],
    cliente: dict[str, Any],
    invoiced_keys: set[str],
) -> dict[str, Any]:
    """
    Fonte fatturabile per un servizio extra attivo (partner_servizi). Prezzo,
    descrizione e periodicita provengono SEMPRE dal catalogo SERVIZI_CATALOGO
    (fonte unica), mai dal documento partner o dal frontend.
    """
    sid = sv_doc.get("servizio_id")
    cat = catalog_by_id.get(sid, {})
    key = f"extra:{sv_doc.get('id')}"
    periodicita = cat.get("periodicita") or (
        "mensile" if cat.get("tipo") == "abbonamento_mensile" else "una_tantum"
    )
    source: dict[str, Any] = {
        "source_key": key,
        "source_type": "servizio_extra",
        "fonte": "servizio_extra",
        "fonte_label": "Servizio extra",
        "service_id": sid,
        "service_code": sid,
        "descrizione": cat.get("nome") or f"Servizio extra ({sid})",
        "periodicita": periodicita,
        "importo": float(cat.get("prezzo") or 0),
        "valuta": "EUR",
        "data": sv_doc.get("data_attivazione") or sv_doc.get("created_at"),
        "partner_id": sv_doc.get("partner_id"),
        "source_subscription_id": sv_doc.get("stripe_subscription_id"),
        "source_payment_id": sv_doc.get("stripe_session_id"),
        "cliente": cliente or {},
        "gia_fatturata": key in invoiced_keys,
    }
    # Componente variabile (es. Gestione Campagne: 10% delle vendite generate).
    variabile = cat.get("componente_variabile")
    if variabile:
        source["componente_variabile"] = {
            "percentuale": variabile.get("percentuale"),
            "base": variabile.get("base"),
            "descrizione": variabile.get("descrizione"),
        }
    return source
