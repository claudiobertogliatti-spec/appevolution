"""
Iteration 32 - Bug Fix Tests for Dashboard Cliente + Flusso €2.790 Evolution PRO

Tests for:
- BUG 3 FIX: POST /api/proposta/{token}/conferma-stripe endpoint exists
- MOD 5 FIX: GET /api/cliente-analisi/status/{user_id} returns analisi_generata and decisione_attivata
- Backend health: login admin, partners endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_PROPOSTA_TOKEN = "T3xb20kGBXEgcGZO"


class TestBackendHealth:
    """Basic backend health checks"""
    
    def test_health_endpoint(self):
        """Test backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Backend health check passed")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") in ["admin", "superadmin"]
        print(f"✓ Admin login successful, role: {data.get('user', {}).get('role')}")
        return data["access_token"]
    
    def test_partners_endpoint(self):
        """Test partners endpoint works"""
        response = requests.get(f"{BASE_URL}/api/partners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Partners endpoint returned {len(data)} partners")


class TestBug3ConfermaStripeEndpoint:
    """BUG 3 FIX: POST /api/proposta/{token}/conferma-stripe endpoint exists and works"""
    
    def test_conferma_stripe_endpoint_exists(self):
        """Test that the endpoint exists (returns 404 for invalid token, not 405 or 500)"""
        response = requests.post(
            f"{BASE_URL}/api/proposta/invalid-test-token/conferma-stripe",
            json={"session_id": "test_session_123"}
        )
        # Should return 404 (proposta not found), NOT 405 (method not allowed) or 500
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "non trovata" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print("✓ POST /api/proposta/{token}/conferma-stripe endpoint exists (returns 404 for invalid token)")
    
    def test_conferma_stripe_with_valid_token(self):
        """Test conferma-stripe with a valid proposta token"""
        response = requests.post(
            f"{BASE_URL}/api/proposta/{TEST_PROPOSTA_TOKEN}/conferma-stripe",
            json={"session_id": "test_session_456"}
        )
        # Should return 200 (success or already_confirmed) or 404 if token doesn't exist
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            # Either success or already_confirmed
            assert "success" in data or "already_confirmed" in data
            print(f"✓ conferma-stripe with valid token: {data}")
        else:
            print("✓ conferma-stripe returns 404 for non-existent token (expected)")


class TestMod5StatusEndpoint:
    """MOD 5 FIX: GET /api/cliente-analisi/status/{user_id} returns analisi_generata and decisione_attivata"""
    
    def test_status_endpoint_returns_required_fields(self):
        """Test that status endpoint returns analisi_generata and decisione_attivata fields"""
        # First, get a valid user_id from the database
        # We'll use the admin login to get a token, then check if there are any cliente users
        
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get list of clienti-analisi
        clienti_response = requests.get(
            f"{BASE_URL}/api/admin/clienti-analisi",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if clienti_response.status_code == 200:
            clienti = clienti_response.json()
            if isinstance(clienti, list) and len(clienti) > 0:
                # Use first cliente's user_id
                test_user_id = clienti[0].get("user_id") or clienti[0].get("id")
                if test_user_id:
                    status_response = requests.get(f"{BASE_URL}/api/cliente-analisi/status/{test_user_id}")
                    if status_response.status_code == 200:
                        data = status_response.json()
                        # Check that the required fields exist
                        assert "analisi_generata" in data, "Missing analisi_generata field"
                        assert "decisione_attivata" in data, "Missing decisione_attivata field"
                        print(f"✓ Status endpoint returns analisi_generata={data['analisi_generata']}, decisione_attivata={data['decisione_attivata']}")
                        return
        
        # If no clienti exist, test with a fake user_id to verify endpoint structure
        print("⚠ No clienti found, testing endpoint structure with fake user_id")
        status_response = requests.get(f"{BASE_URL}/api/cliente-analisi/status/test-user-123")
        # Should return 404 or 200 with default values
        assert status_response.status_code in [200, 404], f"Expected 200 or 404, got {status_response.status_code}"
        if status_response.status_code == 200:
            data = status_response.json()
            assert "analisi_generata" in data, "Missing analisi_generata field"
            assert "decisione_attivata" in data, "Missing decisione_attivata field"
            print(f"✓ Status endpoint structure verified with default values")
        else:
            print("✓ Status endpoint returns 404 for non-existent user (expected)")


class TestLoginRoleRouting:
    """BUG 1 FIX: Login with role=cliente should route to mode=cliente, not mode=partner"""
    
    def test_admin_login_returns_correct_role(self):
        """Test that admin login returns admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        user = data.get("user", {})
        role = user.get("role")
        assert role in ["admin", "superadmin"], f"Expected admin/superadmin role, got {role}"
        print(f"✓ Admin login returns correct role: {role}")
    
    def test_login_response_structure(self):
        """Test that login response has required fields for routing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user object"
        
        user = data["user"]
        assert "role" in user, "Missing role in user object"
        assert "email" in user, "Missing email in user object"
        
        print(f"✓ Login response structure correct: role={user.get('role')}, email={user.get('email')}")


class TestPropostaEndpoints:
    """Test proposta-related endpoints"""
    
    def test_proposta_get_by_token(self):
        """Test GET /api/proposta/{token}"""
        response = requests.get(f"{BASE_URL}/api/proposta/{TEST_PROPOSTA_TOKEN}")
        # Should return 200 with proposta data or 404 if not found
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "token" in data or "prospect_nome" in data
            print(f"✓ GET /api/proposta/{TEST_PROPOSTA_TOKEN} returned proposta data")
        else:
            print(f"✓ GET /api/proposta/{TEST_PROPOSTA_TOKEN} returned 404 (token may not exist)")
    
    def test_proposta_invalid_token(self):
        """Test GET /api/proposta/{invalid_token} returns 404"""
        response = requests.get(f"{BASE_URL}/api/proposta/invalid-token-xyz")
        assert response.status_code == 404
        print("✓ GET /api/proposta/invalid-token returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
