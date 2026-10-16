"""Memoria Ciak: store versionato + blocco per gli agenti."""
import asyncio

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_memoria

pytestmark = pytest.mark.unit


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, chiave, verso):
        self.docs = sorted(self.docs, key=lambda d: d.get(chiave) or "", reverse=verso < 0)
        return self

    def limit(self, n):
        self.docs = self.docs[:n]
        return self

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._it))
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self):
        self.docs = []

    @staticmethod
    def _ok(d, q):
        return all(d.get(k) == v for k, v in q.items())

    async def find_one(self, q, projection=None):
        return next((dict(d) for d in self.docs if self._ok(d, q)), None)

    def find(self, q, projection=None):
        return _Cursor([d for d in self.docs if self._ok(d, q)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, q, upd):
        for d in self.docs:
            if self._ok(d, q):
                d.update(upd.get("$set", {}))
                return

    async def update_many(self, q, upd):
        for d in self.docs:
            if self._ok(d, q):
                d.update(upd.get("$set", {}))


class _Db:
    def __init__(self):
        self.ciak_memoria = _Coll()


@pytest.fixture
def db(monkeypatch):
    fake = _Db()
    monkeypatch.setattr(ciak_memoria, "db", fake)
    return fake


def run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def test_senza_memoria_il_blocco_e_vuoto(db):
    assert run(ciak_memoria.get_active()) is None
    assert run(ciak_memoria.render_active_block()) == ""


def test_sezioni_vuote_non_producono_blocco():
    assert ciak_memoria.render_block({"marchio": "  ", "tono": ""}) == ""


def test_blocco_ha_solo_le_sezioni_scritte_nell_ordine_fisso():
    out = ciak_memoria.render_block({"tono": "Dai del tu.", "marchio": "Ciak aiuta i consulenti."})
    assert out.index("MARCHIO") < out.index("TONO")
    assert "OFFERTE" not in out and "REGOLE" not in out
    assert "non lo inventi" in out


def test_only_esclude_le_sezioni_interne():
    sections = {k: f"testo {k}" for k in ciak_memoria.SECTION_KEYS}
    out = ciak_memoria.render_block(sections, only=ciak_memoria.CLIENT_SAFE)
    assert "testo marchio" in out and "testo tono" in out
    assert "testo offerte" not in out and "testo regole" not in out


def test_sezione_sconosciuta_e_un_errore_non_ignorata():
    with pytest.raises(ValueError, match="sconosciute"):
        ciak_memoria.normalize_sections({"prezzi": "x"})


def test_sezione_troppo_lunga_e_un_errore():
    with pytest.raises(ValueError, match="supera"):
        ciak_memoria.normalize_sections({"marchio": "a" * (ciak_memoria.MAX_SECTION_CHARS + 1)})


def test_sezione_non_testo_e_un_errore():
    with pytest.raises(ValueError, match="testo"):
        ciak_memoria.normalize_sections({"marchio": ["a"]})


def test_nuova_versione_diventa_attiva_e_la_vecchia_resta(db):
    v1 = run(ciak_memoria.create_version({"tono": "Dai del tu."}, "prima", "c@x.it"))
    v2 = run(ciak_memoria.create_version({"tono": "Dai del lei."}, "seconda", "c@x.it", parent_id=v1["id"]))
    assert run(ciak_memoria.get_active())["id"] == v2["id"]
    assert len(run(ciak_memoria.list_versions())) == 2
    assert [d["active"] for d in db.ciak_memoria.docs].count(True) == 1


def test_ritorno_indietro_riattiva_la_versione_vecchia(db):
    v1 = run(ciak_memoria.create_version({"tono": "Dai del tu."}, "prima", "c@x.it"))
    run(ciak_memoria.create_version({"tono": "Dai del lei."}, "seconda", "c@x.it"))
    run(ciak_memoria.activate_version(v1["id"]))
    assert "Dai del tu." in run(ciak_memoria.render_active_block())
    assert run(ciak_memoria.activate_version("inesistente")) is None


def test_etichetta_obbligatoria(db):
    with pytest.raises(ValueError, match="etichetta"):
        run(ciak_memoria.create_version({"tono": "x"}, "   ", "c@x.it"))
    assert db.ciak_memoria.docs == []


def test_se_il_db_si_rompe_gli_agenti_vanno_avanti_senza_memoria(monkeypatch):
    async def boom():
        raise RuntimeError("mongo giu")

    monkeypatch.setattr(ciak_memoria, "get_active", boom)
    assert run(ciak_memoria.render_active_block()) == ""


class _Admin:
    email = "claudio@ciak.test"


def test_endpoint_crea_e_legge(db):
    out = run(ciak_admin.create_memoria(
        ciak_admin.MemoriaCreate(label="prima", sections={"marchio": "Ciak"}), admin=_Admin()))
    assert out["success"] and out["version"]["sections"]["marchio"] == "Ciak"
    got = run(ciak_admin.get_memoria(admin=_Admin()))
    assert got["active"]["id"] == out["version"]["id"]
    assert [s["key"] for s in got["sections"]] == list(ciak_memoria.SECTION_KEYS)


def test_endpoint_rifiuta_sezioni_non_valide_con_422(db):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.create_memoria(
            ciak_admin.MemoriaCreate(label="x", sections={"prezzi": "1"}), admin=_Admin()))
    assert e.value.status_code == 422


def test_endpoint_activate_404_se_manca(db):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.activate_memoria("nope", admin=_Admin()))
    assert e.value.status_code == 404
