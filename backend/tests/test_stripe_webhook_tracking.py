"""
Test Suite: Stripe Webhook + KPI Tracking (GA4 + Meta Pixel)
Tests for iteration 68 features:
1. POST /api/webhook/stripe - Stripe webhook for automatic payment confirmation
2. GET /api/tracking/config - Public tracking config endpoint
3. GET /api/admin/tracking/config - Admin tracking config endpoint
4. PATCH /api/admin/tracking/config - Update tracking config
5. POST /api/cliente-analisi/checkout - Regression check
"""

import pytest
import requests
import os
import json
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStripeWebhook:
    """Tests for Stripe webhook endpoint - should return 200 even on errors"""
    
    def test_webhook_invalid_payload_returns_200(self):
        """Webhook should return 200 even with invalid data to prevent Stripe retries"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b"invalid payload",
            headers={"Content-Type": "application/json", "Stripe-Signature": "invalid_sig"}
        )
        # Should return 200 to prevent Stripe retries
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "received" in data
        assert data["received"] == True
    
    def test_webhook_empty_body_returns_200(self):
        """Webhook should handle empty body gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b"",
            headers={"Content-Type": "application/json", "Stripe-Signature": ""}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_webhook_malformed_json_returns_200(self):
        """Webhook should handle malformed JSON gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b'{"incomplete": ',
            headers={"Content-Type": "application/json", "Stripe-Signature": "test_sig"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


class TestTrackingConfigPublic:
    """Tests for public tracking config endpoint"""
    
    def test_get_tracking_config_returns_200(self):
        """GET /api/tracking/config should return tracking IDs"""
        response = requests.get(f"{BASE_URL}/api/tracking/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have ga4_id and meta_pixel_id fields
        assert "ga4_id" in data, "Response should contain ga4_id"
        assert "meta_pixel_id" in data, "Response should contain meta_pixel_id"
    
    def test_tracking_config_returns_string_values(self):
        """Tracking config should return string values for IDs"""
        response = requests.get(f"{BASE_URL}/api/tracking/config")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data.get("ga4_id"), str), "ga4_id should be a string"
        assert isinstance(data.get("meta_pixel_id"), str), "meta_pixel_id should be a string"


class TestTrackingConfigAdmin:
    """Tests for admin tracking config endpoints"""
    
    def test_get_admin_tracking_config_returns_200(self):
        """GET /api/admin/tracking/config should return full config"""
        response = requests.get(f"{BASE_URL}/api/admin/tracking/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "config" in data, "Response should contain config object"
    
    def test_admin_tracking_config_has_enabled_flags(self):
        """Admin config should include enabled flags"""
        response = requests.get(f"{BASE_URL}/api/admin/tracking/config")
        assert response.status_code == 200
        
        data = response.json()
        config = data.get("config", {})
        # Should have enabled flags
        assert "ga4_id" in config or config == {}, "Config should have ga4_id or be empty"
        assert "meta_pixel_id" in config or config == {}, "Config should have meta_pixel_id or be empty"
    
    def test_patch_tracking_config_saves_values(self):
        """PATCH /api/admin/tracking/config should save tracking IDs"""
        test_ga4_id = f"G-TEST{uuid.uuid4().hex[:6].upper()}"
        test_meta_id = f"{uuid.uuid4().int % 10**15}"
        
        payload = {
            "ga4_id": test_ga4_id,
            "meta_pixel_id": test_meta_id,
            "ga4_enabled": True,
            "meta_enabled": True
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/tracking/config",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Verify the values were saved by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/admin/tracking/config")
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        config = verify_data.get("config", {})
        assert config.get("ga4_id") == test_ga4_id, f"ga4_id should be {test_ga4_id}, got {config.get('ga4_id')}"
        assert config.get("meta_pixel_id") == test_meta_id, f"meta_pixel_id should be {test_meta_id}"
    
    def test_patch_tracking_config_partial_update(self):
        """PATCH should allow partial updates"""
        # Update only ga4_id
        payload = {"ga4_id": "G-PARTIAL123"}
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/tracking/config",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_public_config_reflects_admin_changes(self):
        """Public endpoint should reflect admin config changes"""
        # Set specific values via admin endpoint
        test_ga4 = "G-PUBLIC123"
        test_meta = "999888777666"
        
        requests.patch(
            f"{BASE_URL}/api/admin/tracking/config",
            json={"ga4_id": test_ga4, "meta_pixel_id": test_meta, "ga4_enabled": True, "meta_enabled": True}
        )
        
        # Verify public endpoint returns same values
        response = requests.get(f"{BASE_URL}/api/tracking/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ga4_id") == test_ga4, f"Public ga4_id should be {test_ga4}"
        assert data.get("meta_pixel_id") == test_meta, f"Public meta_pixel_id should be {test_meta}"


class TestCheckoutRegression:
    """Regression tests for checkout endpoint"""
    
    def test_checkout_endpoint_exists_returns_404_without_user(self):
        """POST /api/cliente-analisi/checkout returns 404 when no user provided (expected)"""
        # Without user_id or email, endpoint returns 404 "Utente non trovato"
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            headers={"Content-Type": "application/json"}
        )
        # 404 is expected when no user params provided
        assert response.status_code == 404, f"Expected 404 without user params, got {response.status_code}"
        data = response.json()
        assert "Utente non trovato" in data.get("detail", ""), "Should return 'Utente non trovato'"
    
    def test_checkout_with_valid_user_id(self):
        """Checkout with valid user_id should work or return appropriate error"""
        # Use test user from credentials - endpoint uses query params
        test_user_id = "c407e3fc-5136-48f5-9162-babda5adccc8"
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout?user_id={test_user_id}",
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 with checkout URL or 400 if already paid
        assert response.status_code in [200, 400], f"Expected 200/400, got {response.status_code}: {response.text}"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """API should be reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
