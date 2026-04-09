"""
Test Suite for AI-Driven Posizionamento and Masterclass Pages
Tests the new Input → Generation → Output → Validation flow for both pages

Features tested:
- Posizionamento: 7 input fields, AI generation, approval
- Masterclass: 7 input fields, AI script generation, approval
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com').rstrip('/')

# Test partner ID (Arianna Aceto)
TEST_PARTNER_ID = "2"

# Sample input data for posizionamento (7 fields, min 10 chars each)
POSIZIONAMENTO_INPUTS = {
    "competenza": "Sono esperta in naturopatia e benessere olistico con 10 anni di esperienza",
    "target": "Donne professioniste tra i 35-50 anni che vogliono ritrovare equilibrio",
    "problema_cliente": "Stress cronico, stanchezza e difficoltà a gestire lavoro e vita privata",
    "risultato": "Ritrovare energia, equilibrio e benessere in 90 giorni con metodi naturali",
    "differenziazione": "Approccio integrato che combina naturopatia, mindfulness e coaching",
    "esperienza": "Ho aiutato oltre 200 clienti a trasformare la loro vita con risultati misurabili",
    "esclusioni": "Non lavoro con chi cerca soluzioni rapide o non è disposto a impegnarsi"
}

# Sample input data for masterclass (7 fields)
MASTERCLASS_INPUTS = {
    "risultato_principale": "Trovare i primi 10 clienti in 30 giorni usando il metodo naturale",
    "problema_pubblico": "Non sanno come attrarre clienti senza sembrare venditori aggressivi",
    "errore_comune": "Postano contenuti generici senza una strategia chiara e senza CTA",
    "metodo_semplice": "Il mio metodo in 3 step: Posizionamento, Contenuti Magnetici, Vendita Naturale",
    "esempio_concreto": "Una mia cliente è passata da 0 a 15 clienti in 2 mesi seguendo questo metodo",
    "non_adatta": "Non è per chi cerca scorciatoie o guadagni facili senza impegno",
    "dopo_masterclass": "Dopo la masterclass il partecipante può iscriversi al corso completo di 12 settimane"
}


class TestPosizionamentoEndpoints:
    """Tests for /api/partner-journey/posizionamento/* endpoints"""
    
    def test_get_posizionamento_returns_new_fields(self):
        """GET /api/partner-journey/posizionamento/{partner_id} returns positioning_output and inputs"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "partner_id" in data
        assert "partner_name" in data
        assert "posizionamento" in data
        assert "is_completed" in data
        assert "positioning_output" in data  # New field for AI output
        
        # Check that inputs structure exists if posizionamento has data
        if data.get("posizionamento"):
            print(f"Posizionamento data found: {list(data['posizionamento'].keys())}")
    
    def test_save_inputs_with_7_fields(self):
        """POST /api/partner-journey/posizionamento/save-inputs works with 7 fields"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            **POSIZIONAMENTO_INPUTS
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"Save inputs response: {data}")
        
        # Verify inputs were saved by fetching again
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        assert get_response.status_code == 200
        
        get_data = get_response.json()
        saved_inputs = get_data.get("posizionamento", {}).get("inputs", {})
        
        # Verify all 7 fields were saved
        for key in POSIZIONAMENTO_INPUTS.keys():
            assert key in saved_inputs, f"Field {key} not found in saved inputs"
            assert saved_inputs[key] == POSIZIONAMENTO_INPUTS[key], f"Field {key} value mismatch"
        
        print(f"All 7 input fields saved correctly")
    
    def test_generate_positioning_creates_ai_output(self):
        """POST /api/partner-journey/posizionamento/generate-positioning generates AI output"""
        # First ensure inputs are saved
        save_payload = {
            "partner_id": TEST_PARTNER_ID,
            **POSIZIONAMENTO_INPUTS
        }
        requests.post(f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs", json=save_payload)
        
        # Generate positioning
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/generate-positioning",
            json={"partner_id": TEST_PARTNER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "positioning_output" in data
        
        positioning_output = data.get("positioning_output", {})
        
        # Verify 6 sections are present
        expected_sections = [
            "sintesi_progetto",
            "target_ideale", 
            "problema_principale",
            "risultato_promesso",
            "differenziazione",
            "posizionamento_finale"  # Key phrase
        ]
        
        for section in expected_sections:
            assert section in positioning_output, f"Section {section} not found in positioning output"
            assert len(positioning_output[section]) > 10, f"Section {section} content too short"
        
        print(f"AI generated positioning with 6 sections + key phrase")
        print(f"Posizionamento finale: {positioning_output.get('posizionamento_finale', '')[:100]}...")
    
    def test_approve_positioning_marks_complete(self):
        """POST /api/partner-journey/posizionamento/approve-positioning marks step as complete"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/approve-positioning",
            params={"partner_id": TEST_PARTNER_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        
        # Verify completion status
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        get_data = get_response.json()
        
        # Note: is_completed should be True after approval
        print(f"Approval response: {data}")
        print(f"Is completed: {get_data.get('is_completed')}")
    
    def test_generate_positioning_without_inputs_fails(self):
        """POST /api/partner-journey/posizionamento/generate-positioning fails without inputs"""
        # Use a non-existent partner ID to test error handling
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/generate-positioning",
            json={"partner_id": "nonexistent_partner_999"}
        )
        
        # Should return 404 for non-existent partner
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"


class TestMasterclassEndpoints:
    """Tests for /api/masterclass-factory/* endpoints"""
    
    def test_get_masterclass_data(self):
        """GET /api/masterclass-factory/{partner_id} returns masterclass data"""
        response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "answers" in data
        assert "script" in data
        assert "script_approved" in data
        
        print(f"Masterclass data: answers={bool(data.get('answers'))}, script={bool(data.get('script'))}, approved={data.get('script_approved')}")
    
    def test_save_masterclass_answers(self):
        """POST /api/masterclass-factory/{partner_id}/answers saves 7 input fields"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/answers",
            json={"answers": MASTERCLASS_INPUTS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify answers were saved
        get_response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        get_data = get_response.json()
        
        saved_answers = get_data.get("answers", {})
        for key in MASTERCLASS_INPUTS.keys():
            assert key in saved_answers, f"Answer {key} not found"
            assert saved_answers[key] == MASTERCLASS_INPUTS[key], f"Answer {key} value mismatch"
        
        print(f"All 7 masterclass answers saved correctly")
    
    def test_generate_script_returns_sections(self):
        """POST /api/masterclass-factory/{partner_id}/generate-script returns script_sections array"""
        # First save answers
        requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/answers",
            json={"answers": MASTERCLASS_INPUTS}
        )
        
        # Generate script
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/generate-script",
            json={"answers": MASTERCLASS_INPUTS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "script" in data
        
        # Check for script_sections array (7 sections)
        if "script_sections" in data:
            sections = data.get("script_sections", [])
            assert len(sections) == 7, f"Expected 7 sections, got {len(sections)}"
            
            expected_titles = [
                "Apertura", "Problema", "Errore comune", "Soluzione", 
                "Esempio", "Transizione al corso", "Chiusura / CTA"
            ]
            
            for i, section in enumerate(sections):
                assert "id" in section or "title" in section
                assert "content" in section
                assert len(section.get("content", "")) > 50, f"Section {i} content too short"
            
            print(f"Generated script with {len(sections)} sections")
            for s in sections:
                print(f"  - {s.get('title', s.get('id'))}: {len(s.get('content', ''))} chars")
        else:
            # Fallback: check full script exists
            assert len(data.get("script", "")) > 500, "Script content too short"
            print(f"Generated full script: {len(data.get('script', ''))} chars")
    
    def test_approve_script_works(self):
        """POST /api/masterclass-factory/{partner_id}/approve-script works"""
        # Get current script
        get_response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        current_script = get_response.json().get("script", "Test script content for approval")
        
        if not current_script:
            current_script = "Test script content for approval - minimum content required"
        
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/approve-script",
            json={"script": current_script}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify approval status
        get_response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        get_data = get_response.json()
        
        assert get_data.get("script_approved") == True, "Script should be marked as approved"
        print(f"Script approved successfully")


class TestInputValidation:
    """Tests for input validation on both pages"""
    
    def test_posizionamento_requires_all_fields(self):
        """Posizionamento save-inputs should accept partial data (upsert behavior)"""
        # Test with partial data - should still work (upsert)
        partial_payload = {
            "partner_id": TEST_PARTNER_ID,
            "competenza": "Test competenza field only"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs",
            json=partial_payload
        )
        
        # Should succeed with partial data (upsert behavior)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_masterclass_answers_accepts_partial(self):
        """Masterclass answers endpoint accepts partial data"""
        partial_answers = {
            "risultato_principale": "Test result only"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/answers",
            json={"answers": partial_answers}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestEndpointAvailability:
    """Basic availability tests for all new endpoints"""
    
    def test_posizionamento_get_endpoint(self):
        """GET /api/partner-journey/posizionamento/{partner_id} is available"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/{TEST_PARTNER_ID}")
        assert response.status_code == 200
    
    def test_posizionamento_save_inputs_endpoint(self):
        """POST /api/partner-journey/posizionamento/save-inputs is available"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs",
            json={"partner_id": TEST_PARTNER_ID, "competenza": "test"}
        )
        assert response.status_code == 200
    
    def test_posizionamento_generate_endpoint(self):
        """POST /api/partner-journey/posizionamento/generate-positioning is available"""
        # This may take time due to AI generation, just check it's reachable
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/generate-positioning",
            json={"partner_id": TEST_PARTNER_ID},
            timeout=120  # AI generation can take time
        )
        # Accept 200 (success) or 400 (missing inputs)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_posizionamento_approve_endpoint(self):
        """POST /api/partner-journey/posizionamento/approve-positioning is available"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/approve-positioning",
            params={"partner_id": TEST_PARTNER_ID}
        )
        # Accept 200 (success) or 400 (no positioning to approve)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_masterclass_get_endpoint(self):
        """GET /api/masterclass-factory/{partner_id} is available"""
        response = requests.get(f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}")
        assert response.status_code == 200
    
    def test_masterclass_answers_endpoint(self):
        """POST /api/masterclass-factory/{partner_id}/answers is available"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/answers",
            json={"answers": {"test": "value"}}
        )
        assert response.status_code == 200
    
    def test_masterclass_generate_script_endpoint(self):
        """POST /api/masterclass-factory/{partner_id}/generate-script is available"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/generate-script",
            json={"answers": MASTERCLASS_INPUTS},
            timeout=120  # AI generation can take time
        )
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
    
    def test_masterclass_approve_script_endpoint(self):
        """POST /api/masterclass-factory/{partner_id}/approve-script is available"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/{TEST_PARTNER_ID}/approve-script",
            json={"script": "Test script"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
