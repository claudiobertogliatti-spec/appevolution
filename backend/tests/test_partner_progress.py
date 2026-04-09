"""
Test suite for Partner Progress API endpoints.
Tests GET/PATCH progress endpoints with micro-step config and phase auto-sync.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"

# Partner ID from DB (Marco Orlandi - F3)
TEST_PARTNER_ID = "3"


class TestPartnerProgressAPI:
    """Tests for /api/admin/partners/{id}/progress endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        data = login_res.json()
        self.token = data.get("access_token") or data.get("token")
        assert self.token, "No token in login response"
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ── GET /api/admin/partners/{id}/progress ──────────────────────────
    
    def test_get_progress_returns_200(self):
        """GET progress returns 200 for existing partner"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    
    def test_get_progress_returns_partner_info(self):
        """GET progress returns partner_id, partner_name, phase"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200
        data = res.json()
        
        assert "partner_id" in data, "Missing partner_id"
        assert "partner_name" in data, "Missing partner_name"
        assert "phase" in data, "Missing phase"
        assert data["partner_id"] == TEST_PARTNER_ID
    
    def test_get_progress_returns_5_macro_steps(self):
        """GET progress returns all 5 macro steps in progress dict"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200
        data = res.json()
        
        assert "progress" in data, "Missing progress field"
        progress = data["progress"]
        
        expected_steps = ["posizionamento", "masterclass", "videocorso", "funnel", "lancio"]
        for step in expected_steps:
            assert step in progress, f"Missing macro step: {step}"
    
    def test_get_progress_returns_micro_steps_config(self):
        """GET progress returns config with micro-step definitions"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200
        data = res.json()
        
        assert "config" in data, "Missing config field"
        config = data["config"]
        
        # Check posizionamento has 3 micro-steps
        assert "posizionamento" in config
        assert len(config["posizionamento"]) == 3
        
        # Check masterclass has 5 micro-steps
        assert "masterclass" in config
        assert len(config["masterclass"]) == 5
        
        # Check videocorso has 6 micro-steps
        assert "videocorso" in config
        assert len(config["videocorso"]) == 6
        
        # Check funnel has 5 micro-steps
        assert "funnel" in config
        assert len(config["funnel"]) == 5
        
        # Check lancio has 5 micro-steps
        assert "lancio" in config
        assert len(config["lancio"]) == 5
    
    def test_get_progress_macro_step_has_status(self):
        """Each macro step has status field"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200
        data = res.json()
        
        for step_id, step_data in data["progress"].items():
            assert "status" in step_data, f"Macro step {step_id} missing status"
            assert step_data["status"] in ["not_started", "in_progress", "completed"], \
                f"Invalid status for {step_id}: {step_data['status']}"
    
    def test_get_progress_macro_step_has_micro_steps(self):
        """Each macro step has micro_steps dict"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert res.status_code == 200
        data = res.json()
        
        for step_id, step_data in data["progress"].items():
            assert "micro_steps" in step_data, f"Macro step {step_id} missing micro_steps"
            assert isinstance(step_data["micro_steps"], dict), f"micro_steps should be dict for {step_id}"
    
    def test_get_progress_404_for_nonexistent_partner(self):
        """GET progress returns 404 for non-existent partner"""
        res = self.session.get(f"{BASE_URL}/api/admin/partners/99999/progress")
        assert res.status_code == 404
    
    # ── PATCH /api/admin/partners/{id}/progress ────────────────────────
    
    def test_patch_progress_updates_micro_step(self):
        """PATCH progress updates micro-step status"""
        # First get current state
        get_res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert get_res.status_code == 200
        
        # Update a micro-step
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "posizionamento",
                "micro_step_id": "questionario",
                "status": "in_progress"
            }
        )
        assert patch_res.status_code == 200, f"PATCH failed: {patch_res.text}"
        
        data = patch_res.json()
        assert data.get("success") == True
        assert "new_phase" in data
        assert "progress" in data
    
    def test_patch_progress_returns_new_phase(self):
        """PATCH progress returns new_phase in response"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "posizionamento",
                "micro_step_id": "revisione_pos",
                "status": "completed"
            }
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        
        assert "new_phase" in data, "Missing new_phase in response"
        assert data["new_phase"] in ["F2", "F3", "F4", "F6", "F7", "LIVE"], \
            f"Invalid phase: {data['new_phase']}"
    
    def test_patch_progress_returns_macro_step_status(self):
        """PATCH progress returns macro_step_status"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "masterclass",
                "micro_step_id": "script_scrittura",
                "status": "in_progress"
            }
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        
        assert "macro_step_status" in data, "Missing macro_step_status"
        assert data["macro_step_status"] in ["not_started", "in_progress", "completed"]
    
    def test_patch_progress_auto_computes_macro_status(self):
        """PATCH progress auto-computes macro status from micro-steps"""
        # Complete all posizionamento micro-steps
        for micro_id in ["questionario", "revisione_pos", "approvazione_pos"]:
            patch_res = self.session.patch(
                f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
                json={
                    "macro_step": "posizionamento",
                    "micro_step_id": micro_id,
                    "status": "completed"
                }
            )
            assert patch_res.status_code == 200
        
        # Check macro status is now completed
        data = patch_res.json()
        assert data["macro_step_status"] == "completed", \
            f"Expected macro status 'completed', got '{data['macro_step_status']}'"
    
    def test_patch_progress_auto_syncs_phase(self):
        """PATCH progress auto-syncs partner phase based on progress"""
        # Complete posizionamento → phase should become F3
        for micro_id in ["questionario", "revisione_pos", "approvazione_pos"]:
            self.session.patch(
                f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
                json={
                    "macro_step": "posizionamento",
                    "micro_step_id": micro_id,
                    "status": "completed"
                }
            )
        
        # Verify phase
        get_res = self.session.get(f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress")
        assert get_res.status_code == 200
        data = get_res.json()
        
        # Phase should be F3 (after posizionamento completed)
        assert data["phase"] == "F3", f"Expected phase F3, got {data['phase']}"
    
    def test_patch_progress_invalid_macro_step(self):
        """PATCH progress returns 400 for invalid macro_step"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "invalid_step",
                "micro_step_id": "test",
                "status": "completed"
            }
        )
        assert patch_res.status_code == 400
    
    def test_patch_progress_invalid_micro_step(self):
        """PATCH progress returns 400 for invalid micro_step_id"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "posizionamento",
                "micro_step_id": "invalid_micro",
                "status": "completed"
            }
        )
        assert patch_res.status_code == 400
    
    def test_patch_progress_invalid_status(self):
        """PATCH progress returns 400 for invalid status"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
            json={
                "macro_step": "posizionamento",
                "micro_step_id": "questionario",
                "status": "invalid_status"
            }
        )
        assert patch_res.status_code == 400
    
    def test_patch_progress_404_for_nonexistent_partner(self):
        """PATCH progress returns 404 for non-existent partner"""
        patch_res = self.session.patch(
            f"{BASE_URL}/api/admin/partners/99999/progress",
            json={
                "macro_step": "posizionamento",
                "micro_step_id": "questionario",
                "status": "completed"
            }
        )
        assert patch_res.status_code == 404


class TestPartnerProgressPhaseMapping:
    """Tests for phase auto-sync based on progress"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200
        data = login_res.json()
        self.token = data.get("access_token") or data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_phase_mapping_posizionamento_to_f3(self):
        """Completing posizionamento sets phase to F3"""
        # Reset first
        for micro_id in ["questionario", "revisione_pos", "approvazione_pos"]:
            self.session.patch(
                f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
                json={"macro_step": "posizionamento", "micro_step_id": micro_id, "status": "not_started"}
            )
        
        # Complete all
        for micro_id in ["questionario", "revisione_pos", "approvazione_pos"]:
            res = self.session.patch(
                f"{BASE_URL}/api/admin/partners/{TEST_PARTNER_ID}/progress",
                json={"macro_step": "posizionamento", "micro_step_id": micro_id, "status": "completed"}
            )
        
        data = res.json()
        assert data["new_phase"] == "F3", f"Expected F3, got {data['new_phase']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
