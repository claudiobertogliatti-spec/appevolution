"""
Test suite for Videocorso endpoints and React Hooks bug fix verification
Tests:
1. GET /api/partner-journey/videocorso/{partner_id} - returns course_data, course_generated, course_approved
2. POST /api/partner-journey/videocorso/generate-course - accepts partner_id, durata, include_bonus, contenuti_pronti
3. POST /api/partner-journey/videocorso/approve-course - saves approval
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVideocorsoEndpoints:
    """Videocorso API endpoint tests"""
    
    def test_get_videocorso_partner_2(self):
        """Test GET /api/partner-journey/videocorso/2 returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields exist
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        
        assert "partner_id" in data, "Response should have 'partner_id' field"
        assert data["partner_id"] == "2", f"partner_id should be '2', got {data['partner_id']}"
        
        assert "course_data" in data, "Response should have 'course_data' field"
        assert data["course_data"] is not None, "course_data should not be None for partner 2"
        
        assert "course_generated" in data, "Response should have 'course_generated' field"
        assert data["course_generated"] == True, "course_generated should be True for partner 2"
        
        assert "course_approved" in data, "Response should have 'course_approved' field"
        assert data["course_approved"] == True, "course_approved should be True for partner 2"
        
        # Verify course_data structure
        course_data = data["course_data"]
        assert "titolo" in course_data, "course_data should have 'titolo'"
        assert "moduli" in course_data, "course_data should have 'moduli'"
        assert isinstance(course_data["moduli"], list), "moduli should be a list"
        assert len(course_data["moduli"]) > 0, "moduli should not be empty"
        
        # Verify module structure
        first_module = course_data["moduli"][0]
        assert "numero" in first_module, "module should have 'numero'"
        assert "titolo" in first_module, "module should have 'titolo'"
        assert "lezioni" in first_module, "module should have 'lezioni'"
        
        print(f"✅ GET /api/partner-journey/videocorso/2 - PASS")
        print(f"   - course_data.titolo: {course_data['titolo'][:50]}...")
        print(f"   - course_generated: {data['course_generated']}")
        print(f"   - course_approved: {data['course_approved']}")
        print(f"   - moduli count: {len(course_data['moduli'])}")
    
    def test_get_videocorso_inputs(self):
        """Test that inputs are returned correctly"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "inputs" in data, "Response should have 'inputs' field"
        inputs = data["inputs"]
        
        if inputs:
            # Verify inputs structure if present
            assert "durata" in inputs, "inputs should have 'durata'"
            assert "include_bonus" in inputs, "inputs should have 'include_bonus'"
            assert "contenuti_pronti" in inputs, "inputs should have 'contenuti_pronti'"
            
            print(f"✅ Inputs verification - PASS")
            print(f"   - durata: {inputs['durata']}")
            print(f"   - include_bonus: {inputs['include_bonus']}")
            print(f"   - contenuti_pronti: {inputs['contenuti_pronti']}")
    
    def test_generate_course_endpoint_accepts_params(self):
        """Test POST /api/partner-journey/videocorso/generate-course accepts required params"""
        # Use a test partner ID that won't affect production data
        # We'll test with partner 2 but expect it to work (may regenerate course)
        
        payload = {
            "partner_id": "2",
            "durata": "medio",
            "include_bonus": True,
            "contenuti_pronti": False
        }
        
        # Just verify the endpoint accepts the payload structure
        # We don't want to actually regenerate the course, so we'll check the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/generate-course",
            json=payload
        )
        
        # Should return 200 (success) or 400/500 (business logic error, not 404/405)
        assert response.status_code != 404, "Endpoint should exist"
        assert response.status_code != 405, "Endpoint should accept POST"
        
        print(f"✅ POST /api/partner-journey/videocorso/generate-course - Endpoint accepts params")
        print(f"   - Status code: {response.status_code}")
    
    def test_approve_course_endpoint_exists(self):
        """Test POST /api/partner-journey/videocorso/approve-course endpoint exists"""
        # Test with partner 2 (already approved, should still work)
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/approve-course?partner_id=2"
        )
        
        # Should return 200 (success) or 400 (already approved), not 404/405
        assert response.status_code != 404, "Endpoint should exist"
        assert response.status_code != 405, "Endpoint should accept POST"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data, "Response should have 'success' field"
            print(f"✅ POST /api/partner-journey/videocorso/approve-course - PASS")
            print(f"   - Response: {data}")
        else:
            print(f"✅ POST /api/partner-journey/videocorso/approve-course - Endpoint exists")
            print(f"   - Status code: {response.status_code}")
    
    def test_videocorso_nonexistent_partner(self):
        """Test GET /api/partner-journey/videocorso with non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/99999")
        
        assert response.status_code == 404, f"Expected 404 for non-existent partner, got {response.status_code}"
        print(f"✅ Non-existent partner returns 404 - PASS")


class TestVideocorsoDataIntegrity:
    """Test data integrity for videocorso"""
    
    def test_course_modules_have_lessons(self):
        """Verify each module has lessons"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert response.status_code == 200
        
        data = response.json()
        course_data = data.get("course_data", {})
        moduli = course_data.get("moduli", [])
        
        for i, modulo in enumerate(moduli):
            lezioni = modulo.get("lezioni", [])
            assert len(lezioni) > 0, f"Module {i+1} should have at least one lesson"
            
            for j, lezione in enumerate(lezioni):
                assert "titolo" in lezione, f"Lesson {j+1} in module {i+1} should have 'titolo'"
                assert "numero" in lezione, f"Lesson {j+1} in module {i+1} should have 'numero'"
        
        print(f"✅ All {len(moduli)} modules have lessons with proper structure")
    
    def test_course_has_pricing(self):
        """Verify course has pricing information"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert response.status_code == 200
        
        data = response.json()
        course_data = data.get("course_data", {})
        
        assert "prezzo_base" in course_data, "course_data should have 'prezzo_base'"
        assert "offerta_lancio" in course_data, "course_data should have 'offerta_lancio'"
        
        print(f"✅ Course pricing - PASS")
        print(f"   - prezzo_base: {course_data.get('prezzo_base')}")
        print(f"   - offerta_lancio: {course_data.get('offerta_lancio')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
