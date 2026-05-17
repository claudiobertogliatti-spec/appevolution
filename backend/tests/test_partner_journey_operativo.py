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


class TestOperativoComplete:
    """Test POST /api/partner-journey/operativo/complete/{partner_id}/{step_id}"""

    def test_complete_advances_to_next_step(self):
        """Completa step 1 -> step 2 diventa in_progress, step 1 done con data merged."""
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        r = requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/complete/{fresh_pid}/01-contratto",
            json={"data": {"contract_url": "https://test.com/c.pdf", "receipt_url": "https://test.com/r.pdf"}},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["next_step"]["step_id"] == "02-discovery-video"
        assert body["next_step"]["status"] == "in_progress"

        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        step1 = next(s for s in state["steps"] if s["step_id"] == "01-contratto")
        step2 = next(s for s in state["steps"] if s["step_id"] == "02-discovery-video")
        assert step1["status"] == "done"
        assert step1["data"]["contract_url"] == "https://test.com/c.pdf"
        assert step2["status"] == "in_progress"

    def test_complete_last_step_marks_journey_complete(self):
        """Completa step 13 -> tutti done, completed_count=13."""
        from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        for d in JOURNEY_STEPS_DEFINITION:
            requests.post(
                f"{BASE_URL}/api/partner-journey/operativo/complete/{fresh_pid}/{d['step_id']}",
                json={"data": {}},
            )

        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        assert state["completed_count"] == 13
        assert all(s["status"] == "done" for s in state["steps"])

    def test_complete_unknown_step_returns_404(self):
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")
        r = requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/complete/{fresh_pid}/99-nonexistent",
            json={"data": {}},
        )
        assert r.status_code == 404


class TestOperativoSaveDraft:
    """Test POST /api/partner-journey/operativo/save-draft/{partner_id}/{step_id}"""

    def test_save_draft_merges_data_without_advancing(self):
        """Save draft accumula data ma NON cambia status (resta in_progress)."""
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        # Salva 2 bozze parziali
        r1 = requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/save-draft/{fresh_pid}/01-contratto",
            json={"data": {"contract_url": "https://test.com/c.pdf"}},
        )
        assert r1.status_code == 200, r1.text
        requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/save-draft/{fresh_pid}/01-contratto",
            json={"data": {"receipt_url": "https://test.com/r.pdf"}},
        )

        # Verifica merge + status non cambiato
        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        step1 = next(s for s in state["steps"] if s["step_id"] == "01-contratto")
        assert step1["status"] == "in_progress"
        assert step1["data"]["contract_url"] == "https://test.com/c.pdf"
        assert step1["data"]["receipt_url"] == "https://test.com/r.pdf"
