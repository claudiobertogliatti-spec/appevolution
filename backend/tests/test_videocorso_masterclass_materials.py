"""
Test suite for Videocorso AI-driven endpoints and Masterclass PDF materials
Iteration 47 - Testing new features:
1. 3 PDF materials for Masterclass (Template Script, Struttura Tipo, Consigli Registrazione)
2. Videocorso AI-driven endpoints (save-inputs, generate-course, approve-course)
3. GET /api/partner-journey/videocorso/{partner_id} returns inputs, course_data, course_approved
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com').rstrip('/')

# Test partner ID (Arianna Aceto - has posizionamento and masterclass data)
TEST_PARTNER_ID = "2"


class TestMasterclassPDFMaterials:
    """Test 3 new PDF materials for Masterclass step"""
    
    def test_template_script_pdf_returns_200(self):
        """GET /api/materials/masterclass/template-script returns PDF (200)"""
        response = requests.get(f"{BASE_URL}/api/materials/masterclass/template-script")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'application/pdf' in response.headers.get('Content-Type', ''), "Expected PDF content type"
        assert len(response.content) > 1000, "PDF content should be substantial"
        print(f"PASS: template-script PDF returned {len(response.content)} bytes")
    
    def test_struttura_tipo_pdf_returns_200(self):
        """GET /api/materials/masterclass/struttura-tipo returns PDF (200)"""
        response = requests.get(f"{BASE_URL}/api/materials/masterclass/struttura-tipo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'application/pdf' in response.headers.get('Content-Type', ''), "Expected PDF content type"
        assert len(response.content) > 1000, "PDF content should be substantial"
        print(f"PASS: struttura-tipo PDF returned {len(response.content)} bytes")
    
    def test_consigli_registrazione_pdf_returns_200(self):
        """GET /api/materials/masterclass/consigli-registrazione returns PDF (200)"""
        response = requests.get(f"{BASE_URL}/api/materials/masterclass/consigli-registrazione")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'application/pdf' in response.headers.get('Content-Type', ''), "Expected PDF content type"
        assert len(response.content) > 1000, "PDF content should be substantial"
        print(f"PASS: consigli-registrazione PDF returned {len(response.content)} bytes")
    
    def test_invalid_material_returns_404(self):
        """Invalid material ID should return 404"""
        response = requests.get(f"{BASE_URL}/api/materials/masterclass/invalid-material")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid material returns 404")


class TestVideocorsoGetEndpoint:
    """Test GET /api/partner-journey/videocorso/{partner_id}"""
    
    def test_get_videocorso_returns_expected_fields(self):
        """GET /api/partner-journey/videocorso/{partner_id} returns inputs, course_data, course_approved"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Expected partner_id={TEST_PARTNER_ID}"
        
        # Check required fields exist
        assert "inputs" in data, "Missing 'inputs' field"
        assert "course_data" in data, "Missing 'course_data' field"
        assert "course_approved" in data, "Missing 'course_approved' field"
        assert "course_generated" in data, "Missing 'course_generated' field"
        
        print(f"PASS: GET videocorso returns all expected fields")
        print(f"  - inputs: {data.get('inputs')}")
        print(f"  - course_generated: {data.get('course_generated')}")
        print(f"  - course_approved: {data.get('course_approved')}")
    
    def test_get_videocorso_inputs_structure(self):
        """Verify inputs structure has durata, include_bonus, contenuti_pronti"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        inputs = data.get("inputs", {})
        
        if inputs:
            # Check expected input fields
            assert "durata" in inputs, "Missing 'durata' in inputs"
            assert "include_bonus" in inputs, "Missing 'include_bonus' in inputs"
            assert "contenuti_pronti" in inputs, "Missing 'contenuti_pronti' in inputs"
            
            # Validate durata value
            assert inputs["durata"] in ["breve", "medio", "avanzato"], f"Invalid durata: {inputs['durata']}"
            
            print(f"PASS: inputs structure is correct: {inputs}")
    
    def test_get_videocorso_course_data_structure(self):
        """Verify course_data has expected structure when generated"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        course_data = data.get("course_data")
        
        if course_data:
            # Check expected course_data fields
            expected_fields = ["titolo", "sottotitolo", "descrizione", "moduli", "prezzo_base", "offerta_lancio", "per_chi_e", "per_chi_non_e"]
            for field in expected_fields:
                assert field in course_data, f"Missing '{field}' in course_data"
            
            # Check moduli structure
            moduli = course_data.get("moduli", [])
            assert len(moduli) > 0, "Expected at least 1 module"
            
            first_module = moduli[0]
            assert "numero" in first_module, "Module missing 'numero'"
            assert "titolo" in first_module, "Module missing 'titolo'"
            assert "lezioni" in first_module, "Module missing 'lezioni'"
            
            # Check lezioni structure
            lezioni = first_module.get("lezioni", [])
            if lezioni:
                first_lesson = lezioni[0]
                assert "numero" in first_lesson, "Lesson missing 'numero'"
                assert "titolo" in first_lesson, "Lesson missing 'titolo'"
                assert "contenuto" in first_lesson, "Lesson missing 'contenuto'"
            
            print(f"PASS: course_data structure is correct with {len(moduli)} modules")
    
    def test_get_videocorso_invalid_partner_returns_404(self):
        """Invalid partner ID should return 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/invalid-partner-999")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid partner returns 404")


class TestVideocorsoSaveInputs:
    """Test POST /api/partner-journey/videocorso/save-inputs"""
    
    def test_save_inputs_success(self):
        """POST /api/partner-journey/videocorso/save-inputs saves preferences"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            "durata": "medio",
            "include_bonus": True,
            "contenuti_pronti": False
        }
        
        response = requests.post(f"{BASE_URL}/api/partner-journey/videocorso/save-inputs", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        
        # Verify inputs were saved by fetching
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        get_data = get_response.json()
        inputs = get_data.get("inputs", {})
        
        assert inputs.get("durata") == "medio", f"Expected durata=medio, got {inputs.get('durata')}"
        assert inputs.get("include_bonus") == True, f"Expected include_bonus=True"
        assert inputs.get("contenuti_pronti") == False, f"Expected contenuti_pronti=False"
        
        print("PASS: save-inputs saves preferences correctly")
    
    def test_save_inputs_all_durata_options(self):
        """Test all 3 durata options: breve, medio, avanzato"""
        for durata in ["breve", "medio", "avanzato"]:
            payload = {
                "partner_id": TEST_PARTNER_ID,
                "durata": durata,
                "include_bonus": True,
                "contenuti_pronti": False
            }
            
            response = requests.post(f"{BASE_URL}/api/partner-journey/videocorso/save-inputs", json=payload)
            assert response.status_code == 200, f"Failed for durata={durata}: {response.text}"
            
            # Verify
            get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
            inputs = get_response.json().get("inputs", {})
            assert inputs.get("durata") == durata, f"Expected durata={durata}"
        
        print("PASS: All durata options (breve, medio, avanzato) work correctly")


class TestVideocorsoGenerateCourse:
    """Test POST /api/partner-journey/videocorso/generate-course"""
    
    def test_generate_course_returns_course_data(self):
        """POST /api/partner-journey/videocorso/generate-course generates full course with AI"""
        # First save inputs
        save_payload = {
            "partner_id": TEST_PARTNER_ID,
            "durata": "medio",
            "include_bonus": True,
            "contenuti_pronti": False
        }
        requests.post(f"{BASE_URL}/api/partner-journey/videocorso/save-inputs", json=save_payload)
        
        # Generate course (this uses AI and may take 5-10 seconds)
        generate_payload = {
            "partner_id": TEST_PARTNER_ID,
            "durata": "medio",
            "include_bonus": True,
            "contenuti_pronti": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/generate-course", 
            json=generate_payload,
            timeout=60  # Allow up to 60 seconds for AI generation
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "course_data" in data, "Missing 'course_data' in response"
        
        course_data = data.get("course_data")
        
        # Verify course structure
        assert "titolo" in course_data, "Missing titolo"
        assert "sottotitolo" in course_data, "Missing sottotitolo"
        assert "descrizione" in course_data, "Missing descrizione"
        assert "moduli" in course_data, "Missing moduli"
        assert "prezzo_base" in course_data, "Missing prezzo_base"
        assert "offerta_lancio" in course_data, "Missing offerta_lancio"
        assert "per_chi_e" in course_data, "Missing per_chi_e"
        assert "per_chi_non_e" in course_data, "Missing per_chi_non_e"
        
        # Verify moduli count based on durata (medio = 4 modules)
        moduli = course_data.get("moduli", [])
        assert len(moduli) >= 3, f"Expected at least 3 modules for medio, got {len(moduli)}"
        
        print(f"PASS: generate-course returns valid course with {len(moduli)} modules")
        print(f"  - Titolo: {course_data.get('titolo')}")
        print(f"  - Prezzo: {course_data.get('prezzo_base')}")


class TestVideocorsoApproveCourse:
    """Test POST /api/partner-journey/videocorso/approve-course"""
    
    def test_approve_course_marks_complete(self):
        """POST /api/partner-journey/videocorso/approve-course marks step complete"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/approve-course",
            params={"partner_id": TEST_PARTNER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        
        # Verify course is now approved
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/{TEST_PARTNER_ID}")
        get_data = get_response.json()
        
        assert get_data.get("course_approved") == True, "Expected course_approved=True after approval"
        
        print("PASS: approve-course marks step complete")
    
    def test_approve_course_without_course_data_fails(self):
        """Approving without generated course should fail"""
        # Use a partner that doesn't have course data
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/videocorso/approve-course",
            params={"partner_id": "999999"}  # Non-existent partner
        )
        
        # Should return 404 (partner not found) or 400 (no course to approve)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        print("PASS: approve-course without course data fails appropriately")


class TestMasterclassFactoryEndpoints:
    """Test masterclass-factory endpoints for completeness"""
    
    def test_get_masterclass_factory_data(self):
        """GET /api/masterclass-factory/{partner_id} returns answers and script data"""
        response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected fields
        assert "partner_id" in data or "answers" in data, "Expected partner data or answers"
        
        print(f"PASS: masterclass-factory GET returns data")


class TestPosizionamentoDataForVideocorso:
    """Verify posizionamento data exists for videocorso generation"""
    
    def test_posizionamento_has_positioning_output(self):
        """Partner 2 should have positioning_output for videocorso AI"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        posizionamento = data.get("posizionamento", {})
        positioning_output = data.get("positioning_output") or posizionamento.get("positioning_output")
        
        assert positioning_output is not None, "Partner 2 should have positioning_output for videocorso AI"
        
        # Check positioning_output structure
        expected_fields = ["sintesi_progetto", "target_ideale", "problema_principale", "risultato_promesso"]
        for field in expected_fields:
            assert field in positioning_output, f"Missing '{field}' in positioning_output"
        
        print(f"PASS: Partner 2 has positioning_output with required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
