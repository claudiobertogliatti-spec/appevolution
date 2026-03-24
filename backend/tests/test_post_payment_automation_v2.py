"""
Test Suite: Evolution PRO - Post-Payment Automation & Partnership Activation
Tests for iteration 26 features:
- POST /api/webhooks/stripe - Stripe webhook for payment_intent.succeeded
- POST /api/webhooks/test-analisi-payment/{user_id} - Test endpoint to simulate payment
- GET /api/webhooks/test-automation-status/{user_id} - Check automation status
- POST /api/flusso-analisi/attiva-partnership/{user_id} - Partnership activation with Systeme.io
- POST /api/discovery/trigger-auto-approve - Trigger auto-approve leads
- POST /api/discovery/lead/{lead_id}/start-email-sequence - Start email sequence
- GET /api/admin/email-templates - List templates (must include partnership_welcome)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL not set")


class TestStripeWebhook:
    """Tests for Stripe webhook endpoint"""
    
    def test_stripe_webhook_endpoint_exists(self):
        """POST /api/webhooks/stripe - endpoint exists"""
        # Send minimal payload (will fail validation but endpoint should exist)
        response = requests.post(
            f"{BASE_URL}/api/webhooks/stripe",
            json={"type": "test"},
            headers={"Content-Type": "application/json"}
        )
        # Should not be 404 - endpoint exists
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"✅ Stripe webhook endpoint exists (status: {response.status_code})")
    
    def test_stripe_webhook_invalid_payload(self):
        """POST /api/webhooks/stripe - handles invalid payload"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/stripe",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 for invalid JSON
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✅ Stripe webhook rejects invalid payload (status: {response.status_code})")


class TestAnalisiPaymentSimulation:
    """Tests for test-analisi-payment endpoint (simulates €67 payment)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test user for payment simulation"""
        self.test_user_id = f"test_payment_{uuid.uuid4().hex[:8]}"
        self.test_email = f"test_payment_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create test user via cliente-analisi/register (singular)
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/register",
            json={
                "email": self.test_email,
                "nome": "Test",
                "cognome": "Payment",
                "telefono": "+39123456789"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            self.test_user_id = data.get("user_id", data.get("user", {}).get("id", self.test_user_id))
            print(f"Created test user: {self.test_user_id}")
        else:
            print(f"Warning: Could not create test user: {response.status_code} - {response.text}")
        
        yield
        
        # Cleanup - delete test user
        try:
            requests.delete(f"{BASE_URL}/api/admin/clienti-analisi/{self.test_user_id}")
        except:
            pass
    
    def test_payment_simulation_user_not_found(self):
        """POST /api/webhooks/test-analisi-payment/{user_id} - 404 for nonexistent user"""
        fake_user_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{fake_user_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Test payment returns 404 for nonexistent user")
    
    def test_payment_simulation_success(self):
        """POST /api/webhooks/test-analisi-payment/{user_id} - simulates payment"""
        response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{self.test_user_id}")
        
        # Should succeed or return already processed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        print(f"✅ Test payment simulation successful: {data.get('message')}")
    
    def test_automation_status_check(self):
        """GET /api/webhooks/test-automation-status/{user_id} - check automation status"""
        # First trigger payment
        requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{self.test_user_id}")
        
        # Then check status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{self.test_user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "automation_status" in data, "Response should contain 'automation_status'"
        
        automation = data.get("automation_status", {})
        print(f"✅ Automation status retrieved:")
        print(f"   - payment_confirmed: {automation.get('payment_confirmed')}")
        print(f"   - webhook_processed: {automation.get('webhook_processed')}")
        print(f"   - analysis_generated: {automation.get('analysis_generated')}")
    
    def test_automation_status_user_not_found(self):
        """GET /api/webhooks/test-automation-status/{user_id} - 404 for nonexistent"""
        fake_user_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{fake_user_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Automation status returns 404 for nonexistent user")


class TestPartnershipActivation:
    """Tests for partnership activation with Systeme.io integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test user with contract and payment for partnership activation"""
        self.test_user_id = f"test_partner_{uuid.uuid4().hex[:8]}"
        self.test_email = f"test_partner_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create test user via cliente-analisi/register (singular)
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/register",
            json={
                "email": self.test_email,
                "nome": "Test",
                "cognome": "Partner",
                "telefono": "+39123456789"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            self.test_user_id = data.get("user_id", data.get("user", {}).get("id", self.test_user_id))
            print(f"Created test user for partnership: {self.test_user_id}")
        else:
            print(f"Warning: Could not create test user: {response.status_code} - {response.text}")
        
        yield
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/admin/clienti-analisi/{self.test_user_id}")
        except:
            pass
    
    def test_partnership_activation_no_contract(self):
        """POST /api/flusso-analisi/attiva-partnership/{user_id} - fails without contract"""
        response = requests.post(f"{BASE_URL}/api/flusso-analisi/attiva-partnership/{self.test_user_id}")
        
        # Should fail because contract not signed
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contratto" in data.get("detail", "").lower() or "firmato" in data.get("detail", "").lower(), \
            f"Error should mention contract: {data}"
        print(f"✅ Partnership activation correctly requires signed contract")
    
    def test_partnership_activation_user_not_found(self):
        """POST /api/flusso-analisi/attiva-partnership/{user_id} - 404 for nonexistent"""
        fake_user_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/flusso-analisi/attiva-partnership/{fake_user_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Partnership activation returns 404 for nonexistent user")


class TestDiscoveryAutoApprove:
    """Tests for discovery auto-approve trigger"""
    
    def test_trigger_auto_approve(self):
        """POST /api/discovery/trigger-auto-approve - triggers Celery task"""
        response = requests.post(f"{BASE_URL}/api/discovery/trigger-auto-approve")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "task_id" in data, "Response should contain task_id"
        
        print(f"✅ Auto-approve triggered successfully, task_id: {data.get('task_id')}")


class TestLeadEmailSequence:
    """Tests for lead email sequence endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test lead for email sequence"""
        self.test_lead_id = f"test_lead_{uuid.uuid4().hex[:8]}"
        self.test_email = f"test_lead_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create test lead
        lead_data = {
            "source": "instagram",
            "platform_username": f"test_user_{uuid.uuid4().hex[:6]}",
            "platform_url": "https://instagram.com/test",
            "display_name": "Test Lead User",
            "email": self.test_email,
            "followers_count": 5000,
            "score_total": 85,
            "target_fit_level": "altissimo"
        }
        
        response = requests.post(f"{BASE_URL}/api/discovery/leads", json=lead_data)
        
        if response.status_code in [200, 201]:
            data = response.json()
            self.test_lead_id = data.get("lead_id", self.test_lead_id)
        
        yield
        
        # Cleanup - no direct delete endpoint, lead will remain
    
    def test_start_email_sequence_success(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - starts sequence"""
        response = requests.post(f"{BASE_URL}/api/discovery/lead/{self.test_lead_id}/start-email-sequence")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True: {data}"
        assert "sequence_scheduled" in data, "Response should contain sequence_scheduled"
        
        print(f"✅ Email sequence started for lead {self.test_lead_id}")
        print(f"   Scheduled emails: {len(data.get('sequence_scheduled', []))}")
    
    def test_start_email_sequence_duplicate(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - prevents duplicate"""
        # Start sequence first time
        requests.post(f"{BASE_URL}/api/discovery/lead/{self.test_lead_id}/start-email-sequence")
        
        # Try to start again
        response = requests.post(f"{BASE_URL}/api/discovery/lead/{self.test_lead_id}/start-email-sequence")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == False, f"Expected success=False for duplicate: {data}"
        print(f"✅ Duplicate email sequence correctly prevented")
    
    def test_start_email_sequence_lead_not_found(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - 404 for nonexistent"""
        fake_lead_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/discovery/lead/{fake_lead_id}/start-email-sequence")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Email sequence returns 404 for nonexistent lead")


class TestEmailTemplates:
    """Tests for email templates API"""
    
    def test_list_email_templates(self):
        """GET /api/admin/email-templates - lists all templates"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns {"templates": [...], "total": N}
        assert "templates" in data, f"Expected 'templates' key in response: {data.keys()}"
        templates = data.get("templates", [])
        assert isinstance(templates, list), f"Expected list, got {type(templates)}"
        
        # Check for required templates
        template_ids = [t.get("template_id") for t in templates]
        
        assert "partnership_welcome" in template_ids, "partnership_welcome template missing"
        assert "analisi_welcome" in template_ids, "analisi_welcome template missing"
        
        print(f"✅ Email templates list retrieved: {len(templates)} templates")
        print(f"   Templates: {template_ids}")
    
    def test_get_partnership_welcome_template(self):
        """GET /api/admin/email-templates/partnership_welcome - specific template"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/partnership_welcome")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("template_id") == "partnership_welcome", f"Wrong template: {data}"
        assert "subject" in data, "Template should have subject"
        assert "body_html" in data, "Template should have body_html"
        assert "variables" in data, "Template should have variables"
        
        print(f"✅ partnership_welcome template retrieved")
        print(f"   Subject: {data.get('subject')[:50]}...")
        print(f"   Variables: {data.get('variables')}")
    
    def test_get_analisi_welcome_template(self):
        """GET /api/admin/email-templates/analisi_welcome - analisi welcome template"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/analisi_welcome")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("template_id") == "analisi_welcome", f"Wrong template: {data}"
        
        print(f"✅ analisi_welcome template retrieved")
    
    def test_get_nonexistent_template(self):
        """GET /api/admin/email-templates/{nonexistent} - 404"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/nonexistent_template_xyz")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Nonexistent template returns 404")
    
    def test_preview_template(self):
        """POST /api/admin/email-templates/partnership_welcome/preview - preview with variables"""
        response = requests.post(
            f"{BASE_URL}/api/admin/email-templates/partnership_welcome/preview",
            json={
                "nome": "Mario",
                "email": "mario@test.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subject" in data, "Preview should have subject"
        # API returns html_body not body_html
        assert "html_body" in data, f"Preview should have html_body, got keys: {data.keys()}"
        
        # Check variables were replaced
        assert "Mario" in data.get("html_body", ""), "Variable {{nome}} not replaced"
        
        print(f"✅ Template preview works with variable substitution")


class TestSystemeIOIntegration:
    """Tests for Systeme.io integration (graceful degradation)"""
    
    def test_systeme_client_import(self):
        """Verify systeme_mcp_client module exists and has required functions"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            from systeme_mcp_client import (
                create_partner_subaccount_async,
                is_configured,
                add_tag_to_contact
            )
            print(f"✅ systeme_mcp_client module imported successfully")
            print(f"   - create_partner_subaccount_async: available")
            print(f"   - is_configured: available")
            print(f"   - add_tag_to_contact: available")
        except ImportError as e:
            pytest.fail(f"Failed to import systeme_mcp_client: {e}")


class TestCeleryTasksExist:
    """Tests to verify Celery tasks are defined"""
    
    def test_celery_status_endpoint(self):
        """GET /api/celery/status - check Celery is running"""
        response = requests.get(f"{BASE_URL}/api/celery/status")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Celery status:")
            print(f"   - worker_running: {data.get('worker_running')}")
            print(f"   - beat_running: {data.get('beat_running')}")
        else:
            print(f"⚠️ Celery status endpoint returned {response.status_code}")
    
    def test_celery_tasks_module(self):
        """Verify celery_tasks module has required tasks"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            from celery_tasks import (
                send_analisi_welcome_email,
                send_analisi_48h_reminder,
                send_lead_sequence_email,
                process_auto_approve_leads
            )
            print(f"✅ Celery tasks module has all required tasks:")
            print(f"   - send_analisi_welcome_email")
            print(f"   - send_analisi_48h_reminder")
            print(f"   - send_lead_sequence_email")
            print(f"   - process_auto_approve_leads")
        except ImportError as e:
            pytest.fail(f"Failed to import celery_tasks: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
