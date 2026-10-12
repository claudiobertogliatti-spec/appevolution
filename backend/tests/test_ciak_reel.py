"""Reel HeyGen: script di Andrea, approvazione, tetto mensile. Nessuna rete."""
import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_reel as r

pytestmark = pytest.mark.unit

SCRIPT_OK = " ".join(["parola"] * 60)  # 60 parole = 24 s


def test_valida_script_durata():
    assert r.valida_script(SCRIPT_OK) == SCRIPT_OK
    with pytest.raises(ValueError):
        r.valida_script(" ".join(["parola"] * 200))  # 80 s
    with pytest.raises(ValueError):
        r.valida_script("troppo corto per un reel davvero ok ok")  # < 10 s


def test_parse_script_toglie_le_indicazioni_di_regia():
    raw = json.dumps({"script": "Ciao! (sorride) " + SCRIPT_OK + " *pausa*", "didascalia": "Una didascalia"})
    out = r.parse_script("```json\n" + raw + "\n```")
    assert "(" not in out["script"] and "*" not in out["script"] and out["secondi"] > 0


@pytest.mark.parametrize("raw", ["", "no json", '{"script": "x"}', json.dumps({"script": "corto", "didascalia": "d"}),
                                 json.dumps({"script": SCRIPT_OK, "didascalia": "  "})])
def test_parse_script_scarta_il_non_valido(raw):
    assert r.parse_script(raw) is None


def test_tetto_conta_solo_i_non_falliti_del_mese():
    righe = [{"mese": "2026-10", "stato": "pronto"}, {"mese": "2026-10", "stato": "fallito"},
             {"mese": "2026-09", "stato": "pronto"}, {"mese": "2026-10", "stato": "in_generazione"}]
    assert r.tetto_raggiunto(righe, 2, "2026-10") is True
    assert r.tetto_raggiunto(righe, 3, "2026-10") is False


# ── endpoint (db finto) ──────────────────────────────────────────────────────

class _Cur:
    def __init__(self, docs): self.docs = docs
    def sort(self, k, v=None): return self
    async def to_list(self, n): return [dict(d) for d in self.docs[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return dict(d)
        return None
    def find(self, q, projection=None):
        return _Cur([d for d in self.docs if all(d.get(k) == v for k, v in q.items())])
    async def insert_one(self, doc): self.docs.append(dict(doc))
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"]); return
        if upsert: self.docs.append(dict(upd["$set"]))


ADMIN = SimpleNamespace(email="claudio@x.it")


def run(c): return asyncio.new_event_loop().run_until_complete(c)


@pytest.fixture
def fake(monkeypatch):
    dbf = SimpleNamespace(ciak_site_config=_Coll([{"key": "reel_config", "value": {"avatar_id": "av1", "voice_id": "vo1", "tetto_mensile": 1}}]),
                          ciak_reel=_Coll([]))
    monkeypatch.setattr(ciak_admin, "db", dbf)
    chiamate = []
    class Svc:
        async def generate_video(self, **kw):
            chiamate.append(kw); return {"data": {"video_id": "vid1"}}
    monkeypatch.setattr(ciak_admin, "_heygen", lambda: Svc())
    dbf.chiamate = chiamate
    return dbf


def _genera(**kw):
    base = dict(script=SCRIPT_OK, didascalia="d", approvato=True); base.update(kw)
    return run(ciak_admin.reel_genera(ciak_admin.ReelGeneraIn(**base), ADMIN))


def test_senza_approvazione_non_genera(fake):
    with pytest.raises(HTTPException) as e:
        _genera(approvato=False)
    assert e.value.status_code == 422 and fake.chiamate == [] and fake.ciak_reel.docs == []


def test_genera_verticale_con_avatar_scelto(fake):
    out = _genera()
    assert out["reel"]["stato"] == "in_generazione"
    kw = fake.chiamate[0]
    assert kw["avatar_id"] == "av1" and kw["voice_id"] == "vo1" and kw["dimension"] == {"width": 1080, "height": 1920}


def test_tetto_mensile_blocca_il_secondo(fake):
    _genera()
    with pytest.raises(HTTPException) as e:
        _genera()
    assert e.value.status_code == 409 and len(fake.chiamate) == 1


def test_senza_avatar_scelto_409(fake):
    fake.ciak_site_config.docs.clear()
    with pytest.raises(HTTPException) as e:
        _genera()
    assert e.value.status_code == 409 and fake.chiamate == []


def test_heygen_in_errore_registra_fallito_e_non_conta_nel_tetto(fake, monkeypatch):
    class Rotto:
        async def generate_video(self, **kw): raise RuntimeError("401")
    monkeypatch.setattr(ciak_admin, "_heygen", lambda: Rotto())
    with pytest.raises(HTTPException) as e:
        _genera()
    assert e.value.status_code == 502 and fake.ciak_reel.docs[0]["stato"] == "fallito"
    monkeypatch.setattr(ciak_admin, "_heygen", lambda: SimpleNamespace(generate_video=lambda **kw: asyncio.sleep(0, {"data": {"video_id": "v2"}})))
    assert _genera()["ok"] is True  # il fallito non ha consumato il tetto


def test_bozza_senza_ai_503(monkeypatch):
    async def nessuna(*a, **k): return None
    async def vuota(): return ""
    from services import ciak_memoria
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", nessuna)
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.reel_bozza(ciak_admin.ReelBozzaIn(brief="Un reel sul perché i corsi online non vendono"), ADMIN))
    assert e.value.status_code == 503
