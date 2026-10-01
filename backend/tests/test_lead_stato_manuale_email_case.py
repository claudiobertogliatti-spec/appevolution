"""
Passaggi manuali di stato del lead con email salvata in maiuscolo.

`diagnostic_sessions.user_email` è salvata come l'ha digitata il lead (es.
"AMB@AnnaMariaBernard.it"), mentre l'admin la passa in minuscolo. La scheda
lead cerca senza distinguere le maiuscole, quindi mostra questionario e report;
ma "Conferma call fissata", "Modifica" ed "Elimina" cercavano con match esatto e
rispondevano "Nessuna diagnostic session" / "Lead non trovato".

Il finto database valuta DAVVERO il filtro (uguaglianza e $regex/$options):
quello del test storico restituiva sempre lo stesso documento e non poteva
accorgersi del problema.
"""
import asyncio
import re
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import routers.ciak_admin as admin_router
from routers.ciak_admin import (
    LeadEditIn,
    MarkCallBookedRequest,
    ciak_delete_lead,
    ciak_lead_edit,
    ciak_mark_call_booked,
)

pytestmark = pytest.mark.unit

_FAKE_ADMIN = SimpleNamespace(email="admin@evolution-pro.it", user_id="admin-1")
_EMAIL_SALVATA = "AMB@AnnaMariaBernard.it"
_EMAIL_ADMIN = "amb@annamariabernard.it"


def _match_value(stored, cond):
    if isinstance(cond, dict) and "$regex" in cond:
        flags = re.IGNORECASE if "i" in cond.get("$options", "") else 0
        return isinstance(stored, str) and re.search(cond["$regex"], stored, flags) is not None
    return stored == cond


def _match(doc, query):
    return all(_match_value(doc.get(k), v) for k, v in (query or {}).items())


class _FakeCollection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query, projection=None, sort=None):
        return next((d for d in self.docs if _match(d, query)), None)

    async def replace_one(self, query, doc):
        for i, d in enumerate(self.docs):
            if _match(d, query):
                self.docs[i] = doc
                return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)

    async def update_one(self, query, update):
        for d in self.docs:
            if _match(d, query):
                d.update(update["$set"])
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    async def update_many(self, query, update):
        hit = [d for d in self.docs if _match(d, query)]
        for d in hit:
            d.update(update["$set"])
        return SimpleNamespace(matched_count=len(hit))

    async def delete_many(self, query):
        keep = [d for d in self.docs if not _match(d, query)]
        deleted = len(self.docs) - len(keep)
        self.docs[:] = keep
        return SimpleNamespace(deleted_count=deleted)


class _FakeDB:
    def __init__(self):
        self.ciak_leads = _FakeCollection([
            {"email": _EMAIL_SALVATA, "nome": "ANNA MARIA BERNARD"},
        ])
        self.diagnostic_sessions = _FakeCollection([{
            "_id": "oid-1",
            "session_token": "tok-test",
            "user_email": _EMAIL_SALVATA,
            "user_name": "ANNA MARIA BERNARD",
            "current_state": "report_generated",
            "state_history": [],
            "crm_tags": [],
            "events": [],
        }])
        self.ciak_checkpoint_events = _FakeCollection([{"email": _EMAIL_SALVATA}])


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDB()
    monkeypatch.setattr(admin_router, "db", db)
    return db


@pytest.mark.asyncio
async def test_conferma_call_con_email_salvata_in_maiuscolo(fake_db):
    emitted = {}

    async def _fake_emit(**kwargs):
        emitted.update(kwargs)

    with patch("services.ciak_systeme.ciak_emit_event", _fake_emit):
        res = await ciak_mark_call_booked(
            MarkCallBookedRequest(email=_EMAIL_ADMIN), admin=_FAKE_ADMIN
        )
        await asyncio.sleep(0)

    assert res["ok"] is True
    assert res["current_state"] == "call_booked"
    assert res["already_booked"] is False
    saved = fake_db.diagnostic_sessions.docs[0]
    assert saved["current_state"] == "call_booked"
    assert "ciak_call_booked" in saved["crm_tags"]
    assert emitted.get("event_name") == "ciak_call_booked"
    # La mail al sistema CRM parte con l'indirizzo come salvato dal lead.
    assert emitted.get("email") == _EMAIL_SALVATA


@pytest.mark.asyncio
async def test_conferma_call_404_se_email_diversa(fake_db):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        await ciak_mark_call_booked(
            MarkCallBookedRequest(email="altra@persona.it"), admin=_FAKE_ADMIN
        )
    assert exc.value.status_code == 404
    assert fake_db.diagnostic_sessions.docs[0]["current_state"] == "report_generated"


@pytest.mark.asyncio
async def test_modifica_lead_con_email_salvata_in_maiuscolo(fake_db):
    res = await ciak_lead_edit(
        LeadEditIn(email=_EMAIL_ADMIN, nome="Anna Maria Bernard", phone="333"),
        admin=_FAKE_ADMIN,
    )
    assert res["success"] is True
    assert fake_db.ciak_leads.docs[0]["nome"] == "Anna Maria Bernard"
    assert fake_db.ciak_leads.docs[0]["phone"] == "333"
    assert fake_db.diagnostic_sessions.docs[0]["user_name"] == "Anna Maria Bernard"


@pytest.mark.asyncio
async def test_elimina_lead_con_email_salvata_in_maiuscolo(fake_db):
    res = await ciak_delete_lead(email=_EMAIL_ADMIN, admin=_FAKE_ADMIN)
    assert res["ciak_leads_deleted"] == 1
    assert res["diagnostic_sessions_deleted"] == 1
    assert res["ciak_checkpoint_events_deleted"] == 1
    assert fake_db.diagnostic_sessions.docs == []
    assert fake_db.ciak_leads.docs == []


@pytest.mark.asyncio
async def test_elimina_lead_non_tocca_altre_email(fake_db):
    fake_db.ciak_leads.docs.append({"email": "bernard.altra@example.com"})
    await ciak_delete_lead(email=_EMAIL_ADMIN, admin=_FAKE_ADMIN)
    assert [d["email"] for d in fake_db.ciak_leads.docs] == ["bernard.altra@example.com"]
