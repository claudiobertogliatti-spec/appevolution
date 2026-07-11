import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_cut_engine as ce

pytestmark = pytest.mark.unit


def _words_seconds():
    return [
        {"text": "Ciao", "start": 0.0, "end": 0.3},
        {"text": "ehm", "start": 0.4, "end": 0.7},
        {"text": "benvenuto", "start": 0.8, "end": 1.2},
        {"text": "cioè,", "start": 1.3, "end": 1.6},
    ]


def test_parse_llm_cuts_plain_array():
    raw = '[{"start": 1.0, "end": 1.4, "reason": "intercalare", "word": "ehm"}]'
    out = ce.parse_llm_cuts(raw)
    assert out == [{"start": 1.0, "end": 1.4, "reason": "intercalare", "word": "ehm", "type": "smart"}]


def test_parse_llm_cuts_with_code_fence_and_prose():
    raw = "Ecco i tagli:\n```json\n[{\"start\": 2, \"end\": 3.5, \"reason\": \"ripetizione\"}]\n```\nfine"
    out = ce.parse_llm_cuts(raw)
    assert len(out) == 1 and out[0]["start"] == 2.0 and out[0]["end"] == 3.5


def test_parse_llm_cuts_drops_invalid_and_garbage():
    assert ce.parse_llm_cuts("nessun json qui") == []
    assert ce.parse_llm_cuts('[{"start": 5, "end": 5}]') == []


def test_detect_filler_from_words():
    out = ce.detect_filler_from_words(_words_seconds())
    assert [w["word"] for w in out] == ["ehm", "cioè"]
    assert all(w["type"] == "filler" for w in out)
    assert out[0]["start"] == 0.4 and out[0]["end"] == 0.7


def test_merge_cut_segments_sorts_ids_and_merges_overlaps():
    a = [{"start": 5.0, "end": 6.0, "type": "smart", "reason": "rip", "word": ""}]
    b = [
        {"start": 1.0, "end": 1.4, "type": "filler", "reason": "int", "word": "ehm"},
        {"start": 1.3, "end": 1.8, "type": "silence", "reason": "pausa", "word": ""},
    ]
    out = ce.merge_cut_segments(a, b)
    assert [s["id"] for s in out] == [0, 1]
    assert out[0]["start"] == 1.0 and out[0]["end"] == 1.8
    assert out[1]["start"] == 5.0
    assert all(s["enabled"] is True for s in out)


def test_merge_cut_segments_empty():
    assert ce.merge_cut_segments([], []) == []


def test_build_prompt_contains_timed_words():
    p = ce.build_prompt(_words_seconds())
    assert "ehm | 0.40-0.70" in p
    assert "JSON" in p


def test_assemble_cuts_with_llm_response_merges_silence():
    raw = '[{"start": 0.8, "end": 1.2, "reason": "ripetizione"}]'
    res = ce.assemble_cuts(raw, _words_seconds(), silence_segments=[{"start": 2.0, "end": 2.5}])
    assert res["ai_used"] is True
    starts = [s["start"] for s in res["cut_segments"]]
    assert 0.8 in starts and 2.0 in starts
    assert all("id" in s and s["enabled"] for s in res["cut_segments"])


def test_assemble_cuts_fallback_when_no_llm():
    res = ce.assemble_cuts(None, _words_seconds(), silence_segments=[{"start": 2.0, "end": 2.5}])
    assert res["ai_used"] is False
    assert "ehm" in [s["word"] for s in res["cut_segments"]]
    assert 2.0 in [s["start"] for s in res["cut_segments"]]


def test_propose_cuts_uses_injected_llm():
    fake_llm = lambda prompt: '[{"start": 0.8, "end": 1.2, "reason": "rip"}]'
    res = ce.propose_cuts(_words_seconds(), silence_segments=[], llm=fake_llm)
    assert res["ai_used"] is True and 0.8 in [s["start"] for s in res["cut_segments"]]


def test_propose_cuts_fallback_when_llm_raises():
    def boom(prompt):
        raise RuntimeError("LLM giù")
    res = ce.propose_cuts(_words_seconds(), silence_segments=[], llm=boom)
    assert res["ai_used"] is False and "ehm" in [s["word"] for s in res["cut_segments"]]
