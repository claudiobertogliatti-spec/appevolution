"""
Test suite per Operativo Stefania endpoints (sub-progetto A).
Vedi spec: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
TEST_PARTNER_ID = "1"  # Partner esistente nel DB (Marco Ferretti o seed)


class TestOperativoState:
    """Test GET /api/partner-journey/operativo/state/{partner_id}"""

    def test_state_seeds_steps_on_first_call(self):
        """Prima chiamata per un partner senza step -> seed automatico 13 step."""
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        r = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert len(data["steps"]) == 13
        in_progress = [s for s in data["steps"] if s["status"] == "in_progress"]
        assert len(in_progress) == 1, f"Expected exactly 1 in_progress step, got {len(in_progress)}"
        assert in_progress[0]["step_number"] == 1
        assert data["current_step"]["step_id"] == "01-contratto"
        assert data["total_steps"] == 13
        assert data["completed_count"] == 0

    def test_state_existing_partner(self):
        """Partner esistente -> stato letto da DB, no re-seed."""
        r = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{TEST_PARTNER_ID}")
        assert r.status_code == 200
        data = r.json()
        assert "steps" in data
        assert "current_step" in data
        assert len(data["steps"]) == 13
