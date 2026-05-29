import pytest
from fastapi import HTTPException
from routers import ciak_analisi_public as pub


class Coll:
    def __init__(self, doc): self.doc = doc
    async def find_one(self, q, proj=None): return self.doc


class DB:
    def __init__(self, doc): self.ciak_analisi = Coll(doc)


@pytest.mark.asyncio
async def test_definitiva_gated_non_inviata():
    pub.set_db(DB({"session_token": "t", "stato": "da_validare",
                   "analisi_definitiva": {"capitoli": {}}}))
    with pytest.raises(HTTPException) as e:
        await pub.get_analisi_pubblica("t")
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_definitiva_inviata_ok():
    doc = {"session_token": "t", "stato": "inviata",
           "analisi_definitiva": {"titolo": "X", "capitoli": {"punto_di_partenza": "a"},
                                  "accademia": {}, "roadmap": []},
           "research_data": {"competitor": []}, "email": "c@x.it", "script_call": {"agganci": []}}
    pub.set_db(DB(doc))
    res = await pub.get_analisi_pubblica("t")
    assert res["analisi_definitiva"]["titolo"] == "X"
    assert "script_call" not in res


@pytest.mark.asyncio
async def test_definitiva_404():
    pub.set_db(DB(None))
    with pytest.raises(HTTPException) as e:
        await pub.get_analisi_pubblica("x")
    assert e.value.status_code == 404
