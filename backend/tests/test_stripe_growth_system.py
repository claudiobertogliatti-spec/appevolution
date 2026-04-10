"""
Test Suite for Evolution PRO - Stripe Payment & Growth System
Tests:
1. POST /api/cliente-analisi/checkout - Stripe checkout for €67 analysis
2. GET /api/partner-journey/growth-level/{partner_id} - Get saved growth level
3. POST /api/partner-journey/growth-level/choose - Save growth level selection
4. Validation tests for invalid inputs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"

# Test users with completed questionnaire
TEST_CLIENT_1 = "c407e3fc-5136-48f5-9162-babda5adccc8"  # luigi.calafiore@gmail.com
TEST_CLIENT_2 = "52f828ee-fa88-4761-81be-a7eab23fa7e2"  # test_quiz_ac1a859e@test.com

# Test partner
TEST_PARTNER_ID = "2"  # Arianna Aceto


class TestStripeCheckout:
    """Tests for Stripe checkout endpoint - €67 analysis payment"""
    
    def test_checkout_with_valid_user_id(self):
        """POST /api/cliente-analisi/checkout should return checkout_url for valid user"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": TEST_CLIENT_1}
        )
        
        print(f"Checkout response status: {response.status_code}")
        print(f"Checkout response: {response.json()}")
        
        # Should return 200 with checkout_url
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "checkout_url" in data, "Expected checkout_url in response"
        assert "session_id" in data, "Expected session_id in response"
        
        # Verify checkout_url is a valid Stripe URL
        checkout_url = data.get("checkout_url", "")
        assert "stripe.com" in checkout_url or "checkout.stripe.com" in checkout_url, \
            f"Expected Stripe URL, got: {checkout_url}"
        
        print(f"✅ Stripe checkout URL generated: {checkout_url[:80]}...")
    
    def test_checkout_with_second_valid_user(self):
        """POST /api/cliente-analisi/checkout should work for another valid user"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": TEST_CLIENT_2}
        )
        
        print(f"Checkout response status: {response.status_code}")
        
        # Should return 200 with checkout_url
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "checkout_url" in data
        print(f"✅ Second user checkout URL generated successfully")
    
    def test_checkout_with_invalid_user_id(self):
        """POST /api/cliente-analisi/checkout should return 404 for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": "non-existent-user-id-12345"}
        )
        
        print(f"Invalid user checkout response: {response.status_code}")
        
        # Should return 404
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Correctly returns 404 for non-existent user")


class TestGrowthLevelGet:
    """Tests for GET /api/partner-journey/growth-level/{partner_id}"""
    
    def test_get_growth_level_existing_partner(self):
        """GET /api/partner-journey/growth-level/{partner_id} should return saved level"""
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/growth-level/{TEST_PARTNER_ID}"
        )
        
        print(f"Get growth level response: {response.status_code}")
        print(f"Response data: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Data can be null if no level saved yet, or contain level info
        if data.get("data"):
            assert "level" in data["data"], "Expected level in data"
            assert data["data"]["level"] in ["foundation", "growth", "scale"], \
                f"Invalid level: {data['data']['level']}"
            print(f"✅ Partner has growth level: {data['data']['level']}")
        else:
            print(f"✅ Partner has no growth level saved yet (data is null)")
    
    def test_get_growth_level_non_existent_partner(self):
        """GET /api/partner-journey/growth-level/{partner_id} should return null data for non-existent"""
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/growth-level/99999"
        )
        
        print(f"Non-existent partner response: {response.status_code}")
        
        # Should return 200 with null data (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("data") is None, "Expected null data for non-existent partner"
        print(f"✅ Correctly returns null data for non-existent partner")


class TestGrowthLevelChoose:
    """Tests for POST /api/partner-journey/growth-level/choose"""
    
    def test_choose_foundation_level(self):
        """POST /api/partner-journey/growth-level/choose should save foundation level"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "foundation",
                "level": "foundation"
            }
        )
        
        print(f"Choose foundation response: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("level") == "foundation"
        assert "chosen_at" in data
        print(f"✅ Foundation level saved successfully")
    
    def test_choose_growth_level(self):
        """POST /api/partner-journey/growth-level/choose should save growth level"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "growth",
                "level": "growth"
            }
        )
        
        print(f"Choose growth response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("level") == "growth"
        print(f"✅ Growth level saved successfully")
    
    def test_choose_scale_level(self):
        """POST /api/partner-journey/growth-level/choose should save scale level"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "scale",
                "level": "scale"
            }
        )
        
        print(f"Choose scale response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("level") == "scale"
        print(f"✅ Scale level saved successfully")
    
    def test_choose_invalid_level(self):
        """POST /api/partner-journey/growth-level/choose should return 400 for invalid level"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "foundation",
                "level": "invalid_level"
            }
        )
        
        print(f"Invalid level response: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Correctly returns 400 for invalid level")
    
    def test_choose_non_existent_partner(self):
        """POST /api/partner-journey/growth-level/choose should return 404 for non-existent partner"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": "non-existent-partner-99999",
                "scenario": "foundation",
                "level": "foundation"
            }
        )
        
        print(f"Non-existent partner response: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Correctly returns 404 for non-existent partner")
    
    def test_verify_level_persisted(self):
        """Verify that chosen level is actually persisted in database"""
        # First, save a level
        save_response = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "growth",
                "level": "growth"
            }
        )
        assert save_response.status_code == 200
        
        # Then, retrieve it
        get_response = requests.get(
            f"{BASE_URL}/api/partner-journey/growth-level/{TEST_PARTNER_ID}"
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("success") == True
        assert data.get("data") is not None, "Expected data to be saved"
        assert data["data"]["level"] == "growth", f"Expected 'growth', got {data['data']['level']}"
        assert data["data"]["scenario"] == "growth", f"Expected scenario 'growth'"
        
        print(f"✅ Level correctly persisted and retrieved from database")


class TestIntegration:
    """Integration tests combining multiple endpoints"""
    
    def test_full_growth_level_flow(self):
        """Test complete flow: choose level -> verify saved -> update level -> verify update"""
        # Step 1: Choose foundation level
        response1 = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "foundation",
                "level": "foundation"
            }
        )
        assert response1.status_code == 200
        print("Step 1: Foundation level chosen")
        
        # Step 2: Verify it's saved
        response2 = requests.get(
            f"{BASE_URL}/api/partner-journey/growth-level/{TEST_PARTNER_ID}"
        )
        assert response2.status_code == 200
        assert response2.json()["data"]["level"] == "foundation"
        print("Step 2: Foundation level verified")
        
        # Step 3: Update to growth level
        response3 = requests.post(
            f"{BASE_URL}/api/partner-journey/growth-level/choose",
            json={
                "partner_id": TEST_PARTNER_ID,
                "scenario": "growth",
                "level": "growth"
            }
        )
        assert response3.status_code == 200
        print("Step 3: Updated to growth level")
        
        # Step 4: Verify update
        response4 = requests.get(
            f"{BASE_URL}/api/partner-journey/growth-level/{TEST_PARTNER_ID}"
        )
        assert response4.status_code == 200
        assert response4.json()["data"]["level"] == "growth"
        print("Step 4: Growth level verified")
        
        print(f"✅ Full growth level flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
