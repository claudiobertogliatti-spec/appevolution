"""
Test Funnel Distribution API - Systeme.io Share Link Workflow
Tests the admin workflow for distributing funnel templates to partners
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com')

class TestFunnelDistributionTemplates:
    """Test GET /api/partner-journey/funnel-distribution/templates"""
    
    def test_get_templates_returns_4_templates(self):
        """Verify templates endpoint returns exactly 4 templates"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/templates")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["templates"]) == 4
    
    def test_templates_have_required_fields(self):
        """Verify each template has id, name, share_link, desc"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/templates")
        data = response.json()
        for template in data["templates"]:
            assert "id" in template
            assert "name" in template
            assert "share_link" in template
            assert "desc" in template
            assert template["share_link"].startswith("https://systeme.io/share/")
    
    def test_template_ids_are_correct(self):
        """Verify template IDs match expected values"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/templates")
        data = response.json()
        template_ids = [t["id"] for t in data["templates"]]
        assert "webinar-evergreen" in template_ids
        assert "masterclass-transformation" in template_ids
        assert "sales-page-pro" in template_ids
        assert "lead-gen-basic" in template_ids


class TestFunnelDistributionAllPending:
    """Test GET /api/partner-journey/funnel-distribution/all-pending"""
    
    def test_all_pending_returns_structure(self):
        """Verify all-pending returns pending, delivered, and templates"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/all-pending")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "pending" in data
        assert "delivered" in data
        assert "templates" in data
        assert isinstance(data["pending"], list)
        assert isinstance(data["delivered"], list)
        assert isinstance(data["templates"], list)
    
    def test_all_pending_templates_match_templates_endpoint(self):
        """Verify templates in all-pending match dedicated templates endpoint"""
        all_pending = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/all-pending").json()
        templates = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/templates").json()
        assert len(all_pending["templates"]) == len(templates["templates"])


class TestFunnelDistributionByPartner:
    """Test GET /api/partner-journey/funnel-distribution/{partner_id}"""
    
    def test_get_distributions_for_partner_3(self):
        """Verify Partner 3 (Marco Orlandi) has at least 1 distribution"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/3")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "distributions" in data
        assert len(data["distributions"]) >= 1
    
    def test_distribution_has_required_fields(self):
        """Verify distribution has all required fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/3")
        data = response.json()
        if data["distributions"]:
            dist = data["distributions"][0]
            assert "distribution_id" in dist
            assert "partner_id" in dist
            assert "partner_name" in dist
            assert "template_id" in dist
            assert "template_name" in dist
            assert "share_link" in dist
            assert "status" in dist
            assert "history" in dist
    
    def test_nonexistent_partner_returns_404(self):
        """Verify nonexistent partner returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/99999")
        assert response.status_code == 404


class TestFunnelDistributionAssign:
    """Test POST /api/partner-journey/funnel-distribution/assign"""
    
    def test_assign_new_distribution(self):
        """Verify assigning a new distribution creates it correctly"""
        # Use a unique timestamp to avoid conflicts
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/assign",
            json={
                "partner_id": "3",
                "template_id": "lead-gen-basic",
                "notes": f"Test assignment {int(time.time())}"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "distribution" in data
        dist = data["distribution"]
        assert dist["partner_id"] == "3"
        assert dist["template_id"] == "lead-gen-basic"
        assert dist["status"] == "da_importare"
        assert dist["partner_name"] == "Marco Orlandi"
        assert len(dist["history"]) == 1
    
    def test_assign_invalid_template_returns_400(self):
        """Verify assigning invalid template returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/assign",
            json={
                "partner_id": "3",
                "template_id": "nonexistent-template",
                "notes": "Test"
            }
        )
        assert response.status_code == 400
    
    def test_assign_invalid_partner_returns_404(self):
        """Verify assigning to invalid partner returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/assign",
            json={
                "partner_id": "99999",
                "template_id": "webinar-evergreen",
                "notes": "Test"
            }
        )
        assert response.status_code == 404


class TestFunnelDistributionUpdateStatus:
    """Test POST /api/partner-journey/funnel-distribution/update-status"""
    
    @pytest.fixture
    def test_distribution(self):
        """Create a test distribution for status update tests"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/assign",
            json={
                "partner_id": "3",
                "template_id": "sales-page-pro",
                "notes": f"Test for status updates {int(time.time())}"
            }
        )
        return response.json()["distribution"]
    
    def test_update_status_to_importato(self, test_distribution):
        """Verify status can be updated to importato"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": test_distribution["partner_id"],
                "distribution_id": test_distribution["distribution_id"],
                "status": "importato",
                "notes": "Imported into sub-account"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "importato" in data["message"]
    
    def test_update_status_to_personalizzato(self, test_distribution):
        """Verify status can be updated to personalizzato"""
        # First update to importato
        requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": test_distribution["partner_id"],
                "distribution_id": test_distribution["distribution_id"],
                "status": "importato",
                "notes": "Imported"
            }
        )
        # Then update to personalizzato
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": test_distribution["partner_id"],
                "distribution_id": test_distribution["distribution_id"],
                "status": "personalizzato",
                "notes": "Customized"
            }
        )
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_update_status_to_live_with_url(self, test_distribution):
        """Verify status can be updated to live with URL"""
        # Advance through statuses
        for status in ["importato", "personalizzato"]:
            requests.post(
                f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
                json={
                    "partner_id": test_distribution["partner_id"],
                    "distribution_id": test_distribution["distribution_id"],
                    "status": status,
                    "notes": f"Advanced to {status}"
                }
            )
        # Update to live with URL
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": test_distribution["partner_id"],
                "distribution_id": test_distribution["distribution_id"],
                "status": "live",
                "live_url": "https://test.systeme.io/funnel",
                "notes": "Funnel is live"
            }
        )
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_update_nonexistent_distribution_returns_404(self):
        """Verify updating nonexistent distribution returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": "3",
                "distribution_id": "nonexistent-dist-id",
                "status": "importato",
                "notes": "Test"
            }
        )
        assert response.status_code == 404


class TestFunnelDistributionConsegnatoUpdatesLight:
    """Test that consegnato status updates funnel_light collection"""
    
    def test_consegnato_updates_funnel_light(self):
        """Verify consegnato with live_url updates funnel_light"""
        # Create a new distribution for partner 3
        assign_response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/assign",
            json={
                "partner_id": "3",
                "template_id": "webinar-evergreen",
                "notes": f"Test consegnato flow {int(time.time())}"
            }
        )
        dist = assign_response.json()["distribution"]
        
        # Advance through all statuses
        test_url = f"https://marco.systeme.io/webinar-{int(time.time())}"
        for status in ["importato", "personalizzato", "live"]:
            requests.post(
                f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
                json={
                    "partner_id": dist["partner_id"],
                    "distribution_id": dist["distribution_id"],
                    "status": status,
                    "live_url": test_url if status == "live" else "",
                    "notes": f"Advanced to {status}"
                }
            )
        
        # Update to consegnato with live_url
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel-distribution/update-status",
            json={
                "partner_id": dist["partner_id"],
                "distribution_id": dist["distribution_id"],
                "status": "consegnato",
                "live_url": test_url,
                "notes": "Delivered to partner"
            }
        )
        assert response.status_code == 200
        
        # Verify funnel_light was updated
        funnel_light = requests.get(f"{BASE_URL}/api/partner-journey/funnel-light/3").json()
        assert funnel_light["success"] == True
        # The funnel_light should have the systeme_url set
        if funnel_light.get("funnel_light"):
            assert funnel_light["funnel_light"].get("published") == True


class TestDistributionStatuses:
    """Test the 5 distribution statuses"""
    
    def test_valid_statuses(self):
        """Verify all 5 statuses are valid"""
        valid_statuses = ["da_importare", "importato", "personalizzato", "live", "consegnato"]
        
        # Get a distribution to check its status
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-distribution/3")
        data = response.json()
        
        if data["distributions"]:
            dist = data["distributions"][0]
            assert dist["status"] in valid_statuses


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
