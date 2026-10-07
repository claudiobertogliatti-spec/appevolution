"""Guardia: l'iscrizione pubblica dai funnel in bozza dei partner non e' un varco.

L'endpoint e' raggiungibile senza token (lo chiama una pagina statica). Questi test
fissano le regole che lo rendono sicuro: partner con flag spento = 404 indistinguibile da
"non esiste", consenso obbligatorio, campo trappola, deduplica, tetto orario, nessuna email
nell'avviso Telegram.
"""
import asyncio

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routers import partner_optin
from routers.partner_optin import OptinRequest, partner_optin as handler

pytestmark = pytest.mark.unit


class FakeColl:
    def __init__(self, docs=None):
        self.docs = list(docs or [])
        self.updates = []

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return {k: v for k, v in d.items() if k != "_id"}
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update):
        self.updates.append((query, update))

    async def count_documents(self, query):
        src = query.get("source")
        return len([d for d in self.docs if d.get("source") == src and d.get("partner_id") == query.get("partner_id")])


class FakeDb:
    def __init__(self, partners, leads=None):
        self.partners = FakeColl(partners)
        self.partner_leads = FakeColl(leads)


ON = {"id": "23", "name": "Daniele Andolfi", "public_optin": {"enabled": True, "funnel_origin": "masterclass-bozza"}}


@pytest.fixture
def telegram(monkeypatch):
    sent = []

    async def fake_notify(message):
        sent.append(message)

    monkeypatch.setattr("routers.partner_journey.notify_telegram", fake_notify)
    return sent


def run(partner_id, **body):
    base = {"nome": "Giulia Rossi", "email": "Giulia@Example.it", "consenso": True}
    base.update(body)

    async def go():
        out = await handler(partner_id, OptinRequest(**base))
        await asyncio.sleep(0)  # lascia partire l'avviso
        return out

    return asyncio.run(go())


def use(monkeypatch, db):
    monkeypatch.setattr(partner_optin, "db", db)


def test_flag_off_or_unknown_partner_look_the_same(monkeypatch, telegram):
    use(monkeypatch, FakeDb([{"id": "7", "name": "Altro"}, {"id": "8", "public_optin": {"enabled": False}}]))
    for pid in ("7", "8", "999"):
        with pytest.raises(HTTPException) as e:
            run(pid)
        assert e.value.status_code == 404 and e.value.detail == "Non trovato"


def test_only_a_real_true_enables_the_funnel(monkeypatch, telegram):
    use(monkeypatch, FakeDb([{"id": "9", "public_optin": {"enabled": "false"}}]))
    with pytest.raises(HTTPException) as e:
        run("9")
    assert e.value.status_code == 404


def test_consent_is_required_and_nothing_is_saved_without_it(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    with pytest.raises(HTTPException) as e:
        run("23", consenso=False)
    assert e.value.status_code == 422
    assert db.partner_leads.docs == []


def test_bad_email_is_rejected():
    with pytest.raises(ValidationError):
        OptinRequest(nome="A", email="non-una-email", consenso=True)


def test_new_lead_is_saved_with_consent_and_without_raw_payload(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    assert run("23", telefono="+39 333 12a34", utm_source="instagram").ok is True
    (lead,) = db.partner_leads.docs
    assert lead["partner_id"] == "23" and lead["email"] == "giulia@example.it"
    assert lead["status"] == "new" and lead["source"] == partner_optin.SOURCE
    assert lead["funnel_origin"] == "masterclass-bozza" and lead["phone"] == "+39 333 1234"
    assert lead["consent"]["accepted"] is True and lead["consent"]["at"]
    assert lead["utm"] == {"utm_source": "instagram"}
    assert "raw_data" not in lead


def test_telegram_notice_never_carries_the_email(monkeypatch, telegram):
    use(monkeypatch, FakeDb([ON]))
    run("23")
    assert len(telegram) == 1
    assert "example.it" not in telegram[0] and "Daniele Andolfi" in telegram[0]


def test_honeypot_pretends_success_and_saves_nothing(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    assert run("23", website="http://spam.example").ok is True
    assert db.partner_leads.docs == [] and telegram == []


def test_same_email_twice_updates_instead_of_duplicating(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    run("23")
    run("23", email="giulia@example.it")
    assert len(db.partner_leads.docs) == 1
    assert len(db.partner_leads.updates) == 1 and len(telegram) == 1


def test_hourly_cap_blocks_abuse(monkeypatch, telegram):
    recenti = [{"partner_id": "23", "source": partner_optin.SOURCE} for _ in range(partner_optin.MAX_PER_HOUR)]
    db = FakeDb([ON], recenti)
    use(monkeypatch, db)
    with pytest.raises(HTTPException) as e:
        run("23", email="nuovo@example.it")
    assert e.value.status_code == 429
    assert len(db.partner_leads.docs) == partner_optin.MAX_PER_HOUR
