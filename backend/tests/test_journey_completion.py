import pytest

from services.journey_completion import evaluate_step_completion


pytestmark = pytest.mark.unit


def test_governed_step_rejects_arbitrary_payload():
    result = evaluate_step_completion("13-lancio", {"data": {"anything": True}})
    assert result.ok is False
    assert result.code == "launch_not_verified"


def test_declarative_step_remains_compatible():
    result = evaluate_step_completion("obiettivo", {"data": {"obiettivo": "100 iscritti"}})
    assert result.ok is True


def test_unknown_step_is_not_silently_completed():
    result = evaluate_step_completion("step-inesistente", {"data": {}})
    assert result.ok is False
    assert result.code == "unknown_step"
