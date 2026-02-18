"""
Test Suite for Evolution PRO - Bonus Strategici, Contract PDF, and Welcome Email
Tests:
1. Contract PDF generation endpoint
2. Welcome email endpoint with Systeme.io tag
3. Partner data retrieval for Bonus Strategici page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio@evolutionpro.it"
ADMIN_PASSWORD = "Evolution2026!"
TEST_PARTNER_ID = "d248c632-869d-4a13-b94a-dbf2425fa143"
TEST_PARTNER_EMAIL = "testf0@evolutionpro.it"


class TestContractPDF:
    """Tests for Contract PDF generation endpoint"""
    
    def test_contract_pdf_returns_valid_pdf(self):
        """Test that contract-pdf endpoint returns a valid PDF file"""
        response = requests.get(f"{BASE_URL}/api/partners/{TEST_PARTNER_ID}/contract-pdf")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Content type assertion
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected PDF content type, got {response.headers.get('Content-Type')}"
        
        # PDF header assertion - PDF files start with %PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
        
        # Content-Disposition header should have filename
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "PDF should be downloadable as attachment"
        assert "Contratto_EvolutionPRO" in content_disp, "Filename should contain 'Contratto_EvolutionPRO'"
        
        print(f"✅ Contract PDF generated successfully, size: {len(response.content)} bytes")
    
    def test_contract_pdf_contains_partner_name(self):
        """Test that PDF filename contains partner name"""
        response = requests.get(f"{BASE_URL}/api/partners/{TEST_PARTNER_ID}/contract-pdf")
        
        assert response.status_code == 200
        
        content_disp = response.headers.get("Content-Disposition", "")
        # Partner name is "Test F0 Partner" - should be in filename
        assert "Test_F0_Partner" in content_disp or "Test" in content_disp, \
            f"Partner name not found in filename: {content_disp}"
        
        print(f"✅ PDF filename contains partner name: {content_disp}")
    
    def test_contract_pdf_invalid_partner_returns_404(self):
        """Test that invalid partner ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/partners/invalid-partner-id/contract-pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Invalid partner returns 404 as expected")


class TestWelcomeEmail:
    """Tests for Welcome Email endpoint with Systeme.io integration"""
    
    def test_send_welcome_email_success(self):
        """Test sending welcome email to partner"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/send-welcome-email/{TEST_PARTNER_ID}",
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Response data assertion
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "message" in data, "Expected message in response"
        assert TEST_PARTNER_EMAIL in data.get("message", ""), \
            f"Expected partner email in message, got: {data.get('message')}"
        
        print(f"✅ Welcome email sent successfully: {data.get('message')}")
    
    def test_send_welcome_email_invalid_partner_returns_404(self):
        """Test that invalid partner ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/send-welcome-email/invalid-partner-id",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Invalid partner returns 404 as expected")
    
    def test_email_log_created(self):
        """Test that email log is created in database (via API check)"""
        # First send an email
        response = requests.post(
            f"{BASE_URL}/api/onboarding/send-welcome-email/{TEST_PARTNER_ID}",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        
        # Check partner onboarding status was updated
        partner_response = requests.get(f"{BASE_URL}/api/partners/{TEST_PARTNER_ID}")
        assert partner_response.status_code == 200
        
        partner_data = partner_response.json()
        onboarding_status = partner_data.get("onboarding_status", {})
        
        # Verify welcome email was marked as sent
        assert onboarding_status.get("welcome_email_sent") == True, \
            "Expected welcome_email_sent to be True"
        
        print(f"✅ Partner onboarding status updated: {onboarding_status}")


class TestPartnerDataForBonus:
    """Tests for Partner data retrieval (used by Bonus Strategici page)"""
    
    def test_get_partner_by_id(self):
        """Test getting partner data by ID"""
        response = requests.get(f"{BASE_URL}/api/partners/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("id") == TEST_PARTNER_ID, "Partner ID mismatch"
        assert "name" in data, "Expected name in partner data"
        assert "phase" in data, "Expected phase in partner data"
        
        print(f"✅ Partner data retrieved: {data.get('name')} - Phase: {data.get('phase')}")
    
    def test_get_all_partners(self):
        """Test getting all partners list"""
        response = requests.get(f"{BASE_URL}/api/partners")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of partners"
        assert len(data) > 0, "Expected at least one partner"
        
        # Find our test partner
        test_partner = next((p for p in data if p.get("id") == TEST_PARTNER_ID), None)
        assert test_partner is not None, f"Test partner {TEST_PARTNER_ID} not found in list"
        
        print(f"✅ Partners list retrieved: {len(data)} partners")


class TestAuthentication:
    """Tests for authentication (required for partner view)"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Expected access_token in response"
        assert data.get("user", {}).get("role") == "admin", "Expected admin role"
        
        print(f"✅ Admin login successful: {data.get('user', {}).get('name')}")
        return data.get("access_token")
    
    def test_partner_login(self):
        """Test partner login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_PARTNER_EMAIL, "password": "Test2026!"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Expected access_token in response"
        assert data.get("user", {}).get("role") == "partner", "Expected partner role"
        
        print(f"✅ Partner login successful: {data.get('user', {}).get('name')}")
        return data.get("access_token")


class TestOnboardingStatus:
    """Tests for onboarding status endpoint"""
    
    def test_get_onboarding_status(self):
        """Test getting onboarding status for all partners"""
        response = requests.get(f"{BASE_URL}/api/onboarding/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "partners" in data, "Expected partners in response"
        
        partners = data.get("partners", [])
        assert len(partners) > 0, "Expected at least one partner"
        
        # Find test partner
        test_partner = next((p for p in partners if p.get("id") == TEST_PARTNER_ID), None)
        assert test_partner is not None, "Test partner not found in onboarding status"
        
        # Check onboarding_status structure
        onboarding = test_partner.get("onboarding_status", {})
        assert "welcome_email_sent" in onboarding, "Expected welcome_email_sent field"
        
        print(f"✅ Onboarding status retrieved for {len(partners)} partners")


class TestFilesEndpoint:
    """Tests for partner files endpoint (used by I Miei File page)"""
    
    def test_get_partner_files(self):
        """Test getting partner files"""
        response = requests.get(f"{BASE_URL}/api/files/partner/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "files" in data, "Expected files in response"
        
        files = data.get("files", {})
        # Files should have categories
        expected_categories = ["video", "document", "image", "audio", "onboarding"]
        for cat in expected_categories:
            assert cat in files, f"Expected {cat} category in files"
        
        print(f"✅ Partner files retrieved: {data.get('total', 0)} total files")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
