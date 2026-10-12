"""Piano social: richiesta, parsing, approvazione, link tracciati, redirect e clic. Nessuna rete."""
import asyncio
import json
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin, ciak_go
from services import ciak_piano_social as ps

pytestmark = pytest.mark.unit
OGGI = date(2026, 10, 12)
MESE = "2026-11"


def voce(d="2026-11-03", canale="instagram", formato="carosello", **kw):
    return {"data": d, "canale": canale, "formato": formato, "tema": "Perche' i corsi non si finiscono",
            "brief": "Parla a chi vende formazione: un solo concetto.", "invito": "Vai sul sito", **kw}


PIANO = [voce(), voce("2026-11-05", "linkedin", "post_testo"), voce("2026-11-07", "instagram", "reel"),
         voce("2026-11-10", "youtube", "short")]


def test_valida_richiesta():
    assert ps.valida_richiesta(MESE, "Portare persone sul sito", ["instagram", "boh", "instagram"], OGGI) == (MESE, "Portare persone sul sito", ["instagram"])
    for args in [("2026-09", "Portare persone sul sito", ["instagram"]), ("novembre", "Portare persone sul sito", ["instagram"]),
                 (MESE, "corto", ["instagram"]), (MESE, "Portare persone sul sito", [])]:
        with pytest.raises(ValueError):
            ps.valida_richiesta(*args, OGGI)


def test_parse_scarta_le_voci_non_valide_e_le_conta():
    arr = PIANO + [voce("2026-12-01"), voce(canale="tiktok"), voce(formato="reel", canale="linkedin"), voce("2026-11-31"),
                   voce(brief="x"), voce()]  # ultima: stessa data+canale della prima
    out = ps.parse_piano(json.dumps(arr), MESE, list(ps.CANALI), 8)
    assert len(out["voci"]) == 4 and out["scartate"] == 6
    assert out["voci"][0]["come_si_fa"].startswith("Editoriale")


def test_parse_tetto_reel_e_minimo_di_voci():
    reels = [voce(f"2026-11-0{i}", formato="reel") for i in range(1, 6)] + [voce("2026-11-09", "facebook", "post_testo")]
    out = ps.parse_piano(json.dumps(reels), MESE, list(ps.CANALI), 2)
    assert sum(v["formato"] == "reel" for v in out["voci"]) == 2 and out["scartate"] == 3
    assert ps.parse_piano(json.dumps(PIANO[:2]), MESE, list(ps.CANALI), 8) is None
    assert ps.parse_piano("niente", MESE, list(ps.CANALI), 8) is None


def test_url_tracciato():
    u = ps.url_tracciato("https://www.ciak.io/start?a=1", canale="instagram", mese=MESE, voce_id="ab12")
    assert u.startswith("https://www.ciak.io/start?a=1&utm_source=instagram") and "utm_content=ab12" in u
    for bad in ["javascript:alert(1)", "ftp://x", "", "/relativo"]:
        with pytest.raises(ValueError):
            ps.url_tracciato(bad, canale="instagram", mese=MESE, voce_id="x")


def test_robot_e_riepilogo():
    assert ps.e_robot(None) and ps.e_robot("facebookexternalhit/1.1") and not ps.e_robot("Mozilla/5.0 (iPhone) Safari")
    assert ps.riepilogo_clic([{"codice": "a"}, {"codice": "a", "robot": True}, {"codice": "b"}]) == {"a": {"clic": 1, "robot": 1}, "b": {"clic": 1, "robot": 0}}


# ── endpoint ─────────────────────────────────────────────────────────────────

class _Cur:
    def __init__(self, d): self.d = d
    async def to_list(self, n): return [dict(x) for x in self.d[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None):
        return next((dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)
    def find(self, q=None, projection=None):
        q = q or {}
        def ok(d):
            for k, v in q.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]: return False
                elif d.get(k) != v: return False
            return True
        return _Cur([d for d in self.docs if ok(d)])
    async def insert_one(self, d): self.docs.append(dict(d))


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)


@pytest.fixture
def fake(monkeypatch):
    d = SimpleNamespace(ciak_site_config=_Coll(), ciak_piano_social=_Coll(), ciak_link_tracciati=_Coll(), ciak_link_clic=_Coll())
    monkeypatch.setattr(ciak_admin, "db", d)
    monkeypatch.setattr(ciak_go, "db", d)
    monkeypatch.setenv("CIAK_BASE_URL", "https://www.ciak.io")
    return d


def salva(**kw):
    base = dict(mese=MESE, voci=PIANO, destinazione="", approvato=True); base.update(kw)
    return run(ciak_admin.piano_social_salva(ciak_admin.PianoSalvaIn(**base), ADMIN))


def test_senza_approvazione_non_salva(fake):
    with pytest.raises(HTTPException) as e: salva(approvato=False)
    assert e.value.status_code == 422 and fake.ciak_piano_social.docs == []


def test_salva_crea_link_brevi_e_destinazioni_tracciate(fake):
    out = salva()
    assert len(out["voci"]) == 4 and all(v["link"].startswith("https://www.ciak.io/api/ciak/go/") for v in out["voci"])
    t = fake.ciak_link_tracciati.docs[0]
    assert t["target"].startswith("https://www.ciak.io") and "utm_campaign=piano-2026-11" in t["target"]


def test_un_solo_piano_per_mese_e_voci_non_valide_422(fake):
    salva()
    with pytest.raises(HTTPException) as e: salva()
    assert e.value.status_code == 409
    fake.ciak_piano_social.docs.clear()
    with pytest.raises(HTTPException) as e: salva(voci=PIANO + [voce(canale="tiktok")])
    assert e.value.status_code == 422


def test_destinazione_non_http_422(fake):
    with pytest.raises(HTTPException) as e: salva(destinazione="javascript:alert(1)")
    assert e.value.status_code == 422 and fake.ciak_link_tracciati.docs == []


def test_redirect_conta_il_clic_e_i_robot_a_parte(fake):
    out = salva()
    codice = out["voci"][0]["codice"]
    req = lambda ua: SimpleNamespace(headers={"user-agent": ua})
    r = run(ciak_go.vai(codice, req("Mozilla/5.0 Safari")))
    assert r.status_code == 302 and r.headers["location"].startswith("https://www.ciak.io")
    run(ciak_go.vai(codice, req("facebookexternalhit/1.1")))
    letto = run(ciak_admin.piano_social_leggi(MESE, ADMIN))["piano"]
    v = next(x for x in letto["voci"] if x["codice"] == codice)
    assert v["clic"] == 1 and v["robot"] == 1 and letto["clic_totali"] == 1


def test_codice_sconosciuto_404(fake):
    with pytest.raises(HTTPException) as e: run(ciak_go.vai("zzzzzz", SimpleNamespace(headers={})))
    assert e.value.status_code == 404


def test_bozza_senza_ai_503(fake, monkeypatch):
    async def nessuna(*a, **k): return None
    async def vuota(): return ""
    from services import ciak_memoria
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", nessuna)
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.piano_social_bozza(ciak_admin.PianoBozzaIn(mese=MESE, obiettivo="Portare persone sul sito", canali=["instagram"]), ADMIN))
    assert e.value.status_code == 503
