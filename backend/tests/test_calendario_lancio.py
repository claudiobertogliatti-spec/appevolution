"""
Test suite for Calendario Lancio endpoints
Tests the 30-day editorial calendar generation and retrieval
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evolution-pro-lead.preview.emergentagent.com')

class TestCalendarioLancioEndpoints:
    """Tests for /api/partner-journey/lancio/calendario endpoints"""
    
    def test_get_calendario_empty(self):
        """Test GET calendario returns empty array for partner without calendario"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/calendario/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["partner_id"] == "1"
        assert "calendario" in data
        # Calendario may be empty or have data from previous generation
        assert isinstance(data["calendario"], list)
        print(f"✅ GET calendario returned {len(data['calendario'])} items")
    
    def test_generate_calendario(self):
        """Test POST genera-calendario generates 30-day calendar"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/genera-calendario",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "calendario" in data
        
        calendario = data["calendario"]
        assert isinstance(calendario, list)
        assert len(calendario) == 30, f"Expected 30 days, got {len(calendario)}"
        
        # Verify structure of each day
        for day in calendario:
            assert "giorno" in day
            assert "tipo" in day
            assert "idea" in day
            assert "formato" in day
            assert "obiettivo" in day
            assert day["formato"] in ["post", "reel", "story", "live", "carousel"]
        
        # Verify days are numbered 1-30
        giorni = [d["giorno"] for d in calendario]
        assert giorni == list(range(1, 31)), "Days should be numbered 1-30"
        
        print("✅ Generated 30-day calendario with correct structure")
    
    def test_get_calendario_after_generation(self):
        """Test GET calendario returns generated data"""
        # First generate
        gen_response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/genera-calendario",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        assert gen_response.status_code == 200
        
        # Then retrieve
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/calendario/1")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["success"] == True
        assert len(data["calendario"]) == 30
        print("✅ GET calendario returns persisted data after generation")
    
    def test_calendario_settimane_structure(self):
        """Test calendario has correct weekly structure"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/genera-calendario",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        calendario = response.json()["calendario"]
        
        # Week 1 (days 1-7): Attenzione
        week1 = [d for d in calendario if d["giorno"] <= 7]
        assert len(week1) == 7
        
        # Week 2 (days 8-14): Autorità
        week2 = [d for d in calendario if 8 <= d["giorno"] <= 14]
        assert len(week2) == 7
        
        # Week 3 (days 15-21): Coinvolgimento
        week3 = [d for d in calendario if 15 <= d["giorno"] <= 21]
        assert len(week3) == 7
        
        # Week 4 (days 22-30): Lancio
        week4 = [d for d in calendario if d["giorno"] >= 22]
        assert len(week4) == 9  # Days 22-30
        
        print("✅ Calendario has correct weekly structure")
    
    def test_generate_calendario_invalid_partner(self):
        """Test genera-calendario with non-existent partner returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/genera-calendario",
            json={"partner_id": "non_existent_partner_xyz"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        print("✅ Returns 404 for non-existent partner")
    
    def test_get_calendario_invalid_partner(self):
        """Test GET calendario with non-existent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/calendario/non_existent_partner_xyz")
        
        assert response.status_code == 404
        print("✅ GET returns 404 for non-existent partner")


class TestLancioStatusEndpoint:
    """Tests for /api/partner-journey/lancio/{partner_id} endpoint"""
    
    def test_get_lancio_status(self):
        """Test GET lancio status returns system checks"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/1")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["partner_id"] == "1"
        assert "system_checks" in data
        assert "all_ready" in data
        assert "is_launched" in data
        
        # Verify system_checks structure
        checks = data["system_checks"]
        assert "masterclass_completata" in checks
        assert "videocorso_completato" in checks
        assert "funnel_approvato" in checks
        assert "email_attive" in checks
        
        print(f"✅ Lancio status: all_ready={data['all_ready']}, is_launched={data['is_launched']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
