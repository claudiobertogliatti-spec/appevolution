"""
Admin: "Risultati finali" — sito vetrina Start e funnel dei partner in un posto solo.
Sola lettura. DB fittizio con $in / $nin.
"""
import pytest

from routers import ciak_admin

pytestmark = pytest.mark.unit


def _ok(doc, query):
    for k, cond in query.items():
        v = doc.get(k)
        if isinstance(cond, dict):
            if "$in" in cond and v not in cond["$in"]:
                return False
            if "$nin" in cond and v in cond["$nin"]:
                return False
        elif v != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    def find(self, query, projection=None):
        return _Cursor([dict(d) for d in self.docs if _ok(d, query)])


class _Db:
    def __init__(self, funnel=(), partners=(), deliverables=(), clients=()):
        self.partner_funnel = _Coll(funnel)
        self.partners = _Coll(partners)
        self.ciak_start_deliverables = _Coll(deliverables)
        self.ciak_clients = _Coll(clients)


ADMIN = object()


@pytest.mark.asyncio
async def test_funnel_con_anteprima_valida_elenca_le_pagine(monkeypatch):
    db = _Db(
        funnel=[
            {"partner_id": "p1", "preview_url": "https://sabai-daniele-andolfi.vercel.app", "preview_released": True},
            {"partner_id": "p2"},  # senza anteprima: non compare
        ],
        partners=[{"id": "p1", "name": "Daniele Andolfi"}],
    )
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.risultati_finali(_admin=ADMIN)
    assert [f["nome"] for f in res["funnel"]] == ["Daniele Andolfi"]
    f = res["funnel"][0]
    assert f["url_non_valido"] is False and f["released"] is True
    assert f["pages"] and all(p["url"].startswith("https://sabai-daniele-andolfi.vercel.app") for p in f["pages"])


@pytest.mark.asyncio
async def test_url_non_vercel_non_diventa_mai_un_link(monkeypatch):
    db = _Db(
        funnel=[{"partner_id": "p1", "preview_url": "http://evil.example.com/x"}],
        partners=[{"id": "p1", "name": "Mario"}],
    )
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.risultati_finali(_admin=ADMIN)
    f = res["funnel"][0]
    assert f["preview_url"] is None and f["url_non_valido"] is True and f["pages"] == []


@pytest.mark.asyncio
async def test_vetrine_start_con_nome_e_stato(monkeypatch):
    db = _Db(
        deliverables=[
            {"partner_id": "c1", "type": "showcase", "approval_status": "pending_review", "generated_at": "2026-10-06"},
            {"partner_id": "c2", "type": "showcase", "approval_status": "approved", "generated_at": "2026-10-01",
             "live_url": "https://anna.it"},
            {"partner_id": "c1", "type": "positioning"},  # non e' una vetrina
        ],
        clients=[{"id": "c1", "name": "Linda Pavia"}, {"id": "c2", "email": "anna@x.it"}],
    )
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.risultati_finali(_admin=ADMIN)
    assert [v["nome"] for v in res["vetrine"]] == ["Linda Pavia", "anna@x.it"]  # piu' recente prima
    assert res["vetrine"][1]["live_url"] == "https://anna.it"
    assert "html" not in res["vetrine"][0]


@pytest.mark.asyncio
async def test_senza_dati_risponde_vuoto(monkeypatch):
    monkeypatch.setattr(ciak_admin, "db", _Db())
    assert await ciak_admin.risultati_finali(_admin=ADMIN) == {"funnel": [], "vetrine": []}
