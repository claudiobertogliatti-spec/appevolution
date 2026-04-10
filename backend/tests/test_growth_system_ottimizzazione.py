"""
Test Growth System and Ottimizzazione Endpoints
Tests for:
- GET /api/partner-journey/ottimizzazione/{partner_id} - Get ottimizzazione data
- POST /api/partner-journey/ottimizzazione/salva-protocollo - Save weekly checklist
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test partner ID (Arianna Aceto)
TEST_PARTNER_ID = "2"


class TestOttimizzazioneEndpoints:
    """Tests for Ottimizzazione endpoints"""

    def test_get_ottimizzazione_success(self):
        """Test GET /api/partner-journey/ottimizzazione/{partner_id} returns data"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("partner_id") == TEST_PARTNER_ID, f"Expected partner_id={TEST_PARTNER_ID}"
        assert "partner_name" in data, "Response should have partner_name"
        assert "kpi" in data, "Response should have kpi data"
        assert "azioni" in data, "Response should have azioni list"
        assert "partnership" in data, "Response should have partnership data"
        
        # Verify KPI structure
        kpi = data.get("kpi", {})
        assert "visite" in kpi, "KPI should have visite"
        assert "contatti" in kpi, "KPI should have contatti"
        assert "vendite" in kpi, "KPI should have vendite"
        assert "conversione" in kpi, "KPI should have conversione"
        
        # Verify partnership structure
        partnership = data.get("partnership", {})
        assert "stato" in partnership, "Partnership should have stato"
        assert "giorni_rimanenti" in partnership, "Partnership should have giorni_rimanenti"
        
        print(f"✅ GET ottimizzazione success - Partner: {data.get('partner_name')}")

    def test_get_ottimizzazione_invalid_partner(self):
        """Test GET ottimizzazione with invalid partner_id returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/invalid_partner_999")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ GET ottimizzazione with invalid partner returns 404")

    def test_salva_protocollo_success(self):
        """Test POST /api/partner-journey/ottimizzazione/salva-protocollo saves checklist"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            "settimana": "2026-W02",
            "checklist": [
                {"id": 1, "label": "Pubblica 3 contenuti social", "completed": True},
                {"id": 2, "label": "Rispondi ai commenti", "completed": False},
                {"id": 3, "label": "Analizza metriche funnel", "completed": True}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "message" in data, "Response should have message"
        
        print(f"✅ POST salva-protocollo success - Message: {data.get('message')}")

    def test_salva_protocollo_verify_persistence(self):
        """Test that saved protocollo is returned in GET ottimizzazione"""
        # First save a protocollo
        test_settimana = "2026-W03"
        test_checklist = [
            {"id": 1, "label": "Test item 1", "completed": True},
            {"id": 2, "label": "Test item 2", "completed": False}
        ]
        
        save_response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json={
                "partner_id": TEST_PARTNER_ID,
                "settimana": test_settimana,
                "checklist": test_checklist
            }
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        # Then verify it's returned in GET
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{TEST_PARTNER_ID}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("protocollo_settimana") == test_settimana, f"Expected settimana={test_settimana}"
        assert data.get("protocollo_checklist") is not None, "protocollo_checklist should be returned"
        
        print(f"✅ Protocollo persistence verified - Settimana: {test_settimana}")

    def test_salva_protocollo_invalid_partner(self):
        """Test POST salva-protocollo with invalid partner_id returns 404"""
        payload = {
            "partner_id": "invalid_partner_999",
            "settimana": "2026-W01",
            "checklist": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ POST salva-protocollo with invalid partner returns 404")

    def test_salva_protocollo_empty_checklist(self):
        """Test POST salva-protocollo with empty checklist"""
        payload = {
            "partner_id": TEST_PARTNER_ID,
            "settimana": "2026-W04",
            "checklist": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        
        # Should still succeed with empty checklist
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ POST salva-protocollo with empty checklist succeeds")


class TestHealthCheck:
    """Basic health check tests"""

    def test_api_health(self):
        """Test API is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✅ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
