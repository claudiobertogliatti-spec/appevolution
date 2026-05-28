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
