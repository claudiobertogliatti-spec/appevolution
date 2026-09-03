"""
Il publisher social deve pubblicare SOLO cio' che produce davvero, su tutti i canali.

Perche' esiste (4/9/2026): la pubblicazione si e' fermata a giugno e nessuno se
n'e' accorto. Un motore che dichiara "pubblicato" cio' che non e' uscito
ripeterebbe il difetto di famiglia di Ciak. Qui si verifica che:
- senza token NON si tocca la coda (fail-closed), i post restano pending;
- si pubblicano solo i post scaduti;
- se TUTTI i canali escono -> published; se solo alcuni -> partial; se nessuno ->
  failed. Un post uscito a meta' NON viene contato come pubblicato (controprova).
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://social-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services import social_publisher as sp  # noqa: E402

OGGI = datetime.now(timezone.utc).date().isoformat()
DOMANI = (datetime.now(timezone.utc).date() + timedelta(days=2)).isoformat()


class _Coll:
    def __init__(self, docs):
        self._docs = docs

    def _match(self, doc, query):
        for k, atteso in (query or {}).items():
            v = doc.get(k)
            if isinstance(atteso, dict):
                if "$lte" in atteso and not (v is not None and str(v) <= atteso["$lte"]):
                    return False
            elif v != atteso:
                return False
        return True

    async def count_documents(self, query=None):
        return sum(1 for d in self._docs if self._match(d, query))

    def find(self, query=None, proj=None):
        trovati = [d for d in self._docs if self._match(d, query)]

        class _Cur:
            def sort(self, campo, verso=1):
                trovati.sort(key=lambda d: d.get(campo) or "", reverse=verso < 0)
                return self

            def limit(self, n):
                self._n = n
                return self

            async def to_list(self, length=None):
                return trovati[: getattr(self, "_n", length or len(trovati))]

        return _Cur()

    async def update_one(self, flt, update):
        for d in self._docs:
            if d.get("_id") == flt.get("_id"):
                d.update(update.get("$set", {}))
                for k, inc in update.get("$inc", {}).items():
                    d[k] = d.get(k, 0) + inc
                return


class _Db:
    def __init__(self, docs):
        self._coll = _Coll(docs)

    def __getitem__(self, name):
        assert name == sp.COLLECTION
        return self._coll


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _con_token(monkeypatch):
    monkeypatch.setenv("IG_BUSINESS_ID", "123")
    monkeypatch.setenv("META_PAGE_ACCESS_TOKEN", "tok")

    async def _pid(client, token):
        return "PAGE"
    monkeypatch.setattr(sp, "_fb_page_id", _pid)


def test_senza_token_non_tocca_la_coda(monkeypatch):
    monkeypatch.delenv("IG_BUSINESS_ID", raising=False)
    monkeypatch.delenv("INSTAGRAM_BUSINESS_ID", raising=False)
    monkeypatch.delenv("META_PAGE_ACCESS_TOKEN", raising=False)
    docs = [{"_id": 1, "post_id": "p1", "status": "pending", "scheduled_date": OGGI,
             "image_urls": ["u1", "u2"], "caption": "c"}]
    db = _Db(docs)

    res = _run(sp.pubblica_coda_social(db, oggi=OGGI))

    assert res["configurato"] is False
    assert res["pubblicati"] == 0
    assert res["in_coda_scaduti"] == 1
    assert docs[0]["status"] == "pending"  # non diventa failed


def test_pubblica_solo_gli_scaduti_su_tutti_i_canali(monkeypatch):
    _con_token(monkeypatch)

    async def _ok(client, ig, token, page_id, post):
        return ({"instagram": {"media_id": "M", "permalink": "ig/" + post["post_id"]},
                 "facebook": {"post_id": "F", "permalink": "fb/" + post["post_id"]}}, [])
    monkeypatch.setattr(sp, "_pubblica_post", _ok)

    docs = [
        {"_id": 1, "post_id": "scaduto", "status": "pending", "scheduled_date": OGGI,
         "image_urls": ["u1", "u2"], "caption": "c"},
        {"_id": 2, "post_id": "futuro", "status": "pending", "scheduled_date": DOMANI,
         "image_urls": ["u1", "u2"], "caption": "c"},
    ]
    db = _Db(docs)

    res = _run(sp.pubblica_coda_social(db, oggi=OGGI))

    assert res["pubblicati"] == 1 and res["falliti"] == 0
    assert docs[0]["status"] == "published"
    assert docs[0]["results"]["facebook"]["permalink"] == "fb/scaduto"
    assert docs[1]["status"] == "pending"  # il futuro non si tocca


def test_un_canale_fallito_e_partial_non_published(monkeypatch):
    """Controprova: IG esce, FB no -> partial, NON published."""
    _con_token(monkeypatch)

    async def _meta(client, ig, token, page_id, post):
        return ({"instagram": {"media_id": "M", "permalink": "ig/x"}}, ["facebook: Graph 500"])
    monkeypatch.setattr(sp, "_pubblica_post", _meta)

    docs = [{"_id": 1, "post_id": "mezzo", "status": "pending", "scheduled_date": OGGI,
             "image_urls": ["u1", "u2"], "caption": "c"}]
    db = _Db(docs)

    res = _run(sp.pubblica_coda_social(db, oggi=OGGI))

    assert res["pubblicati"] == 0
    assert res["parziali"] == 1
    assert docs[0]["status"] == "partial"
    assert "facebook" in docs[0]["error"]


def test_tutti_i_canali_falliti_e_failed(monkeypatch):
    _con_token(monkeypatch)

    async def _ko(client, ig, token, page_id, post):
        return ({}, ["instagram: giu", "facebook: giu"])
    monkeypatch.setattr(sp, "_pubblica_post", _ko)

    docs = [{"_id": 1, "post_id": "rotto", "status": "pending", "scheduled_date": OGGI,
             "image_urls": ["u1", "u2"], "caption": "c"}]
    db = _Db(docs)

    res = _run(sp.pubblica_coda_social(db, oggi=OGGI))

    assert res["pubblicati"] == 0 and res["falliti"] == 1
    assert docs[0]["status"] == "failed"
