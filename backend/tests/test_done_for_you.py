"""
Test Done-for-You Step Status and Webinar APIs
Tests the new proactive UX model with 4 states: in_lavorazione, in_revisione, pronto, approvato
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStepStatusAPI:
    """Tests for GET /api/partner-journey/step-status/{partner_id}"""
    
    def test_get_step_status_partner_2(self):
        """GET step status for partner 2 - should return all step statuses"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/step-status/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "steps" in data["data"]
        
        steps = data["data"]["steps"]
        # Verify all expected step IDs exist
        expected_steps = ["posizionamento", "funnel-light", "masterclass", "videocorso", "funnel", "lancio", "webinar", "email"]
        for step_id in expected_steps:
            assert step_id in steps, f"Missing step: {step_id}"
            assert "status" in steps[step_id], f"Step {step_id} missing status"
        
        print(f"Step statuses for partner 2: {steps}")
    
    def test_get_step_status_invalid_partner(self):
        """GET step status for non-existent partner - should return 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/step-status/99999")
        assert response.status_code == 404


class TestStepStatusUpdate:
    """Tests for POST /api/partner-journey/step-status/update"""
    
    def test_update_step_status_to_in_revisione(self):
        """Update a step to in_revisione status"""
        payload = {
            "partner_id": "2",
            "step_id": "email",
            "status": "in_revisione",
            "notes": "Test note from testing agent"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/update",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("step_id") == "email"
        assert data.get("status") == "in_revisione"
        print("Successfully updated email step to in_revisione")
    
    def test_update_step_status_to_pronto(self):
        """Update a step to pronto status with content"""
        payload = {
            "partner_id": "2",
            "step_id": "email",
            "status": "pronto",
            "content": {"test_key": "test_value"},
            "notes": "Ready for partner review"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/update",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "pronto"
        print("Successfully updated email step to pronto")
    
    def test_update_invalid_step_id(self):
        """Update with invalid step_id should fail"""
        payload = {
            "partner_id": "2",
            "step_id": "invalid-step",
            "status": "pronto"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/update",
            json=payload
        )
        assert response.status_code == 400
        print("Correctly rejected invalid step_id")
    
    def test_update_invalid_status(self):
        """Update with invalid status should fail"""
        payload = {
            "partner_id": "2",
            "step_id": "email",
            "status": "invalid-status"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/update",
            json=payload
        )
        assert response.status_code == 400
        print("Correctly rejected invalid status")


class TestStepApprove:
    """Tests for POST /api/partner-journey/step-status/approve"""
    
    def test_approve_pronto_step(self):
        """Approve a step that is in 'pronto' status"""
        # First ensure funnel-light is pronto (as per agent context)
        # Then try to approve it
        payload = {
            "partner_id": "2",
            "step_id": "funnel-light"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/approve",
            json=payload
        )
        # Should succeed if step is pronto, or return message if already approved
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        data = response.json()
        if response.status_code == 200:
            assert data.get("success") == True
            print(f"Approved funnel-light step: {data}")
        else:
            print(f"Step not ready for approval: {data}")
    
    def test_approve_invalid_step(self):
        """Approve with invalid step_id should fail"""
        payload = {
            "partner_id": "2",
            "step_id": "invalid-step"
        }
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/step-status/approve",
            json=payload
        )
        assert response.status_code == 400
        print("Correctly rejected invalid step_id for approval")


class TestWebinarAPI:
    """Tests for Webinar Done-for-You endpoints"""
    
    def test_get_webinar_partner_2(self):
        """GET webinar data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        # webinar can be null if not yet created
        print(f"Webinar data for partner 2: {data.get('webinar')}")
    
    def test_get_webinar_invalid_partner(self):
        """GET webinar for non-existent partner - should return 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/99999")
        assert response.status_code == 404


class TestFunnelLightAPI:
    """Tests for Funnel Light endpoints"""
    
    def test_get_funnel_light_partner_2(self):
        """GET funnel light data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-light/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Funnel light data: {data.get('funnel_light')}")


class TestMasterclassAPI:
    """Tests for Masterclass endpoints"""
    
    def test_get_masterclass_partner_2(self):
        """GET masterclass data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/masterclass/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Masterclass data: {data.get('masterclass')}")


class TestVideocorsoAPI:
    """Tests for Videocorso endpoints"""
    
    def test_get_videocorso_partner_2(self):
        """GET videocorso data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Videocorso data: course_generated={data.get('course_generated')}")


class TestLancioAPI:
    """Tests for Lancio endpoints"""
    
    def test_get_lancio_partner_2(self):
        """GET lancio data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Lancio data: is_generated={data.get('is_generated')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
