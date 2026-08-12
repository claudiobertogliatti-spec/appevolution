import pytest

from services.sales_system_readiness import evaluate_launch_readiness, evaluate_sales_system


pytestmark = pytest.mark.unit


def test_sales_system_requires_all_seven_real_checks():
    complete = {key: True for key in ("subaccount", "domain", "legal", "funnel", "checkout", "price", "automation")}
    assert evaluate_sales_system(complete).ready is True
    for key in complete:
        assert evaluate_sales_system({**complete, key: False}).ready is False


def test_launch_readiness_aggregates_every_prerequisite():
    complete = {key: True for key in ("masterclass", "lessons", "sales_system", "calendar", "price_webinar", "launch_date")}
    assert evaluate_launch_readiness(complete).ready is True
    assert evaluate_launch_readiness({**complete, "lessons": False}).ready is False
