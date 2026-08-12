import pytest

from services.journey_completion import can_unlock_f20


pytestmark = pytest.mark.unit


def test_f20_requires_launch_certificate_and_workbook():
    assert can_unlock_f20({"13-lancio": "done", "18-certificato-valida": "done", "19-workbook-finale": "done"}) is True
    assert can_unlock_f20({"13-lancio": "done", "18-certificato-valida": "done", "19-workbook-finale": "pending"}) is False
