import pytest
from services import ciak_analisi


def test_module_exposes_api():
    assert hasattr(ciak_analisi, "CiakAnalisiError")
    assert hasattr(ciak_analisi, "genera_e_salva")
    assert hasattr(ciak_analisi, "set_db")
    assert len(ciak_analisi._PROMPT_RESEARCH) > 200
    assert len(ciak_analisi._PROMPT_DEFINITIVA) > 200
    assert len(ciak_analisi._PROMPT_BOZZA) > 100
    assert len(ciak_analisi._PROMPT_SCRIPT_CALL) > 100


def test_extract_text_from_blocks():
    from services.ciak_analisi import _last_text_block, _extract_json

    class Block:
        def __init__(self, type_, text=None):
            self.type = type_
            self.text = text

    # web search produce blocchi misti: l'ultimo text è la risposta
    blocks = [Block("text", "sto cercando"), Block("server_tool_use"), Block("web_search_tool_result"), Block("text", '{"a": 1}')]
    assert _last_text_block(blocks) == '{"a": 1}'

    # JSON dentro code fence
    assert _extract_json('ecco:\n```json\n{"x": 2}\n```') == '{"x": 2}'
    # JSON nudo
    assert _extract_json('prefix {"y": 3} suffix') == '{"y": 3}'


@pytest.mark.asyncio
async def test_genera_research_brief_parsa_json(monkeypatch):
    from services import ciak_analisi

    class FakeBlock:
        type = "text"
        text = '{"settore":"shiatsu","competitor":[],"fascia_prezzo_mercato":"€500-€1200","spazi_non_presidiati":[],"fonti":[],"dimensione_trend":"x","note_data_gap":""}'

    class FakeResp:
        content = [FakeBlock()]

    class FakeClient:
        def __init__(self): self.messages = self
        def create(self, **kw):
            # verifica che il web search tool sia passato
            assert any(t.get("type") == "web_search_20250305" for t in kw.get("tools", []))
            return FakeResp()

    monkeypatch.setattr(ciak_analisi, "_get_client", lambda: FakeClient())
    brief = await ciak_analisi.genera_research_brief({"q1_competenza": "shiatsu", "q6_problema": "dolore cronico", "q5_target": "No"})
    assert brief["settore"] == "shiatsu"
    assert brief["fascia_prezzo_mercato"] == "€500-€1200"
