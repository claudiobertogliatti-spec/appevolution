"""Compiti sui partner + avvisi di percorso. Solo lettura sul percorso; nessuna rete."""
import asyncio
import re
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_partner_attivita as pa

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)
DEF = [
    {"step_id": "a", "label": "Benvenuto", "step_number": 1},
    {"step_id": "b", "label": "Brand kit", "step_number": 2},
    {"step_id": "c", "label": "Posizionamento", "step_number": 3},
]


def st(sid, status, giorni_fa=None, pid="p1"):
    return {"partner_id": pid, "step_id": sid, "status": status,
            "completed_at": (NOW - timedelta(days=giorni_fa)) if giorni_fa is not None else None}


def test_valida_compito():
    assert pa.valida_compito("  Sento   Dario ", "2026-10-15", date(2026, 10, 12)) == ("Sento Dario", "2026-10-15")
    assert pa.valida_compito("Sento Dario", None) == ("Sento Dario", None)
    assert pa.valida_compito("Sento Dario", "") == ("Sento Dario", None)
    for t, s in [("", None), ("ab", None), (None, None), ("Sento Dario", "boh"), ("Sento Dario", "2020-01-01")]:
        with pytest.raises(ValueError):
            pa.valida_compito(t, s, date(2026, 10, 12))


def test_avviso_con_prossimo_passo_del_percorso():
    r = pa.avvisi_percorso(steps=[st("a", "done", 10), st("b", "done", 2), st("c", "pending")], definizione=DEF, visti=set(), now=NOW)
    assert [(x["step_id"], x["prossimo"]) for x in r] == [("b", "Posizionamento")]  # "a" e' vecchio


def test_percorso_finito_non_ha_prossimo():
    r = pa.avvisi_percorso(steps=[st("a", "done", 20), st("b", "done", 20), st("c", "completed", 1)], definizione=DEF, visti=set(), now=NOW)
    assert r[0]["prossimo"] is None


def test_visti_e_stati_non_completati_non_compaiono():
    steps = [st("a", "done", 1), st("b", "in_progress", None), st("c", "blocked", None)]
    assert pa.avvisi_percorso(steps=steps, definizione=DEF, visti={("p1", "a")}, now=NOW) == []


def test_data_come_stringa_iso_e_step_sconosciuti():
    s = {"partner_id": "p1", "step_id": "a", "status": "done", "completed_at": (NOW - timedelta(days=1)).isoformat()}
    ignoto = {"partner_id": "p1", "step_id": "zzz", "status": "done", "completed_at": NOW}
    r = pa.avvisi_percorso(steps=[s, ignoto], definizione=DEF, visti=set(), now=NOW)
    assert [x["step_id"] for x in r] == ["a"]


# ── endpoint ──
def _match(doc, q):
    for k, v in q.items():
        if isinstance(v, dict) and "$in" in v:
            if doc.get(k) not in v["$in"]:
                return False
        elif isinstance(v, dict) and "$exists" in v:
            if (k in doc) != v["$exists"]:
                return False
        elif k == "$or":
            if not any(_match(doc, sub) for sub in v):
                return False
        elif doc.get(k) != v:
            return False
    return True


class _Cur:
    def __init__(self, d): self.d = d
    async def to_list(self, n): return [dict(x) for x in self.d[:n]]
    def __aiter__(self):
        self._i = iter(self.d); return self
    async def __anext__(self):
        try: return dict(next(self._i))
        except StopIteration: raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None): return next((dict(d) for d in self.docs if _match(d, q)), None)
    def find(self, q, projection=None): return _Cur([d for d in self.docs if _match(d, q)])
    async def insert_one(self, doc): self.docs.append(dict(doc))
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if _match(d, q):
                d.update(upd["$set"]); return
        if upsert: self.docs.append(dict(upd["$set"]))


@pytest.fixture
def fake(monkeypatch):
    oggi = datetime.now(timezone.utc)
    d = SimpleNamespace(
        partners=_Coll([{"id": "p1", "name": "Dario Fontana"}, {"id": "p2", "name": "Ex", "stato": "ex"}]),
        ciak_partner_attivita=_Coll(), ciak_avvisi_visti=_Coll(),
        partner_journey_steps=_Coll([
            {"partner_id": "p1", "step_id": "03-brand-kit", "status": "done", "completed_at": oggi - timedelta(days=1)},
            {"partner_id": "p2", "step_id": "03-brand-kit", "status": "done", "completed_at": oggi - timedelta(days=1)},
        ]),
    )
    monkeypatch.setattr(ciak_admin, "db", d)
    return d


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)
def crea(pid="p1", testo="Sento Dario per il funnel", scad=None):
    return run(ciak_admin.crea_compito(ciak_admin.CompitoIn(partner_id=pid, testo=testo, scadenza=scad), ADMIN))


def test_crea_elenca_e_chiude_un_compito(fake):
    c = crea(scad=(date.today() + timedelta(days=2)).isoformat())["compito"]
    r = run(ciak_admin.partner_attivita(partner_id=None, admin=ADMIN))
    assert r["items"][0]["partner_nome"] == "Dario Fontana" and r["items"][0]["stato_scadenza"] == "futuro"
    run(ciak_admin.compito_fatto(ciak_admin.CompitoFatto(id=c["id"]), ADMIN))
    assert run(ciak_admin.partner_attivita(partner_id=None, admin=ADMIN))["items"] == []
    assert fake.ciak_partner_attivita.docs[0]["fatto_da"] == "claudio@x.it"  # non si cancella


def test_compito_su_partner_inesistente_404_e_data_passata_422(fake):
    with pytest.raises(HTTPException) as e: crea(pid="nope")
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e: crea(scad="2020-01-01")
    assert e.value.status_code == 422


def test_compito_fatto_inesistente_404(fake):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.compito_fatto(ciak_admin.CompitoFatto(id="x"), ADMIN))
    assert e.value.status_code == 404


def test_filtro_per_partner(fake):
    crea(); 
    assert run(ciak_admin.partner_attivita(partner_id="p2", admin=ADMIN))["items"] == []


def test_avvisi_solo_partner_attivi_e_scompaiono_dopo_visto(fake):
    r = run(ciak_admin.avvisi_percorso(ADMIN))
    assert [(a["partner_nome"], a["step_label"]) for a in r["items"]] == [("Dario Fontana", "Brand kit")]
    run(ciak_admin.avviso_visto(ciak_admin.AvvisoVisto(partner_id="p1", step_id="03-brand-kit"), ADMIN))
    assert run(ciak_admin.avvisi_percorso(ADMIN))["items"] == []
    # il percorso non e' stato toccato
    assert all(s["status"] == "done" for s in fake.partner_journey_steps.docs)
