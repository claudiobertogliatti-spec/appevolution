"""La playlist YouTube si popola solo dopo il controllo umano del montaggio.

Sequenza voluta: editing di Ciak → verifica di Antonella → playlist YouTube → Systeme.
Prima l'approvazione admin poteva precedere la verifica e il video entrava nella playlist del
partner senza che nessuno l'avesse guardato per intero.
"""
import os
from types import SimpleNamespace

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

from services import youtube_playlist as yp

pytestmark = pytest.mark.unit


def test_only_a_verified_edit_opens_the_playlist():
    assert yp.verificata({"esito": "verificata"}) is True
    assert yp.verificata({"esito": "da_correggere"}) is False
    assert yp.verificata(None) is False
    assert yp.verificata({}) is False


def test_the_reason_for_waiting_is_explicit():
    assert "controllo" in yp.motivo_attesa(None)
    assert "rimonta" in yp.motivo_attesa({"esito": "da_correggere"})
    assert "sconosciuto" in yp.motivo_attesa({"esito": "sconosciuto"})


class FakeDb:
    def __init__(self, partner):
        self.partner = dict(partner)
        self.scritture = []
        self.partners = SimpleNamespace(find_one=self._find, update_one=self._update)

    async def _find(self, q, p=None):
        return dict(self.partner)

    async def _update(self, q, u):
        self.partner.update((u.get("$set") or {}))
        self.scritture.append(u)
        return SimpleNamespace(matched_count=1)


@pytest.mark.asyncio
async def test_without_a_youtube_id_nothing_is_attempted():
    out = await yp.aggiungi_video(FakeDb({"id": "p1"}), "p1", "")
    assert out["ok"] is False and "nessun id" in out["motivo"]


@pytest.mark.asyncio
async def test_the_playlist_is_created_once_and_saved_on_the_partner(monkeypatch):
    chiamate = {}
    import video_pipeline_task as vpt
    def crea(nome):
        chiamate["creata"] = nome
        return "PL1"

    def aggiungi(video_id, playlist_id):
        chiamate["aggiunto"] = (video_id, playlist_id)
        return True

    monkeypatch.setattr(vpt, "create_youtube_playlist_sync", crea, raising=False)
    monkeypatch.setattr(vpt, "add_to_youtube_playlist_sync", aggiungi, raising=False)

    db = FakeDb({"id": "p1", "name": "Daniele"})
    out = await yp.aggiungi_video(db, "p1", "VID1")
    assert out["ok"] is True and out["playlist_id"] == "PL1"
    assert chiamate["creata"] == "Daniele" and chiamate["aggiunto"] == ("VID1", "PL1")
    assert db.partner["youtube_playlist_id"] == "PL1"

    # il secondo video riusa la playlist del partner, non ne crea un'altra
    chiamate.pop("creata")
    await yp.aggiungi_video(db, "p1", "VID2")
    assert "creata" not in chiamate


@pytest.mark.asyncio
async def test_a_network_failure_never_breaks_the_caller(monkeypatch):
    import video_pipeline_task as vpt

    def esplode(*a, **k):
        raise RuntimeError("YouTube giù")

    monkeypatch.setattr(vpt, "create_youtube_playlist_sync", esplode, raising=False)
    out = await yp.aggiungi_video(FakeDb({"id": "p1", "name": "D"}), "p1", "VID1")
    assert out["ok"] is False and "errore tecnico" in out["motivo"]


# ── La masterclass passa dallo stesso controllo delle lezioni (Claudio, 13/10/2026) ──

from services import coda_antonella as coda


def _mc(pid="p1", durata=1800, **kw):
    return {"partner_id": pid, "video_final_duration_s": durata,
            "pipeline_completed_at": "2026-10-13T08:00:00Z", **kw}


def test_the_masterclass_enters_the_same_queue_as_the_lessons():
    g = coda.lezioni_da_controllare([], {"p1": "Daniele"}, {}, None, docs_masterclass=[_mc()])
    assert len(g["da_controllare"]) == 1
    voce = g["da_controllare"][0]
    assert voce["titolo"] == "Masterclass" and voce["tipo"] == "masterclass"
    assert voce["lesson_id"] == "masterclass" and voce["partner_nome"] == "Daniele"
    assert voce["minuti"] > 0 and voce["chiave"] == coda.chiave_lezione("p1", "masterclass", 1)


def test_a_verified_masterclass_leaves_the_queue_and_a_flagged_one_moves_to_corrections():
    esiti = {coda.chiave_lezione("p1", "masterclass", 1): {"esito": "verificata"}}
    g = coda.lezioni_da_controllare([], {}, esiti, None, docs_masterclass=[_mc()])
    assert g["da_controllare"] == [] and g["da_correggere"] == []

    esiti = {coda.chiave_lezione("p1", "masterclass", 1): {"esito": "da_correggere", "note": "taglio brusco"}}
    g = coda.lezioni_da_controllare([], {}, esiti, None, docs_masterclass=[_mc()])
    assert len(g["da_correggere"]) == 1 and g["da_correggere"][0]["nota"] == "taglio brusco"


def test_a_remounted_masterclass_comes_back_to_be_checked():
    """Versione 2: l'esito sulla 1 non vale piu'."""
    esiti = {coda.chiave_lezione("p1", "masterclass", 1): {"esito": "verificata"}}
    g = coda.lezioni_da_controllare([], {}, esiti, None, docs_masterclass=[_mc(output_version=2)])
    assert len(g["da_controllare"]) == 1 and g["da_controllare"][0]["output_version"] == 2


def test_a_masterclass_without_a_finished_edit_is_not_queued():
    for doc in ({"partner_id": "p1"}, {"video_final_duration_s": 10}, {}):
        assert coda.lezioni_da_controllare([], {}, {}, None, docs_masterclass=[doc])["da_controllare"] == []


def test_lessons_and_masterclass_share_one_ordered_queue():
    lez = {"partner_id": "p1", "lessons": {"l1": {"output_version": 1, "video_final_duration_s": 600,
                                                  "title": "Lezione 1", "pipeline_completed_at": "2026-10-13T09:00:00Z"}}}
    g = coda.lezioni_da_controllare([lez], {"p1": "Daniele"}, {}, None, docs_masterclass=[_mc()])
    assert [v["tipo"] for v in g["da_controllare"]] == ["masterclass", "lezione"]  # ordinata per arrivo


# ── Anche le due vie piu' vecchie della masterclass aspettano la verifica ──

@pytest.mark.asyncio
async def test_the_masterclass_approval_waits_for_the_check(monkeypatch):
    """`approve-masterclass` non deve popolare la playlist prima del controllo del montaggio."""
    import routers.partner_journey as pj

    esiti = {}

    class Coda:
        async def find_one(self, q, p=None):
            return esiti.get(q["_id"])

    pj.db = SimpleNamespace(ciak_coda_lezioni=Coda())
    doc = {"output_version": 1, "video_youtube_id": "VID1"}

    assert await pj._esito_masterclass("p1", doc) is None
    assert yp.verificata(await pj._esito_masterclass("p1", doc)) is False

    from services.coda_antonella import chiave_lezione, MASTERCLASS_ID
    esiti[chiave_lezione("p1", MASTERCLASS_ID, 1)] = {"esito": "verificata"}
    assert yp.verificata(await pj._esito_masterclass("p1", doc)) is True

    # una masterclass rimontata (versione 2) torna in attesa: l'esito sulla 1 non vale
    assert yp.verificata(await pj._esito_masterclass("p1", {"output_version": 2})) is False
