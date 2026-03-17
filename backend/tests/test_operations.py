"""
Test suite for Operations Dashboard (Antonella)
Tests: Partner list, Contenuti, Campagne ADV CRUD
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stefania-ai-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
ANTONELLA_EMAIL = "antonella@evolution-pro.it"
ANTONELLA_PASSWORD = "OperationsAnto2024!"
CLAUDIO_EMAIL = "claudio.bertogliatti@gmail.com"
CLAUDIO_PASSWORD = "Evoluzione74"


class TestOperationsAuth:
    """Test authentication for operations users"""
    
    def test_antonella_login_success(self):
        """Antonella should login with role 'operations'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ANTONELLA_EMAIL,
            "password": ANTONELLA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "operations"
        assert data["user"]["email"] == ANTONELLA_EMAIL
        
    def test_claudio_login_success(self):
        """Claudio should login with role 'admin'"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLAUDIO_EMAIL,
            "password": CLAUDIO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"


class TestOperationsStats:
    """Test GET /api/operations/stats"""
    
    def test_get_stats_success(self):
        """Should return operations statistics"""
        response = requests.get(f"{BASE_URL}/api/operations/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "partner_attivi" in stats
        assert "campagne_attive" in stats
        assert "partner_in_ritardo" in stats
        # Values should be integers
        assert isinstance(stats["partner_attivi"], int)
        assert isinstance(stats["campagne_attive"], int)
        assert isinstance(stats["partner_in_ritardo"], int)


class TestOperationsPartners:
    """Test GET /api/operations/partners"""
    
    def test_get_partners_success(self):
        """Should return list of active partners (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/operations/partners")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "partners" in data
        assert isinstance(data["partners"], list)


class TestOperationsContenuti:
    """Test GET /api/operations/contenuti/{partner_id}"""
    
    def test_get_contenuti_nonexistent_partner(self):
        """Should return empty arrays for non-existent partner"""
        fake_partner_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/operations/contenuti/{fake_partner_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documenti" in data
        assert "calendar" in data
        assert "videos" in data
        assert "commenti" in data
        # All should be empty lists
        assert isinstance(data["documenti"], list)
        assert isinstance(data["calendar"], list)
        assert isinstance(data["videos"], list)
        assert isinstance(data["commenti"], list)


class TestOperationsCampagneADV:
    """Test CRUD for Campagne ADV"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_partner_id = f"TEST_PARTNER_{uuid.uuid4().hex[:8]}"
        self.created_campagna_id = None
        yield
        # Cleanup: delete test campagna if created
        if self.created_campagna_id:
            try:
                requests.delete(f"{BASE_URL}/api/operations/campagne/{self.created_campagna_id}")
            except:
                pass
    
    def test_get_campagne_empty(self):
        """GET /api/operations/campagne - should return empty list for new partner"""
        response = requests.get(f"{BASE_URL}/api/operations/campagne", params={
            "partner_id": self.test_partner_id
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "campagne" in data
        assert isinstance(data["campagne"], list)
        assert len(data["campagne"]) == 0
    
    def test_create_campagna_success(self):
        """POST /api/operations/campagne - should create new campaign"""
        campagna_data = {
            "partner_id": self.test_partner_id,
            "piattaforma": "Meta",
            "nome_campagna": f"TEST_Campagna_{uuid.uuid4().hex[:6]}",
            "budget_giornaliero": 50.0,
            "budget_totale": 1500.0,
            "data_inizio": datetime.now().strftime("%Y-%m-%d"),
            "data_fine": None,
            "stato": "attiva",
            "note": "Test campaign created by pytest"
        }
        
        response = requests.post(f"{BASE_URL}/api/operations/campagne", json=campagna_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "campagna" in data
        
        campagna = data["campagna"]
        self.created_campagna_id = campagna["id"]
        
        # Verify all fields
        assert campagna["partner_id"] == self.test_partner_id
        assert campagna["piattaforma"] == "Meta"
        assert campagna["nome_campagna"] == campagna_data["nome_campagna"]
        assert campagna["budget_giornaliero"] == 50.0
        assert campagna["budget_totale"] == 1500.0
        assert campagna["stato"] == "attiva"
        assert "risultati" in campagna
        assert campagna["risultati"]["lead"] == 0
        
    def test_create_and_get_campagna(self):
        """Create campagna then verify with GET"""
        # Create
        campagna_data = {
            "partner_id": self.test_partner_id,
            "piattaforma": "Google",
            "nome_campagna": f"TEST_GetVerify_{uuid.uuid4().hex[:6]}",
            "budget_giornaliero": 30.0,
            "budget_totale": 900.0,
            "data_inizio": "2026-01-15",
            "stato": "attiva"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/operations/campagne", json=campagna_data)
        assert create_response.status_code == 200
        created = create_response.json()["campagna"]
        self.created_campagna_id = created["id"]
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/operations/campagne", params={
            "partner_id": self.test_partner_id
        })
        assert get_response.status_code == 200
        campagne = get_response.json()["campagne"]
        
        # Find our created campagna
        found = next((c for c in campagne if c["id"] == self.created_campagna_id), None)
        assert found is not None
        assert found["nome_campagna"] == campagna_data["nome_campagna"]
        assert found["piattaforma"] == "Google"
        
    def test_update_campagna_success(self):
        """PUT /api/operations/campagne/{id} - should update campaign"""
        # First create a campagna
        campagna_data = {
            "partner_id": self.test_partner_id,
            "piattaforma": "TikTok",
            "nome_campagna": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "budget_giornaliero": 20.0,
            "budget_totale": 600.0,
            "data_inizio": "2026-01-20",
            "stato": "attiva"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/operations/campagne", json=campagna_data)
        assert create_response.status_code == 200
        created = create_response.json()["campagna"]
        self.created_campagna_id = created["id"]
        
        # Update the campagna
        update_data = {
            "stato": "in_pausa",
            "budget_giornaliero": 40.0,
            "note": "Updated by pytest",
            "risultati": {
                "impression": 5000,
                "click": 250,
                "lead": 15,
                "costo_per_lead": 8.5,
                "conversioni": 3
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/operations/campagne/{self.created_campagna_id}",
            json=update_data
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["success"] == True
        
        # Verify update
        campagna = updated["campagna"]
        assert campagna["stato"] == "in_pausa"
        assert campagna["budget_giornaliero"] == 40.0
        assert campagna["note"] == "Updated by pytest"
        assert campagna["risultati"]["lead"] == 15
        assert campagna["risultati"]["costo_per_lead"] == 8.5
        
    def test_update_nonexistent_campagna(self):
        """PUT should return 404 for non-existent campagna"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/operations/campagne/{fake_id}",
            json={"stato": "terminata"}
        )
        assert response.status_code == 404
        
    def test_delete_campagna_success(self):
        """DELETE /api/operations/campagne/{id} - should delete campaign"""
        # First create a campagna
        campagna_data = {
            "partner_id": self.test_partner_id,
            "piattaforma": "LinkedIn",
            "nome_campagna": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "budget_giornaliero": 100.0,
            "budget_totale": 3000.0,
            "data_inizio": "2026-01-25",
            "stato": "attiva"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/operations/campagne", json=campagna_data)
        assert create_response.status_code == 200
        created = create_response.json()["campagna"]
        campagna_id = created["id"]
        
        # Delete the campagna
        delete_response = requests.delete(f"{BASE_URL}/api/operations/campagne/{campagna_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify deletion - GET should not find it
        get_response = requests.get(f"{BASE_URL}/api/operations/campagne", params={
            "partner_id": self.test_partner_id
        })
        campagne = get_response.json()["campagne"]
        found = next((c for c in campagne if c["id"] == campagna_id), None)
        assert found is None
        
        # Mark as deleted so cleanup doesn't try again
        self.created_campagna_id = None
        
    def test_delete_nonexistent_campagna(self):
        """DELETE should return 404 for non-existent campagna"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/operations/campagne/{fake_id}")
        assert response.status_code == 404


class TestOperationsAggregati:
    """Test aggregated metrics for campagne"""
    
    def test_campagne_with_aggregati(self):
        """GET /api/operations/campagne with partner_id should return aggregati"""
        test_partner_id = f"TEST_AGG_{uuid.uuid4().hex[:8]}"
        created_ids = []
        
        try:
            # Create multiple campagne
            for i in range(2):
                campagna_data = {
                    "partner_id": test_partner_id,
                    "piattaforma": "Meta",
                    "nome_campagna": f"TEST_Agg_{i}_{uuid.uuid4().hex[:4]}",
                    "budget_giornaliero": 25.0,
                    "budget_totale": 500.0,
                    "data_inizio": "2026-01-01",
                    "stato": "attiva"
                }
                response = requests.post(f"{BASE_URL}/api/operations/campagne", json=campagna_data)
                if response.status_code == 200:
                    created_ids.append(response.json()["campagna"]["id"])
            
            # Get campagne with aggregati
            response = requests.get(f"{BASE_URL}/api/operations/campagne", params={
                "partner_id": test_partner_id
            })
            assert response.status_code == 200
            data = response.json()
            
            # Should have aggregati when partner_id is specified and campagne exist
            if len(data["campagne"]) > 0:
                assert "aggregati" in data
                if data["aggregati"]:
                    assert "totale_lead" in data["aggregati"]
                    assert "budget_investito" in data["aggregati"]
                    assert "campagne_attive" in data["aggregati"]
                    
        finally:
            # Cleanup
            for cid in created_ids:
                try:
                    requests.delete(f"{BASE_URL}/api/operations/campagne/{cid}")
                except:
                    pass


class TestOperationsContenutiFull:
    """Test contenuti endpoints with comments"""
    
    def test_add_commento_success(self):
        """POST /api/operations/contenuti/commento - should add comment"""
        test_partner_id = f"TEST_COMM_{uuid.uuid4().hex[:8]}"
        
        commento_data = {
            "partner_id": test_partner_id,
            "documento_tipo": "script_masterclass",
            "commento": "Test commento da pytest"
        }
        
        response = requests.post(f"{BASE_URL}/api/operations/contenuti/commento", json=commento_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "commento" in data
        assert data["commento"]["autore"] == "Antonella"
        assert data["commento"]["commento"] == "Test commento da pytest"
        
    def test_update_calendar_success(self):
        """PUT /api/operations/contenuti/calendar - should update calendar status"""
        test_partner_id = f"TEST_CAL_{uuid.uuid4().hex[:8]}"
        
        calendar_data = {
            "partner_id": test_partner_id,
            "giorno": "2026-01-20",
            "stato": "approvato"
        }
        
        response = requests.put(f"{BASE_URL}/api/operations/contenuti/calendar", json=calendar_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestOperationsPartnerNotes:
    """Test partner notes functionality"""
    
    def test_update_partner_note(self):
        """PUT /api/operations/partner/note - should update partner notes"""
        test_partner_id = f"TEST_NOTE_{uuid.uuid4().hex[:8]}"
        
        note_data = {
            "partner_id": test_partner_id,
            "note": "Test note from pytest - partner needs follow-up"
        }
        
        response = requests.put(f"{BASE_URL}/api/operations/partner/note", json=note_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
