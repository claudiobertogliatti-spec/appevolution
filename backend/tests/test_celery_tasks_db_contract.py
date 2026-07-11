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

# check_stuck_video_pipelines fa `from video_pipeline_task import process_partner_video`
# PRIMA della query DB. In locale celery è stubbato, quindi l'import reale di
# video_pipeline_task (che importa celery_app → `from celery import Celery`)
# fallirebbe e l'except mascherebbe tutto. Stub minimale per far proseguire il
# task fino allo spacchettamento di get_db() e alla query. In CI con celery reale
# installato, setdefault non sovrascrive e viene usato il modulo vero.
video_pipeline_stub = types.ModuleType("video_pipeline_task")
video_pipeline_stub.process_partner_video = types.SimpleNamespace(delay=lambda **_kwargs: None)
sys.modules.setdefault("video_pipeline_task", video_pipeline_stub)

import celery_tasks


class _Cursor:
    async def to_list(self, _limit):
        return []


class _Collection:
    def __init__(self):
        self.find_called = False

    def find(self, *_args, **_kwargs):
        self.find_called = True
        return _Cursor()


class _Db:
    def __init__(self):
        self.pipeline_jobs = _Collection()
        self.masterclass_factory = _Collection()
        self.partner_videocorso = _Collection()


# NB: entrambi i task hanno un try/except che, in caso di errore, ritorna lo
# STESSO sentinel del percorso di successo (0 / {"reset":0,"retriggered":0}).
# Perciò asserire solo sul valore di ritorno NON distingue il fix dal bug
# `db = get_db()`: l'except maschererebbe l'AttributeError. La guardia vera è che
# la query sul DB sia PARTITA (find_called), cosa che avviene solo se
# `client, db = get_db()` spacchetta la tupla. Col bug, `db.<collection>` solleva
# AttributeError PRIMA di `.find()`, quindi find_called resta False e il test fallisce.


def test_check_stuck_pipelines_unpacks_db_tuple(monkeypatch):
    db = _Db()
    monkeypatch.setattr(celery_tasks, "get_db", lambda: (object(), db))

    assert celery_tasks.check_stuck_pipelines.run() == 0
    assert db.pipeline_jobs.find_called, (
        "check_stuck_pipelines non ha interrogato pipeline_jobs: "
        "get_db() non spacchettato (regressione bug tuple)"
    )


def test_check_stuck_video_pipelines_unpacks_db_tuple(monkeypatch):
    db = _Db()
    monkeypatch.setattr(celery_tasks, "get_db", lambda: (object(), db))

    assert celery_tasks.check_stuck_video_pipelines.run() == {
        "reset": 0,
        "retriggered": 0,
    }
    assert db.masterclass_factory.find_called, (
        "check_stuck_video_pipelines non ha interrogato masterclass_factory: "
        "get_db() non spacchettato (regressione bug tuple)"
    )
