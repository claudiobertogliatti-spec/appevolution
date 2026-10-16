"""
Unit test: Matteo genera il report via TOOL USE (structured output).

Il modello risponde chiamando il tool `emit_report`: l'SDK consegna un dict già
conforme allo schema in `.input`, quindi non esiste più il path "JSON malformato".
Anthropic è mockato: gira in CI senza chiave e senza rete.
"""
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import services.ciak_matteo as matteo
from services.ciak_matteo import MatteoServiceError, generate_report

pytestmark = pytest.mark.unit


_PAYLOAD = {
    "competenza": "Public speaking e comunicazione per professionisti.",
    "esperienza_anni": "Dieci anni, prima in azienda poi da libero.",
    "problema": "La paura di parlare in pubblico.",
    "score_numerico": 40,
    "stato": 2,
    "override_applicato": [],
    "input_language": "italiano",
}

_VALID_INPUT = {
    "report_markdown": "## Sintesi del profilo\nFormatore con dieci anni di pratica.",
    "tags": {
        "stato": 2,
        "tag_segment": "segment_formatore",
        "tag_digital_level": "digital_level_base",
        "tag_obiettivo": "obiettivo_libertà",
    },
}


class _ToolUseBlock:
    type = "tool_use"

    def __init__(self, inp):
        self.input = inp


def _response(content, stop_reason="tool_use"):
    r = MagicMock()
    r.content = content
    r.stop_reason = stop_reason
    return r


@pytest.mark.asyncio
async def test_report_from_tool_use():
    with patch.object(matteo, "_resolve_system_prompt", AsyncMock(return_value="SYS")), \
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_matteo.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = _response([_ToolUseBlock(dict(_VALID_INPUT))])
        out = await generate_report(_PAYLOAD, user_name="Test")

    # output strutturato, tipizzato
    assert out["report_markdown"].startswith("## Sintesi")
    assert out["tags"]["stato"] == 2
    assert out["tags"]["tag_segment"] == "segment_formatore"
    assert out["matteo_version"] == "v1.4"
    # tool_choice forzato + tool passato all'SDK
    kwargs = MC.return_value.messages.create.call_args.kwargs
    assert kwargs["tool_choice"] == {"type": "tool", "name": "emit_report"}
    assert kwargs["tools"][0]["name"] == "emit_report"


@pytest.mark.asyncio
async def test_raises_when_no_tool_use():
    text_block = MagicMock()
    text_block.type = "text"
    with patch.object(matteo, "_resolve_system_prompt", AsyncMock(return_value="SYS")), \
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_matteo.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = _response([text_block])
        with pytest.raises(MatteoServiceError):
            await generate_report(_PAYLOAD)


@pytest.mark.asyncio
async def test_raises_when_truncated():
    with patch.object(matteo, "_resolve_system_prompt", AsyncMock(return_value="SYS")), \
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_matteo.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = _response(
            [_ToolUseBlock(dict(_VALID_INPUT))], stop_reason="max_tokens"
        )
        with pytest.raises(MatteoServiceError):
            await generate_report(_PAYLOAD)


@pytest.mark.asyncio
async def test_raises_when_tags_incomplete():
    bad = {"report_markdown": "## X\nY", "tags": {"stato": 2, "tag_segment": "segment_altro"}}
    with patch.object(matteo, "_resolve_system_prompt", AsyncMock(return_value="SYS")), \
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_matteo.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = _response([_ToolUseBlock(bad)])
        with pytest.raises(MatteoServiceError):
            await generate_report(_PAYLOAD)
