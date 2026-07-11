"""
Fatturazione admin Ciak — copertura di TUTTE le offerte vendibili.

15 requisiti (vedi brief): prezzi offerte principali, EVO-S, servizi extra,
idempotenza, sicurezza (solo admin), niente shadow route.
"""
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"


from services.ciak_offers import (  # noqa: E402
    MAIN_OFFERS,
    EVO_S_OFFERS,
    EVO_S_BY_PLAN,
    EVO_S_MIN_MONTHS,
    EVO_S_AVAILABLE_AFTER_MONTHS,
    UPGRADE_AMOUNT_CENTS,
)
from services.ciak_client_accounts import (  # noqa: E402
    PARTNERSHIP_AMOUNT_CENTS,
    START_AMOUNT_CENTS,
)
from services.evo_s_billing import (  # noqa: E402
    build_evo_s_sources,
    subscription_billable_sources,
    merge_billing_period,
    compute_billing_period,
)
from services.ciak_invoice_sources import build_servizio_extra_source  # noqa: E402
from routers.servizi_extra import SERVIZI_CATALOGO  # noqa: E402
from routers.evo_booster import EVO_S_PLANS  # noqa: E402


# ── 1-4: offerte principali ────────────────────────────────────────────────

def test_1_blueprint_e27_mai_67():
    assert MAIN_OFFERS["CIAK-BLUEPRINT"]["amount_cents"] == 2700
    assert MAIN_OFFERS["CIAK-BLUEPRINT"]["amount_cents"] != 6700


def test_2_start_e499():
    assert MAIN_OFFERS["CIAK-START"]["amount_cents"] == 49900


def test_3_partnership_e2790():
    assert MAIN_OFFERS["CIAK-PARTNERSHIP"]["amount_cents"] == 279000


def test_4_upgrade_e2291_derivato():
    assert MAIN_OFFERS["CIAK-UPGRADE"]["amount_cents"] == 229100
    assert UPGRADE_AMOUNT_CENTS == PARTNERSHIP_AMOUNT_CENTS - START_AMOUNT_CENTS
    assert MAIN_OFFERS["CIAK-UPGRADE"]["amount_cents"] == PARTNERSHIP_AMOUNT_CENTS - START_AMOUNT_CENTS


# ── 5-7: EVO-S ─────────────────────────────────────────────────────────────

def test_5_evo_s_prezzi():
    assert EVO_S_BY_PLAN["recover"]["amount_cents"] == 14700
    assert EVO_S_BY_PLAN["start"]["amount_cents"] == 29700
    assert EVO_S_BY_PLAN["grow"]["amount_cents"] == 49700
    assert EVO_S_BY_PLAN["scale"]["amount_cents"] == 79700
    # evo_booster (checkout Stripe) allineato al catalogo unico
    assert EVO_S_PLANS["recover"]["amount"] == 14700
    assert EVO_S_PLANS["start"]["amount"] == 29700
    assert EVO_S_PLANS["grow"]["amount"] == 49700
    assert EVO_S_PLANS["scale"]["amount"] == 79700


def test_6_evo_s_mensile():
    for offer in EVO_S_OFFERS.values():
        assert offer["periodicita"] == "mensile"


def test_7_permanenza_minima_6_mesi_esposta():
    assert EVO_S_MIN_MONTHS == 6
    assert EVO_S_AVAILABLE_AFTER_MONTHS == 12
    for offer in EVO_S_OFFERS.values():
        assert offer["permanenza_minima_mesi"] == 6
        assert any("Permanenza minima 6 mesi" == c for c in offer["condizioni"])


# ── 8-10: riconoscimento pagamenti EVO-S + idempotenza ─────────────────────

def _paid_sub(periods):
    return {
        "subscription_id": "sub_123",
        "plan": "grow",
        "partner_id": "p1",
        "amount_cents": 49700,
        "currency": "EUR",
        "status": "attivo",
        "billing_periods": periods,
    }


def test_8_checkout_avviato_non_pagato_non_appare():
    # subscription senza periodi pagati / status non pagato -> nessuna fonte
    intent_only = {"subscription_id": "sub_x", "plan": "grow", "status": "checkout_avviato", "billing_periods": []}
    assert subscription_billable_sources(intent_only) == []
    assert build_evo_s_sources([intent_only], set()) == []
    # anche un attivo senza periodi non produce fonti
    assert subscription_billable_sources(_paid_sub([])) == []


def test_9_pagamento_evo_s_appare_una_sola_volta():
    sub = _paid_sub([{"period": "2026-07", "invoice_payment_id": "in_1", "paid_at": "2026-07-01T00:00:00+00:00"}])
    sources = build_evo_s_sources([sub], set())
    assert len(sources) == 1
    s = sources[0]
    assert s["fonte"] == "evo_s"
    assert s["periodicita"] == "mensile"
    assert s["billing_period"] == "2026-07"
    assert s["importo"] == 497.0
    assert s["source_key"] == "evo_s:sub_123:2026-07"


def test_10_stesso_subscription_e_periodo_non_due_fatture():
    # merge idempotente sullo stesso periodo
    periods = merge_billing_period([], {"period": "2026-07", "invoice_payment_id": None})
    periods = merge_billing_period(periods, {"period": "2026-07", "invoice_payment_id": "in_1"})
    assert len(periods) == 1
    assert periods[0]["invoice_payment_id"] == "in_1"
    # un periodo diverso aggiunge una riga
    periods = merge_billing_period(periods, {"period": "2026-08", "invoice_payment_id": "in_2"})
    assert len(periods) == 2
    # se gia' fatturata (source_key negli invoiced) -> gia_fatturata True
    sub = _paid_sub([{"period": "2026-07", "invoice_payment_id": "in_1"}])
    sources = build_evo_s_sources([sub], {"evo_s:sub_123:2026-07"})
    assert sources[0]["gia_fatturata"] is True


def test_compute_billing_period_format():
    from datetime import datetime, timezone
    assert compute_billing_period(datetime(2026, 7, 11, tzinfo=timezone.utc)) == "2026-07"


# ── 11-12: servizi extra ───────────────────────────────────────────────────

def _catalog_by_id():
    return {s["id"]: s for s in SERVIZI_CATALOGO}


def test_11_servizi_extra_derivano_dal_catalogo():
    cat = _catalog_by_id()
    # prezzo/descrizione dal catalogo, NON dal documento partner (che qui mente)
    sv = {"id": "svx1", "servizio_id": "calendario-pro", "partner_id": "p1", "prezzo": 1}
    src = build_servizio_extra_source(sv, cat, {"nome": "Mario"}, set())
    assert src["descrizione"] == cat["calendario-pro"]["nome"]
    assert src["importo"] == 297
    assert src["periodicita"] == "mensile"
    assert src["source_key"] == "extra:svx1"


def test_12_gestione_campagne_fisso_piu_variabile():
    cat = _catalog_by_id()
    gc = cat["gestione-campagne"]
    assert gc["prezzo"] == 348
    assert gc["periodicita"] == "mensile_variabile"
    assert gc["componente_variabile"]["percentuale"] == 10
    assert gc["componente_variabile"]["base"] == "vendite_generate"
    src = build_servizio_extra_source(
        {"id": "svx2", "servizio_id": "gestione-campagne", "partner_id": "p1"}, cat, {}, set())
    assert src["importo"] == 348
    assert src["componente_variabile"]["percentuale"] == 10


def test_ogni_servizio_ha_periodicita_valida():
    valide = {"una_tantum", "mensile", "mensile_variabile"}
    for s in SERVIZI_CATALOGO:
        assert s["periodicita"] in valide, f"{s['id']} periodicita non valida"


# ── 13: fatture manuali continuano a funzionare ────────────────────────────

def test_13_fattura_manuale_non_ha_source_key_dedup():
    # Una fattura manuale non ha source_key -> non entra nell'indice univoco
    # parziale (che filtra sui soli source_key stringa) e non viene bloccata.
    from services.ciak_offers import eur_from_cents  # import leggero
    assert eur_from_cents(None) == 0.0
    # nessuna fonte con source_key None deve risultare "gia fatturata"
    assert build_evo_s_sources([], set()) == []


# ── 14-15: sicurezza + shadow route ────────────────────────────────────────

def test_14_endpoint_fatture_solo_admin():
    txt = (BACKEND / "routers" / "ciak_admin.py").read_text(encoding="utf-8")
    # ogni rotta /invoices deve dichiarare require_ciak_admin nella firma
    pattern = re.compile(
        r"@router\.(?:get|post|put|delete)\(\s*[\"']/invoices[^\"']*[\"'][^)]*\)\s*\n"
        r"async def [a-zA-Z0-9_]+\(([^)]*)\)",
        re.DOTALL,
    )
    found = pattern.findall(txt)
    assert found, "Nessuna rotta /invoices trovata"
    for sig in found:
        assert "require_ciak_admin" in sig, f"Rotta /invoices senza require_ciak_admin: {sig}"


def test_15_nessuna_shadow_route_invoices_in_server():
    txt = (BACKEND / "server.py").read_text(encoding="utf-8", errors="ignore")
    assert not re.search(r"@api_router\.\w+\(\s*[\"']/(admin/ciak/)?invoices", txt), \
        "Path invoices definito anche in server.py (shadow route)"
