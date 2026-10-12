"""Router della coda di Antonella: lettura coda, esito, config. Mongo finto locale, nessuna rete."""
import asyncio
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from fastapi import HTTPException

from routers import ciak_coda
from routers.ciak_admin import _week_start

pytestmark = pytest.mark.unit


class Cur:
    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class Col:
    def __init__(self, docs=None):
        self.docs = {d.get("_id", d.get("task_id", i)): dict(d) for i, d in enumerate(docs or [])}

    def find(self, q=None, *_a, **_k):
        q = q or {}
        return Cur([d for d in self.docs.values() if all(d.get(k) == v for k, v in q.items() if not isinstance(v, dict))])

    async def find_one(self, q=None, *_a, **_k):
        for d in self.docs.values():
            if all(d.get(k) == v for k, v in (q or {}).items() if not isinstance(v, dict)):
                return dict(d)
        return None

    async def update_one(self, flt, upd, upsert=False):
        key = flt.get("_id", flt.get("task_id"))
        nuovo = key not in self.docs
        if nuovo and not upsert:
            return
        cur = self.docs.setdefault(key, {"_id": key} if "_id" in flt else {})
        if nuovo:
            cur.update(upd.get("$setOnInsert") or {})
        cur.update(upd.get("$set") or {})


class Db:
    def __init__(self):
        self.partners = Col([{"id": "p1", "name": "Giulia Bianchi"}])
        self.partner_videocorso = Col([{"partner_id": "p1", "lessons": {
            "l1": {"output_version": 2, "video_final_duration_s": 600, "title": "Intro", "pipeline_completed_at": "2026-10-10"},
            "l2": {"output_version": 1, "video_final_duration_s": 300, "title": "Metodo", "pipeline_completed_at": "2026-10-11"},
        }}])
        self.ciak_coda_lezioni = Col()
        self.ciak_coda_config = Col()
        self.agent_tasks = Col([{"task_id": "x1", "assigned_to": "antonella", "week_start": _week_start(), "status": "open", "estimated_minutes": 90}])


@pytest.fixture()
def db(monkeypatch):
    d = Db()
    monkeypatch.setattr(ciak_coda, "db", d)
    return d


def run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_coda_mostra_consegna_e_piano(db):
    r = run(ciak_coda.get_coda())
    assert r["stime_iniziali"] is True
    assert len(r["consegne"]) == 1 and r["consegne"][0]["partner_nome"] == "Giulia Bianchi"
    assert [l["titolo"] for l in r["consegne"][0]["lezioni"]] == ["Intro", "Metodo"]
    assert r["consegne"][0]["pronta_entro"]
    assert all(g["usati"] <= g["budget"] for g in r["piano"]["giorni"])


def test_esito_verificata_toglie_la_lezione_dalla_coda(db):
    body = ciak_coda.EsitoBody(partner_id="p1", lesson_id="l1", output_version=2, esito="verificata",
                               controlli={k: True for k in ("audio", "inizio_fine", "parte_su_systeme", "titolo_ordine", "nessun_salto")},
                               minuti_reali=18)
    run(ciak_coda.post_esito(body, data=None))
    r = run(ciak_coda.get_coda())
    assert [l["lesson_id"] for l in r["consegne"][0]["lezioni"]] == ["l2"]
    assert db.ciak_coda_lezioni.docs["p1|l1|2"]["minuti_reali"] == 18


def test_esito_con_versione_vecchia_e_409(db):
    body = ciak_coda.EsitoBody(partner_id="p1", lesson_id="l1", output_version=1, esito="da_correggere", note="audio basso", minuti_reali=5)
    with pytest.raises(HTTPException) as e:
        run(ciak_coda.post_esito(body, data=None))
    assert e.value.status_code == 409


def test_esito_incompleto_e_422(db):
    body = ciak_coda.EsitoBody(partner_id="p1", lesson_id="l1", output_version=2, esito="verificata", controlli={"audio": True}, minuti_reali=10)
    with pytest.raises(HTTPException) as e:
        run(ciak_coda.post_esito(body, data=None))
    assert e.value.status_code == 422


def test_da_correggere_finisce_nella_sua_lista(db, monkeypatch):
    async def no_tg(_msg):
        return None
    import routers.partner_journey as pj
    monkeypatch.setattr(pj, "notify_telegram", no_tg, raising=False)
    body = ciak_coda.EsitoBody(partner_id="p1", lesson_id="l2", output_version=1, esito="da_correggere", note="taglio brusco alla fine", minuti_reali=9)
    run(ciak_coda.post_esito(body, data=None))
    r = run(ciak_coda.get_coda())
    assert [l["lesson_id"] for l in r["da_correggere"]] == ["l2"]
    assert [l["lesson_id"] for l in r["consegne"][0]["lezioni"]] == ["l1"]


def test_config_salvata_e_riletta(db):
    out = run(ciak_coda.put_config(ciak_coda.ConfigBody(minuti_per_giorno={"0": 30, "1": 0}), data=None))
    assert out["config"]["minuti_per_giorno"]["0"] == 30
    r = run(ciak_coda.get_coda())
    assert r["config"]["minuti_per_giorno"]["1"] == 0


def test_esito_crea_l_attivita_per_la_fatturazione_con_i_minuti_veri(db):
    body = ciak_coda.EsitoBody(partner_id="p1", lesson_id="l1", output_version=2, esito="verificata",
                               controlli={k: True for k in ("audio", "inizio_fine", "parte_su_systeme", "titolo_ordine", "nessun_salto")},
                               minuti_reali=18)
    run(ciak_coda.post_esito(body, data=None))
    run(ciak_coda.post_esito(body, data=None))  # un secondo invio non duplica
    lez = [t for t in db.agent_tasks.docs.values() if t.get("task_type") == "lesson_check"]
    assert len(lez) == 1
    t = lez[0]
    assert t["assigned_to"] == "antonella" and t["actual_minutes"] == 18 and t["approved_minutes"] == 0
    assert t["hourly_rate"] == 25.0 and t["status"] == "completed" and t["context"]["lesson_key"] == "p1|l1|2"


def test_la_coda_dice_quanto_e_gia_assegnato_nella_settimana(db):
    r = run(ciak_coda.get_coda())
    assert r["altri_minuti_settimana"] == 90
    assert r["tetto_settimana_min"] == 300
