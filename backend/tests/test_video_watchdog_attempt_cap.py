"""
check_stuck_video_pipelines rispetta il tetto ai tentativi (services/video_retry_guard).

Regressione dell'incidente 27/9/2026: una masterclass che esauriva la memoria del
worker veniva riaccodata all'infinito dal watchdog. Sotto il tetto il retrigger
resta invariato; al tetto il job va in errore e NON viene riaccodato.
"""
import sys
import types
from datetime import datetime, timezone, timedelta

import pytest

pytestmark = pytest.mark.unit


def _shared_task(*decorator_args, **_decorator_kwargs):
    def decorate(fn):
        fn.run = fn
        fn.delay = lambda *args, **kwargs: None
        return fn

    if decorator_args and callable(decorator_args[0]):
        return decorate(decorator_args[0])
    return decorate


# Stessa tecnica di test_celery_tasks_db_contract: stub solo se il modulo reale non è già caricato.
celery_stub = types.ModuleType("celery")
celery_stub.shared_task = _shared_task
celery_exceptions_stub = types.ModuleType("celery.exceptions")
celery_exceptions_stub.SoftTimeLimitExceeded = type("SoftTimeLimitExceeded", (Exception,), {})
sys.modules.setdefault("celery", celery_stub)
sys.modules.setdefault("celery.exceptions", celery_exceptions_stub)
_vp_stub = types.ModuleType("video_pipeline_task")
_vp_stub.process_partner_video = types.SimpleNamespace(delay=lambda **_kw: None)
sys.modules.setdefault("video_pipeline_task", _vp_stub)

import celery_tasks  # noqa: E402

NOW = datetime.now(timezone.utc)
URL = "gs://bucket/raw_videos/masterclass.mp4"


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, _limit):
        return self._docs


class _Collection:
    def __init__(self, docs=None):
        self.docs = docs or []
        self.updates = []

    def find(self, *_a, **_kw):
        return _Cursor(self.docs)

    async def update_one(self, flt, update, **_kw):
        self.updates.append((flt, update["$set"]))


class _Db:
    def __init__(self, masterclass=None, videocorso=None):
        self.masterclass_factory = _Collection(masterclass)
        self.partner_videocorso = _Collection(videocorso)


@pytest.fixture
def harness(monkeypatch):
    triggered = []
    vp = sys.modules["video_pipeline_task"]
    monkeypatch.setattr(vp, "process_partner_video",
                        types.SimpleNamespace(delay=lambda **kw: triggered.append(kw)))

    async def _no_telegram(_msg):
        return None

    monkeypatch.setattr(celery_tasks, "send_telegram_notification", _no_telegram)

    def install(db):
        monkeypatch.setattr(celery_tasks, "get_db", lambda: (object(), db))

    return triggered, install


def _masterclass_doc(attempts=None, since_minutes_ago=30):
    doc = {
        "partner_id": "p1",
        "video_pipeline_status": "downloading",
        "video_raw_url": URL,
        "pipeline_heartbeat_at": (NOW - timedelta(minutes=20)).isoformat(),
    }
    if attempts is not None:
        doc["pipeline_attempts"] = attempts
        doc["pipeline_attempts_since"] = (NOW - timedelta(minutes=since_minutes_ago)).isoformat()
    return doc


def test_masterclass_below_cap_is_retriggered(harness):
    triggered, install = harness
    db = _Db(masterclass=[_masterclass_doc(attempts=2)])
    install(db)

    result = celery_tasks.check_stuck_video_pipelines.run()

    assert result == {"reset": 1, "retriggered": 1}
    assert triggered == [{"partner_id": "p1", "video_url": URL, "video_type": "masterclass"}]
    assert db.masterclass_factory.updates[0][1]["video_pipeline_status"] == "queued"


def test_masterclass_at_cap_goes_to_error_and_is_not_retriggered(harness):
    triggered, install = harness
    db = _Db(masterclass=[_masterclass_doc(attempts=3)])
    install(db)

    result = celery_tasks.check_stuck_video_pipelines.run()

    assert result == {"reset": 1, "retriggered": 0}
    assert triggered == []
    _, fields = db.masterclass_factory.updates[0]
    assert fields["video_pipeline_status"] == "error"
    assert "tetto" in fields["video_pipeline_error"]


def test_masterclass_with_expired_window_is_retriggered_again(harness):
    triggered, install = harness
    db = _Db(masterclass=[_masterclass_doc(attempts=3, since_minutes_ago=60 * 7)])
    install(db)

    assert celery_tasks.check_stuck_video_pipelines.run() == {"reset": 1, "retriggered": 1}
    assert len(triggered) == 1


def _lesson_doc(attempts=None):
    lesson = {
        "pipeline_status": "transcribing",
        "pipeline_heartbeat_at": (NOW - timedelta(minutes=20)).isoformat(),
        "video_raw_url": URL,
    }
    if attempts is not None:
        lesson["pipeline_attempts"] = attempts
        lesson["pipeline_attempts_since"] = (NOW - timedelta(minutes=30)).isoformat()
    return {"partner_id": "p2", "lessons": {"1-1": lesson}}


def test_lesson_at_cap_is_not_retriggered(harness):
    triggered, install = harness
    db = _Db(videocorso=[_lesson_doc(attempts=3)])
    install(db)

    assert celery_tasks.check_stuck_video_pipelines.run() == {"reset": 1, "retriggered": 0}
    assert triggered == []
    _, fields = db.partner_videocorso.updates[0]
    assert fields["lessons.1-1.pipeline_status"] == "error"


def test_lesson_below_cap_is_retriggered(harness):
    triggered, install = harness
    db = _Db(videocorso=[_lesson_doc(attempts=1)])
    install(db)

    assert celery_tasks.check_stuck_video_pipelines.run() == {"reset": 1, "retriggered": 1}
    assert triggered[0]["lesson_id"] == "1-1"
