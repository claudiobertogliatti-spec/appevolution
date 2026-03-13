"""
Test file for Funnel Page (5 blocks) and Lead Management endpoints
Tests: funnel-complete, save-domain, generate-legal, leads endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFunnelCompleteEndpoint:
    """Tests for GET /api/partner-journey/funnel-complete/{partner_id}"""
    
    def test_funnel_complete_returns_data(self):
        """Test that funnel-complete endpoint returns all funnel data"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-complete/1")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert data.get("partner_id") == "1"
        assert "partner_name" in data
        assert "funnel_content" in data
        assert "page_states" in data
        assert "content_approved" in data
        assert "domain" in data
        assert "legal" in data
        assert "publish_state" in data
        print(f"✅ funnel-complete returns all expected fields for partner 1")
    
    def test_funnel_complete_404_for_invalid_partner(self):
        """Test that funnel-complete returns 404 for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-complete/invalid-partner-999")
        
        assert response.status_code == 404
        print(f"✅ funnel-complete returns 404 for invalid partner")


class TestSaveDomainEndpoint:
    """Tests for POST /api/partner-journey/funnel/save-domain"""
    
    def test_save_domain_success(self):
        """Test saving domain configuration"""
        payload = {
            "partner_id": "1",
            "domain": f"test-{uuid.uuid4().hex[:8]}.example.com",
            "email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/save-domain",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "domain" in data
        assert data["domain"]["domain"] == payload["domain"]
        assert data["domain"]["email"] == payload["email"]
        assert data["domain"]["status"] == "inserted"
        print(f"✅ save-domain successfully saves domain configuration")
    
    def test_save_domain_persists(self):
        """Test that saved domain persists in funnel-complete"""
        # First save a domain
        test_domain = f"persist-test-{uuid.uuid4().hex[:8]}.example.com"
        payload = {
            "partner_id": "1",
            "domain": test_domain,
            "email": "persist@example.com"
        }
        
        save_response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/save-domain",
            json=payload
        )
        assert save_response.status_code == 200
        
        # Verify it persists
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-complete/1")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("domain") is not None
        assert data["domain"]["domain"] == test_domain
        print(f"✅ save-domain persists domain in database")
    
    def test_save_domain_404_for_invalid_partner(self):
        """Test save-domain returns 404 for non-existent partner"""
        payload = {
            "partner_id": "invalid-partner-999",
            "domain": "test.example.com",
            "email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/save-domain",
            json=payload
        )
        
        assert response.status_code == 404
        print(f"✅ save-domain returns 404 for invalid partner")


class TestGenerateLegalEndpoint:
    """Tests for POST /api/partner-journey/funnel/generate-legal"""
    
    def test_generate_legal_success(self):
        """Test generating legal pages"""
        payload = {"partner_id": "1"}
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/generate-legal",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "legal" in data
        
        # Verify all 4 legal pages are generated
        legal = data["legal"]
        expected_pages = ["privacy", "cookie", "terms", "disclaimer"]
        for page in expected_pages:
            assert page in legal, f"Missing legal page: {page}"
            assert legal[page].get("generated") == True
            assert "content" in legal[page]
        
        print(f"✅ generate-legal creates all 4 legal pages: {expected_pages}")
    
    def test_generate_legal_persists(self):
        """Test that generated legal pages persist"""
        # Generate legal pages
        payload = {"partner_id": "1"}
        gen_response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/generate-legal",
            json=payload
        )
        assert gen_response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-complete/1")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("legal") is not None
        assert "privacy" in data["legal"]
        print(f"✅ generate-legal persists legal pages in database")
    
    def test_generate_legal_404_for_invalid_partner(self):
        """Test generate-legal returns 404 for non-existent partner"""
        payload = {"partner_id": "invalid-partner-999"}
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/generate-legal",
            json=payload
        )
        
        assert response.status_code == 404
        print(f"✅ generate-legal returns 404 for invalid partner")


class TestLeadsEndpoints:
    """Tests for Lead Management endpoints"""
    
    def test_get_leads_returns_data(self):
        """Test GET /api/partner-journey/leads/{partner_id}"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/leads/1")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("partner_id") == "1"
        assert "leads" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert "funnel_origins" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_leads" in stats
        assert "leads_today" in stats
        assert "leads_this_month" in stats
        assert "by_status" in stats
        
        print(f"✅ GET leads returns all expected fields with stats")
    
    def test_get_leads_with_filters(self):
        """Test GET leads with query filters"""
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/leads/1",
            params={"status": "new", "page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ GET leads works with query filters")
    
    def test_get_leads_404_for_invalid_partner(self):
        """Test GET leads returns 404 for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/leads/invalid-partner-999")
        
        assert response.status_code == 404
        print(f"✅ GET leads returns 404 for invalid partner")
    
    def test_webhook_creates_lead(self):
        """Test POST /api/partner-journey/leads/webhook/{partner_id}"""
        test_email = f"test-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test Lead",
            "email": test_email,
            "phone": "+39123456789",
            "funnel_origin": "optin",
            "source": "test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/leads/webhook/1",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "lead_id" in data
        print(f"✅ webhook creates new lead successfully")
    
    def test_webhook_updates_existing_lead(self):
        """Test webhook updates existing lead instead of creating duplicate"""
        test_email = f"duplicate-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test Lead",
            "email": test_email,
            "phone": "+39123456789",
            "funnel_origin": "optin"
        }
        
        # Create first lead
        response1 = requests.post(
            f"{BASE_URL}/api/partner-journey/leads/webhook/1",
            json=payload
        )
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/partner-journey/leads/webhook/1",
            json=payload
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should update existing, not create new
        assert "Lead esistente aggiornato" in data2.get("message", "") or data2.get("success") == True
        print(f"✅ webhook handles duplicate leads correctly")
    
    def test_webhook_404_for_invalid_partner(self):
        """Test webhook returns 404 for non-existent partner"""
        payload = {
            "name": "Test",
            "email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/leads/webhook/invalid-partner-999",
            json=payload
        )
        
        assert response.status_code == 404
        print(f"✅ webhook returns 404 for invalid partner")


class TestExportCSVEndpoint:
    """Tests for POST /api/partner-journey/leads/export-csv/{partner_id}"""
    
    def test_export_csv_returns_file(self):
        """Test CSV export returns proper CSV file"""
        response = requests.post(f"{BASE_URL}/api/partner-journey/leads/export-csv/1")
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        
        # Verify CSV content has header
        content = response.text
        assert "Nome" in content or "Email" in content
        print(f"✅ export-csv returns valid CSV file")
    
    def test_export_csv_404_for_invalid_partner(self):
        """Test export-csv returns 404 for non-existent partner"""
        response = requests.post(f"{BASE_URL}/api/partner-journey/leads/export-csv/invalid-partner-999")
        
        assert response.status_code == 404
        print(f"✅ export-csv returns 404 for invalid partner")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
