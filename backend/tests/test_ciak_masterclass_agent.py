import asyncio
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_masterclass_agent as agent
from services import ciak_masterclass_standard as mc

pytestmark = pytest.mark.unit


def W(text, start):
    return {"text": text, "start": start, "end": start + 0.3}


def test_brand_comes_from_partner_data_and_never_from_ciak():
    b = agent.masterclass_brand({"name": "Andrea Fredi"}, {"primaryColor": "#000041", "logo": "https://x/l.png"},
                                {"data": {"colori": ["#35B3CB", "#000041", "non-un-colore"], "parole_vietate": ["terapia", " "]}})
    assert b["colors"] == ["#000041", "#35B3CB"] and b["logo_url"] == "https://x/l.png"
    assert b["banned"] == ["terapia"] and "#FACC15" not in b["colors"]


def test_brand_without_data_has_no_colors_so_the_palette_stays_neutral():
    b = agent.masterclass_brand({"name": "Nuovo"}, {}, {})
    assert b["colors"] == [] and mc.card_palette(b["colors"])["source"] == "neutral-fallback"


@pytest.fixture
def fake_media(monkeypatch):
    calls = {}
    monkeypatch.setattr(agent, "_duration", lambda p: 100.0)
    monkeypatch.setattr(mc, "measure_loudnorm", lambda src, keep: {"input_i": "-11.8"})
    monkeypatch.setattr(mc, "silence_list", lambda p, noise_db=-35.0: calls.setdefault("thr", []).append(noise_db) or [])

    def fake_render(**kw):
        calls["render"] = kw
        return {"standard": mc.STANDARD_VERSION, "all_ok": True}
    monkeypatch.setattr(mc, "render_masterclass", fake_render)
    return calls


def _words():
    return [W("ciao", 1.0), W("ehm", 2.0), W("a", 3.0), W("tutti", 3.5)]


def test_agent_renders_with_rules_only_when_the_llm_is_down(fake_media, tmp_path):
    async def broken(_):
        raise RuntimeError("llm giù")
    rep = asyncio.run(agent.run_masterclass_agent(
        source="in.mp4", output=str(tmp_path / "o.mp4"), tmp_dir=tmp_path, words=_words(),
        brand={"name": "X", "colors": ["#000041"], "banned": []}, llm=broken))
    assert rep["ai_used"] == {"structure": False, "cards": False}
    assert rep["needs_partner_rerecord"]
    assert any(c["word"] == "ehm" for c in fake_media["render"]["plan"]["cuts"])    # le regole tagliano comunque
    assert fake_media["render"]["with_sigla"] is True


def test_silence_threshold_is_raised_by_the_loudness_gain(fake_media, tmp_path):
    asyncio.run(agent.run_masterclass_agent(
        source="in.mp4", output=str(tmp_path / "o.mp4"), tmp_dir=tmp_path, words=_words(), brand={"colors": []}))
    assert fake_media["thr"][0] == -35.0 and fake_media["thr"][1] == pytest.approx(-29.3)   # fisso per le pratiche, corretto per le pause


def test_ai_output_goes_through_validators(fake_media, tmp_path):
    async def llm(prompt):
        if "SCHEDE" in prompt:
            return ('[{"start":5,"end":20,"kind":"quote","kicker":"K","lines":["ok"]},'
                    '{"start":30,"end":40,"kind":"gif","kicker":"K","lines":["no"]}]')
        return '[{"start": 10, "end": 90, "reason": "bio"}, {"start": 20, "end": 30, "reason": "x"}]'
    rep = asyncio.run(agent.run_masterclass_agent(
        source="in.mp4", output=str(tmp_path / "o.mp4"), tmp_dir=tmp_path, words=_words(),
        brand={"colors": [], "banned": []}, llm=llm))
    assert rep["ai_used"] == {"structure": True, "cards": True}
    assert rep["cards_rejected"] == 1 and len(fake_media["render"]["cards"]) == 1      # tipo "gif" non ammesso
    assert rep["ai_cuts_rejected"] >= 1                                                  # 80 s su 100 s: oltre quota


def test_missing_transcript_stops_instead_of_publishing_raw(fake_media, tmp_path):
    with pytest.raises(RuntimeError):
        asyncio.run(agent.run_masterclass_agent(
            source="in.mp4", output=str(tmp_path / "o.mp4"), tmp_dir=tmp_path, words=[], brand={"colors": []}))
    assert "render" not in fake_media
