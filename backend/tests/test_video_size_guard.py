"""Unit test per services/video_size_guard.py + sonda del peso in video_pipeline_task."""
import os

import httpx
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import video_size_guard as g

pytestmark = pytest.mark.unit

CAP = 1_500_000_000


# ── check_size ───────────────────────────────────────────────────────────────

def test_a_file_under_the_cap_passes():
    g.check_size(170_000_000, limit=CAP)      # lezione da 163 MB
    g.check_size(777_000_000, limit=CAP)      # la lezione più pesante vista


def test_a_file_exactly_at_the_cap_passes_and_one_byte_over_is_refused():
    g.check_size(CAP, limit=CAP)
    with pytest.raises(g.VideoTooHeavy):
        g.check_size(CAP + 1, limit=CAP)


def test_a_huge_file_is_refused_with_a_message_the_partner_can_act_on():
    with pytest.raises(g.VideoTooHeavy) as exc:
        g.check_size(4_420_000_000, limit=CAP)   # un bonus da 4,4 GB
    msg = str(exc.value)
    assert "troppo pesante" in msg
    assert "4.420 MB" in msg and "1.500 MB" in msg
    assert "comprimilo" in msg


@pytest.mark.parametrize("unknown", [None, 0, -5])
def test_unknown_size_never_blocks(unknown):
    g.check_size(unknown, limit=CAP)


def test_videotooheavy_is_a_valueerror_so_existing_handlers_still_catch_it():
    assert issubclass(g.VideoTooHeavy, ValueError)


# ── tetto configurabile ──────────────────────────────────────────────────────

def test_default_cap_is_used_without_env(monkeypatch):
    monkeypatch.delenv(g.ENV_VAR, raising=False)
    assert g.max_raw_bytes() == g.DEFAULT_MAX_RAW_BYTES == 1_500_000_000


def test_env_can_raise_the_cap_when_the_worker_gets_more_memory(monkeypatch):
    monkeypatch.setenv(g.ENV_VAR, "3000000000")
    assert g.max_raw_bytes() == 3_000_000_000
    g.check_size(2_900_000_000)              # ora passa col tetto da env


@pytest.mark.parametrize("bad", ["", "abc", "0", "-1", "1.5e9"])
def test_invalid_env_falls_back_to_the_default(monkeypatch, bad):
    monkeypatch.setenv(g.ENV_VAR, bad)
    assert g.max_raw_bytes() == g.DEFAULT_MAX_RAW_BYTES


# ── link_or_copy / free_file: stessi byte, niente raddoppio in RAM ────────────

def test_link_or_copy_gives_the_same_bytes_without_duplicating_them(tmp_path):
    raw, final = tmp_path / "raw.mp4", tmp_path / "final.mp4"
    raw.write_bytes(b"video-bytes")
    g.link_or_copy(str(raw), str(final))
    assert final.read_bytes() == b"video-bytes"
    assert os.path.samefile(raw, final)      # hard link: stesso file, zero byte in più


def test_link_or_copy_falls_back_to_a_real_copy_when_links_are_not_allowed(tmp_path, monkeypatch):
    raw, final = tmp_path / "raw.mp4", tmp_path / "final.mp4"
    raw.write_bytes(b"abc")

    def no_link(*_a, **_k):
        raise OSError("link non supportato")

    monkeypatch.setattr(os, "link", no_link)
    g.link_or_copy(str(raw), str(final))
    assert final.read_bytes() == b"abc"
    assert not os.path.samefile(raw, final)


def test_link_or_copy_over_an_existing_hardlink_does_not_raise_samefile(tmp_path):
    # Percorso reale: ramo AssemblyAI in errore dopo che final era già stato collegato.
    raw, final = tmp_path / "raw.mp4", tmp_path / "final.mp4"
    raw.write_bytes(b"x" * 10)
    g.link_or_copy(str(raw), str(final))
    g.link_or_copy(str(raw), str(final))     # shutil.copy qui darebbe SameFileError
    assert final.read_bytes() == b"x" * 10


def test_freeing_the_raw_keeps_the_final_readable(tmp_path):
    raw, final = tmp_path / "raw.mp4", tmp_path / "final.mp4"
    raw.write_bytes(b"payload")
    g.link_or_copy(str(raw), str(final))
    assert g.free_file(str(raw), keep=str(final)) is True
    assert not raw.exists()
    assert final.read_bytes() == b"payload"


def test_free_file_never_deletes_the_file_to_keep_and_never_raises(tmp_path):
    f = tmp_path / "final.mp4"
    f.write_bytes(b"keep")
    assert g.free_file(str(f), keep=str(f)) is False
    assert f.exists()
    assert g.free_file(str(tmp_path / "missing.mp4")) is False


# ── sonda del peso prima del download (rete simulata) ────────────────────────

@pytest.fixture(scope="module")
def vpt():
    """Il VERO video_pipeline_task, caricato dal file: altri test mettono in sys.modules un finto stub."""
    import importlib.util
    import sys
    import types

    class _FakeCelery:
        def task(self, *_a, **_k):
            return lambda fn: fn

    fake = types.ModuleType("celery_app")
    fake.celery_app = _FakeCelery()
    saved = sys.modules.get("celery_app")
    sys.modules["celery_app"] = fake          # evita di dipendere dal vero celery (altri test lo stubbano)
    try:
        path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "video_pipeline_task.py")
        spec = importlib.util.spec_from_file_location("video_pipeline_task_real", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        if saved is None:
            sys.modules.pop("celery_app", None)
        else:
            sys.modules["celery_app"] = saved
    return mod


def _patch_httpx(monkeypatch, vpt, handler):
    real = httpx.AsyncClient

    def make(*a, **kw):
        kw.pop("transport", None)
        return real(*a, transport=httpx.MockTransport(handler), **kw)

    monkeypatch.setattr(vpt.httpx, "AsyncClient", make)


@pytest.mark.asyncio
async def test_probe_reads_content_length_from_a_head_request(monkeypatch, vpt):
    _patch_httpx(monkeypatch, vpt, lambda req: httpx.Response(200, headers={"content-length": "2000000000"}))
    assert await vpt.probe_remote_size("https://example.com/lezione.mp4") == 2_000_000_000


@pytest.mark.asyncio
async def test_probe_returns_none_when_the_host_hides_the_size_or_fails(monkeypatch, vpt):
    _patch_httpx(monkeypatch, vpt, lambda req: httpx.Response(200))
    assert await vpt.probe_remote_size("https://example.com/a.mp4") is None

    def boom(req):
        raise httpx.ConnectError("giù")

    _patch_httpx(monkeypatch, vpt, boom)
    assert await vpt.probe_remote_size("https://example.com/a.mp4") is None


@pytest.mark.asyncio
async def test_probe_skips_google_drive_links_without_any_network_call(monkeypatch, vpt):

    def must_not_be_called(req):
        raise AssertionError("nessuna rete per i link Drive")

    _patch_httpx(monkeypatch, vpt, must_not_be_called)
    assert await vpt.probe_remote_size("https://drive.google.com/file/d/1AbCdEf/view") is None


# ── collegamento nella pipeline: file pesante = errore chiaro, senza scaricare né lanciare ffmpeg ──

class _Coll:
    def __init__(self, log, name):
        self.log, self.name = log, name

    async def find_one(self, *_a, **_k):
        return {"id": "p1", "name": "Partner Prova"} if self.name == "partners" else {}

    async def update_one(self, flt, update, **_k):
        self.log.append((self.name, update.get("$set", {})))


class _Db:
    def __init__(self, log):
        self.log = log

    def __getattr__(self, name):
        return _Coll(self.log, name)

    __getitem__ = __getattr__


class _Mongo:
    def __init__(self, log):
        self._db = _Db(log)

    def __getitem__(self, _name):
        return self._db

    def close(self):
        pass


@pytest.fixture
def pipeline_env(monkeypatch, vpt):
    import motor.motor_asyncio as motor_mod
    log, telegrams, calls = [], [], {"download": 0}
    monkeypatch.setattr(motor_mod, "AsyncIOMotorClient", lambda *a, **k: _Mongo(log))

    async def fake_telegram(msg):
        telegrams.append(msg)

    async def fake_download(url, dest):
        calls["download"] += 1
        return calls.get("size", 100_000_000)

    monkeypatch.setattr(vpt, "telegram", fake_telegram)
    monkeypatch.setattr(vpt, "download_video", fake_download)
    return log, telegrams, calls


async def _run(vpt):
    await vpt._run_pipeline(None, "p1", "https://example.com/lezione.mp4", "videocorso", "lez-1")


@pytest.mark.asyncio
async def test_pipeline_refuses_a_heavy_file_before_downloading_it(monkeypatch, vpt, pipeline_env):
    log, telegrams, calls = pipeline_env

    async def probe(_url):
        return 2_000_000_000                       # 2 GB dichiarati dal sorgente

    monkeypatch.setattr(vpt, "probe_remote_size", probe)
    await _run(vpt)

    assert calls["download"] == 0                   # non ha nemmeno scaricato
    errors = [s for _n, s in log if s.get("lessons.lez-1.pipeline_status") == "error" or s.get("pipeline_status") == "error"]
    assert errors, log
    assert any("troppo pesante" in str(v) for s in errors for v in s.values())
    assert any("Video troppo pesante" in t for t in telegrams)


@pytest.mark.asyncio
async def test_pipeline_refuses_after_download_when_the_size_was_unknown(monkeypatch, vpt, pipeline_env):
    log, telegrams, calls = pipeline_env
    calls["size"] = 2_000_000_000

    async def probe(_url):
        return None                                 # es. link Drive: peso non noto prima

    def must_not_run(_p):
        raise AssertionError("ffprobe/ffmpeg non devono partire su un file troppo pesante")

    monkeypatch.setattr(vpt, "probe_remote_size", probe)
    monkeypatch.setattr(vpt, "get_video_duration", must_not_run)
    await _run(vpt)

    assert calls["download"] == 1
    assert any("troppo pesante" in str(v) for _n, s in log for v in s.values())
    assert any("Video troppo pesante" in t for t in telegrams)


@pytest.mark.asyncio
async def test_pipeline_lets_a_normal_lesson_through_the_gate(monkeypatch, vpt, pipeline_env):
    log, telegrams, calls = pipeline_env
    calls["size"] = 170_000_000

    async def probe(_url):
        return 170_000_000

    def passed_gate(_p):
        raise RuntimeError("PASSED_GATE")           # il passo successivo al download è stato raggiunto

    monkeypatch.setattr(vpt, "probe_remote_size", probe)
    monkeypatch.setattr(vpt, "get_video_duration", passed_gate)
    with pytest.raises(RuntimeError, match="PASSED_GATE"):
        await _run(vpt)

    assert calls["download"] == 1
    assert not any("Video troppo pesante" in t for t in telegrams)
