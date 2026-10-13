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
