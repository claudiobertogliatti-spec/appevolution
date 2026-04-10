"""
Test suite for Videocorso Update Course feature
Tests the new POST /api/partner-journey/videocorso/update-course endpoint
and verifies the edit structure functionality for approved courses
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com')

class TestVideocorsoUpdateCourse:
    """Tests for the videocorso update-course endpoint"""
    
    def test_get_videocorso_partner_2_returns_course_data(self):
        """GET /api/partner-journey/videocorso/2 should return course_data with 4 modules"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert data.get("partner_id") == "2"
        assert data.get("course_approved") == True
        assert data.get("is_completed") == True
        
        # Verify course_data exists and has modules
        course_data = data.get("course_data")
        assert course_data is not None
        assert "moduli" in course_data
        assert len(course_data["moduli"]) == 4, f"Expected 4 modules, got {len(course_data['moduli'])}"
        
        # Verify each module has required fields
        for i, modulo in enumerate(course_data["moduli"]):
            assert "numero" in modulo, f"Module {i} missing 'numero'"
            assert "titolo" in modulo, f"Module {i} missing 'titolo'"
            assert "lezioni" in modulo, f"Module {i} missing 'lezioni'"
            assert len(modulo["lezioni"]) > 0, f"Module {i} has no lessons"
    
    def test_update_course_endpoint_exists(self):
        """POST /api/partner-journey/videocorso/update-course should accept valid request"""
        # Get current course data first
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        original_data = get_response.json().get("course_data")
        
        # Update with same data (no actual change)
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "partner_id": "2",
                "course_data": original_data
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Struttura videocorso aggiornata"
    
    def test_update_course_adds_module(self):
        """POST /api/partner-journey/videocorso/update-course should allow adding a module"""
        # Get current course data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        course_data = get_response.json().get("course_data")
        original_module_count = len(course_data.get("moduli", []))
        
        # Add a new module
        new_module = {
            "numero": original_module_count + 1,
            "titolo": "TEST_Modulo Aggiunto",
            "obiettivo": "Test obiettivo",
            "lezioni": [
                {"numero": f"{original_module_count + 1}.1", "titolo": "TEST_Lezione 1", "durata": "5-10 min", "contenuto": ["Test contenuto"]}
            ]
        }
        course_data["moduli"].append(new_module)
        
        # Update
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "partner_id": "2",
                "course_data": course_data
            }
        )
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify the module was added
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert verify_response.status_code == 200
        updated_data = verify_response.json().get("course_data")
        assert len(updated_data.get("moduli", [])) == original_module_count + 1
        
        # Cleanup: remove the test module
        updated_data["moduli"] = [m for m in updated_data["moduli"] if not m.get("titolo", "").startswith("TEST_")]
        requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": updated_data}
        )
    
    def test_update_course_adds_lesson(self):
        """POST /api/partner-journey/videocorso/update-course should allow adding a lesson to a module"""
        # Get current course data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        course_data = get_response.json().get("course_data")
        
        if not course_data.get("moduli"):
            pytest.skip("No modules to add lesson to")
        
        original_lesson_count = len(course_data["moduli"][0].get("lezioni", []))
        
        # Add a new lesson to first module
        new_lesson = {
            "numero": f"1.{original_lesson_count + 1}",
            "titolo": "TEST_Lezione Aggiunta",
            "durata": "5-10 min",
            "contenuto": ["Test contenuto"]
        }
        course_data["moduli"][0]["lezioni"].append(new_lesson)
        
        # Update
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "partner_id": "2",
                "course_data": course_data
            }
        )
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify the lesson was added
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert verify_response.status_code == 200
        updated_data = verify_response.json().get("course_data")
        assert len(updated_data["moduli"][0].get("lezioni", [])) == original_lesson_count + 1
        
        # Cleanup: remove the test lesson
        updated_data["moduli"][0]["lezioni"] = [l for l in updated_data["moduli"][0]["lezioni"] if not l.get("titolo", "").startswith("TEST_")]
        requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": updated_data}
        )
    
    def test_update_course_removes_module(self):
        """POST /api/partner-journey/videocorso/update-course should allow removing a module"""
        # Get current course data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        course_data = get_response.json().get("course_data")
        original_module_count = len(course_data.get("moduli", []))
        
        if original_module_count < 2:
            pytest.skip("Need at least 2 modules to test removal")
        
        # Store original data for restoration
        original_course_data = course_data.copy()
        original_course_data["moduli"] = course_data["moduli"].copy()
        
        # Remove last module
        course_data["moduli"] = course_data["moduli"][:-1]
        
        # Update
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "partner_id": "2",
                "course_data": course_data
            }
        )
        
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify the module was removed
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert verify_response.status_code == 200
        updated_data = verify_response.json().get("course_data")
        assert len(updated_data.get("moduli", [])) == original_module_count - 1
        
        # Restore original data
        requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": original_course_data}
        )
    
    def test_update_course_invalid_partner_returns_404(self):
        """POST /api/partner-journey/videocorso/update-course with invalid partner should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "partner_id": "99999",
                "course_data": {"titolo": "Test", "moduli": []}
            }
        )
        
        assert response.status_code == 404
    
    def test_update_course_missing_partner_id_returns_422(self):
        """POST /api/partner-journey/videocorso/update-course without partner_id should return 422"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={
                "course_data": {"titolo": "Test", "moduli": []}
            }
        )
        
        assert response.status_code == 422


class TestVideocorsoEndpointIntegrity:
    """Tests to verify the videocorso endpoints work correctly together"""
    
    def test_course_data_persists_after_update(self):
        """Verify that course_data changes persist in the database"""
        # Get current data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        original_data = get_response.json().get("course_data")
        
        # Modify title
        modified_data = original_data.copy()
        modified_data["titolo"] = "TEST_Titolo Modificato"
        
        # Update
        update_response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": modified_data}
        )
        assert update_response.status_code == 200
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert verify_response.status_code == 200
        assert verify_response.json().get("course_data", {}).get("titolo") == "TEST_Titolo Modificato"
        
        # Restore original
        requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": original_data}
        )
    
    def test_course_approved_status_preserved_after_update(self):
        """Verify that course_approved status is preserved after update"""
        # Get current data
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert get_response.status_code == 200
        data = get_response.json()
        original_approved = data.get("course_approved")
        course_data = data.get("course_data")
        
        # Update course data
        update_response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/update-course",
            json={"partner_id": "2", "course_data": course_data}
        )
        assert update_response.status_code == 200
        
        # Verify approved status is preserved
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert verify_response.status_code == 200
        assert verify_response.json().get("course_approved") == original_approved


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
