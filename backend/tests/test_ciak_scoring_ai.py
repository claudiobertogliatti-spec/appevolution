"""
Unit test per services/ciak_scoring_ai.py (scoring AI sulle 8 risposte APERTE).
Anthropic è mockato: il test gira in CI senza chiave e senza rete.
"""
import os
from unittest.mock import MagicMock, patch

import pytest

from services.ciak_scoring_ai import (
    ScoringAIResult,
    _clamp_stato,
    calculate_scoring_ai,
)

pytestmark = pytest.mark.unit

_RESP = {
    "q1_competenza": "Shiatsu e riequilibrio energetico, dieci anni di pratica.",
    "q2_esperienza": "La pratico da dieci anni, formata in Giappone.",
    "q3_clienti": "Seguo clienti regolarmente, molti tornano dopo il primo ciclo.",
    "q4_idea": "Un percorso online per insegnare l'automassaggio.",
    "q5_target": "Donne 35-50 con dolori cronici da stress.",
    "q6_problema": "Il dolore che torna appena finisce la seduta.",
    "q7_digitale": "Uso Instagram, non ho mai venduto online.",
    "q8_obiettivo": "Non dipendere solo dalle sedute in studio.",
}


def _fake_response(text: str) -> MagicMock:
    r = MagicMock()
    r.content = [MagicMock(text=text)]
    return r


def test_clamp_stato_thresholds():
    assert _clamp_stato(10) == 1
    assert _clamp_stato(40) == 2
    assert _clamp_stato(60) == 3
    assert _clamp_stato(90) == 4


@pytest.mark.asyncio
async def test_fallback_when_no_api_key():
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": ""}, clear=False):
        res = await calculate_scoring_ai(_RESP)
    assert isinstance(res, ScoringAIResult)
    assert res.is_fallback is True
    assert res.pronto is False
    assert 1 <= res.stato_finale <= 4
    # compatibilità col payload di Matteo
    assert res.score_numerico == res.score_0_100
    assert res.to_dict()["_fallback"] is True


@pytest.mark.asyncio
async def test_parses_valid_json():
    fake = _fake_response('{"score_0_100": 72, "stato": 3, "pronto": true, "rationale": "prova reale forte"}')
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_scoring_ai.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = fake
        res = await calculate_scoring_ai(_RESP)
    assert res.is_fallback is False
    assert res.score_0_100 == 72
    assert res.stato_finale == 3
    assert res.pronto is True
    assert res.rationale == "prova reale forte"


@pytest.mark.asyncio
async def test_clamps_score_and_maps_stato():
    # score fuori range + stato assente → clamp a 100 e stato dedotto (4)
    fake = _fake_response('{"score_0_100": 150, "pronto": true, "rationale": "x"}')
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_scoring_ai.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = fake
        res = await calculate_scoring_ai(_RESP)
    assert res.score_0_100 == 100
    assert res.stato_finale == 4


@pytest.mark.asyncio
async def test_fallback_on_unparsable_output():
    fake = _fake_response("mi dispiace, non riesco a rispondere")
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}), \
            patch("services.ciak_scoring_ai.anthropic.Anthropic") as MC:
        MC.return_value.messages.create.return_value = fake
        res = await calculate_scoring_ai(_RESP)
    assert res.is_fallback is True
    assert res.pronto is False
