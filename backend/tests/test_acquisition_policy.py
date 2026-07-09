import sys
import os
from pathlib import Path

import pytest
from fastapi import BackgroundTasks, HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "routers"))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/test")

import acquisition_policy
import systeme_contacts


pytestmark = pytest.mark.unit


def test_lista_fredda_systeme_import_is_disabled_by_default():
    assert acquisition_policy.is_lista_fredda_systeme_import_allowed({}) is False
    assert acquisition_policy.get_allowed_systeme_sources({}) == ["google_places"]
    assert acquisition_policy.get_systeme_daily_queue_match({}) == {
        "status": "pending",
        "source": {"$ne": "lista_fredda"},
    }


@pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "on"])
def test_lista_fredda_systeme_import_can_be_enabled_only_with_explicit_flag(value):
    env = {acquisition_policy.ALLOW_LISTA_FREDDA_SYSTEME_IMPORT_ENV: value}

    assert acquisition_policy.is_lista_fredda_systeme_import_allowed(env) is True
    assert acquisition_policy.get_allowed_systeme_sources(env) == ["google_places", "lista_fredda"]
    assert acquisition_policy.get_systeme_daily_queue_match(env) == {"status": "pending"}


def test_lista_fredda_freeze_message_explains_allowed_uses():
    message = acquisition_policy.get_lista_fredda_freeze_message()

    assert "Acquisizione Evolution" in message
    assert "custom audience" in message
    assert "analisi" in message
    assert "email massive" in message


def test_lista_fredda_freeze_message_blocks_cold_sequences():
    message = acquisition_policy.get_lista_fredda_freeze_message()

    assert "drip" in message
    assert "sequenze cold" in message


@pytest.mark.asyncio
async def test_legacy_systeme_bulk_endpoint_is_blocked_by_default(monkeypatch):
    monkeypatch.setattr(systeme_contacts, "SYSTEME_API_KEY", "fake-key")

    with pytest.raises(HTTPException) as exc:
        await systeme_contacts.import_bulk_from_mongodb(
            systeme_contacts.SystemeBulkImportRequest(),
            BackgroundTasks(),
        )

    assert exc.value.status_code == 423
    assert "Lista fredda 13k congelata" in exc.value.detail


@pytest.mark.asyncio
async def test_legacy_systeme_bulk_background_job_is_blocked_by_default(monkeypatch):
    touched_db = False

    class ExplodingClient:
        def __init__(self, *args, **kwargs):
            nonlocal touched_db
            touched_db = True
            raise AssertionError("MongoDB should not be touched while lista fredda is frozen")

    monkeypatch.setattr(systeme_contacts, "AsyncIOMotorClient", ExplodingClient)

    result = await systeme_contacts.process_bulk_import_job("job-1", 1934404, 50)

    assert result is None
    assert touched_db is False
