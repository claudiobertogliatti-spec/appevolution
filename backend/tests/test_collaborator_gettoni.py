"""Gettoni di Mariangela: importi attuali, solo call FATTA, attribuzione, upgrade."""

from __future__ import annotations

import pytest

from services.collaborator_gettoni import RATES, build_gettoni, pay_by

pytestmark = pytest.mark.unit


def _diag(email, utm=None, call_done=None, call_booked=None, created_at=None):
    history = []
    if call_booked:
        history.append({"state": "call_booked", "timestamp": call_booked})
    if call_done:
        history.append({"state": "call_done", "timestamp": call_done})
    return {
        "user_email": email,
        "created_at": created_at,
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


def test_lead_inserito_a_mano_senza_diagnostica_con_call_dichiarata():
    out = build_gettoni("2026-10", [], {}, {"fuori@x.it": {"nome": "Fuori Funnel", "call_fatta_il": "2026-10-05"}})
    assert [(e["tipo"], e["nome"], e["attribuzione"]) for e in out["events"]] == [("call_fatta", "Fuori Funnel", "manuale")]
    assert out["total_cents"] == 1500


def test_lead_manuale_che_compra_senza_diagnostica_matura_lo_start():
    out = build_gettoni("2026-10", [], {"fuori@x.it": {"name": "Fuori", "start_purchased_at": "2026-10-06T08:00:00+00:00"}},
                        {"fuori@x.it": {"nome": "Fuori Funnel"}})
    assert [e["tipo"] for e in out["events"]] == ["start"] and out["total_cents"] == 5000


def test_acquisto_non_attribuito_va_in_da_verificare_con_importo_ma_non_nel_totale():
    clients = {"cliente@x.it": {"name": "Cliente", "partnership_purchased_at": "2026-10-06T08:00:00+00:00"}}
    out = build_gettoni("2026-10", [_diag("cliente@x.it")], clients, set())
    assert out["total_cents"] == 0
    pv = out["purchases_to_verify"]
    assert len(pv) == 1 and pv[0]["tipo"] == "partnership" and pv[0]["importo_cents"] == 25000


def test_acquisto_senza_diagnostica_ne_attribuzione_compare_in_da_verificare():
    clients = {"solo@x.it": {"name": "Solo Cliente", "start_purchased_at": "2026-10-06T08:00:00+00:00"}}
    out = build_gettoni("2026-10", [], clients, set())
    assert [p["email"] for p in out["purchases_to_verify"]] == ["solo@x.it"] and out["total_cents"] == 0


def test_un_lead_resta_solo_nel_suo_mese_di_ingresso():
    diags = [_diag("a@x.it", utm="mariangela", created_at="2026-09-23T10:00:00+00:00")]
    manual = {"b@x.it": {"nome": "B", "mese": "2026-10"}}
    sett = build_gettoni("2026-09", diags, {}, manual)
    ott = build_gettoni("2026-10", diags, {}, manual)
    nov = build_gettoni("2026-11", diags, {}, manual)
    assert [l["email"] for l in sett["leads"]] == ["a@x.it"]
    assert [l["email"] for l in ott["leads"]] == ["b@x.it"]
    assert nov["leads"] == [] and nov["conteggio"]["lead"] == 0
    assert (sett["conteggio"]["lead"], ott["conteggio"]["lead"]) == (1, 1)


def test_lead_di_settembre_con_call_e_start_in_ottobre_si_paga_in_ottobre_ma_e_contato_in_settembre():
    diags = [_diag("a@x.it", utm="mariangela", created_at="2026-09-23T10:00:00+00:00", call_done="2026-10-02T15:00:00+00:00")]
    clients = {"a@x.it": {"start_purchased_at": "2026-10-04T08:00:00+00:00"}}
    ott = build_gettoni("2026-10", diags, clients, set())
    assert ott["leads"] == [] and ott["conteggio"]["lead"] == 0
    assert [e["tipo"] for e in ott["da_pagare"]["lead"]] == ["call_fatta"] and ott["da_pagare"]["lead_cents"] == 1500
    assert [e["tipo"] for e in ott["da_pagare"]["bonus"]] == ["start"] and ott["da_pagare"]["bonus_cents"] == 5000
    assert {e["lead_mese"] for e in ott["events"]} == {"2026-09"}
    assert ott["lead_detail"]["a@x.it"]["mese"] == "2026-09"  # apribile anche se non e un lead di ottobre
    sett = build_gettoni("2026-09", diags, clients, set())
    assert [l["email"] for l in sett["leads"]] == ["a@x.it"] and sett["total_cents"] == 0


def test_conteggio_e_somme_del_mese():
    diags = [_diag("a@x.it", utm="mariangela", created_at="2026-10-01T10:00:00+00:00", call_done="2026-10-03T10:00:00+00:00"),
             _diag("b@x.it", utm="mariangela", created_at="2026-10-02T10:00:00+00:00", call_done="2026-10-04T10:00:00+00:00")]
    clients = {"a@x.it": {"partnership_purchased_at": "2026-10-05T08:00:00+00:00"}}
    out = build_gettoni("2026-10", diags, clients, set())
    assert out["conteggio"] == {"lead": 2, "call_fatte": 2, "bonus": 1}
    assert out["da_pagare"]["lead_cents"] == 3000 and out["da_pagare"]["bonus_cents"] == 25000
    assert out["total_cents"] == out["da_pagare"]["lead_cents"] + out["da_pagare"]["bonus_cents"] == 28000


def test_mese_di_ingresso_dichiarato_vince_sulla_data_di_creazione():
    diags = [_diag("a@x.it", utm="mariangela", created_at="2026-09-23T10:00:00+00:00")]
    out = build_gettoni("2026-10", diags, {}, {"a@x.it": {"nome": "A", "mese": "2026-10"}})
    assert [l["email"] for l in out["leads"]] == ["a@x.it"]
