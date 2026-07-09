import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import acquisition_policy


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
