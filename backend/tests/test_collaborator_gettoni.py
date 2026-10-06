"""Gettoni di Mariangela: importi attuali, solo call FATTA, attribuzione, upgrade."""

from __future__ import annotations

import pytest

from services.collaborator_gettoni import RATES, build_gettoni, pay_by

pytestmark = pytest.mark.unit


def _diag(email, utm=None, call_done=None, call_booked=None):
    history = []
    if call_booked:
        history.append({"state": "call_booked", "timestamp": call_booked})
    if call_done:
        history.append({"state": "call_done", "timestamp": call_done})
    return {
        "user_email": email,
        "user_name": email.split("@")[0],
        "tracking": {"utm_source": utm} if utm else {},
        "state_history": history,
    }


def test_importi_attuali_non_sono_quelli_vecchi():
    cents = RATES["importi_cents"]
    assert cents == {"call_fatta": 1500, "start": 5000, "partnership": 25000, "upgrade": 20000}
    assert 27900 not in cents.values() and 22900 not in cents.values()


def test_call_fatta_matura_solo_se_attribuita_e_nel_mese():
    out = build_gettoni(
        "2026-10",
        [_diag("a@x.it", utm="mariangela", call_done="2026-10-03T10:00:00+00:00"),
         _diag("b@x.it", utm="mariangela", call_done="2026-09-30T10:00:00+00:00")],
        {}, set())
    assert [e["email"] for e in out["events"]] == ["a@x.it"]
    assert out["total_cents"] == 1500


def test_call_solo_fissata_non_da_gettone():
    out = build_gettoni("2026-10", [_diag("a@x.it", utm="mariangela", call_booked="2026-10-03T10:00:00+00:00")], {}, set())
    assert out["events"] == [] and out["total_cents"] == 0


def test_call_non_attribuita_va_in_da_verificare_non_nel_totale():
    out = build_gettoni("2026-10", [_diag("lead@x.it", call_done="2026-10-02T15:26:00+00:00")], {}, set())
    assert out["total_cents"] == 0
    assert out["to_verify"][0]["email"] == "lead@x.it"


def test_attribuzione_manuale_fa_maturare_il_gettone():
    out = build_gettoni("2026-10", [_diag("lead@x.it", call_done="2026-10-02T15:26:00+00:00")], {}, {"lead@x.it"})
    assert out["events"][0]["attribuzione"] == "manuale"
    assert out["total_cents"] == 1500 and out["to_verify"] == []


def test_utm_maiuscolo_o_con_spazi_e_riconosciuto():
    out = build_gettoni("2026-10", [_diag("a@x.it", utm=" Mariangela ", call_done="2026-10-02T00:00:00+00:00")], {}, set())
    assert out["total_cents"] == 1500


def test_start_50_e_partnership_250():
    diags = [_diag("s@x.it", utm="mariangela"), _diag("p@x.it", utm="mariangela")]
    clients = {"s@x.it": {"start_purchased_at": "2026-10-04T08:00:00+00:00"},
               "p@x.it": {"partnership_purchased_at": "2026-10-05T08:00:00+00:00"}}
    out = build_gettoni("2026-10", diags, clients, set())
    by_email = {e["email"]: e for e in out["events"]}
    assert by_email["s@x.it"]["tipo"] == "start" and by_email["s@x.it"]["importo_cents"] == 5000
    assert by_email["p@x.it"]["tipo"] == "partnership" and by_email["p@x.it"]["importo_cents"] == 25000


def test_upgrade_200_e_somma_con_lo_start_fa_250():
    diags = [_diag("u@x.it", utm="mariangela")]
    clients = {"u@x.it": {"start_purchased_at": "2026-09-20T08:00:00+00:00",
                          "partnership_purchased_at": "2026-10-10T08:00:00+00:00"}}
    ott = build_gettoni("2026-10", diags, clients, set())
    sett = build_gettoni("2026-09", diags, clients, set())
    assert [e["tipo"] for e in ott["events"]] == ["upgrade"] and ott["total_cents"] == 20000
    assert [e["tipo"] for e in sett["events"]] == ["start"] and sett["total_cents"] == 5000
    assert ott["total_cents"] + sett["total_cents"] == RATES["importi_cents"]["partnership"]


def test_esito_non_attribuito_non_matura():
    out = build_gettoni("2026-10", [_diag("n@x.it")],
                        {"n@x.it": {"partnership_purchased_at": "2026-10-05T08:00:00+00:00"}}, set())
    assert out["total_cents"] == 0 and out["events"] == []


def test_email_cliente_in_maiuscolo_e_diagnostica_minuscola():
    out = build_gettoni("2026-10", [_diag("Lead@X.it", utm="mariangela")],
                        {"lead@x.it": {"start_purchased_at": "2026-10-04T08:00:00+00:00"}}, set())
    assert out["total_cents"] == 5000


def test_scadenza_pagamento_entro_il_10_del_mese_dopo():
    assert pay_by("2026-10") == "2026-11-10"
    assert pay_by("2026-12") == "2027-01-10"
