import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

import celery_manager

pytestmark = pytest.mark.unit


def test_celery_enabled_false_disables_autostart(monkeypatch):
    monkeypatch.setenv("CELERY_ENABLED", "false")

    assert celery_manager.is_celery_enabled() is False


def test_celery_enabled_true_enables_autostart(monkeypatch):
    monkeypatch.setenv("CELERY_ENABLED", "true")

    assert celery_manager.is_celery_enabled() is True
