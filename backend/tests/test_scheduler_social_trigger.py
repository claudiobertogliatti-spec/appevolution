"""
Il trigger dello scheduler social deve pubblicare su UN solo servizio.

Perche' esiste (8/9/2026): lo scheduler gira sul worker, che non ha i token Meta;
il publisher deve girare sul backend (che i token ce li ha). Il trigger percio'
chiama `SOCIAL_PUBLISH_BASE_URL` (origin del backend) e resta INERTE dove quella
env non c'e' — cosi' non si pubblica due volte anche se lo scheduler girasse su
entrambi i servizi.
"""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://scheduler-test.invalid:27017")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import scheduler as sch  # noqa: E402


def test_trigger_inerte_senza_base_url(monkeypatch):
    monkeypatch.delenv("SOCIAL_PUBLISH_BASE_URL", raising=False)
    monkeypatch.setenv("LUCA_REPORT_KEY", "k")
    with patch.object(sch.httpx, "post") as mp:
        sch.trigger_social_publisher()
    mp.assert_not_called()  # niente doppione: senza base URL non pubblica


def test_trigger_chiama_il_backend_con_report_key(monkeypatch):
    monkeypatch.setenv("SOCIAL_PUBLISH_BASE_URL", "https://backend.example/")
    monkeypatch.setenv("LUCA_REPORT_KEY", "k")
    fake = MagicMock()
    fake.json.return_value = {"configurato": True, "pubblicati": 1, "parziali": 0, "falliti": 0}
    with patch.object(sch.httpx, "post", return_value=fake) as mp:
        sch.trigger_social_publisher()
    mp.assert_called_once()
    args, kwargs = mp.call_args
    # origin normalizzato (niente doppio slash) + path completo con /api
    assert args[0] == "https://backend.example/api/ciak/social/publish-due"
    assert kwargs["headers"]["X-Report-Key"] == "k"


def test_trigger_saltato_senza_report_key(monkeypatch):
    monkeypatch.setenv("SOCIAL_PUBLISH_BASE_URL", "https://backend.example")
    monkeypatch.delenv("LUCA_REPORT_KEY", raising=False)
    with patch.object(sch.httpx, "post") as mp:
        sch.trigger_social_publisher()
    mp.assert_not_called()
