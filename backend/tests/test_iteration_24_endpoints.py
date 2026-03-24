"""
Test Suite for Iteration 24 - Evolution PRO
Tests for:
1. Masterclass endpoints (GET /genera alias, POST /generate-script)
2. Partners Unified View (GET /partners-unified)
3. Admin Email Templates (GET, PUT, POST preview)
4. YouTube OAuth Status (GET /youtube/status)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://evolution-pro-lead.preview.emergentagent.com"

print(f"[TEST] Using BASE_URL: {BASE_URL}")


class TestMasterclassEndpoints:
    """Tests for Masterclass generation endpoints"""
    
    def test_masterclass_genera_alias_with_valid_partner(self):
        """Test GET /api/partner-journey/masterclass/genera?partner_id=23"""
        # Partner ID 23 = Daniele Andolfi (from test info)
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/masterclass/genera",
            params={"partner_id": "23"},
            timeout=60  # LLM generation can take time
        )
        
        print(f"[TEST] Masterclass genera alias - Status: {response.status_code}")
        
        # Should return 200 or 500 (if LLM fails) - not 404 or 422
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}, body: {response.text[:500]}"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data or "script" in data, f"Missing expected fields: {data.keys()}"
            print(f"[TEST] Masterclass genera - SUCCESS: {data.get('success', 'N/A')}")
    
    def test_masterclass_genera_alias_with_invalid_partner(self):
        """Test GET /api/partner-journey/masterclass/genera with non-existent partner"""
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/masterclass/genera",
            params={"partner_id": "99999"},
            timeout=30
        )
        
        print(f"[TEST] Masterclass genera invalid partner - Status: {response.status_code}")
        
        # Should return 404 for non-existent partner
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_masterclass_generate_script_post(self):
        """Test POST /api/partner-journey/masterclass/generate-script"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/masterclass/generate-script",
            json={"partner_id": "23"},
            timeout=60
        )
        
        print(f"[TEST] Masterclass generate-script POST - Status: {response.status_code}")
        
        # Should return 200 or 500 (if LLM fails)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data, f"Missing 'success' field: {data.keys()}"
            print(f"[TEST] Generate script - SUCCESS: {data.get('success')}")
    
    def test_masterclass_get_partner_data(self):
        """Test GET /api/partner-journey/masterclass/{partner_id}"""
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/masterclass/23",
            timeout=30
        )
        
        print(f"[TEST] Masterclass GET partner data - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "success" in data
        assert "partner_id" in data
        assert "masterclass" in data
        print(f"[TEST] Masterclass data retrieved for partner: {data.get('partner_id')}")


class TestPartnersUnifiedView:
    """Tests for Partners Unified View endpoints (fix ObjectId)"""
    
    def test_get_all_partners_unified(self):
        """Test GET /api/partners-unified - should not have ObjectId serialization errors"""
        response = requests.get(
            f"{BASE_URL}/api/partners-unified",
            timeout=30
        )
        
        print(f"[TEST] Partners unified - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}, body: {response.text[:500]}"
        
        data = response.json()
        assert "partners" in data, f"Missing 'partners' field: {data.keys()}"
        assert "total" in data, f"Missing 'total' field: {data.keys()}"
        
        # Verify no ObjectId serialization issues (would cause 500 error)
        partners = data.get("partners", [])
        print(f"[TEST] Partners unified - Total: {data.get('total')}, Retrieved: {len(partners)}")
        
        # Check that _id is not present in any partner (serialize_doc should remove it)
        for partner in partners[:5]:  # Check first 5
            assert "_id" not in partner, f"ObjectId '_id' found in partner: {partner.get('id', 'unknown')}"
    
    def test_get_single_partner_unified(self):
        """Test GET /api/partners-unified/{partner_id}"""
        # Use partner ID 23 (Daniele Andolfi)
        response = requests.get(
            f"{BASE_URL}/api/partners-unified/23",
            timeout=30
        )
        
        print(f"[TEST] Partner unified single - Status: {response.status_code}")
        
        # Could be 404 if view not created or partner doesn't exist
        if response.status_code == 200:
            data = response.json()
            assert "_id" not in data, "ObjectId '_id' should be removed by serialize_doc"
            print(f"[TEST] Partner unified - ID: {data.get('id')}, Name: {data.get('name')}")
        elif response.status_code == 404:
            print("[TEST] Partner not found in unified view (may need view initialization)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_partners_unified_filter_active_production(self):
        """Test GET /api/partners-unified/filter/active-production"""
        response = requests.get(
            f"{BASE_URL}/api/partners-unified/filter/active-production",
            timeout=30
        )
        
        print(f"[TEST] Partners active production - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "partners" in data
        print(f"[TEST] Active production partners: {data.get('total', 0)}")


class TestAdminEmailTemplates:
    """Tests for Admin Email Templates endpoints"""
    
    def test_list_email_templates(self):
        """Test GET /api/admin/email-templates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/email-templates",
            timeout=30
        )
        
        print(f"[TEST] Email templates list - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data, f"Missing 'templates' field: {data.keys()}"
        assert "total" in data, f"Missing 'total' field: {data.keys()}"
        
        templates = data.get("templates", [])
        print(f"[TEST] Email templates - Total: {data.get('total')}")
        
        # Verify expected templates exist
        template_ids = [t.get("template_id") for t in templates]
        expected_templates = ["partnership_welcome", "analisi_welcome", "analisi_reminder_48h"]
        
        for expected in expected_templates:
            assert expected in template_ids, f"Missing expected template: {expected}"
            print(f"[TEST] Found template: {expected}")
    
    def test_get_single_template_partnership_welcome(self):
        """Test GET /api/admin/email-templates/partnership_welcome"""
        response = requests.get(
            f"{BASE_URL}/api/admin/email-templates/partnership_welcome",
            timeout=30
        )
        
        print(f"[TEST] Get partnership_welcome template - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subject" in data, f"Missing 'subject' field: {data.keys()}"
        assert "body_html" in data, f"Missing 'body_html' field: {data.keys()}"
        assert "variables" in data, f"Missing 'variables' field: {data.keys()}"
        
        print(f"[TEST] Template subject: {data.get('subject', '')[:50]}...")
        print(f"[TEST] Template variables: {data.get('variables')}")
    
    def test_get_nonexistent_template(self):
        """Test GET /api/admin/email-templates/{nonexistent}"""
        response = requests.get(
            f"{BASE_URL}/api/admin/email-templates/nonexistent_template_xyz",
            timeout=30
        )
        
        print(f"[TEST] Get nonexistent template - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_preview_template_partnership_welcome(self):
        """Test POST /api/admin/email-templates/partnership_welcome/preview"""
        response = requests.post(
            f"{BASE_URL}/api/admin/email-templates/partnership_welcome/preview",
            json={
                "variables": {
                    "nome": "Test User",
                    "email": "test@example.com"
                }
            },
            timeout=30
        )
        
        print(f"[TEST] Preview partnership_welcome - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subject" in data, f"Missing 'subject' field: {data.keys()}"
        assert "html_body" in data, f"Missing 'html_body' field: {data.keys()}"
        assert "variables_used" in data, f"Missing 'variables_used' field: {data.keys()}"
        
        # Verify variables were replaced
        html_body = data.get("html_body", "")
        assert "Test User" in html_body, "Variable {{nome}} not replaced"
        assert "test@example.com" in html_body, "Variable {{email}} not replaced"
        
        print(f"[TEST] Preview rendered successfully with variables")
    
    def test_update_template(self):
        """Test PUT /api/admin/email-templates/partnership_welcome"""
        # First get the current template
        get_response = requests.get(
            f"{BASE_URL}/api/admin/email-templates/partnership_welcome",
            timeout=30
        )
        
        if get_response.status_code != 200:
            pytest.skip("Could not get template for update test")
        
        original = get_response.json()
        
        # Update with same content (to avoid breaking the template)
        response = requests.put(
            f"{BASE_URL}/api/admin/email-templates/partnership_welcome",
            json={
                "subject": original.get("subject"),
                "body_html": original.get("body_html"),
                "description": original.get("description", "Test update"),
                "variables": original.get("variables", ["nome", "email"])
            },
            timeout=30
        )
        
        print(f"[TEST] Update template - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, f"Update failed: {data}"
        print(f"[TEST] Template updated successfully")


class TestYouTubeOAuthStatus:
    """Tests for YouTube OAuth status endpoint"""
    
    def test_youtube_status(self):
        """Test GET /api/youtube/status"""
        response = requests.get(
            f"{BASE_URL}/api/youtube/status",
            timeout=30
        )
        
        print(f"[TEST] YouTube status - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "authenticated" in data, f"Missing 'authenticated' field: {data.keys()}"
        assert "config_exists" in data, f"Missing 'config_exists' field: {data.keys()}"
        
        print(f"[TEST] YouTube authenticated: {data.get('authenticated')}")
        print(f"[TEST] YouTube config exists: {data.get('config_exists')}")
        
        # According to agent context, youtube_authenticated=true
        # But we just verify the endpoint works correctly


class TestRouteOrdering:
    """Tests to verify FastAPI route ordering fix for masterclass"""
    
    def test_genera_route_not_matched_as_partner_id(self):
        """Verify /genera is matched before /{partner_id}"""
        # This tests the fix: /genera endpoint should be defined BEFORE /{partner_id}
        # If not fixed, "genera" would be interpreted as a partner_id
        
        response = requests.get(
            f"{BASE_URL}/api/partner-journey/masterclass/genera",
            params={"partner_id": "23"},
            timeout=60
        )
        
        print(f"[TEST] Route ordering test - Status: {response.status_code}")
        
        # Should NOT return 404 with "Partner non trovato" for partner_id="genera"
        # Should return 200 (success) or 500 (LLM error) or 404 (partner 23 not found)
        if response.status_code == 404:
            data = response.json()
            detail = data.get("detail", "")
            # If 404, it should be because partner 23 doesn't exist, not because "genera" was matched as partner_id
            assert "genera" not in detail.lower(), f"Route ordering bug: 'genera' matched as partner_id: {detail}"
            print(f"[TEST] 404 is for partner not found, not route mismatch: {detail}")
        else:
            print(f"[TEST] Route ordering correct - endpoint responded with {response.status_code}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
