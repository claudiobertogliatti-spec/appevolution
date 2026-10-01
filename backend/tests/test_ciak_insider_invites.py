"""
Evolution Insider — inviti. Ermetici: niente rete, niente Mongo. Il DB finto VALUTA i
filtri (non restituisce a prescindere), cosi' un filtro sbagliato fa fallire il test.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_insider_invites as ins

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)


def _iso(days_ago: float) -> str:
    return (NOW - timedelta(days=days_ago)).isoformat()


def _session(state="report_generated", email="a@example.com", days_ago=20, token="t1", name="Anna Rossi"):
    return {
        "session_token": token, "user_email": email, "user_name": name, "current_state": state,
        "state_history": [{"state": state, "timestamp": _iso(days_ago)}],
    }


def test_norm_email_minuscolo_e_validazione():
    assert ins.norm_email("  Anna.Rossi@Example.COM ") == "anna.rossi@example.com"
    assert ins.norm_email("senza-chiocciola") == ""
    assert ins.norm_email("a b@example.com") == ""
    assert ins.norm_email(None) == ""


def test_parse_iso_accetta_z_e_naive():
    assert ins.parse_iso("2026-10-01T10:00:00Z").tzinfo is not None
    assert ins.parse_iso("2026-10-01T10:00:00").tzinfo is not None
    assert ins.parse_iso("boh") is None and ins.parse_iso(None) is None


def test_state_time_prende_l_ultimo_timestamp_dello_stato():
    s = {"state_history": [
        {"state": "report_generated", "timestamp": "2026-10-01T10:00:00+00:00"},
        {"state": "call_booked", "timestamp": "2026-10-02T10:00:00+00:00"},
        {"state": "report_generated", "timestamp": "2026-10-03T10:00:00+00:00"},
    ]}
    assert ins.state_time(s, "report_generated") == datetime(2026, 10, 3, 10, 0, tzinfo=timezone.utc)
    assert ins.state_time(s, "call_done") is None


def test_has_bought_riconosce_ogni_indicatore():
    assert ins.has_bought({"start_purchased_at": "2026-10-01"}, None)
    assert ins.has_bought({"access_level": "cliente_start"}, None)
    assert ins.has_bought({"access_level": "partner"}, None)
    assert ins.has_bought({"partnership_attiva": True}, None)
    assert ins.has_bought({}, {"stato": "pagamento_completato"})
    assert ins.has_bought({}, {"stato": "contratto_firmato"})
    assert not ins.has_bought({"access_level": "lead"}, {"stato": "vista"})
    assert not ins.has_bought(None, None)


def test_reference_questionario_dopo_14_giorni_dal_report():
    path, ref = ins.reference(_session("report_generated", days_ago=20), None, None)
    assert path == ins.PATH_QUESTIONARIO
    assert ref == NOW - timedelta(days=20) + timedelta(days=14)


def test_reference_call_done_con_proposta_usa_la_scadenza():
    proposta = {"scadenza": _iso(2), "stato": "scaduta"}
    path, ref = ins.reference(_session("call_done"), proposta, {"consegna_inviata_at": _iso(30)})
    assert path == ins.PATH_PROPOSTA and ref == NOW - timedelta(days=2)


def test_reference_call_done_senza_proposta_usa_consegna_blueprint_piu_7_giorni():
    path, ref = ins.reference(_session("call_done"), None, {"consegna_inviata_at": _iso(10)})
    assert path == ins.PATH_BLUEPRINT and ref == NOW - timedelta(days=10) + timedelta(days=7)


def test_reference_call_done_senza_consegna_ripiega_sulla_data_della_call():
    path, ref = ins.reference(_session("call_done", days_ago=9), None, None)
    assert path == ins.PATH_BLUEPRINT and ref == NOW - timedelta(days=9) + timedelta(days=7)


@pytest.mark.parametrize("state", ["call_booked", "ciak_completed", "ciak_started", "lead_created", None])
def test_reference_altri_stati_non_sono_mai_candidati(state):
    assert ins.reference(_session(state or "x") | {"current_state": state}, None, None) is None
