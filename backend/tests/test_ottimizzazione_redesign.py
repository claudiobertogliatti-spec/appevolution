"""
Test OttimizzazionePage (Risultati) Redesign - Iteration 57
Tests the 6 sections: Stato → KPI → Diagnosi → Prossima Azione → Prossimo Livello → Trend
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOttimizzazioneEndpoint:
    """Tests for GET /api/partner-journey/ottimizzazione/{partner_id}"""
    
    def test_ottimizzazione_endpoint_success(self):
        """Test that ottimizzazione endpoint returns 200 for valid partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("partner_id") == "2"
        assert data.get("partner_name") == "Arianna Aceto"
        print("✓ Ottimizzazione endpoint returns 200 for valid partner")
    
    def test_ottimizzazione_kpi_structure(self):
        """Test that KPI data has correct structure with all 4 metrics + trends"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/2")
        assert response.status_code == 200
        data = response.json()
        kpi = data.get("kpi", {})
        
        # Check all 4 KPI fields exist
        assert "visite" in kpi, "Missing 'visite' in KPI"
        assert "contatti" in kpi, "Missing 'contatti' in KPI"
        assert "vendite" in kpi, "Missing 'vendite' in KPI"
        assert "conversione" in kpi, "Missing 'conversione' in KPI"
        
        # Check all 4 trend fields exist
        assert "visite_trend" in kpi, "Missing 'visite_trend' in KPI"
        assert "contatti_trend" in kpi, "Missing 'contatti_trend' in KPI"
        assert "vendite_trend" in kpi, "Missing 'vendite_trend' in KPI"
        assert "conversione_trend" in kpi, "Missing 'conversione_trend' in KPI"
        
        # Check types
        assert isinstance(kpi["visite"], (int, float)), "visite should be numeric"
        assert isinstance(kpi["contatti"], (int, float)), "contatti should be numeric"
        assert isinstance(kpi["vendite"], (int, float)), "vendite should be numeric"
        assert isinstance(kpi["conversione"], (int, float)), "conversione should be numeric"
        
        print("✓ KPI structure is correct with all 4 metrics and trends")
    
    def test_ottimizzazione_invalid_partner_404(self):
        """Test that invalid partner ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/99999")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid partner returns 404")
    
    def test_ottimizzazione_partnership_data(self):
        """Test that partnership data is included in response"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/2")
        assert response.status_code == 200
        data = response.json()
        
        partnership = data.get("partnership", {})
        assert "stato" in partnership, "Missing 'stato' in partnership"
        assert "giorni_rimanenti" in partnership, "Missing 'giorni_rimanenti' in partnership"
        
        print("✓ Partnership data is included in response")
    
    def test_ottimizzazione_caso_studio_data(self):
        """Test that caso_studio data is included in response"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/2")
        assert response.status_code == 200
        data = response.json()
        
        caso_studio = data.get("caso_studio", {})
        assert "studenti" in caso_studio, "Missing 'studenti' in caso_studio"
        assert "fatturato" in caso_studio, "Missing 'fatturato' in caso_studio"
        
        print("✓ Caso studio data is included in response")


class TestKPIZeroState:
    """Tests for when all KPI are 0 (initial state)"""
    
    def test_kpi_zero_returns_valid_structure(self):
        """When KPI are 0, endpoint should still return valid structure"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/2")
        assert response.status_code == 200
        data = response.json()
        kpi = data.get("kpi", {})
        
        # Even with 0 values, structure should be complete
        assert kpi.get("visite") is not None
        assert kpi.get("contatti") is not None
        assert kpi.get("vendite") is not None
        assert kpi.get("conversione") is not None
        
        print("✓ KPI zero state returns valid structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
