"""
Unit test: POST /api/admin/ciak/leads/{id}/tocco - contatto manuale (LinkedIn, IG/FB, WhatsApp).

Perche' (5/10/2026): i passi che Mariangela fa ogni giorno fuori da Ciak (cerca il profilo,
risveglio, seguito) non lasciavano traccia nel lead. Ora lo Script si copia dalla scheda e
qui si registra cosa e' partito, da chi, quando. Regole che contano:
- niente invio e NIENTE evento Systeme (un tag farebbe partire sequenze email automatiche
  a chi abbiamo solo scritto su LinkedIn);
- chi e' gia' avanti non torna indietro a "contacted";
- il seguito si programma a 5 giorni dopo un risveglio e si toglie dopo il seguito.
Mongo finto, nessuna rete.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import routers.ciak_admin as ca
from tests._fake_mongo import FakeDb

pytestmark = pytest.mark.unit

CLAUDIO = SimpleNamespace(admin_type="claudio", user_id="u1", role="admin")
MARIANGELA = SimpleNamespace(admin_type="mariangela", user_id="u2", role="admin")


def _tocco(lead, channel="linkedin", message="risveglio_ex", sender=None, admin=CLAUDIO):
    ca.db = FakeDb(discovery_leads=[lead])
    body = ca.ToccoLeadIn(channel=channel, message=message, sender=sender)
    res = asyncio.run(ca.registra_tocco_lead("L1", body, admin=admin))
    return res, ca.db.discovery_leads.docs[0]


def test_risveglio_porta_il_lead_nuovo_a_contattato_e_registra_il_tocco():
    res, doc = _tocco({"id": "L1", "status": "discovered"})
    assert doc["status"] == "contacted"
    t = doc["touches"][-1]
    assert (t["channel"], t["via"], t["message"], t["by"]) == ("linkedin", "manuale", "risveglio_ex", "Claudio")
    assert t["systeme"] is False
    assert doc["last_contacted_at"] == t["at"]
    assert res["status"] == "contacted"


def test_il_seguito_si_programma_a_cinque_giorni_dopo_un_risveglio():
    _, doc = _tocco({"id": "L1", "status": "discovered"})
    atteso = (datetime.now(timezone.utc) + timedelta(days=5)).date().isoformat()
    assert doc["next_followup"] == atteso


def test_dopo_il_seguito_il_promemoria_si_toglie():
    _, doc = _tocco({"id": "L1", "status": "contacted", "next_followup": "2026-10-10"}, message="seguito")
    assert doc["next_followup"] is None
    assert doc["status"] == "contacted"


def test_chi_e_gia_avanti_non_torna_indietro():
    for stato in ("responded_positive", "qualified", "converted", "responded_negative"):
        _, doc = _tocco({"id": "L1", "status": stato})
        assert doc["status"] == stato, stato


def test_profilo_trovato_registra_ma_non_conta_come_contatto():
    _, doc = _tocco({"id": "L1", "status": "discovered"}, message="profilo_trovato")
    assert doc["status"] == "discovered"
    assert "last_contacted_at" not in doc
    assert "next_followup" not in doc
    assert len(doc["touches"]) == 1


def test_i_tocchi_si_accumulano_senza_cancellare_quelli_vecchi():
    ca.db = FakeDb(discovery_leads=[{"id": "L1", "status": "contacted",
                                     "touches": [{"channel": "email", "via": "smtp_brevo"}]}])
    for m in ("risveglio_ex", "seguito"):
        asyncio.run(ca.registra_tocco_lead("L1", ca.ToccoLeadIn(channel="linkedin", message=m), admin=CLAUDIO))
    assert [t["channel"] for t in ca.db.discovery_leads.docs[0]["touches"]] == ["email", "linkedin", "linkedin"]


def test_il_mittente_predefinito_e_chi_e_collegato():
    _, doc = _tocco({"id": "L1", "status": "discovered"}, admin=MARIANGELA)
    assert doc["touches"][-1]["by"] == "Mariangela"


def test_il_mittente_si_puo_scegliere_solo_tra_i_due():
    _, doc = _tocco({"id": "L1", "status": "discovered"}, sender="Claudio", admin=MARIANGELA)
    assert doc["touches"][-1]["by"] == "Claudio"
    with pytest.raises(HTTPException) as e:
        _tocco({"id": "L1", "status": "discovered"}, sender="Pinco")
    assert e.value.status_code == 400


@pytest.mark.parametrize("campo,valore", [("channel", "email"), ("channel", "sms"), ("message", "inventato")])
def test_canale_e_messaggio_non_validi_sono_rifiutati_e_non_scrivono(campo, valore):
    ca.db = FakeDb(discovery_leads=[{"id": "L1", "status": "discovered"}])
    args = {"channel": "linkedin", "message": "risveglio_ex", campo: valore}
    with pytest.raises(HTTPException) as e:
        asyncio.run(ca.registra_tocco_lead("L1", ca.ToccoLeadIn(**args), admin=CLAUDIO))
    assert e.value.status_code == 400
    assert ca.db.discovery_leads.writes == 0


def test_lead_inesistente_e_404():
    ca.db = FakeDb(discovery_leads=[])
    with pytest.raises(HTTPException) as e:
        asyncio.run(ca.registra_tocco_lead("X", ca.ToccoLeadIn(channel="linkedin", message="breve"), admin=CLAUDIO))
    assert e.value.status_code == 404


def test_nessun_evento_systeme_viene_emesso(monkeypatch):
    import services.ciak_systeme as cs

    def _boom(*a, **k):
        raise AssertionError("il tocco manuale non deve toccare Systeme")

    monkeypatch.setattr(cs, "ciak_emit_event", _boom)
    _tocco({"id": "L1", "status": "discovered", "email": "x@y.it"})


def test_mariangela_puo_chiamare_il_tocco_ma_non_altre_route_nuove():
    assert ca._path_allowed_for_commercial("/api/admin/ciak/leads/abc/tocco", "POST") is True
    assert ca._path_allowed_for_commercial("/api/admin/ciak/leads/abc/tocco/x", "POST") is False
