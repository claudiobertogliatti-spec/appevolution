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


def test_ig_attende_finished_prima_di_media_publish(monkeypatch):
    """Il bug reale del 7/9 (Graph 400 code 9007 'Media ID is not available'): si
    pubblicava PRIMA che il container fosse FINISHED. Ora _pubblica_ig fa polling e
    chiama media_publish solo dopo che il container e' pronto."""
    async def _no_sleep(_):
        return None
    monkeypatch.setattr(sp.asyncio, "sleep", _no_sleep)

    ordine = []

    async def _post(client, path, data):
        if path.endswith("/media_publish"):
            ordine.append("publish")
            return {"id": "MEDIA1"}
        if path.endswith("/media"):
            ordine.append("create")
            return {"id": "CONT1"}
        raise AssertionError(path)

    stati = iter(["IN_PROGRESS", "FINISHED"])

    async def _get(client, path, params):
        if params.get("fields") == "status_code":
            ordine.append("check")
            return {"status_code": next(stati)}
        return {"permalink": "https://ig/p/abc"}

    monkeypatch.setattr(sp, "_graph_post", _post)
    monkeypatch.setattr(sp, "_graph_get", _get)

    res = _run(sp._pubblica_ig(object(), "IG", "tok", ["u1"], "c"))

    assert res["permalink"] == "https://ig/p/abc"
    assert ordine.count("check") == 2  # IN_PROGRESS poi FINISHED
    assert ordine.index("publish") > ordine.index("create")
    assert ordine.index("publish") > ordine.index("check")  # mai prima del FINISHED


def test_ig_solleva_se_il_container_non_diventa_pronto(monkeypatch):
    """Se il container resta non-pronto, si solleva e NON si pubblica (niente 9007
    ripetuto a vuoto): il post andra' `partial` e sara' ripreso al giro dopo."""
    async def _no_sleep(_):
        return None
    monkeypatch.setattr(sp.asyncio, "sleep", _no_sleep)

    published = []

    async def _post(client, path, data):
        if path.endswith("/media_publish"):
            published.append(1)
        return {"id": "CONT1"}

    async def _get(client, path, params):
        return {"status_code": "IN_PROGRESS"}  # non pronto mai

    monkeypatch.setattr(sp, "_graph_post", _post)
    monkeypatch.setattr(sp, "_graph_get", _get)

    try:
        _run(sp._pubblica_ig(object(), "IG", "tok", ["u1"], "c"))
        raise AssertionError("doveva sollevare: container mai pronto")
    except RuntimeError:
        pass
    assert not published, "non deve pubblicare se il container non e' FINISHED"


def test_un_post_partial_viene_ripreso_sul_solo_canale_mancante(monkeypatch):
    """Il difetto che lascia Instagram fermo: un post uscito su Facebook ma non su
    Instagram resta `partial` e NON viene mai piu' ripreso, perche' il giro seleziona
    solo `status == pending`. La coda continua, IG resta indietro per sempre.

    Comportamento atteso (fix): un `partial` scaduto viene ripreso e si ripubblica
    SOLO il canale mancante (Instagram), MAI quello gia' uscito (Facebook) — altrimenti
    si crea un doppione sulla Pagina. A canale completato -> `published`.
    """
    _con_token(monkeypatch)

    ig_calls, fb_calls = [], []

    async def _ig(client, ig, token, urls, caption):
        ig_calls.append(urls)
        return {"media_id": "M", "permalink": "ig/recuperato"}

    async def _fb(client, page_id, token, urls, caption):
        fb_calls.append(urls)
        return {"post_id": "F", "permalink": "fb/gia-uscito"}

    async def _noop_prewarm(client, urls):
        return None

    monkeypatch.setattr(sp, "_pubblica_ig", _ig)
    monkeypatch.setattr(sp, "_pubblica_fb", _fb)
    monkeypatch.setattr(sp, "_prewarm", _noop_prewarm)

    # Post gia' andato in partial in un giro precedente: FB uscito, IG mai.
    docs = [{"_id": 1, "post_id": "meta-fatto", "status": "partial",
             "scheduled_date": OGGI, "image_urls": ["u1", "u2"], "caption": "c",
             "results": {"facebook": {"post_id": "F", "permalink": "fb/gia-uscito"}},
             "error": "instagram: Graph 500", "attempts": 1}]
    db = _Db(docs)

    _run(sp.pubblica_coda_social(db, oggi=OGGI))

    # Instagram recuperato una volta; Facebook NON ritoccato (niente doppione).
    assert len(ig_calls) == 1, "Instagram doveva essere ripubblicato sul post partial"
    assert len(fb_calls) == 0, "Facebook era gia' uscito: non va ripubblicato (doppione)"
    # Ora il post e' completo su entrambi i canali.
    assert docs[0]["status"] == "published"
    assert docs[0]["results"]["instagram"]["permalink"] == "ig/recuperato"
    assert docs[0]["results"]["facebook"]["permalink"] == "fb/gia-uscito"
