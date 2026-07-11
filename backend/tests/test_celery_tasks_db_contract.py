import sys
import types

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


celery_stub = types.ModuleType("celery")
celery_stub.shared_task = _shared_task
celery_exceptions_stub = types.ModuleType("celery.exceptions")
celery_exceptions_stub.SoftTimeLimitExceeded = type("SoftTimeLimitExceeded", (Exception,), {})
sys.modules.setdefault("celery", celery_stub)
sys.modules.setdefault("celery.exceptions", celery_exceptions_stub)

import celery_tasks


class _Cursor:
    async def to_list(self, _limit):
        return []


class _Collection:
    def find(self, *_args, **_kwargs):
        return _Cursor()


class _Db:
    pipeline_jobs = _Collection()
    masterclass_factory = _Collection()
    partner_videocorso = _Collection()


def test_check_stuck_pipelines_unpacks_db_tuple(monkeypatch):
    monkeypatch.setattr(celery_tasks, "get_db", lambda: (object(), _Db()))

    assert celery_tasks.check_stuck_pipelines.run() == 0


def test_check_stuck_video_pipelines_unpacks_db_tuple(monkeypatch):
    monkeypatch.setattr(celery_tasks, "get_db", lambda: (object(), _Db()))

    assert celery_tasks.check_stuck_video_pipelines.run() == {
        "reset": 0,
        "retriggered": 0,
    }
