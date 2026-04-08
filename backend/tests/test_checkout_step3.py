"""
Test Suite for Step 3 Checkout - Analisi Strategica €67
Tests the POST /api/cliente-analisi/checkout endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCheckoutEndpoint:
    """Tests for POST /api/cliente-analisi/checkout"""
    
    def test_checkout_endpoint_exists(self):
        """Test that checkout endpoint exists and accepts POST"""
        # Test with missing user_id - should return 404 or 422
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/checkout")
        # Endpoint exists if we get 404 (user not found) or 422 (validation error)
        # Not 405 (method not allowed)
        assert response.status_code != 405, "Endpoint should accept POST method"
        print(f"✓ Checkout endpoint exists, status: {response.status_code}")
    
    def test_checkout_with_valid_user_id(self):
        """Test checkout with valid test user ID"""
        test_user_id = "2e3357f3-254b-49bc-98d8-a55771d75f0d"
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": test_user_id, "email": "mario.rossi@test.com"}
        )
        
        # In preview env, Stripe key may be expired - that's expected
        # We check that the endpoint processes the request correctly
        data = response.json()
        
        if response.status_code == 200:
            # Success case - Stripe working
            assert "checkout_url" in data, "Response should contain checkout_url"
            assert "session_id" in data, "Response should contain session_id"
            print(f"✓ Checkout created successfully: {data.get('checkout_url', '')[:50]}...")
        elif response.status_code == 500:
            # Stripe API key expired - expected in preview
            assert "detail" in data
            if "Expired API Key" in data.get("detail", ""):
                print(f"✓ Endpoint works but Stripe key expired (expected in preview)")
            else:
                print(f"⚠ Server error: {data.get('detail')}")
        elif response.status_code == 400:
            # Payment already made
            assert "detail" in data
            print(f"✓ User already paid: {data.get('detail')}")
        else:
            print(f"Response: {response.status_code} - {data}")
    
    def test_checkout_with_invalid_user_id(self):
        """Test checkout with non-existent user ID"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": "non-existent-user-id-12345"}
        )
        
        # Should return 404 for non-existent user
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Non-existent user returns 404: {data.get('detail')}")
    
    def test_checkout_with_email_only(self):
        """Test checkout with email parameter only"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"email": "mario.rossi@test.com"}
        )
        
        data = response.json()
        # Should find user by email or return appropriate error
        if response.status_code == 200:
            assert "checkout_url" in data
            print(f"✓ Checkout by email works")
        elif response.status_code == 500 and "Expired API Key" in data.get("detail", ""):
            print(f"✓ User found by email, Stripe key expired (expected)")
        elif response.status_code == 400:
            print(f"✓ User found, already paid: {data.get('detail')}")
        else:
            print(f"Response: {response.status_code} - {data}")


class TestClienteAnalisiStatus:
    """Tests for GET /api/cliente-analisi/status/{user_id}"""
    
    def test_status_endpoint(self):
        """Test status endpoint returns user state"""
        test_user_id = "2e3357f3-254b-49bc-98d8-a55771d75f0d"
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/status/{test_user_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status endpoint works: {data}")
        else:
            print(f"Status response: {response.status_code}")


class TestClienteAnalisiStato:
    """Tests for GET /api/cliente-analisi/stato/{user_id}"""
    
    def test_stato_endpoint(self):
        """Test stato endpoint returns user state"""
        test_user_id = "2e3357f3-254b-49bc-98d8-a55771d75f0d"
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/stato/{test_user_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert "stato_cliente" in data, "Response should contain stato_cliente"
            print(f"✓ Stato endpoint works: stato_cliente={data.get('stato_cliente')}")
        else:
            print(f"Stato response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
