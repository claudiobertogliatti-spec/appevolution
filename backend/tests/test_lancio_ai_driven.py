"""
Test suite for Lancio AI-driven endpoints
Tests: GET /api/partner-journey/lancio/{partner_id}, POST approve-plan, POST generate-plan validation
Partner 2 (Arianna Aceto) has pre-generated and approved plan in DB
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLancioAIDriven:
    """Tests for Lancio AI-driven phase endpoints"""
    
    def test_get_lancio_returns_plan_data(self):
        """GET /api/partner-journey/lancio/2 returns plan_data with all required fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("partner_id") == "2"
        
        # Verify plan_data exists
        plan_data = data.get("plan_data")
        assert plan_data is not None, "plan_data should be present"
        
        # Verify calendario_30g has 30 items
        calendario = plan_data.get("calendario_30g", [])
        assert len(calendario) == 30, f"Expected 30 calendar items, got {len(calendario)}"
        
        # Verify first calendar item structure
        first_day = calendario[0]
        assert "giorno" in first_day
        assert "tipo" in first_day
        assert "obiettivo" in first_day
        assert "titolo" in first_day
        assert "cta" in first_day
        
    def test_get_lancio_contenuti_pronti(self):
        """GET /api/partner-journey/lancio/2 returns contenuti_pronti with reel, carousel, post"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200
        
        data = response.json()
        plan_data = data.get("plan_data", {})
        contenuti = plan_data.get("contenuti_pronti", {})
        
        # Verify reel array
        reel = contenuti.get("reel", [])
        assert len(reel) >= 3, f"Expected at least 3 reels, got {len(reel)}"
        if reel:
            assert "titolo" in reel[0]
            assert "hook" in reel[0]
            assert "script" in reel[0]
            assert "cta" in reel[0]
        
        # Verify carousel array
        carousel = contenuti.get("carousel", [])
        assert len(carousel) >= 3, f"Expected at least 3 carousels, got {len(carousel)}"
        if carousel:
            assert "titolo" in carousel[0]
            assert "slide" in carousel[0]
            assert "cta" in carousel[0]
        
        # Verify post array
        post = contenuti.get("post", [])
        assert len(post) >= 3, f"Expected at least 3 posts, got {len(post)}"
        if post:
            assert "titolo" in post[0]
            assert "testo" in post[0]
            assert "cta" in post[0]
    
    def test_get_lancio_piano_ads(self):
        """GET /api/partner-journey/lancio/2 returns piano_ads with required fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200
        
        data = response.json()
        plan_data = data.get("plan_data", {})
        piano_ads = plan_data.get("piano_ads", {})
        
        assert piano_ads is not None, "piano_ads should be present"
        assert "obiettivo_campagna" in piano_ads
        assert "pubblico_target" in piano_ads
        assert "budget_consigliato" in piano_ads
        assert "creativita" in piano_ads
        assert "copy_ads" in piano_ads
        
        # Verify creativita array
        creativita = piano_ads.get("creativita", [])
        assert len(creativita) >= 1, "Should have at least 1 creativita"
        
        # Verify copy_ads array
        copy_ads = piano_ads.get("copy_ads", [])
        assert len(copy_ads) >= 1, "Should have at least 1 copy_ads"
    
    def test_get_lancio_webinar(self):
        """GET /api/partner-journey/lancio/2 returns webinar with titolo, promessa, scaletta"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200
        
        data = response.json()
        plan_data = data.get("plan_data", {})
        webinar = plan_data.get("webinar", {})
        
        assert webinar is not None, "webinar should be present"
        assert "titolo" in webinar
        assert "promessa" in webinar
        assert "scaletta" in webinar
        assert "cta_vendita" in webinar
        
        # Verify scaletta array
        scaletta = webinar.get("scaletta", [])
        assert len(scaletta) >= 1, "Should have at least 1 scaletta item"
        if scaletta:
            assert "momento" in scaletta[0]
            assert "contenuto" in scaletta[0]
    
    def test_get_lancio_promozione_webinar(self):
        """GET /api/partner-journey/lancio/2 returns promozione_webinar with social, ads, email"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200
        
        data = response.json()
        plan_data = data.get("plan_data", {})
        promozione = plan_data.get("promozione_webinar", {})
        
        assert promozione is not None, "promozione_webinar should be present"
        assert "contenuti_social" in promozione
        assert "ads_webinar" in promozione
        assert "email_sequence" in promozione
        
        # Verify arrays have content
        assert len(promozione.get("contenuti_social", [])) >= 1
        assert len(promozione.get("ads_webinar", [])) >= 1
        assert len(promozione.get("email_sequence", [])) >= 1
    
    def test_get_lancio_plan_status(self):
        """GET /api/partner-journey/lancio/2 returns plan_generated=true and plan_approved=true"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("plan_generated") == True, "plan_generated should be True"
        assert data.get("plan_approved") == True, "plan_approved should be True"
    
    def test_generate_plan_empty_body_returns_422(self):
        """POST /api/partner-journey/lancio/generate-plan with empty body returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/generate-plan",
            json={},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        # Verify it's a validation error for missing partner_id
        detail = data.get("detail", [])
        assert len(detail) > 0
        assert detail[0].get("loc") == ["body", "partner_id"]
    
    def test_approve_plan_works(self):
        """POST /api/partner-journey/lancio/approve-plan?partner_id=2 works"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/lancio/approve-plan?partner_id=2",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert "approvato" in data.get("message", "").lower() or "approved" in data.get("message", "").lower()
    
    def test_get_lancio_invalid_partner_returns_404(self):
        """GET /api/partner-journey/lancio/99999 returns 404 for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/99999")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
