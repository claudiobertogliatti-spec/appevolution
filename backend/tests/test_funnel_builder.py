"""
Test Funnel Builder Module - Fase 4: Landing Page Builder + Documenti Legali
Tests for:
- GET /api/partner-journey/funnel/{partner_id}/landing-page
- POST /api/partner-journey/funnel/{partner_id}/landing-page
- GET /api/partner-journey/funnel/{partner_id}/documenti-legali
- POST /api/partner-journey/funnel/{partner_id}/documenti-legali
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Partner ID 2 = Arianna Aceto (F9) - good candidate for testing
TEST_PARTNER_ID = "2"


class TestFunnelBuilderLandingPage:
    """Tests for Landing Page Builder endpoints"""
    
    def test_get_landing_page_returns_prefill(self):
        """GET /api/partner-journey/funnel/{partner_id}/landing-page should return prefill data from partner profile"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "dati" in data, "Response should contain 'dati' field"
        assert "prefill" in data, "Response should contain 'prefill' field"
        assert "stato" in data, "Response should contain 'stato' field"
        assert "html_generato" in data, "Response should contain 'html_generato' field"
        
        # Verify prefill contains partner data
        prefill = data["prefill"]
        assert "PARTNER_NOME" in prefill, "Prefill should contain PARTNER_NOME"
        assert "PARTNER_NICCHIA" in prefill, "Prefill should contain PARTNER_NICCHIA"
        
        print(f"✓ GET landing-page returned prefill: PARTNER_NOME={prefill.get('PARTNER_NOME')}, PARTNER_NICCHIA={prefill.get('PARTNER_NICCHIA')}")
    
    def test_get_landing_page_nonexistent_partner(self):
        """GET /api/partner-journey/funnel/{partner_id}/landing-page should return 404 for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/nonexistent-partner-xyz/landing-page")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET landing-page returns 404 for non-existent partner")
    
    def test_save_landing_page_draft(self):
        """POST /api/partner-journey/funnel/{partner_id}/landing-page with genera_html:false should save draft"""
        payload = {
            "dati": {
                "PARTNER_NOME": "Test Partner",
                "HEADLINE_PRINCIPALE": "Test Headline",
                "CTA_TESTO_PRINCIPALE": "Scopri di più",
                "CTA_LINK": "https://example.com/checkout",
                "CORSO_NOME": "Test Corso",
                "CORSO_PREZZO": "497"
            },
            "genera_html": False,
            "stato": "bozza"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("stato") == "bozza", "Stato should be 'bozza'"
        assert data.get("html_generato") == "", "HTML should be empty when genera_html is false"
        
        print("✓ POST landing-page saves draft without generating HTML")
    
    def test_generate_landing_page_html(self):
        """POST /api/partner-journey/funnel/{partner_id}/landing-page with genera_html:true should generate HTML"""
        payload = {
            "dati": {
                "PARTNER_NOME": "Arianna Aceto",
                "PARTNER_NICCHIA": "Coaching",
                "HEADLINE_PRINCIPALE": "Trasforma la tua vita",
                "HEADLINE_SPAN": "in 30 giorni",
                "SOTTOTITOLO": "Il metodo che ha già aiutato centinaia di persone",
                "CTA_TESTO_PRINCIPALE": "Inizia Ora",
                "CTA_LINK": "https://example.com/checkout",
                "CORSO_NOME": "Corso Trasformazione",
                "CORSO_PREZZO": "497",
                "CORSO_PREZZO_ORIGINALE": "997",
                "INCLUSO_1": "Accesso a vita",
                "COLORE_PRIMARIO": "#1a1a2e",
                "COLORE_SECONDARIO": "#e94560",
                "COLORE_ACCENT": "#f5a623"
            },
            "genera_html": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("stato") == "pronta", "Stato should be 'pronta' after generation"
        
        html = data.get("html_generato", "")
        assert len(html) > 0, "HTML should be generated"
        assert "<!DOCTYPE html>" in html, "HTML should contain DOCTYPE"
        assert "Arianna Aceto" in html, "HTML should contain partner name"
        assert "Trasforma la tua vita" in html, "HTML should contain headline"
        assert "#1a1a2e" in html, "HTML should contain primary color"
        
        print(f"✓ POST landing-page generates HTML ({len(html)} chars)")
    
    def test_mark_landing_page_published(self):
        """POST /api/partner-journey/funnel/{partner_id}/landing-page with stato:'pubblicata' should update status"""
        # First generate HTML
        payload_generate = {
            "dati": {
                "PARTNER_NOME": "Test Partner",
                "HEADLINE_PRINCIPALE": "Test",
                "CTA_TESTO_PRINCIPALE": "CTA",
                "CTA_LINK": "https://example.com",
                "CORSO_NOME": "Test",
                "CORSO_PREZZO": "100"
            },
            "genera_html": True
        }
        requests.post(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page", json=payload_generate)
        
        # Then mark as published
        payload_publish = {
            "dati": payload_generate["dati"],
            "genera_html": False,
            "stato": "pubblicata"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page",
            json=payload_publish
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("stato") == "pubblicata", "Stato should be 'pubblicata'"
        
        print("✓ POST landing-page can mark as 'pubblicata'")


class TestFunnelBuilderDocumentiLegali:
    """Tests for Documenti Legali endpoints"""
    
    def test_get_documenti_legali_returns_prefill(self):
        """GET /api/partner-journey/funnel/{partner_id}/documenti-legali should return prefill data"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "dati" in data, "Response should contain 'dati' field"
        assert "prefill" in data, "Response should contain 'prefill' field"
        assert "stato" in data, "Response should contain 'stato' field"
        assert "cookie_policy_html" in data, "Response should contain 'cookie_policy_html' field"
        assert "privacy_policy_html" in data, "Response should contain 'privacy_policy_html' field"
        assert "condizioni_vendita_html" in data, "Response should contain 'condizioni_vendita_html' field"
        
        # Verify prefill contains partner data
        prefill = data["prefill"]
        assert "titolare_nome" in prefill, "Prefill should contain titolare_nome"
        assert "email_legale" in prefill, "Prefill should contain email_legale"
        
        print(f"✓ GET documenti-legali returned prefill: titolare_nome={prefill.get('titolare_nome')}")
    
    def test_get_documenti_legali_nonexistent_partner(self):
        """GET /api/partner-journey/funnel/{partner_id}/documenti-legali should return 404 for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/nonexistent-partner-xyz/documenti-legali")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET documenti-legali returns 404 for non-existent partner")
    
    def test_save_documenti_legali_without_generation(self):
        """POST /api/partner-journey/funnel/{partner_id}/documenti-legali with genera:false should save data"""
        payload = {
            "dati": {
                "titolare_nome": "Arianna",
                "titolare_cognome": "Aceto",
                "piva": "12345678901",
                "codice_fiscale": "CTARNN80A01H501Z",
                "indirizzo": "Via Roma 1",
                "citta": "Milano",
                "cap": "20100",
                "email_legale": "arianna@example.com",
                "sito_url": "https://arianna-aceto.com",
                "nome_sito": "Arianna Aceto Coaching"
            },
            "genera": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("stato") == "non_generato", "Stato should be 'non_generato'"
        assert data.get("cookie_policy_html") == "", "Cookie policy HTML should be empty"
        assert data.get("privacy_policy_html") == "", "Privacy policy HTML should be empty"
        assert data.get("condizioni_vendita_html") == "", "Condizioni vendita HTML should be empty"
        
        print("✓ POST documenti-legali saves data without generating HTML")
    
    def test_generate_documenti_legali(self):
        """POST /api/partner-journey/funnel/{partner_id}/documenti-legali with genera:true should generate 3 HTML documents"""
        payload = {
            "dati": {
                "titolare_nome": "Arianna",
                "titolare_cognome": "Aceto",
                "piva": "12345678901",
                "codice_fiscale": "CTARNN80A01H501Z",
                "indirizzo": "Via Roma 1",
                "citta": "Milano",
                "cap": "20100",
                "email_legale": "arianna@example.com",
                "sito_url": "https://arianna-aceto.com",
                "nome_sito": "Arianna Aceto Coaching"
            },
            "genera": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("stato") == "generato", "Stato should be 'generato'"
        
        # Verify all 3 documents are generated
        cookie_html = data.get("cookie_policy_html", "")
        privacy_html = data.get("privacy_policy_html", "")
        condizioni_html = data.get("condizioni_vendita_html", "")
        
        assert len(cookie_html) > 0, "Cookie policy HTML should be generated"
        assert len(privacy_html) > 0, "Privacy policy HTML should be generated"
        assert len(condizioni_html) > 0, "Condizioni vendita HTML should be generated"
        
        # Verify content
        assert "Cookie Policy" in cookie_html, "Cookie policy should contain title"
        assert "Privacy Policy" in privacy_html or "Informativa sulla Privacy" in privacy_html, "Privacy policy should contain title"
        assert "Condizioni" in condizioni_html, "Condizioni vendita should contain title"
        
        # Verify partner data is in documents
        assert "Arianna" in cookie_html, "Cookie policy should contain titolare nome"
        assert "Aceto" in cookie_html, "Cookie policy should contain titolare cognome"
        assert "12345678901" in cookie_html, "Cookie policy should contain P.IVA"
        
        print(f"✓ POST documenti-legali generates 3 HTML documents:")
        print(f"  - Cookie Policy: {len(cookie_html)} chars")
        print(f"  - Privacy Policy: {len(privacy_html)} chars")
        print(f"  - Condizioni Vendita: {len(condizioni_html)} chars")


class TestFunnelBuilderIntegration:
    """Integration tests for the full Funnel Builder flow"""
    
    def test_full_landing_page_flow(self):
        """Test complete flow: GET prefill -> save draft -> generate HTML -> mark published"""
        # Step 1: GET prefill
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page")
        assert get_response.status_code == 200
        prefill = get_response.json().get("prefill", {})
        
        # Step 2: Save draft with prefill data
        draft_payload = {
            "dati": {
                "PARTNER_NOME": prefill.get("PARTNER_NOME", "Test"),
                "PARTNER_NICCHIA": prefill.get("PARTNER_NICCHIA", "Test"),
                "HEADLINE_PRINCIPALE": "Test Headline",
                "CTA_TESTO_PRINCIPALE": "Test CTA",
                "CTA_LINK": "https://test.com",
                "CORSO_NOME": "Test Corso",
                "CORSO_PREZZO": "100"
            },
            "genera_html": False,
            "stato": "bozza"
        }
        draft_response = requests.post(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page", json=draft_payload)
        assert draft_response.status_code == 200
        assert draft_response.json().get("stato") == "bozza"
        
        # Step 3: Generate HTML
        generate_payload = {
            "dati": draft_payload["dati"],
            "genera_html": True
        }
        generate_response = requests.post(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page", json=generate_payload)
        assert generate_response.status_code == 200
        assert generate_response.json().get("stato") == "pronta"
        assert len(generate_response.json().get("html_generato", "")) > 0
        
        # Step 4: Mark as published
        publish_payload = {**draft_payload, "genera_html": False, "stato": "pubblicata"}
        publish_response = requests.post(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page", json=publish_payload)
        assert publish_response.status_code == 200
        assert publish_response.json().get("stato") == "pubblicata"
        
        # Step 5: Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/landing-page")
        assert verify_response.status_code == 200
        assert verify_response.json().get("stato") == "pubblicata"
        
        print("✓ Full landing page flow completed successfully")
    
    def test_full_documenti_legali_flow(self):
        """Test complete flow: GET prefill -> generate documents -> verify persistence"""
        # Step 1: GET prefill
        get_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali")
        assert get_response.status_code == 200
        prefill = get_response.json().get("prefill", {})
        
        # Step 2: Generate documents
        generate_payload = {
            "dati": {
                "titolare_nome": prefill.get("titolare_nome", "Test"),
                "titolare_cognome": prefill.get("titolare_cognome", "User"),
                "piva": "12345678901",
                "codice_fiscale": "TSTXXX80A01H501Z",
                "indirizzo": "Via Test 1",
                "citta": "Roma",
                "cap": "00100",
                "email_legale": prefill.get("email_legale", "test@example.com"),
                "sito_url": "https://test.com",
                "nome_sito": "Test Site"
            },
            "genera": True
        }
        generate_response = requests.post(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali", json=generate_payload)
        assert generate_response.status_code == 200
        assert generate_response.json().get("stato") == "generato"
        
        # Step 3: Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}/documenti-legali")
        assert verify_response.status_code == 200
        assert verify_response.json().get("stato") == "generato"
        assert len(verify_response.json().get("cookie_policy_html", "")) > 0
        
        print("✓ Full documenti legali flow completed successfully")


class TestDashboardAPIFix:
    """Tests to verify the /api/api/ double prefix bug is fixed"""
    
    def test_partners_endpoint_works(self):
        """GET /api/partners should work (not /api/api/partners)"""
        response = requests.get(f"{BASE_URL}/api/partners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of partners"
        print(f"✓ GET /api/partners works correctly ({len(data)} partners)")
    
    def test_agents_endpoint_works(self):
        """GET /api/agents should work (not /api/api/agents)"""
        response = requests.get(f"{BASE_URL}/api/agents")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of agents"
        print(f"✓ GET /api/agents works correctly ({len(data)} agents)")
    
    def test_alerts_endpoint_works(self):
        """GET /api/alerts should work (not /api/api/alerts)"""
        response = requests.get(f"{BASE_URL}/api/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of alerts"
        print(f"✓ GET /api/alerts works correctly ({len(data)} alerts)")
    
    def test_stats_endpoint_works(self):
        """GET /api/stats should work (not /api/api/stats)"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/stats works correctly")
    
    def test_modules_endpoint_works(self):
        """GET /api/modules should work (not /api/api/modules)"""
        response = requests.get(f"{BASE_URL}/api/modules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of modules"
        print(f"✓ GET /api/modules works correctly ({len(data)} modules)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
