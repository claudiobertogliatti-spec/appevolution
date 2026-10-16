"""Unit test per services/transcription_fallback.py + collegamento in video_pipeline_task."""
import os

import httpx
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import transcription_fallback as tf

pytestmark = pytest.mark.unit

GROQ_OK = {
    "text": "Ciao a tutti. Benvenuti nella lezione.",
    "words": [
        {"word": "Ciao", "start": 0.5, "end": 0.9},
        {"word": "a", "start": 0.95, "end": 1.0},
        {"word": "tutti.", "start": 1.05, "end": 1.6},
        {"word": "Benvenuti", "start": 3.4, "end": 4.0},      # pausa di 1,8 s dopo "tutti."
        {"word": "nella", "start": 4.05, "end": 4.3},
        {"word": "lezione.", "start": 4.35, "end": 5.0},
    ],
}


@pytest.fixture
def audio(tmp_path):
    f = tmp_path / "audio.mp3"
    f.write_bytes(b"\x00" * 2048)
    return str(f)


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


# ── parse / build ────────────────────────────────────────────────────────────

def test_parse_accepts_word_or_text_and_drops_broken_items():
    words = tf.parse_groq_words({"words": [
        {"word": "ciao", "start": 0, "end": 0.4},
        {"text": " mondo ", "start": "0.5", "end": "0.9"},     # `text` e tempi come stringa
        {"word": "", "start": 1, "end": 1.2},                  # vuota
        {"word": "rotta", "start": 2, "end": 1.5},             # fine < inizio
        {"word": "senza-tempi"},                               # senza tempi
    ]})
    assert words == [{"word": "ciao", "start": 0.0, "end": 0.4}, {"word": "mondo", "start": 0.5, "end": 0.9}]


def test_parse_without_word_timestamps_raises():
    with pytest.raises(ValueError, match="tempi per parola"):
        tf.parse_groq_words({"text": "solo testo", "words": []})
    with pytest.raises(ValueError):
        tf.parse_groq_words({"text": "solo testo"})


def test_build_result_has_the_same_shape_and_rules_as_assemblyai():
    words = tf.parse_groq_words(GROQ_OK)
    out = tf.build_result("t", words)
    assert set(out) == {"transcript", "words", "filler_segments", "silence_segments"}
    assert out["silence_segments"] == [{"start": 1.6, "end": 3.4, "duration": pytest.approx(1.8)}]   # > 0,5 s
    assert out["filler_segments"] == []                      # Whisper non trascrive gli "ehm"


def test_build_result_flags_italian_fillers_like_assemblyai_does():
    out = tf.build_result("t", [{"word": "Allora,", "start": 0, "end": 0.3}, {"word": "ciao", "start": 0.3, "end": 0.6}])
    assert out["filler_segments"] == [{"start": 0, "end": 0.3, "word": "Allora,"}]


# ── groq_transcribe (rete simulata) ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_request_asks_for_italian_word_timestamps_with_bearer_key(audio, monkeypatch):
    monkeypatch.delenv("GROQ_WHISPER_MODEL", raising=False)
    seen = {}

    def handler(req: httpx.Request):
        seen["url"], seen["auth"], seen["body"] = str(req.url), req.headers["authorization"], req.read().decode("latin-1")
        return httpx.Response(200, json=GROQ_OK)

    res = await tf.groq_transcribe(audio, "gsk_test", client=_client(handler))
    assert seen["url"] == "https://api.groq.com/openai/v1/audio/transcriptions"
    assert seen["auth"] == "Bearer gsk_test"
    for needle in ("whisper-large-v3", 'name="language"', "it", "verbose_json", "timestamp_granularities[]", "word"):
        assert needle in seen["body"], needle
    assert res["provider"] == "groq" and len(res["words"]) == 6
    assert res["transcript"].startswith("Ciao a tutti")


@pytest.mark.asyncio
async def test_groq_model_can_be_changed_by_env(audio, monkeypatch):
    monkeypatch.setenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
    seen = {}

    def handler(req):
        seen["body"] = req.read().decode("latin-1")
        return httpx.Response(200, json=GROQ_OK)

    await tf.groq_transcribe(audio, "k", client=_client(handler))
    assert "whisper-large-v3-turbo" in seen["body"]


@pytest.mark.asyncio
async def test_rate_limit_waits_the_advertised_time_then_succeeds(audio):
    calls, slept = {"n": 0}, []

    def handler(req):
        calls["n"] += 1
        return httpx.Response(429, headers={"retry-after": "7"}) if calls["n"] == 1 else httpx.Response(200, json=GROQ_OK)

    async def fake_sleep(s):
        slept.append(s)

    res = await tf.groq_transcribe(audio, "k", client=_client(handler), sleep=fake_sleep)
    assert calls["n"] == 2 and slept == [7.0] and res["provider"] == "groq"


@pytest.mark.asyncio
async def test_hourly_limit_is_not_waited_for(audio):
    def handler(req):
        return httpx.Response(429, headers={"retry-after": "1800"})

    async def never(_s):
        raise AssertionError("non deve aspettare mezz'ora")

    with pytest.raises(tf.TranscriptionUnavailable, match="limite di utilizzo"):
        await tf.groq_transcribe(audio, "k", client=_client(handler), sleep=never)


@pytest.mark.asyncio
async def test_auth_error_is_reported_with_status_and_body(audio):
    with pytest.raises(tf.TranscriptionUnavailable, match="Groq 401"):
        await tf.groq_transcribe(audio, "bad", client=_client(lambda r: httpx.Response(401, text="invalid api key")))


@pytest.mark.asyncio
async def test_oversized_audio_fails_before_any_network_call(tmp_path):
    big = tmp_path / "big.mp3"
    with open(big, "wb") as f:
        f.truncate(tf.MAX_FILE_BYTES + 1)

    def handler(req):
        raise AssertionError("nessuna rete per un file oltre il limite gratuito")

    with pytest.raises(tf.TranscriptionUnavailable, match="troppo grande"):
        await tf.groq_transcribe(str(big), "k", client=_client(handler))


# ── transcribe_with_fallback ─────────────────────────────────────────────────

AAI_OK = {"transcript": "da assembly", "words": [], "filler_segments": [], "silence_segments": []}


@pytest.mark.asyncio
async def test_assemblyai_is_used_first_and_groq_is_never_called_when_it_works():
    async def aai(path, key):
        return dict(AAI_OK)

    async def groq(path, key):
        raise AssertionError("Groq non deve partire se AssemblyAI funziona")

    res = await tf.transcribe_with_fallback("a.mp3", "aai", "groq", aai, groq_fn=groq)
    assert res["provider"] == "assemblyai"


@pytest.mark.asyncio
async def test_negative_balance_falls_back_to_groq_and_says_why():
    logs = []

    async def aai(path, key):
        raise httpx.HTTPStatusError("400 Bad Request: account balance is negative",
                                    request=httpx.Request("POST", "https://x"), response=httpx.Response(400))

    async def groq(path, key):
        return {**AAI_OK, "transcript": "da groq", "provider": "groq"}

    res = await tf.transcribe_with_fallback("a.mp3", "aai", "groq", aai, groq_fn=groq, log=logs.append)
    assert res["transcript"] == "da groq" and res["provider"] == "groq"
    assert any("AssemblyAI fallito" in m and "provo Groq" in m for m in logs)


@pytest.mark.asyncio
async def test_missing_assemblyai_key_goes_straight_to_groq():
    async def aai(path, key):
        raise AssertionError("senza chiave AssemblyAI non si chiama")

    async def groq(path, key):
        return {**AAI_OK, "provider": "groq"}

    res = await tf.transcribe_with_fallback("a.mp3", "", "groq", aai, groq_fn=groq)
    assert res["provider"] == "groq"


@pytest.mark.asyncio
async def test_failure_without_groq_key_reports_both_reasons():
    async def aai(path, key):
        raise RuntimeError("saldo negativo")

    with pytest.raises(tf.TranscriptionUnavailable) as exc:
        await tf.transcribe_with_fallback("a.mp3", "aai", "", aai)
    msg = str(exc.value)
    assert "saldo negativo" in msg and "GROQ_API_KEY non configurata" in msg


@pytest.mark.asyncio
async def test_both_failing_raises_with_both_errors():
    async def aai(path, key):
        raise RuntimeError("aai giù")

    async def groq(path, key):
        raise RuntimeError("groq giù")

    with pytest.raises(tf.TranscriptionUnavailable, match="aai giù.*groq giù"):
        await tf.transcribe_with_fallback("a.mp3", "aai", "groq", aai, groq_fn=groq)


# ── collegamento nella pipeline vera ─────────────────────────────────────────

class _Stop(BaseException):
    """Non è una Exception: attraversa gli `except Exception` della pipeline."""


class _Coll:
    def __init__(self, name):
        self.name = name

    async def find_one(self, *_a, **_k):
        return {"id": "p1", "name": "Partner Prova"} if self.name == "partners" else {}

    async def update_one(self, *_a, **_k):
        return None


class _Db:
    def __getattr__(self, name):
        return _Coll(name)

    __getitem__ = __getattr__


class _Mongo:
    def __getitem__(self, _n):
        return _Db()

    def close(self):
        pass


@pytest.fixture(scope="module")
def vpt():
    """Il VERO video_pipeline_task (altri test lo sostituiscono con uno stub in sys.modules)."""
    import importlib.util
    import sys
    import types

    class _FakeCelery:
        def task(self, *_a, **_k):
            return lambda fn: fn

    fake = types.ModuleType("celery_app")
    fake.celery_app = _FakeCelery()
    saved = sys.modules.get("celery_app")
    sys.modules["celery_app"] = fake
    try:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "video_pipeline_task.py")
        spec = importlib.util.spec_from_file_location("video_pipeline_task_real_tf", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        if saved is None:
            sys.modules.pop("celery_app", None)
        else:
            sys.modules["celery_app"] = saved
    return mod


async def _run_until_transcription(monkeypatch, vpt, env):
    import motor.motor_asyncio as motor_mod
    seen = {}

    monkeypatch.setattr(motor_mod, "AsyncIOMotorClient", lambda *a, **k: _Mongo())
    for k in ("ASSEMBLYAI_API_KEY", "GROQ_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    for k, v in env.items():
        monkeypatch.setenv(k, v)

    async def telegram(_m):
        pass

    async def probe(_u):
        return None

    async def download(_u, dest):
        with open(dest, "wb") as f:          # il grezzo deve esistere davvero (link/copia verso final)
            f.write(b"x" * 1000)
        return 1_000_000

    async def fake_transcribe(audio_path, aai_key, groq_key, aai_fn, **kw):
        seen["keys"] = (aai_key, groq_key)
        seen["fn"] = aai_fn
        raise _Stop()

    monkeypatch.setattr(vpt, "telegram", telegram)
    monkeypatch.setattr(vpt, "probe_remote_size", probe)
    monkeypatch.setattr(vpt, "download_video", download)
    monkeypatch.setattr(vpt, "get_video_duration", lambda _p: 60.0)
    monkeypatch.setattr(vpt, "extract_audio_for_whisper", lambda _v, _a: True)
    monkeypatch.setattr(vpt, "transcribe_with_fallback", fake_transcribe)
    try:
        await vpt._run_pipeline(None, "p1", "https://example.com/l.mp4", "videocorso", "lez-1")
    except _Stop:
        seen["reached"] = True
    return seen


@pytest.mark.asyncio
async def test_pipeline_transcribes_with_groq_alone_when_assemblyai_key_is_missing(monkeypatch, vpt):
    seen = await _run_until_transcription(monkeypatch, vpt, {"GROQ_API_KEY": "gsk_x"})
    assert seen.get("reached") and seen["keys"] == ("", "gsk_x")
    assert seen["fn"] is vpt.assemblyai_transcribe


@pytest.mark.asyncio
async def test_pipeline_passes_both_keys_so_the_fallback_can_decide(monkeypatch, vpt):
    seen = await _run_until_transcription(monkeypatch, vpt, {"ASSEMBLYAI_API_KEY": "aai", "GROQ_API_KEY": "gsk"})
    assert seen["keys"] == ("aai", "gsk")


@pytest.mark.asyncio
async def test_pipeline_without_any_provider_never_attempts_transcription(monkeypatch, vpt):
    seen = await _run_until_transcription(monkeypatch, vpt, {})
    assert "reached" not in seen        # nessuna chiave: ramo "upload video raw" come prima
