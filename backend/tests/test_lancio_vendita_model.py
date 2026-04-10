"""
Test Lancio Vendita Model - Evolution PRO
Tests the new sales funnel model: Traffico → Landing → Webinar → Offerta → Follow-up
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLancioVenditaModel:
    """Tests for GET /api/partner-journey/lancio/2 with new sales model structure"""
    
    def test_lancio_endpoint_returns_200(self):
        """Test that lancio endpoint returns 200 for partner 2"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Lancio endpoint returns 200")
    
    def test_plan_data_contains_all_sections(self):
        """Test that plan_data contains all required sections"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        plan = data.get('plan_data', {})
        
        required_sections = ['landing_page', 'webinar', 'offerta', 'email_followup', 
                           'calendario_30g', 'contenuti_pronti', 'piano_ads']
        
        for section in required_sections:
            assert section in plan, f"Missing section: {section}"
            print(f"✓ plan_data contains {section}")
    
    def test_landing_page_structure(self):
        """Test landing_page has required fields: headline, promessa, problema, benefici, cta_iscrizione"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        lp = data.get('plan_data', {}).get('landing_page', {})
        
        # Required fields
        assert lp.get('headline'), "landing_page.headline is missing or empty"
        assert lp.get('promessa'), "landing_page.promessa is missing or empty"
        assert lp.get('problema'), "landing_page.problema is missing or empty"
        assert isinstance(lp.get('benefici'), list), "landing_page.benefici should be an array"
        assert len(lp.get('benefici', [])) >= 1, "landing_page.benefici should have at least 1 item"
        assert lp.get('cta_iscrizione'), "landing_page.cta_iscrizione is missing or empty"
        
        print(f"✓ landing_page.headline: {lp.get('headline')[:50]}...")
        print(f"✓ landing_page.promessa: present")
        print(f"✓ landing_page.problema: present")
        print(f"✓ landing_page.benefici: {len(lp.get('benefici', []))} items")
        print(f"✓ landing_page.cta_iscrizione: {lp.get('cta_iscrizione')}")
    
    def test_offerta_structure(self):
        """Test offerta has required fields: nome_prodotto, prezzo_pieno, prezzo_lancio, bonus (3), garanzia, urgenza"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        off = data.get('plan_data', {}).get('offerta', {})
        
        # Required fields
        assert off.get('nome_prodotto'), "offerta.nome_prodotto is missing or empty"
        assert off.get('prezzo_pieno'), "offerta.prezzo_pieno is missing or empty"
        assert off.get('prezzo_lancio'), "offerta.prezzo_lancio is missing or empty"
        assert isinstance(off.get('bonus'), list), "offerta.bonus should be an array"
        assert len(off.get('bonus', [])) >= 3, f"offerta.bonus should have at least 3 items, got {len(off.get('bonus', []))}"
        assert off.get('garanzia'), "offerta.garanzia is missing or empty"
        assert off.get('urgenza'), "offerta.urgenza is missing or empty"
        
        print(f"✓ offerta.nome_prodotto: {off.get('nome_prodotto')}")
        print(f"✓ offerta.prezzo_pieno: {off.get('prezzo_pieno')}")
        print(f"✓ offerta.prezzo_lancio: {off.get('prezzo_lancio')}")
        print(f"✓ offerta.bonus: {len(off.get('bonus', []))} items")
        print(f"✓ offerta.garanzia: present")
        print(f"✓ offerta.urgenza: present")
    
    def test_email_followup_structure(self):
        """Test email_followup is array of 6 emails with numero, timing, tipo, subject, body"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        emails = data.get('plan_data', {}).get('email_followup', [])
        
        assert isinstance(emails, list), "email_followup should be an array"
        assert len(emails) == 6, f"email_followup should have exactly 6 emails, got {len(emails)}"
        
        for i, email in enumerate(emails):
            assert email.get('numero'), f"Email {i+1}: numero is missing"
            assert email.get('timing'), f"Email {i+1}: timing is missing"
            assert email.get('tipo'), f"Email {i+1}: tipo is missing"
            assert email.get('subject'), f"Email {i+1}: subject is missing"
            assert email.get('body'), f"Email {i+1}: body is missing"
            print(f"✓ Email {email.get('numero')}: timing={email.get('timing')}, tipo={email.get('tipo')}")
    
    def test_webinar_has_obiezioni_comuni(self):
        """Test webinar has obiezioni_comuni array"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        web = data.get('plan_data', {}).get('webinar', {})
        
        assert web.get('titolo'), "webinar.titolo is missing or empty"
        assert isinstance(web.get('obiezioni_comuni'), list), "webinar.obiezioni_comuni should be an array"
        assert len(web.get('obiezioni_comuni', [])) >= 1, "webinar.obiezioni_comuni should have at least 1 item"
        
        for ob in web.get('obiezioni_comuni', []):
            assert ob.get('obiezione'), "obiezione field is missing"
            assert ob.get('risposta'), "risposta field is missing"
        
        print(f"✓ webinar.titolo: {web.get('titolo')[:50]}...")
        print(f"✓ webinar.obiezioni_comuni: {len(web.get('obiezioni_comuni', []))} items")
    
    def test_webinar_scaletta_structure(self):
        """Test webinar.scaletta has numbered phases"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        web = data.get('plan_data', {}).get('webinar', {})
        scaletta = web.get('scaletta', [])
        
        assert isinstance(scaletta, list), "webinar.scaletta should be an array"
        assert len(scaletta) >= 4, f"webinar.scaletta should have at least 4 phases, got {len(scaletta)}"
        
        for i, fase in enumerate(scaletta):
            assert fase.get('momento'), f"Fase {i+1}: momento is missing"
            assert fase.get('contenuto'), f"Fase {i+1}: contenuto is missing"
            print(f"✓ Scaletta fase {i+1}: {fase.get('momento')}")
    
    def test_calendario_30g_structure(self):
        """Test calendario_30g is an array"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        cal = data.get('plan_data', {}).get('calendario_30g', [])
        
        assert isinstance(cal, list), "calendario_30g should be an array"
        print(f"✓ calendario_30g: {len(cal)} items")
    
    def test_contenuti_pronti_structure(self):
        """Test contenuti_pronti is an object with reel, carousel, post"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        cont = data.get('plan_data', {}).get('contenuti_pronti', {})
        
        assert isinstance(cont, dict), "contenuti_pronti should be an object"
        # At least one of these should exist
        has_content = cont.get('reel') or cont.get('carousel') or cont.get('post')
        assert has_content, "contenuti_pronti should have at least one of: reel, carousel, post"
        print(f"✓ contenuti_pronti: reel={len(cont.get('reel', []))}, carousel={len(cont.get('carousel', []))}, post={len(cont.get('post', []))}")
    
    def test_piano_ads_structure(self):
        """Test piano_ads is an object"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/lancio/2")
        data = response.json()
        ads = data.get('plan_data', {}).get('piano_ads', {})
        
        assert isinstance(ads, dict), "piano_ads should be an object"
        assert ads.get('obiettivo_campagna') or ads.get('pubblico_target'), "piano_ads should have campaign info"
        print(f"✓ piano_ads: obiettivo={ads.get('obiettivo_campagna', 'N/A')[:30]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
