"""
Test Suite for Evolution PRO - Contract PDF Generation, Notifications & Security
Tests:
1. POST /api/contract/sign - Contract signing with PDF generation
2. GET /api/contract/pdf-download/{partner_id} - PDF download from MongoDB
3. GET /api/contract/pdf/{partner_id} - Get PDF URL
4. POST /api/contract/sign for already-signed partner - Should return 'Contratto già firmato'
5. GET /api/contract/status/{partner_id} - Contract status check
6. POST /api/cliente-analisi/checkout - Stripe checkout
7. POST /api/auth/login - Admin authentication
8. Backend starts without hardcoded credentials
"""

import pytest
import requests
import os
import base64

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://evoluzione-pro.preview.emergentagent.com"

# Test credentials from test_credentials.md
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_PARTNER_ID = "2"  # Arianna Aceto - already has signed contract
TEST_CLIENT_USER_ID = "c407e3fc-5136-48f5-9162-babda5adccc8"


class TestAdminAuthentication:
    """Test admin login endpoint"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login with admin credentials → should return access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, f"Missing access_token in response: {data}"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        print(f"✅ Admin login successful, token received (length: {len(data['access_token'])})")
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/auth/login with wrong credentials → should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected with 401")


class TestContractStatus:
    """Test contract status endpoint"""
    
    def test_contract_status_signed_partner(self):
        """GET /api/contract/status/2 → should show signed=true"""
        response = requests.get(f"{BASE_URL}/api/contract/status/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Status check failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "signed" in data, f"Missing 'signed' field: {data}"
        assert data["signed"] == True, f"Expected signed=true, got: {data}"
        assert "signed_at" in data, f"Missing 'signed_at' field: {data}"
        print(f"✅ Contract status for partner {TEST_PARTNER_ID}: signed={data['signed']}, signed_at={data.get('signed_at')}")
    
    def test_contract_status_nonexistent_partner(self):
        """GET /api/contract/status/nonexistent → should return 404"""
        response = requests.get(f"{BASE_URL}/api/contract/status/nonexistent-partner-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent partner correctly returns 404")


class TestContractPDF:
    """Test contract PDF endpoints"""
    
    def test_get_contract_pdf_url(self):
        """GET /api/contract/pdf/2 → should return success with pdf_url"""
        response = requests.get(f"{BASE_URL}/api/contract/pdf/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"PDF URL request failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data, f"Missing 'success' field: {data}"
        assert data["success"] == True, f"Expected success=true: {data}"
        assert "pdf_url" in data, f"Missing 'pdf_url' field: {data}"
        
        # Verify pdf_url starts with /api/contract/pdf-download/
        pdf_url = data["pdf_url"]
        assert pdf_url.startswith("/api/contract/pdf-download/"), f"Unexpected pdf_url format: {pdf_url}"
        print(f"✅ PDF URL retrieved: {pdf_url}")
        
        return pdf_url
    
    def test_download_contract_pdf(self):
        """GET /api/contract/pdf-download/{partner_id} → should return application/pdf content type with valid PDF"""
        response = requests.get(f"{BASE_URL}/api/contract/pdf-download/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"PDF download failed: {response.status_code}"
        
        # Verify content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got: {content_type}"
        
        # Verify PDF size (should be 52KB+ as per requirements)
        content_length = len(response.content)
        assert content_length >= 52000, f"PDF too small: {content_length} bytes (expected 52KB+)"
        
        # Verify PDF magic bytes (PDF files start with %PDF)
        assert response.content[:4] == b'%PDF', f"Invalid PDF header: {response.content[:10]}"
        
        # Verify Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Missing attachment disposition: {content_disposition}"
        assert ".pdf" in content_disposition, f"Missing .pdf in filename: {content_disposition}"
        
        print(f"✅ PDF downloaded successfully: {content_length} bytes, content-type: {content_type}")
        print(f"   Content-Disposition: {content_disposition}")
    
    def test_download_pdf_nonexistent_partner(self):
        """GET /api/contract/pdf-download/nonexistent → should return 404"""
        response = requests.get(f"{BASE_URL}/api/contract/pdf-download/nonexistent-partner-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent partner PDF correctly returns 404")


class TestContractSigning:
    """Test contract signing endpoint"""
    
    def test_sign_already_signed_contract(self):
        """POST /api/contract/sign for already-signed partner → should return 'Contratto già firmato'"""
        # Create a dummy signature (base64 encoded small image)
        dummy_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/contract/sign",
            json={
                "partner_id": TEST_PARTNER_ID,
                "signature_base64": dummy_signature,
                "contract_version": "1.0"
            }
        )
        
        assert response.status_code == 200, f"Sign request failed: {response.text}"
        data = response.json()
        
        # Verify response indicates already signed
        assert "success" in data, f"Missing 'success' field: {data}"
        assert data["success"] == True, f"Expected success=true: {data}"
        assert "message" in data, f"Missing 'message' field: {data}"
        assert "già firmato" in data["message"].lower() or "already" in data["message"].lower(), \
            f"Expected 'già firmato' message, got: {data['message']}"
        
        print(f"✅ Already-signed contract correctly returns: {data['message']}")


class TestStripeCheckout:
    """Test Stripe checkout endpoint"""
    
    def test_checkout_with_valid_user(self):
        """POST /api/cliente-analisi/checkout?user_id=... → Stripe checkout should work"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": TEST_CLIENT_USER_ID}
        )
        
        # Could be 200 (success) or 400 (already paid)
        assert response.status_code in [200, 400], f"Checkout failed: {response.status_code} - {response.text}"
        data = response.json()
        
        if response.status_code == 200:
            # Verify checkout URL returned
            assert "success" in data, f"Missing 'success' field: {data}"
            assert data["success"] == True, f"Expected success=true: {data}"
            assert "checkout_url" in data, f"Missing 'checkout_url' field: {data}"
            
            checkout_url = data["checkout_url"]
            assert checkout_url.startswith("https://checkout.stripe.com"), \
                f"Invalid checkout URL: {checkout_url}"
            
            print(f"✅ Stripe checkout session created: {checkout_url[:80]}...")
        else:
            # Already paid case
            assert "detail" in data or "message" in data, f"Missing error message: {data}"
            print(f"✅ Checkout correctly handled (already paid or other expected state): {data}")
    
    def test_checkout_with_invalid_user(self):
        """POST /api/cliente-analisi/checkout?user_id=invalid → should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/checkout",
            params={"user_id": "nonexistent-user-id-12345"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid user correctly returns 404")


class TestSecurityNoHardcodedCredentials:
    """Test that no hardcoded credentials exist in server.py"""
    
    def test_server_py_no_hardcoded_mongo_atlas(self):
        """Backend server.py should not have hardcoded MongoDB Atlas credentials"""
        server_path = "/app/backend/server.py"
        
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for hardcoded MongoDB Atlas URLs (should use env vars)
        hardcoded_patterns = [
            "mongodb+srv://evolution_admin:",  # Hardcoded Atlas URL
            "ATLAS_FALLBACK = \"mongodb",  # Hardcoded fallback
            "REDIS_FALLBACK = \"redis",  # Hardcoded Redis
        ]
        
        for pattern in hardcoded_patterns:
            assert pattern not in content, f"Found hardcoded credential pattern: {pattern}"
        
        # Verify env var usage
        assert "os.environ.get('MONGO_ATLAS_URL'" in content or "os.environ.get(\"MONGO_ATLAS_URL\"" in content, \
            "MONGO_ATLAS_URL should be read from environment"
        assert "os.environ.get('REDIS_FALLBACK_URL'" in content or "os.environ.get(\"REDIS_FALLBACK_URL\"" in content, \
            "REDIS_FALLBACK_URL should be read from environment"
        
        print("✅ No hardcoded credentials found in server.py")
        print("   - MONGO_ATLAS_URL read from environment")
        print("   - REDIS_FALLBACK_URL read from environment")
    
    def test_env_file_has_required_vars(self):
        """Backend .env should have required security variables"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        required_vars = [
            "MONGO_ATLAS_URL=",
            "REDIS_FALLBACK_URL=",
            "SYSTEME_TAG_CONTRATTO_FIRMATO=",
        ]
        
        for var in required_vars:
            assert var in content, f"Missing required env var: {var}"
        
        # Verify SYSTEME_TAG_CONTRATTO_FIRMATO has correct value
        assert "SYSTEME_TAG_CONTRATTO_FIRMATO=1958860" in content, \
            "SYSTEME_TAG_CONTRATTO_FIRMATO should be 1958860"
        
        print("✅ All required environment variables present in .env")
        print("   - MONGO_ATLAS_URL configured")
        print("   - REDIS_FALLBACK_URL configured")
        print("   - SYSTEME_TAG_CONTRATTO_FIRMATO=1958860")


class TestSystemeNotifications:
    """Test Systeme.io notification configuration"""
    
    def test_systeme_notifications_service_exists(self):
        """Verify systeme_notifications.py exists and has correct tag ID"""
        service_path = "/app/backend/services/systeme_notifications.py"
        
        with open(service_path, 'r') as f:
            content = f.read()
        
        # Verify notify_contract_signed function exists
        assert "async def notify_contract_signed" in content, \
            "notify_contract_signed function not found"
        
        # Verify it reads tag from env
        assert "SYSTEME_TAG_CONTRATTO_FIRMATO" in content, \
            "SYSTEME_TAG_CONTRATTO_FIRMATO not referenced in service"
        
        print("✅ Systeme.io notification service correctly configured")
        print("   - notify_contract_signed function exists")
        print("   - Uses SYSTEME_TAG_CONTRATTO_FIRMATO from environment")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
