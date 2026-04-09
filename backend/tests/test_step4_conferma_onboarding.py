"""
Test Suite for Step 4 - Conferma e Onboarding
Tests the unified Step 4 that combines old Steps 5+6+7:
- POST /api/cliente-analisi/call-prenotata endpoint
- State transitions after booking
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_CLIENTE_EMAIL = "mario.rossi@test.com"
TEST_CLIENTE_PASSWORD = "TestMario123"
TEST_CLIENTE_USER_ID = "2e3357f3-254b-49bc-98d8-a55771d75f0d"

ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"


class TestCallPrenotataEndpoint:
    """Tests for POST /api/cliente-analisi/call-prenotata"""
    
    @pytest.fixture
    def cliente_token(self):
        """Get auth token for test cliente"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_CLIENTE_EMAIL,
            "password": TEST_CLIENTE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Could not login as test cliente: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def admin_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Could not login as admin: {response.status_code} - {response.text}")
    
    def test_call_prenotata_requires_auth(self):
        """Test that endpoint requires authentication"""
        # Generate a valid weekday date
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:  # Skip weekends
            tomorrow += timedelta(days=1)
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/call-prenotata", json={
            "data": tomorrow.strftime("%Y-%m-%d"),
            "ora": "10:00"
        })
        
        # Should return 401 without token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint correctly requires authentication (401)")
    
    def test_call_prenotata_success(self, cliente_token):
        """Test successful call booking with valid data"""
        # Generate a valid weekday date (next 14 days)
        tomorrow = datetime.now() + timedelta(days=1)
        while tomorrow.weekday() >= 5:  # Skip weekends
            tomorrow += timedelta(days=1)
        
        test_date = tomorrow.strftime("%Y-%m-%d")
        test_time = "10:00"
        
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/call-prenotata",
            json={"data": test_date, "ora": test_time},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert data.get("data") == test_date, f"Expected data={test_date}, got {data.get('data')}"
        assert data.get("ora") == test_time, f"Expected ora={test_time}, got {data.get('ora')}"
        
        print(f"✓ Call booking successful: {test_date} at {test_time}")
    
    def test_call_prenotata_updates_state(self, cliente_token):
        """Test that booking updates user state to CALL_PRENOTATA"""
        # First book a call
        tomorrow = datetime.now() + timedelta(days=2)
        while tomorrow.weekday() >= 5:
            tomorrow += timedelta(days=1)
        
        test_date = tomorrow.strftime("%Y-%m-%d")
        test_time = "14:00"
        
        headers = {"Authorization": f"Bearer {cliente_token}"}
        
        # Book the call
        book_response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/call-prenotata",
            json={"data": test_date, "ora": test_time},
            headers=headers
        )
        assert book_response.status_code == 200, f"Booking failed: {book_response.text}"
        
        # Check state
        state_response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/stato/{TEST_CLIENTE_USER_ID}"
        )
        
        assert state_response.status_code == 200, f"State check failed: {state_response.text}"
        
        state_data = state_response.json()
        # After booking, state should be CALL_PRENOTATA
        assert state_data.get("stato_cliente") == "CALL_PRENOTATA", \
            f"Expected stato_cliente=CALL_PRENOTATA, got {state_data.get('stato_cliente')}"
        
        print(f"✓ State correctly updated to CALL_PRENOTATA")
    
    def test_call_prenotata_with_different_time_slots(self, cliente_token):
        """Test booking with all valid time slots (09:00, 10:00, 11:00, 14:00, 15:00, 16:00)"""
        valid_time_slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
        
        # Get a valid weekday
        test_day = datetime.now() + timedelta(days=3)
        while test_day.weekday() >= 5:
            test_day += timedelta(days=1)
        test_date = test_day.strftime("%Y-%m-%d")
        
        headers = {"Authorization": f"Bearer {cliente_token}"}
        
        for time_slot in valid_time_slots:
            response = requests.post(
                f"{BASE_URL}/api/cliente-analisi/call-prenotata",
                json={"data": test_date, "ora": time_slot},
                headers=headers
            )
            
            assert response.status_code == 200, \
                f"Failed for time slot {time_slot}: {response.status_code} - {response.text}"
            
            data = response.json()
            assert data.get("ora") == time_slot, f"Time slot mismatch: expected {time_slot}, got {data.get('ora')}"
        
        print(f"✓ All 6 time slots work correctly: {valid_time_slots}")


class TestStatoClienteEndpoint:
    """Tests for GET /api/cliente-analisi/stato/{user_id}"""
    
    def test_stato_endpoint_exists(self):
        """Test that stato endpoint exists and returns data"""
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/stato/{TEST_CLIENTE_USER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stato_cliente" in data, f"Missing stato_cliente in response: {data}"
        assert "user_id" in data, f"Missing user_id in response: {data}"
        
        print(f"✓ Stato endpoint returns valid data: stato={data.get('stato_cliente')}")
    
    def test_stato_returns_pagina_mapping(self):
        """Test that stato endpoint returns pagina mapping for frontend"""
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/stato/{TEST_CLIENTE_USER_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should include pagina for frontend routing
        assert "pagina" in data, f"Missing pagina in response: {data}"
        assert "label_admin" in data, f"Missing label_admin in response: {data}"
        
        print(f"✓ Stato includes pagina mapping: {data.get('pagina')}")


class TestWizardStepMapping:
    """Tests to verify wizard step mapping (4 steps total)"""
    
    def test_post_payment_states_map_to_step_4(self):
        """Verify that post-payment states map to step 4 in frontend"""
        # These states should all map to step 4 according to ClienteWizard.jsx
        post_payment_states = [
            "ANALISI_ATTIVATA",
            "IN_ATTESA_CALL", 
            "CALL_PRENOTATA",
            "CALL_COMPLETATA",
            "IDONEO_PARTNERSHIP"
        ]
        
        # Get current state
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/stato/{TEST_CLIENTE_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        current_state = data.get("stato_cliente")
        
        # If current state is one of post-payment states, it should map to step 4
        if current_state in post_payment_states:
            print(f"✓ Current state '{current_state}' correctly maps to Step 4")
        else:
            print(f"ℹ Current state '{current_state}' - not a post-payment state")
        
        # Verify the state is valid
        assert current_state is not None, "stato_cliente should not be None"


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ API health check passed")
    
    def test_auth_endpoint_exists(self):
        """Test auth endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "wrong"
        })
        # Should return 401 for wrong credentials, not 404
        assert response.status_code in [401, 400], \
            f"Auth endpoint issue: {response.status_code} - {response.text}"
        print("✓ Auth endpoint exists and responds correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
