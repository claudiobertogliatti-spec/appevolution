"""
Test Webinar Mensile Endpoints
Tests for GET /api/partner-journey/webinar/{partner_id} and POST /api/partner-journey/webinar/genera
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWebinarEndpoints:
    """Test webinar mensile endpoints"""
    
    def test_get_webinar_existing_partner(self):
        """Test GET webinar for existing partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["partner_id"] == "1"
        # webinar and promozione can be null if not generated yet
        assert "webinar" in data
        assert "promozione" in data
    
    def test_get_webinar_nonexistent_partner(self):
        """Test GET webinar for non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/nonexistent_xyz")
        assert response.status_code == 404
    
    def test_genera_webinar(self):
        """Test POST genera webinar creates content"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/webinar/genera",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify webinar structure
        assert "webinar" in data
        webinar = data["webinar"]
        assert "titolo" in webinar
        assert "sottotitolo" in webinar
        assert len(webinar["titolo"]) > 0
        
        # Verify promozione structure
        assert "promozione" in data
        promo = data["promozione"]
        assert "emails" in promo
        assert "social" in promo
        assert len(promo["emails"]) >= 3  # At least 3 emails
        assert len(promo["social"]) >= 3  # At least 3 social posts
        
        # Verify email structure
        for email in promo["emails"]:
            assert "tipo" in email
            assert "oggetto" in email
            assert "corpo" in email
        
        # Verify social structure
        for post in promo["social"]:
            assert "tipo" in post
            assert "testo" in post
    
    def test_genera_webinar_persists_data(self):
        """Test that generated webinar is persisted and retrievable"""
        # First generate
        gen_response = requests.post(
            f"{BASE_URL}/api/partner-journey/webinar/genera",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        assert gen_response.status_code == 200
        gen_data = gen_response.json()
        
        # Then retrieve
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/1")
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        # Verify data matches
        assert get_data["webinar"]["titolo"] == gen_data["webinar"]["titolo"]
        assert get_data["promozione"] is not None
    
    def test_genera_webinar_nonexistent_partner(self):
        """Test POST genera webinar for non-existent partner returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/webinar/genera",
            json={"partner_id": "nonexistent_xyz"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404


class TestOttimizzazioneEndpoints:
    """Test ottimizzazione endpoints (related to webinar page)"""
    
    def test_get_ottimizzazione(self):
        """Test GET ottimizzazione returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/ottimizzazione/1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["partner_id"] == "1"
        
        # Verify KPI structure
        assert "kpi" in data
        kpi = data["kpi"]
        assert "studenti_totali" in kpi
        assert "vendite_mese" in kpi
        assert "lead_generati" in kpi
        assert "conversione_funnel" in kpi
        
        # Verify azioni structure
        assert "azioni" in data
        assert isinstance(data["azioni"], list)
        
        # Verify partnership structure
        assert "partnership" in data
        partnership = data["partnership"]
        assert "stato" in partnership
        assert "giorni_rimanenti" in partnership


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
