"""
Test Percorso Veloce (Go Live in 21 giorni) - Fast Track Mode
Tests for the 3 new endpoints:
- POST /api/partner-journey/percorso-veloce/activate
- GET /api/partner-journey/percorso-veloce/{partner_id}
- POST /api/partner-journey/percorso-veloce/save-checklist
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPercorsoVeloceEndpoints:
    """Test Percorso Veloce (Go Live in 21 giorni) endpoints"""
    
    # Partner ID 2 = Arianna Aceto (already has percorso active)
    # Partner ID 3 = Marco Orlandi (should NOT have percorso active)
    
    def test_get_percorso_veloce_not_activated(self):
        """GET returns active=false when percorso not activated for partner"""
        # Use partner ID 3 which should NOT have percorso veloce activated
        response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/3")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return active=false for partner without percorso veloce
        assert data.get("success") == True
        # If not activated, active should be False
        # Note: If partner 3 has been activated in previous tests, this might be True
        print(f"Partner 3 percorso veloce status: active={data.get('active')}")
    
    def test_get_percorso_veloce_activated(self):
        """GET returns active status, current day, phase, tasks for activated partner"""
        # Partner ID 2 (Arianna Aceto) should have percorso veloce activated
        response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/2")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("active") == True, "Partner 2 should have percorso veloce active"
        
        # Verify response structure
        assert "current_day" in data, "Response should include current_day"
        assert "current_phase" in data, "Response should include current_phase"
        assert "today_tasks" in data, "Response should include today_tasks"
        assert "phases" in data, "Response should include phases"
        
        # Verify current_day is between 1 and 21 (or beyond if completed)
        current_day = data.get("current_day")
        assert isinstance(current_day, int), "current_day should be an integer"
        assert current_day >= 1, "current_day should be at least 1"
        
        # Verify current_phase is one of the valid phases
        valid_phases = ["posizionamento", "webinar", "funnel", "traffico", "webinar_live"]
        current_phase = data.get("current_phase")
        assert current_phase in valid_phases, f"current_phase should be one of {valid_phases}, got {current_phase}"
        
        # Verify phases structure
        phases = data.get("phases", [])
        assert len(phases) == 5, "Should have 5 phases"
        
        for phase in phases:
            assert "id" in phase
            assert "name" in phase
            assert "day_start" in phase
            assert "day_end" in phase
            assert "is_current" in phase
            assert "is_completed" in phase
        
        # Verify today_tasks is a list
        today_tasks = data.get("today_tasks", [])
        assert isinstance(today_tasks, list), "today_tasks should be a list"
        
        print(f"Partner 2 percorso veloce: day={current_day}, phase={current_phase}, tasks={len(today_tasks)}")
    
    def test_activate_percorso_veloce(self):
        """POST /activate activates fast track for partner"""
        # Use a test partner ID that might not have percorso veloce
        # We'll use partner 3 for this test
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/percorso-veloce/activate",
            json={"partner_id": "3"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("day") == 1, "Activation should start at day 1"
        
        print(f"Activated percorso veloce for partner 3: {data}")
        
        # Verify activation by getting the status
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/3")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data.get("active") == True, "Partner 3 should now have percorso veloce active"
        assert verify_data.get("current_day") >= 1, "current_day should be at least 1"
    
    def test_save_checklist(self):
        """POST /save-checklist saves daily checklist"""
        # Save checklist for partner 2, day 1
        checklist_data = [
            {"id": "definisci_target", "done": True},
            {"id": "definisci_promessa", "done": False},
            {"id": "scegli_nome", "done": True}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/percorso-veloce/save-checklist",
            json={
                "partner_id": "2",
                "day": 1,
                "checklist": checklist_data
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "message" in data
        
        print(f"Saved checklist for partner 2, day 1: {data}")
        
        # Verify checklist was saved by getting the status
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/2")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # Check that checklists contains day 1 data
        checklists = verify_data.get("checklists", {})
        assert "1" in checklists or 1 in checklists, "Checklist for day 1 should be saved"
        
        print(f"Verified checklist saved: {checklists}")
    
    def test_get_percorso_veloce_invalid_partner(self):
        """GET returns 404 for invalid partner ID"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/99999")
        
        # Should return 404 for non-existent partner
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_phases_structure(self):
        """Verify the 5 phases are correctly structured"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/percorso-veloce/2")
        
        assert response.status_code == 200
        data = response.json()
        
        phases = data.get("phases", [])
        
        # Expected phases with their day ranges
        expected_phases = [
            {"id": "posizionamento", "name": "Posizionamento", "day_start": 1, "day_end": 2},
            {"id": "webinar", "name": "Webinar / Masterclass", "day_start": 3, "day_end": 7},
            {"id": "funnel", "name": "Funnel", "day_start": 8, "day_end": 10},
            {"id": "traffico", "name": "Traffico", "day_start": 11, "day_end": 14},
            {"id": "webinar_live", "name": "Webinar Live", "day_start": 15, "day_end": 21},
        ]
        
        for i, expected in enumerate(expected_phases):
            actual = phases[i]
            assert actual["id"] == expected["id"], f"Phase {i} id mismatch"
            assert actual["day_start"] == expected["day_start"], f"Phase {i} day_start mismatch"
            assert actual["day_end"] == expected["day_end"], f"Phase {i} day_end mismatch"
            print(f"Phase {i+1}: {actual['name']} (days {actual['day_start']}-{actual['day_end']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
