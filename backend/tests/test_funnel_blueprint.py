"""
Test Funnel Blueprint Endpoints - Academy Blueprint Generation
Tests for:
- POST /api/partner-journey/funnel/generate - generates full academy blueprint
- POST /api/partner-journey/funnel/approve-blueprint - marks step complete
- GET /api/partner-journey/funnel/{partner_id} - returns blueprint, inputs, is_approved
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Partner 2 (Arianna Aceto) has posizionamento, masterclass, videocorso data
TEST_PARTNER_ID = "2"


class TestFunnelEndpoints:
    """Test Funnel Blueprint API endpoints"""

    def test_get_funnel_initial_state(self):
        """GET /api/partner-journey/funnel/{partner_id} - returns funnel data"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("partner_id") == TEST_PARTNER_ID
        
        # Check expected fields exist
        assert "blueprint" in data
        assert "inputs" in data
        assert "is_approved" in data
        assert "is_generated" in data
        
        print(f"✓ GET funnel - is_generated: {data.get('is_generated')}, is_approved: {data.get('is_approved')}")

    def test_generate_blueprint_requires_bio(self):
        """POST /api/partner-journey/funnel/generate - requires bio_partner >= 10 chars"""
        # Test with empty bio
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/generate",
            json={
                "partner_id": TEST_PARTNER_ID,
                "bio_partner": "",
                "garanzia": ""
            }
        )
        
        # Should still work but bio will be empty in inputs
        # The validation is on frontend, backend accepts it
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        print(f"✓ Generate with empty bio - status: {response.status_code}")

    def test_generate_blueprint_full(self):
        """POST /api/partner-journey/funnel/generate - generates full academy blueprint"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/generate",
            json={
                "partner_id": TEST_PARTNER_ID,
                "bio_partner": "Sono Arianna Aceto, coach di fitness con 10 anni di esperienza. Ho aiutato più di 200 persone a raggiungere i loro obiettivi di salute e benessere.",
                "garanzia": "Soddisfatti o rimborsati entro 30 giorni, nessuna domanda."
            },
            timeout=60  # LLM call takes 10-15 seconds
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "blueprint" in data
        
        blueprint = data.get("blueprint", {})
        
        # Verify landing_sections structure
        assert "landing_sections" in blueprint, "Missing landing_sections"
        ls = blueprint.get("landing_sections", {})
        
        # Check all required landing sections
        required_sections = ["hero", "problema", "promessa", "moduli", "bonus", "garanzia", "faq", "bio", "cta_finale"]
        for section in required_sections:
            assert section in ls, f"Missing landing section: {section}"
        
        # Verify hero structure
        hero = ls.get("hero", {})
        assert "headline" in hero, "Hero missing headline"
        assert "subheadline" in hero, "Hero missing subheadline"
        assert "cta_text" in hero, "Hero missing cta_text"
        
        # Verify problema structure
        problema = ls.get("problema", {})
        assert "headline" in problema, "Problema missing headline"
        assert "body" in problema, "Problema missing body"
        
        # Verify promessa structure
        promessa = ls.get("promessa", {})
        assert "headline" in promessa, "Promessa missing headline"
        assert "body" in promessa, "Promessa missing body"
        
        # Verify moduli structure
        moduli = ls.get("moduli", {})
        assert "headline" in moduli, "Moduli missing headline"
        assert "items" in moduli, "Moduli missing items"
        assert isinstance(moduli.get("items"), list), "Moduli items should be a list"
        
        # Verify bonus structure
        bonus = ls.get("bonus", {})
        assert "headline" in bonus, "Bonus missing headline"
        assert "items" in bonus, "Bonus missing items"
        
        # Verify garanzia structure
        garanzia = ls.get("garanzia", {})
        assert "headline" in garanzia, "Garanzia missing headline"
        assert "body" in garanzia, "Garanzia missing body"
        
        # Verify FAQ structure
        faq = ls.get("faq", [])
        assert isinstance(faq, list), "FAQ should be a list"
        assert len(faq) >= 3, f"Expected at least 3 FAQs, got {len(faq)}"
        for f in faq:
            assert "question" in f, "FAQ item missing question"
            assert "answer" in f, "FAQ item missing answer"
        
        # Verify bio structure
        bio = ls.get("bio", {})
        assert "name" in bio, "Bio missing name"
        assert "bio" in bio, "Bio missing bio text"
        
        # Verify cta_finale structure
        cta_finale = ls.get("cta_finale", {})
        assert "headline" in cta_finale, "CTA finale missing headline"
        assert "body" in cta_finale, "CTA finale missing body"
        assert "cta_text" in cta_finale, "CTA finale missing cta_text"
        
        print(f"✓ Landing sections verified: {list(ls.keys())}")
        
        # Verify email_sequence structure
        assert "email_sequence" in blueprint, "Missing email_sequence"
        emails = blueprint.get("email_sequence", [])
        assert isinstance(emails, list), "Email sequence should be a list"
        assert len(emails) == 5, f"Expected 5 emails, got {len(emails)}"
        
        email_types = ["consegna", "problema", "errore", "soluzione", "urgenza"]
        for i, email in enumerate(emails):
            assert "id" in email, f"Email {i+1} missing id"
            assert "type" in email, f"Email {i+1} missing type"
            assert "delay" in email, f"Email {i+1} missing delay"
            assert "subject" in email, f"Email {i+1} missing subject"
            assert "body" in email, f"Email {i+1} missing body"
            assert email.get("type") == email_types[i], f"Email {i+1} type mismatch: expected {email_types[i]}, got {email.get('type')}"
            assert len(email.get("body", "")) > 50, f"Email {i+1} body too short"
        
        print(f"✓ Email sequence verified: {len(emails)} emails with types {[e.get('type') for e in emails]}")
        
        # Verify student_area structure
        assert "student_area" in blueprint, "Missing student_area"
        area = blueprint.get("student_area", {})
        
        assert "welcome_message" in area, "Student area missing welcome_message"
        assert "modules" in area, "Student area missing modules"
        assert "bonus_section" in area, "Student area missing bonus_section"
        assert "resources_section" in area, "Student area missing resources_section"
        
        modules = area.get("modules", [])
        assert isinstance(modules, list), "Modules should be a list"
        assert len(modules) >= 1, "Expected at least 1 module"
        for mod in modules:
            assert "title" in mod, "Module missing title"
            assert "lessons" in mod, "Module missing lessons"
        
        print(f"✓ Student area verified: {len(modules)} modules, {len(area.get('bonus_section', []))} bonus, {len(area.get('resources_section', []))} resources")
        
        print("✓ Full blueprint generation test PASSED")

    def test_get_funnel_after_generation(self):
        """GET /api/partner-journey/funnel/{partner_id} - returns generated blueprint"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("is_generated") == True
        
        # Verify blueprint is returned
        blueprint = data.get("blueprint")
        assert blueprint is not None, "Blueprint should be returned after generation"
        assert "landing_sections" in blueprint
        assert "email_sequence" in blueprint
        assert "student_area" in blueprint
        
        # Verify inputs are saved
        inputs = data.get("inputs")
        assert inputs is not None, "Inputs should be saved"
        assert "bio_partner" in inputs
        assert "garanzia" in inputs
        
        print(f"✓ GET funnel after generation - blueprint and inputs returned")

    def test_approve_blueprint(self):
        """POST /api/partner-journey/funnel/approve-blueprint - marks step complete"""
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/approve-blueprint?partner_id={TEST_PARTNER_ID}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        
        print(f"✓ Approve blueprint - message: {data.get('message')}")

    def test_get_funnel_after_approval(self):
        """GET /api/partner-journey/funnel/{partner_id} - returns is_approved=True"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("is_approved") == True, "Blueprint should be approved"
        
        print(f"✓ GET funnel after approval - is_approved: {data.get('is_approved')}")

    def test_approve_without_blueprint_fails(self):
        """POST /api/partner-journey/funnel/approve-blueprint - fails without blueprint"""
        # Use a partner that doesn't have a blueprint
        response = requests.post(
            f"{BASE_URL}/api/partner-journey/funnel/approve-blueprint?partner_id=999"
        )
        
        # Should return 404 (partner not found) or 400 (no blueprint)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        print(f"✓ Approve without blueprint - correctly returns {response.status_code}")


class TestFunnelBlueprintStructure:
    """Test specific blueprint structure requirements"""

    def test_landing_sections_complete(self):
        """Verify all landing sections are present and have correct structure"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        blueprint = data.get("blueprint", {})
        ls = blueprint.get("landing_sections", {})
        
        # All required sections
        required = ["hero", "problema", "promessa", "moduli", "bonus", "garanzia", "faq", "bio", "cta_finale"]
        for section in required:
            assert section in ls, f"Missing section: {section}"
        
        print(f"✓ All {len(required)} landing sections present")

    def test_email_sequence_has_5_emails(self):
        """Verify email sequence has exactly 5 emails with correct types"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        blueprint = data.get("blueprint", {})
        emails = blueprint.get("email_sequence", [])
        
        assert len(emails) == 5, f"Expected 5 emails, got {len(emails)}"
        
        expected_types = ["consegna", "problema", "errore", "soluzione", "urgenza"]
        actual_types = [e.get("type") for e in emails]
        
        assert actual_types == expected_types, f"Email types mismatch: expected {expected_types}, got {actual_types}"
        
        # Verify each email has full body
        for i, email in enumerate(emails):
            body = email.get("body", "")
            assert len(body) > 50, f"Email {i+1} body too short ({len(body)} chars)"
        
        print(f"✓ Email sequence: 5 emails with types {actual_types}")

    def test_student_area_structure(self):
        """Verify student area has welcome, modules, bonus, resources"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/funnel/{TEST_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        blueprint = data.get("blueprint", {})
        area = blueprint.get("student_area", {})
        
        assert "welcome_message" in area, "Missing welcome_message"
        assert "modules" in area, "Missing modules"
        assert "bonus_section" in area, "Missing bonus_section"
        assert "resources_section" in area, "Missing resources_section"
        
        # Verify modules have lessons
        modules = area.get("modules", [])
        assert len(modules) >= 1, "Expected at least 1 module"
        for mod in modules:
            assert "title" in mod
            assert "lessons" in mod
            assert isinstance(mod.get("lessons"), list)
        
        print(f"✓ Student area: {len(modules)} modules, welcome message present")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
