"""
Test Done-for-You data APIs (webinar, funnel-light, masterclass, videocorso, lancio).
NB: il vecchio sistema step-status (collection step_statuses) è stato rimosso col
consolidamento 2026-06-03 — la fonte di verità è ora partner_journey_steps.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWebinarAPI:
    """Tests for Webinar Done-for-You endpoints"""
    
    def test_get_webinar_partner_2(self):
        """GET webinar data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        # webinar can be null if not yet created
        print(f"Webinar data for partner 2: {data.get('webinar')}")
    
    def test_get_webinar_invalid_partner(self):
        """GET webinar for non-existent partner - should return 404"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/webinar/99999")
        assert response.status_code == 404


class TestFunnelLightAPI:
    """Tests for Funnel Light endpoints"""
    
    def test_get_funnel_light_partner_2(self):
        """GET funnel light data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel-light/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Funnel light data: {data.get('funnel_light')}")


class TestMasterclassAPI:
    """Tests for Masterclass endpoints"""
    
    def test_get_masterclass_partner_2(self):
        """GET masterclass data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/masterclass/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Masterclass data: {data.get('masterclass')}")


class TestVideocorsoAPI:
    """Tests for Videocorso endpoints"""
    
    def test_get_videocorso_partner_2(self):
        """GET videocorso data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/videocorso/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Videocorso data: course_generated={data.get('course_generated')}")


class TestLancioAPI:
    """Tests for Lancio endpoints"""
    
    def test_get_lancio_partner_2(self):
        """GET lancio data for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Lancio data: is_generated={data.get('is_generated')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
