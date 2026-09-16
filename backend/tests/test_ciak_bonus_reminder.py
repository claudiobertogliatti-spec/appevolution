"""
Promemoria della finestra bonus 48h: manda UN promemoria a chi si avvicina alla
scadenza (~24h) e non ha ancora comprato Ciak Start. Idempotente. Email mockata.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_bonus_reminder as br

pytestmark = pytest.mark.unit


def _iso(hours_from_now: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours_from_now)).isoformat()


def _match(doc, query):
    for key, cond in query.items():
        val = doc.get(key)
        if isinstance(cond, dict):
            for op, target in cond.items():
                if op == "$in" and val not in target:
                    return False
                if op == "$nin" and val in target:
                    return False
                if op == "$ne" and val == target:
                    return False
        elif val != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, n):
        return [dict(d) for d in self._docs[:n]]


class _Coll:
    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    def find(self, query=None):
        return _Cursor([d for d in self.docs if _match(d, query or {})])

    async def update_one(self, query, update, upsert=False):
        for d in self.docs:
            if d.get("id") == query.get("id") and _match(d, query):
                d.update(update.get("$set", {}))
        return None


class _Db:
    def __init__(self, docs):
        self.ciak_clients = _Coll(docs)


@pytest.fixture
def sent(monkeypatch):
    calls = []
    monkeypatch.setattr(br, "_send_reminder", lambda email, nome, ore, link: calls.append((email, ore)) or True)
    return calls


def _client(**extra):
    base = {"id": "c1", "email": "c@x.it", "name": "Linda Pavia", "bonus_expires_at": _iso(10)}
    base.update(extra)
    return base


@pytest.mark.asyncio
async def test_manda_promemoria_a_chi_e_nelle_ultime_24h(sent):
    db = _Db([_client(bonus_expires_at=_iso(10))])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 1
    assert sent and sent[0][0] == "c@x.it"
    assert db.ciak_clients.docs[0]["bonus_reminder_sent_at"]  # flag scritto (no doppioni)


@pytest.mark.asyncio
async def test_non_manda_se_mancano_piu_di_24h(sent):
    db = _Db([_client(bonus_expires_at=_iso(40))])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 0
    assert sent == []


@pytest.mark.asyncio
async def test_non_manda_se_gia_scaduto(sent):
    db = _Db([_client(bonus_expires_at=_iso(-2))])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 0


@pytest.mark.asyncio
async def test_non_manda_a_chi_ha_gia_ricevuto(sent):
    db = _Db([_client(bonus_reminder_sent_at=_iso(-1))])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 0
    assert sent == []


@pytest.mark.asyncio
async def test_non_manda_a_chi_ha_gia_comprato_start(sent):
    db = _Db([_client(access_level="cliente_start")])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 0
    db2 = _Db([_client(start_purchased_at=_iso(-1))])
    assert (await br.invia_promemoria_bonus(db2))["inviati"] == 0


@pytest.mark.asyncio
async def test_salta_senza_email(sent):
    db = _Db([_client(email="")])
    res = await br.invia_promemoria_bonus(db)
    assert res["inviati"] == 0
