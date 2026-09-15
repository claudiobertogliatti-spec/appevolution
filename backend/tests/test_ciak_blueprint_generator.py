"""
Unit test: genera_blueprint — costruisce il payload delle 13 sezioni per il
renderer, riusando la ricerca mercato. Anthropic e DB mockati (gira in CI).
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

import services.ciak_analisi as ca
from services.ciak_pdf_blueprint import _SEZIONI, render_blueprint_html

pytestmark = pytest.mark.unit


def _fake_structured():
    sez = {}
    for (k, *_r) in _SEZIONI:
        base = {"title": f"T-{k}", "accent": "acc"}
        if k in ("sintesi", "problema"):
            base.update(lead="L", body="B")
        elif k == "potenziale":
            base.update(lead="L", cards=[{"h": "C", "p": "p"}])
        elif k == "mercato":
            base.update(lead="L", trend=["t1", "t2"])
        elif k == "competitor":
            base.update(presidia=["a"], spazio=["b"])
        elif k == "pubblico":
            base.update(lead="L", segmenti=[{"segmento": "S", "chi": "c", "cerca": "x"}])
        elif k in ("forza", "limiti"):
            base.update(punti=["uno", "due"])
        elif k == "accademia":
            base.update(lead="L", moduli=[{"titolo": "M1", "contenuto": "c"}])
        elif k == "rischio":
            base.update(lead="L", callout="<b>c</b>")
        elif k == "manca":
            base.update(items=[{"h": "h", "p": "p"}])
        elif k == "roadmap":
            base.update(lead="L", steps=[{"titolo": "s", "desc": "d"}])
        elif k == "prossimo":
            base.update(lead="L", no="no", yes=["si"], chiusura="<b>fine</b>")
        sez[k] = base
    return {"meta": {"progetto": "Progetto", "accent_progetto": "Test", "ambito": "Coaching"}, "sezioni": sez}


def _fake_db():
    db = MagicMock()
    db.diagnostic_sessions.find_one = AsyncMock(return_value={
        "session_token": "tok", "user_name": "Mario Rossi",
        "responses": {"q1_competenza": "coach", "q6_problema": "x", "q5_target": "y"},
    })
    return db


@pytest.mark.asyncio
async def test_genera_blueprint_costruisce_payload_13_sezioni(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(return_value={"settore": "coaching", "dimensione_trend": "cresce", "fascia_prezzo_mercato": "x"}))
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=_fake_structured()))

    payload = await ca.genera_blueprint("tok")

    assert set(payload["sezioni"].keys()) == {k for (k, *_r) in _SEZIONI}
    assert payload["meta"]["nome"] == "Mario Rossi"       # nome dalla sessione
    assert payload["meta"]["progetto"] == "Progetto"
    assert payload["meta"].get("data")                     # data riempita
    # il payload deve renderizzare senza errori (13 sezioni + cover + sommario)
    html = render_blueprint_html(payload)
    assert html.count('<section class="page') == 15


@pytest.mark.asyncio
async def test_genera_blueprint_degrada_se_research_fallisce(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(side_effect=RuntimeError("web down")))
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=_fake_structured()))
    payload = await ca.genera_blueprint("tok")  # non deve sollevare
    assert set(payload["sezioni"].keys()) == {k for (k, *_r) in _SEZIONI}


@pytest.mark.asyncio
async def test_genera_blueprint_solleva_se_sezione_mancante(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(return_value={}))
    bad = _fake_structured()
    del bad["sezioni"]["roadmap"]
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=bad))
    with pytest.raises(ca.CiakAnalisiError):
        await ca.genera_blueprint("tok")
