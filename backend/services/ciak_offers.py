"""
ciak_offers.py — Catalogo UNICO delle offerte vendibili Ciak (source of truth).

Raccoglie in un solo posto, con codici stabili, le offerte principali e gli
abbonamenti EVO-S, con prezzi in centesimi, descrizioni ufficiali e periodicita.
Serve alla fatturazione admin per ricalcolare SEMPRE prezzi e descrizioni lato
server (mai fidarsi del frontend) e per esporre le fonti fatturabili.

Modulo volutamente leggero (solo stdlib + costanti gia' definite in
services/ciak_client_accounts.py): importabile anche in test ermetici, senza
fastapi/stripe.

Prezzi definitivi (LOCK):
  - CIAK-BLUEPRINT   €27   una tantum   (MAI €67)
  - CIAK-START       €499  una tantum
  - CIAK-PARTNERSHIP €2.790 una tantum
  - CIAK-UPGRADE     €2.291 una tantum  (Partnership - credito Start)
  - EVO-S recover/start/grow/scale = 147/297/497/797 €/mese
"""
from __future__ import annotations

from typing import Any, Optional

from services.ciak_client_accounts import (
    BLUEPRINT_AMOUNT_CENTS,
    START_AMOUNT_CENTS,
    PARTNERSHIP_AMOUNT_CENTS,
)

# Upgrade = Partnership al netto del credito Ciak Start gia' versato.
# NON duplicare il calcolo altrove: deriva dai valori canonici.
UPGRADE_AMOUNT_CENTS = PARTNERSHIP_AMOUNT_CENTS - START_AMOUNT_CENTS  # 279000 - 49900 = 229100

# Condizioni EVO-S (abbonamenti post 12 mesi Partnership).
EVO_S_MIN_MONTHS = 6              # permanenza minima
EVO_S_AVAILABLE_AFTER_MONTHS = 12  # disponibile dopo 12 mesi di Partnership

EVO_S_CONDIZIONI_COMUNI = [
    "Periodicita mensile",
    "Permanenza minima 6 mesi",
    "Disponibile dopo 12 mesi di Partnership",
    "Budget advertising escluso",
    "Strumenti e licenze esterne esclusi",
    "Nessuna garanzia di risultato",
]


def eur_from_cents(cents: Any) -> float:
    """Converte centesimi -> euro (2 decimali)."""
    try:
        return round(float(cents or 0) / 100.0, 2)
    except (TypeError, ValueError):
        return 0.0


# ── Offerte principali (una tantum) ─────────────────────────────────────────
MAIN_OFFERS: dict[str, dict[str, Any]] = {
    "CIAK-BLUEPRINT": {
        "code": "CIAK-BLUEPRINT",
        "nome": "Ciak Blueprint",
        "amount_cents": BLUEPRINT_AMOUNT_CENTS,  # 2700 -> €27 (MAI €67)
        "periodicita": "una_tantum",
        "descrizione": (
            "Analisi strategica digitale e roadmap personalizzata per "
            "posizionamento, offerta e sviluppo del progetto."
        ),
    },
    "CIAK-START": {
        "code": "CIAK-START",
        "nome": "Ciak Start",
        "amount_cents": START_AMOUNT_CENTS,  # 49900 -> €499
        "periodicita": "una_tantum",
        "descrizione": (
            "Percorso iniziale per definizione del posizionamento, brand, "
            "profili, sito e strategia contenuti."
        ),
    },
    "CIAK-PARTNERSHIP": {
        "code": "CIAK-PARTNERSHIP",
        "nome": "Partnership Ciak",
        "amount_cents": PARTNERSHIP_AMOUNT_CENTS,  # 279000 -> €2.790
        "periodicita": "una_tantum",
        "descrizione": (
            "Progettazione, produzione e lancio dell'offerta digitale secondo "
            "il percorso Ciak."
        ),
    },
    "CIAK-UPGRADE": {
        "code": "CIAK-UPGRADE",
        "nome": "Upgrade Partnership Ciak",
        "amount_cents": UPGRADE_AMOUNT_CENTS,  # 229100 -> €2.291
        "periodicita": "una_tantum",
        "descrizione": (
            "Upgrade alla Partnership Ciak, al netto del credito Ciak Start "
            "gia' versato."
        ),
    },
}


# ── Abbonamenti EVO-S (mensili) ─────────────────────────────────────────────
# La chiave `plan` combacia con evo_booster.EVO_S_PLANS / metadata Stripe.
EVO_S_OFFERS: dict[str, dict[str, Any]] = {
    "EVO-S-RECOVER": {
        "code": "EVO-S-RECOVER",
        "plan": "recover",
        "nome": "EVO-S Inside",
        "amount_cents": 14700,  # €147/mese
        "periodicita": "mensile",
        "descrizione": (
            "Percorso mensile di recupero della fase Ottimizza, con audit "
            "iniziale, priorita operative, calendario guidato, KPI e revisione "
            "funnel."
        ),
        "permanenza_minima_mesi": EVO_S_MIN_MONTHS,
        "disponibile_dopo_mesi": EVO_S_AVAILABLE_AFTER_MONTHS,
        "condizioni": list(EVO_S_CONDIZIONI_COMUNI),
    },
    "EVO-S-CONTINUITA": {
        "code": "EVO-S-CONTINUITA",
        "plan": "start",
        "nome": "EVO-S Pro",
        "amount_cents": 29700,  # €297/mese
        "periodicita": "mensile",
        "descrizione": (
            "Servizio continuativo di monitoraggio KPI, revisione mensile, "
            "aggiornamento calendario contenuti e supporto operativo."
        ),
        "permanenza_minima_mesi": EVO_S_MIN_MONTHS,
        "disponibile_dopo_mesi": EVO_S_AVAILABLE_AFTER_MONTHS,
        "condizioni": list(EVO_S_CONDIZIONI_COMUNI),
    },
    "EVO-S-CRESCITA": {
        "code": "EVO-S-CRESCITA",
        "plan": "grow",
        "nome": "EVO-S Premium",
        "amount_cents": 49700,  # €497/mese
        "periodicita": "mensile",
        "descrizione": (
            "Servizio continuativo di crescita con ottimizzazioni quindicinali, "
            "contenuti extra, supporto Live Promo, report avanzato e call "
            "mensile."
        ),
        "permanenza_minima_mesi": EVO_S_MIN_MONTHS,
        "disponibile_dopo_mesi": EVO_S_AVAILABLE_AFTER_MONTHS,
        "condizioni": list(EVO_S_CONDIZIONI_COMUNI),
    },
    "EVO-S-ESPANSIONE": {
        "code": "EVO-S-ESPANSIONE",
        "plan": "scale",
        "nome": "EVO-S Elite",
        "amount_cents": 79700,  # €797/mese
        "periodicita": "mensile",
        "descrizione": (
            "Servizio continuativo di espansione con advertising, progettazione "
            "di nuovi prodotti o funnel, ottimizzazione e affiancamento "
            "strategico."
        ),
        "permanenza_minima_mesi": EVO_S_MIN_MONTHS,
        "disponibile_dopo_mesi": EVO_S_AVAILABLE_AFTER_MONTHS,
        "condizioni": list(EVO_S_CONDIZIONI_COMUNI),
    },
}

# Indice per `plan` (recover/start/grow/scale) -> offerta EVO-S.
EVO_S_BY_PLAN: dict[str, dict[str, Any]] = {o["plan"]: o for o in EVO_S_OFFERS.values()}


def main_offer(code: str) -> Optional[dict[str, Any]]:
    return MAIN_OFFERS.get(code)


def evo_s_offer_for_plan(plan: Optional[str]) -> Optional[dict[str, Any]]:
    if not plan:
        return None
    return EVO_S_BY_PLAN.get(str(plan).lower())
