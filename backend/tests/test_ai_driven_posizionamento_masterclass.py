"""
Test AI-Driven Posizionamento and Masterclass Pages
Tests for the new AI-driven flow:
- PosizionamentoPage: 7 inputs → GENERA POSIZIONAMENTO → 6 sections output → APPROVA
- MasterclassPage: 7 inputs → GENERA SCRIPT → 7 script sections → APPROVA SCRIPT
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data for posizionamento
POSIZIONAMENTO_INPUTS = {
    "partner_id": "2",
    "competenza": "Coaching per imprenditori digitali e formazione su marketing online",
    "target": "Imprenditori e professionisti che vogliono lanciare il loro business online",
    "problema_cliente": "Non sanno come posizionarsi nel mercato e attrarre clienti ideali",
    "risultato": "Avere un posizionamento chiaro e una strategia per attrarre clienti in modo costante",
    "differenziazione": "Metodo pratico basato su 10 anni di esperienza nel digital marketing",
    "esperienza": "Ho aiutato oltre 100 imprenditori a lanciare il loro business online con successo",
    "esclusioni": "Non lavoro con chi cerca scorciatoie o guadagni facili senza impegno"
}

# Test data for masterclass
MASTERCLASS_ANSWERS = {
    "risultato_principale": "Trovare i primi 10 clienti in 30 giorni usando strategie di marketing digitale",
    "problema_pubblico": "Non sanno come trovare clienti online e perdono tempo con strategie inefficaci",
    "errore_comune": "Postano contenuti senza strategia e senza una CTA chiara, sperando che i clienti arrivino da soli",
    "metodo_semplice": "Il mio metodo in 3 step: Posizionamento chiaro, Contenuti strategici, Sistema di vendita automatizzato",
    "esempio_concreto": "Un mio cliente è passato da 0 a 15 clienti in 2 mesi seguendo questo metodo",
    "non_adatta": "Non è per chi cerca scorciatoie o guadagni facili senza impegno",
    "dopo_masterclass": "Dopo la masterclass il partecipante può iscriversi al corso completo per implementare tutto il sistema"
}


class TestPosizionamentoEndpoints:
    """Tests for Posizionamento AI-driven endpoints"""
    
    def test_save_posizionamento_inputs(self):
        """Test POST /api/partner-journey/posizionamento/save-inputs saves 7 fields"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs",
            json=POSIZIONAMENTO_INPUTS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "message" in data
    
    def test_get_posizionamento_returns_inputs(self):
        """Test GET /api/partner-journey/posizionamento/{partner_id} returns inputs"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "partner_id" in data
        assert "posizionamento" in data
        
        # Verify inputs are saved
        posizionamento = data.get("posizionamento", {})
        inputs = posizionamento.get("inputs", {})
        assert inputs.get("competenza") is not None
        assert inputs.get("target") is not None
        assert inputs.get("problema_cliente") is not None
        assert inputs.get("risultato") is not None
        assert inputs.get("differenziazione") is not None
        assert inputs.get("esperienza") is not None
        assert inputs.get("esclusioni") is not None
    
    def test_generate_positioning_returns_6_sections(self):
        """Test POST /api/partner-journey/posizionamento/generate-positioning generates AI output with 6 sections"""
        # First save inputs
        requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/save-inputs",
            json=POSIZIONAMENTO_INPUTS
        )
        
        # Generate positioning (AI call - may take 5-10 seconds)
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/generate-positioning",
            json={"partner_id": "2"},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        assert "positioning_output" in data
        
        # Verify 6 sections in output
        output = data.get("positioning_output", {})
        expected_sections = [
            "sintesi_progetto",
            "target_ideale",
            "problema_principale",
            "risultato_promesso",
            "differenziazione",
            "posizionamento_finale"
        ]
        for section in expected_sections:
            assert section in output, f"Missing section: {section}"
            assert len(output[section]) > 10, f"Section {section} is too short"
    
    def test_approve_positioning_marks_complete(self):
        """Test POST /api/partner-journey/posizionamento/approve-positioning marks step complete"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/approve-positioning?partner_id=2"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Verify completion via GET
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/2")
        get_data = get_response.json()
        assert get_data.get("is_completed") is True
    
    def test_get_posizionamento_returns_positioning_output(self):
        """Test GET /api/partner-journey/posizionamento/{partner_id} returns positioning_output"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/2")
        assert response.status_code == 200
        data = response.json()
        
        # Verify positioning_output is returned
        assert "positioning_output" in data
        output = data.get("positioning_output", {})
        assert "posizionamento_finale" in output


class TestMasterclassEndpoints:
    """Tests for Masterclass Factory AI-driven endpoints"""
    
    def test_save_masterclass_answers(self):
        """Test POST /api/masterclass-factory/{partner_id}/answers saves 7 answers"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/2/answers",
            json={"answers": MASTERCLASS_ANSWERS}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
    
    def test_get_masterclass_returns_answers(self):
        """Test GET /api/masterclass-factory/{partner_id} returns saved answers"""
        # First save answers
        requests.post(
            f"{BASE_URL}/api/masterclass-factory/2/answers",
            json={"answers": MASTERCLASS_ANSWERS}
        )
        
        response = requests.get(f"{BASE_URL}/api/masterclass-factory/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify answers are returned
        answers = data.get("answers", {})
        assert answers.get("risultato_principale") is not None
        assert answers.get("problema_pubblico") is not None
        assert answers.get("errore_comune") is not None
        assert answers.get("metodo_semplice") is not None
        assert answers.get("esempio_concreto") is not None
        assert answers.get("non_adatta") is not None
        assert answers.get("dopo_masterclass") is not None
    
    def test_generate_script_returns_7_sections(self):
        """Test POST /api/masterclass-factory/{partner_id}/generate-script returns script_sections array with 7 sections"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/2/generate-script",
            json={"answers": MASTERCLASS_ANSWERS},
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        assert "script" in data
        assert "script_sections" in data
        
        # Verify 7 sections
        sections = data.get("script_sections", [])
        assert len(sections) == 7, f"Expected 7 sections, got {len(sections)}"
        
        # Verify each section has required fields
        for section in sections:
            assert "id" in section
            assert "title" in section
            assert "content" in section
            assert len(section["content"]) > 50, f"Section {section['title']} content is too short"
    
    def test_approve_script_works(self):
        """Test POST /api/masterclass-factory/{partner_id}/approve-script works"""
        response = requests.post(
            f"{BASE_URL}/api/masterclass-factory/2/approve-script",
            json={"script": "Test script content for approval testing"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Verify approval via GET
        get_response = requests.get(f"{BASE_URL}/api/masterclass-factory/2")
        get_data = get_response.json()
        assert get_data.get("script_approved") is True


class TestInputValidation:
    """Tests for input validation"""
    
    def test_generate_positioning_without_inputs_fails(self):
        """Test generate-positioning fails if no inputs saved"""
        # Use a partner ID that doesn't have inputs
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/generate-positioning",
            json={"partner_id": "nonexistent-partner-999"}
        )
        # Should return 404 (partner not found) or 400 (no inputs)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
    
    def test_approve_positioning_without_output_fails(self):
        """Test approve-positioning fails if no positioning_output exists"""
        # This test depends on state - if positioning was already generated, it will pass
        # We're testing the endpoint exists and responds correctly
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/posizionamento/approve-positioning?partner_id=nonexistent-999"
        )
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"


class TestAdminAccess:
    """Tests for admin access to partner data"""
    
    def test_admin_can_view_posizionamento(self):
        """Test admin can view partner posizionamento data"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/posizionamento/2")
        assert response.status_code == 200
        data = response.json()
        assert "partner_name" in data
        assert "posizionamento" in data
    
    def test_admin_can_view_masterclass(self):
        """Test admin can view partner masterclass data"""
        response = requests.get(f"{BASE_URL}/api/masterclass-factory/2")
        assert response.status_code == 200
        data = response.json()
        # Should return partner data
        assert "partner_id" in data or "answers" in data or "script" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
