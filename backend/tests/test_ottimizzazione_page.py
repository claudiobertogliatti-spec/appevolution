"""
Test OttimizzazionePage Backend API
Tests for GET /api/partner-journey/ottimizzazione/{partner_id}
and POST /api/partner-journey/ottimizzazione/salva-protocollo
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOttimizzazioneAPI:
    """Tests for Ottimizzazione (Risultati) page backend endpoints"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ API health check passed")
    
    def test_get_ottimizzazione_valid_partner(self):
        """GET /api/partner-journey/ottimizzazione/{partner_id} - valid partner returns KPI data"""
        partner_id = "2"  # Arianna Aceto
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{partner_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        assert "partner_id" in data, "Response should contain partner_id"
        assert "kpi" in data, "Response should contain kpi object"
        
        # Verify KPI structure
        kpi = data.get("kpi", {})
        assert "visite" in kpi, "KPI should contain visite"
        assert "visite_trend" in kpi, "KPI should contain visite_trend"
        assert "contatti" in kpi, "KPI should contain contatti"
        assert "contatti_trend" in kpi, "KPI should contain contatti_trend"
        assert "vendite" in kpi, "KPI should contain vendite"
        assert "vendite_trend" in kpi, "KPI should contain vendite_trend"
        assert "conversione" in kpi, "KPI should contain conversione"
        assert "conversione_trend" in kpi, "KPI should contain conversione_trend"
        
        # Verify KPI values are numbers
        assert isinstance(kpi.get("visite"), (int, float)), "visite should be a number"
        assert isinstance(kpi.get("contatti"), (int, float)), "contatti should be a number"
        assert isinstance(kpi.get("vendite"), (int, float)), "vendite should be a number"
        assert isinstance(kpi.get("conversione"), (int, float)), "conversione should be a number"
        
        print(f"✓ GET ottimizzazione for partner {partner_id} passed")
        print(f"  KPI: visite={kpi.get('visite')}, contatti={kpi.get('contatti')}, vendite={kpi.get('vendite')}, conversione={kpi.get('conversione')}")
    
    def test_get_ottimizzazione_invalid_partner(self):
        """GET /api/partner-journey/ottimizzazione/{partner_id} - invalid partner returns 404"""
        partner_id = "99999"
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{partner_id}")
        
        assert response.status_code == 404, f"Expected 404 for invalid partner, got {response.status_code}"
        print("✓ GET ottimizzazione invalid partner returns 404")
    
    def test_get_ottimizzazione_response_has_protocollo_fields(self):
        """GET /api/partner-journey/ottimizzazione/{partner_id} - response includes protocollo fields"""
        partner_id = "2"
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{partner_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # These fields should exist (can be null)
        assert "protocollo_settimana" in data, "Response should contain protocollo_settimana"
        assert "protocollo_checklist" in data, "Response should contain protocollo_checklist"
        
        print("✓ GET ottimizzazione includes protocollo fields")
    
    def test_post_salva_protocollo_success(self):
        """POST /api/partner-journey/ottimizzazione/salva-protocollo - saves checklist"""
        partner_id = "2"
        
        # Get current week key (same logic as frontend)
        from datetime import datetime
        now = datetime.now()
        start = datetime(now.year, 1, 1)
        week_num = ((now - start).days + start.weekday() + 1) // 7 + 1
        week_key = f"{now.year}-W{week_num}"
        
        checklist = [
            {"id": "pubblica_contenuti", "done": True},
            {"id": "promuovi_webinar", "done": False},
            {"id": "partecipa_webinar", "done": False},
            {"id": "invia_followup", "done": False}
        ]
        
        payload = {
            "partner_id": partner_id,
            "settimana": week_key,
            "checklist": checklist
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        print(f"✓ POST salva-protocollo success for partner {partner_id}")
    
    def test_post_salva_protocollo_persistence(self):
        """POST salva-protocollo - verify data persists via GET"""
        partner_id = "2"
        
        # Get current week key
        from datetime import datetime
        now = datetime.now()
        start = datetime(now.year, 1, 1)
        week_num = ((now - start).days + start.weekday() + 1) // 7 + 1
        week_key = f"{now.year}-W{week_num}"
        
        # Save with specific checklist
        checklist = [
            {"id": "pubblica_contenuti", "done": True},
            {"id": "promuovi_webinar", "done": True},
            {"id": "partecipa_webinar", "done": False},
            {"id": "invia_followup", "done": False}
        ]
        
        payload = {
            "partner_id": partner_id,
            "settimana": week_key,
            "checklist": checklist
        }
        
        # Save
        save_response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        assert save_response.status_code == 200
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/{partner_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        saved_week = data.get("protocollo_settimana")
        saved_checklist = data.get("protocollo_checklist")
        
        assert saved_week == week_key, f"Week key should match: expected {week_key}, got {saved_week}"
        assert saved_checklist is not None, "Checklist should be saved"
        
        # Verify checklist content
        if saved_checklist:
            done_count = sum(1 for item in saved_checklist if item.get("done"))
            assert done_count == 2, f"Expected 2 done items, got {done_count}"
        
        print("✓ POST salva-protocollo persistence verified")
    
    def test_post_salva_protocollo_invalid_partner(self):
        """POST salva-protocollo - invalid partner returns 404"""
        payload = {
            "partner_id": "99999",
            "settimana": "2026-W1",
            "checklist": [{"id": "test", "done": False}]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/ottimizzazione/salva-protocollo",
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid partner, got {response.status_code}"
        print("✓ POST salva-protocollo invalid partner returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
