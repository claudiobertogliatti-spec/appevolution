"""
Partner Journey API Tests
Tests for the new partner journey router endpoints:
- GET /api/partner-journey/progress/{partner_id}
- GET /api/partner-journey/posizionamento/{partner_id}
- POST /api/partner-journey/posizionamento/save-step
- GET /api/partner-journey/masterclass/{partner_id}
- GET /api/partner-journey/funnel/{partner_id}
- GET /api/partner-journey/lancio/{partner_id}
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test partner ID (Marco Ferretti - exists in database)
TEST_PARTNER_ID = "1"
INVALID_PARTNER_ID = "nonexistent_partner_999"


class TestPartnerJourneyProgress:
    """Tests for GET /api/partner-journey/progress/{partner_id}"""
    
    def test_get_progress_success(self):
        """Test getting progress for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/progress/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "partner_name" in data, "Response should include partner_name"
        assert "current_step" in data, "Response should include current_step"
        assert "progress" in data, "Response should include progress object"
        
        # Verify progress structure
        progress = data.get("progress", {})
        assert "posizionamento" in progress, "Progress should include posizionamento"
        assert "masterclass" in progress, "Progress should include masterclass"
        assert "videocorso" in progress, "Progress should include videocorso"
        assert "funnel" in progress, "Progress should include funnel"
        assert "lancio" in progress, "Progress should include lancio"
        
        print(f"✅ GET /api/partner-journey/progress/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   Partner: {data.get('partner_name')}, Current Step: {data.get('current_step')}")
    
    def test_get_progress_invalid_partner(self):
        """Test getting progress for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/progress/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/progress/{INVALID_PARTNER_ID} - Returns 404 as expected")


class TestPartnerJourneyPosizionamento:
    """Tests for posizionamento endpoints"""
    
    def test_get_posizionamento_success(self):
        """Test getting posizionamento data for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "partner_name" in data, "Response should include partner_name"
        assert "posizionamento" in data, "Response should include posizionamento object"
        assert "is_completed" in data, "Response should include is_completed flag"
        assert "course_structure" in data, "Response should include course_structure"
        
        print(f"✅ GET /api/partner-journey/posizionamento/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   Partner: {data.get('partner_name')}, Completed: {data.get('is_completed')}")
    
    def test_get_posizionamento_invalid_partner(self):
        """Test getting posizionamento for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/posizionamento/{INVALID_PARTNER_ID} - Returns 404 as expected")
    
    def test_save_step_success(self):
        """Test saving a posizionamento wizard step"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            "step_number": 1,
            "content": "Test content for step 1 - Studente ideale: Coach e consulenti che vogliono trovare clienti online."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-step",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("step") == 1, "Response should confirm step number"
        assert "field" in data, "Response should include field name"
        assert "message" in data, "Response should include message"
        
        print(f"✅ POST /api/partner-journey/posizionamento/save-step - SUCCESS")
        print(f"   Step: {data.get('step')}, Field: {data.get('field')}")
    
    def test_save_step_invalid_step_number(self):
        """Test saving with invalid step number returns 400"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            "step_number": 10,  # Invalid - only 1-5 allowed
            "content": "Test content"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-step",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ POST /api/partner-journey/posizionamento/save-step (invalid step) - Returns 400 as expected")
    
    def test_save_step_invalid_partner(self):
        """Test saving step for non-existent partner returns 404"""
        payload = {
            "partner_id": INVALID_PARTNER_ID,
            "step_number": 1,
            "content": "Test content"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-step",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ POST /api/partner-journey/posizionamento/save-step (invalid partner) - Returns 404 as expected")
    
    def test_save_multiple_steps(self):
        """Test saving multiple wizard steps"""
        steps_data = [
            {"step_number": 2, "content": "Test obiettivo: Trovare i primi 10 clienti per il proprio business."},
            {"step_number": 3, "content": "Test trasformazione: Prima confuso, dopo ha un sistema chiaro."},
            {"step_number": 4, "content": "Test metodo: Metodo 3C - Chiarezza, Contatti, Conversione."},
            {"step_number": 5, "content": "Test obiezioni: Non ho tempo, non sono esperto, ho già provato."}
        ]
        
        for step in steps_data:
            payload = {
                "partner_id": TEST_PARTNER_ID,
                "step_number": step["step_number"],
                "content": step["content"]
            }
            
            response = requests.post(
                f"{BASE_URL}/api/partner-journey/posizionamento/save-step",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 200, f"Step {step['step_number']} failed: {response.text}"
        
        print(f"✅ POST /api/partner-journey/posizionamento/save-step (steps 2-5) - All saved successfully")


class TestPartnerJourneyMasterclass:
    """Tests for GET /api/partner-journey/masterclass/{partner_id}"""
    
    def test_get_masterclass_success(self):
        """Test getting masterclass data for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/masterclass/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "masterclass" in data, "Response should include masterclass object"
        assert "script_completed" in data, "Response should include script_completed flag"
        assert "video_uploaded" in data, "Response should include video_uploaded flag"
        assert "video_approved" in data, "Response should include video_approved flag"
        
        print(f"✅ GET /api/partner-journey/masterclass/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   Script: {data.get('script_completed')}, Video: {data.get('video_uploaded')}, Approved: {data.get('video_approved')}")
    
    def test_get_masterclass_invalid_partner(self):
        """Test getting masterclass for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/masterclass/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/masterclass/{INVALID_PARTNER_ID} - Returns 404 as expected")


class TestPartnerJourneyFunnel:
    """Tests for GET /api/partner-journey/funnel/{partner_id}"""
    
    def test_get_funnel_success(self):
        """Test getting funnel data for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "funnel" in data, "Response should include funnel object"
        assert "is_generated" in data, "Response should include is_generated flag"
        assert "is_published" in data, "Response should include is_published flag"
        
        print(f"✅ GET /api/partner-journey/funnel/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   Generated: {data.get('is_generated')}, Published: {data.get('is_published')}")
    
    def test_get_funnel_invalid_partner(self):
        """Test getting funnel for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/funnel/{INVALID_PARTNER_ID} - Returns 404 as expected")


class TestPartnerJourneyLancio:
    """Tests for GET /api/partner-journey/lancio/{partner_id}"""
    
    def test_get_lancio_success(self):
        """Test getting lancio status for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "system_checks" in data, "Response should include system_checks object"
        assert "all_ready" in data, "Response should include all_ready flag"
        assert "is_launched" in data, "Response should include is_launched flag"
        
        # Verify system_checks structure
        system_checks = data.get("system_checks", {})
        assert "masterclass_completata" in system_checks, "system_checks should include masterclass_completata"
        assert "videocorso_completato" in system_checks, "system_checks should include videocorso_completato"
        assert "funnel_approvato" in system_checks, "system_checks should include funnel_approvato"
        assert "email_attive" in system_checks, "system_checks should include email_attive"
        
        print(f"✅ GET /api/partner-journey/lancio/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   All Ready: {data.get('all_ready')}, Launched: {data.get('is_launched')}")
        print(f"   System Checks: {system_checks}")
    
    def test_get_lancio_invalid_partner(self):
        """Test getting lancio for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/lancio/{INVALID_PARTNER_ID} - Returns 404 as expected")


class TestPartnerJourneyVideocorso:
    """Tests for GET /api/partner-journey/videocorso/{partner_id}"""
    
    def test_get_videocorso_success(self):
        """Test getting videocorso data for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Partner ID should be {TEST_PARTNER_ID}"
        assert "lessons_status" in data, "Response should include lessons_status"
        assert "is_completed" in data, "Response should include is_completed flag"
        
        print(f"✅ GET /api/partner-journey/videocorso/{TEST_PARTNER_ID} - SUCCESS")
        print(f"   Completed: {data.get('is_completed')}")
    
    def test_get_videocorso_invalid_partner(self):
        """Test getting videocorso for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{INVALID_PARTNER_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ GET /api/partner-journey/videocorso/{INVALID_PARTNER_ID} - Returns 404 as expected")


class TestPartnerJourneyDataPersistence:
    """Tests to verify data persistence after save operations"""
    
    def test_save_and_verify_posizionamento_step(self):
        """Test that saved step data persists and can be retrieved"""
        unique_content = f"TEST_PERSISTENCE_{uuid.uuid4().hex[:8]}_Studente ideale test content"
        
        # Save step 1
        save_payload = {
            "partner_id": TEST_PARTNER_ID,
            "step_number": 1,
            "content": unique_content
        }
        
        save_response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-step",
            json=save_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        # Verify by getting posizionamento data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        assert get_response.status_code == 200, f"Get failed: {get_response.text}"
        
        data = get_response.json()
        posizionamento = data.get("posizionamento", {})
        
        # Check if the saved content is in the response
        saved_value = posizionamento.get("step_1_studente_ideale", "")
        assert unique_content in saved_value or saved_value == unique_content, \
            f"Saved content not found. Expected: {unique_content}, Got: {saved_value}"
        
        print(f"✅ Data persistence verified - Step 1 content saved and retrieved correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
