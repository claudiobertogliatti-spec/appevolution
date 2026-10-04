"""
Unit test: /pipeline-blueprint espone QUANDO e' entrato nello stadio e la data della call.

Perche' (4/10/2026): `updated_at` degli stadi call e' la data di CREAZIONE della
sessione diagnostica, non l'ultimo cambio di stato: una "call fatta" di ieri
poteva mostrare una data di settimane fa. Per la home "Oggi" servono i giorni di
attesa veri (`stage_since`) e l'appuntamento (`call_starts_at`, dal webhook Cal.com).

Mongo finto, nessuna rete: gira in CI.
"""
import asyncio

import pytest

import routers.ciak_admin as ca
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

CREATA = "2026-09-01T09:00:00+00:00"


def _sessione(state, history=None, events=None, email="Lead@Ciak.it"):
    return {
        "_id": "oid-" + email, "session_token": "tok-" + email,
        "user_email": email, "user_name": "Lead Test",
        "current_state": state, "created_at": CREATA,
        "state_history": history or [], "events": events or [],
    }


def _ev(name, **meta):
    return {"event": name, "timestamp": "2026-09-20T10:00:00+00:00", "metadata": meta}


def _run(sessioni):
    ca.db = FakeDb(diagnostic_sessions=sessioni, proposte=[], partners=[], ciak_leads=[])
    return asyncio.run(ca.pipeline_blueprint(admin={}))


def _item(res, stage, email="lead@ciak.it"):
    col = next(c for c in res["columns"] if c["id"] == stage)
    return next(i for i in col["items"] if i["email"] == email)


def test_stage_since_e_la_data_del_cambio_di_stato_non_la_creazione():
    res = _run([_sessione(
        "call_done",
        history=[{"state": "call_booked", "timestamp": "2026-09-10T10:00:00+00:00"},
                 {"state": "call_done", "timestamp": "2026-09-25T15:00:00+00:00"}],
    )])
    it = _item(res, "call_fatta")
    assert it["stage_since"] == "2026-09-25T15:00:00+00:00"
    assert it["updated_at"] == CREATA  # invariato: lo usa ancora PipelineList


def test_senza_storico_stage_since_ricade_sulla_creazione():
    it = _item(_run([_sessione("call_booked")]), "call_prenotata")
    assert it["stage_since"] == CREATA


def test_call_starts_at_dalla_prenotazione_calcom():
    ev = [_ev("calcom_booking_created", booking_id="b1", starts_at="2026-10-06T14:00:00.000Z")]
    it = _item(_run([_sessione("call_booked", events=ev)]), "call_prenotata")
    assert it["call_starts_at"] == "2026-10-06T14:00:00.000Z"


def test_lo_spostamento_vince_sulla_prenotazione_iniziale():
    ev = [_ev("calcom_booking_created", starts_at="2026-10-06T14:00:00.000Z"),
          _ev("calcom_booking_rescheduled", new_starts_at="2026-10-08T09:30:00.000Z")]
    it = _item(_run([_sessione("call_booked", events=ev)]), "call_prenotata")
    assert it["call_starts_at"] == "2026-10-08T09:30:00.000Z"


def test_prenotazione_annullata_non_lascia_una_data():
    ev = [_ev("calcom_booking_created", starts_at="2026-10-06T14:00:00.000Z"),
          _ev("calcom_booking_cancelled", booking_id="b1")]
    it = _item(_run([_sessione("call_booked", events=ev)]), "call_prenotata")
    assert it["call_starts_at"] is None


def test_call_segnata_a_mano_non_ha_data_inventata():
    # Nessun evento Cal.com: il campo c'e' ma e' None, mai un valore di ripiego.
    it = _item(_run([_sessione("call_booked")]), "call_prenotata")
    assert "call_starts_at" in it and it["call_starts_at"] is None


def test_email_maiuscola_viene_normalizzata():
    res = _run([_sessione("call_booked", email="MARIO@Ciak.IT")])
    assert _item(res, "call_prenotata", email="mario@ciak.it")["email"] == "mario@ciak.it"
