"""
Test Lead Auto-Approve and Email Sequence for €67 Analysis Sale
Evolution PRO - Iteration 25

Tests:
- Auto-approve settings CRUD
- Manual trigger of auto-approve job
- Email sequence start/stop for leads
- Email templates for lead sequence (1-4)
- Celery task integration
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAutoApproveSettings:
    """Tests for auto-approve settings endpoints"""
    
    def test_get_auto_approve_settings(self):
        """GET /api/discovery/settings/auto-approve - retrieve settings"""
        response = requests.get(f"{BASE_URL}/api/discovery/settings/auto-approve")
        assert response.status_code == 200
        
        data = response.json()
        assert "min_score" in data
        assert "required_fit_level" in data
        assert "enabled" in data
        
        # Verify default values
        assert isinstance(data["min_score"], int)
        assert data["required_fit_level"] in ["basso", "medio", "alto", "altissimo"]
        assert isinstance(data["enabled"], bool)
        print(f"✅ Auto-approve settings: min_score={data['min_score']}, fit={data['required_fit_level']}, enabled={data['enabled']}")
    
    def test_update_auto_approve_settings(self):
        """PUT /api/discovery/settings/auto-approve - update settings"""
        # Update settings
        new_settings = {
            "min_score": 85,
            "required_fit_level": "altissimo",
            "enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/discovery/settings/auto-approve",
            json=new_settings
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["settings"]["min_score"] == 85
        assert data["settings"]["required_fit_level"] == "altissimo"
        assert data["settings"]["enabled"] is True
        print("✅ Auto-approve settings updated successfully")
        
        # Verify by getting settings again
        verify_response = requests.get(f"{BASE_URL}/api/discovery/settings/auto-approve")
        verify_data = verify_response.json()
        assert verify_data["min_score"] == 85
        print("✅ Settings verified after update")
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/discovery/settings/auto-approve",
            json={"min_score": 80, "required_fit_level": "altissimo", "enabled": True}
        )
    
    def test_update_auto_approve_disable(self):
        """PUT /api/discovery/settings/auto-approve - disable auto-approve"""
        response = requests.put(
            f"{BASE_URL}/api/discovery/settings/auto-approve",
            json={"min_score": 80, "required_fit_level": "altissimo", "enabled": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["settings"]["enabled"] is False
        print("✅ Auto-approve disabled successfully")
        
        # Re-enable
        requests.put(
            f"{BASE_URL}/api/discovery/settings/auto-approve",
            json={"min_score": 80, "required_fit_level": "altissimo", "enabled": True}
        )


class TestTriggerAutoApprove:
    """Tests for manual auto-approve trigger"""
    
    def test_trigger_auto_approve_job(self):
        """POST /api/discovery/trigger-auto-approve - trigger manual job"""
        response = requests.post(f"{BASE_URL}/api/discovery/trigger-auto-approve")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Auto-approve job triggered"
        assert "task_id" in data
        assert len(data["task_id"]) > 0
        print(f"✅ Auto-approve job triggered, task_id: {data['task_id']}")


class TestEmailSequence:
    """Tests for email sequence start/stop endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_test_lead(self):
        """Create a test lead for email sequence tests"""
        timestamp = int(time.time())
        self.test_username = f"test_seq_{timestamp}"
        self.test_email = f"test_seq_{timestamp}@example.com"
        
        # Create lead
        response = requests.post(
            f"{BASE_URL}/api/discovery/leads",
            json={
                "source": "instagram",
                "platform_username": self.test_username,
                "platform_url": f"https://instagram.com/{self.test_username}",
                "display_name": "Test Sequence Lead",
                "email": self.test_email,
                "followers_count": 20000,
                "score_total": 90,
                "target_fit_level": "altissimo"
            }
        )
        
        if response.status_code == 200:
            self.lead_id = response.json()["lead_id"]
        else:
            pytest.skip("Could not create test lead")
        
        yield
        
        # Cleanup - delete test lead
        requests.delete(f"{BASE_URL}/api/discovery/leads/{self.lead_id}")
    
    def test_start_email_sequence(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - start sequence"""
        response = requests.post(
            f"{BASE_URL}/api/discovery/lead/{self.lead_id}/start-email-sequence"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["lead_id"] == self.lead_id
        assert data["email"] == self.test_email
        assert "sequence_scheduled" in data
        assert len(data["sequence_scheduled"]) == 4
        
        # Verify schedule
        steps = {s["step"]: s["send_at"] for s in data["sequence_scheduled"]}
        assert steps[1] == "immediate"
        assert steps[2] == "+2 days"
        assert steps[3] == "+4 days"
        assert steps[4] == "+7 days"
        print(f"✅ Email sequence started for lead {self.lead_id}")
        
        # Verify lead was updated
        lead_response = requests.get(f"{BASE_URL}/api/discovery/leads/{self.lead_id}")
        lead_data = lead_response.json()
        assert lead_data["email_sequence_started"] is True
        assert "email_sequence_started_at" in lead_data
        print("✅ Lead record updated with sequence info")
    
    def test_start_email_sequence_already_started(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - already started"""
        # Start sequence first
        requests.post(f"{BASE_URL}/api/discovery/lead/{self.lead_id}/start-email-sequence")
        
        # Try to start again
        response = requests.post(
            f"{BASE_URL}/api/discovery/lead/{self.lead_id}/start-email-sequence"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is False
        assert "già avviata" in data["message"] or "already" in data.get("message", "").lower()
        print("✅ Duplicate sequence start prevented")
    
    def test_stop_email_sequence(self):
        """POST /api/discovery/lead/{lead_id}/stop-email-sequence - stop sequence"""
        # Start sequence first
        requests.post(f"{BASE_URL}/api/discovery/lead/{self.lead_id}/start-email-sequence")
        
        # Stop sequence
        response = requests.post(
            f"{BASE_URL}/api/discovery/lead/{self.lead_id}/stop-email-sequence"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["lead_id"] == self.lead_id
        assert data["status"] == "sequence_stopped"
        print(f"✅ Email sequence stopped for lead {self.lead_id}")
        
        # Verify lead was updated
        lead_response = requests.get(f"{BASE_URL}/api/discovery/leads/{self.lead_id}")
        lead_data = lead_response.json()
        assert lead_data["email_sequence_stopped"] is True
        assert "email_sequence_stopped_at" in lead_data
        print("✅ Lead record updated with stop info")
    
    def test_start_sequence_nonexistent_lead(self):
        """POST /api/discovery/lead/{lead_id}/start-email-sequence - 404 for nonexistent"""
        response = requests.post(
            f"{BASE_URL}/api/discovery/lead/nonexistent_lead_id/start-email-sequence"
        )
        assert response.status_code == 404
        print("✅ 404 returned for nonexistent lead")
    
    def test_stop_sequence_nonexistent_lead(self):
        """POST /api/discovery/lead/{lead_id}/stop-email-sequence - 404 for nonexistent"""
        response = requests.post(
            f"{BASE_URL}/api/discovery/lead/nonexistent_lead_id/stop-email-sequence"
        )
        assert response.status_code == 404
        print("✅ 404 returned for nonexistent lead")


class TestEmailTemplates:
    """Tests for lead sequence email templates"""
    
    def test_list_email_templates_includes_lead_sequence(self):
        """GET /api/admin/email-templates - includes lead_sequence_email_1-4"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        
        template_ids = [t["template_id"] for t in data["templates"]]
        
        # Verify all 4 lead sequence templates exist
        for i in range(1, 5):
            template_id = f"lead_sequence_email_{i}"
            assert template_id in template_ids, f"Missing template: {template_id}"
        
        print(f"✅ All 4 lead sequence templates found in {len(template_ids)} total templates")
    
    def test_get_lead_sequence_email_1(self):
        """GET /api/admin/email-templates/lead_sequence_email_1"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/lead_sequence_email_1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_id"] == "lead_sequence_email_1"
        assert "subject" in data
        assert "body_html" in data
        assert "variables" in data
        assert "nome" in data["variables"]
        assert "niche" in data["variables"]
        assert data["category"] == "lead_sequence"
        print("✅ lead_sequence_email_1 template retrieved")
    
    def test_get_lead_sequence_email_2(self):
        """GET /api/admin/email-templates/lead_sequence_email_2"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/lead_sequence_email_2")
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_id"] == "lead_sequence_email_2"
        assert "Marco" in data["subject"]  # Case study email
        assert data["category"] == "lead_sequence"
        print("✅ lead_sequence_email_2 template retrieved")
    
    def test_get_lead_sequence_email_3(self):
        """GET /api/admin/email-templates/lead_sequence_email_3"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/lead_sequence_email_3")
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_id"] == "lead_sequence_email_3"
        assert "€67" in data["subject"] or "67" in data["subject"]  # Offer email
        assert "link_checkout" in data["variables"]
        assert data["category"] == "lead_sequence"
        print("✅ lead_sequence_email_3 template retrieved")
    
    def test_get_lead_sequence_email_4(self):
        """GET /api/admin/email-templates/lead_sequence_email_4"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/lead_sequence_email_4")
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_id"] == "lead_sequence_email_4"
        assert "Ultima" in data["subject"] or "ultima" in data["subject"]  # Final reminder
        assert "link_checkout" in data["variables"]
        assert data["category"] == "lead_sequence"
        print("✅ lead_sequence_email_4 template retrieved")
    
    def test_get_nonexistent_template(self):
        """GET /api/admin/email-templates/{template_id} - 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/admin/email-templates/nonexistent_template")
        assert response.status_code == 404
        print("✅ 404 returned for nonexistent template")


class TestCeleryIntegration:
    """Tests for Celery task integration"""
    
    def test_celery_status(self):
        """GET /api/celery/status - verify Celery is running"""
        response = requests.get(f"{BASE_URL}/api/celery/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["enabled"] is True
        assert data["redis_available"] is True
        assert data["worker_running"] is True
        assert data["beat_running"] is True
        print(f"✅ Celery status: worker_pid={data.get('worker_pid')}, beat_pid={data.get('beat_pid')}")
    
    def test_email_sequence_celery_task_execution(self):
        """Verify Celery task executes and updates lead record"""
        timestamp = int(time.time())
        test_username = f"test_celery_{timestamp}"
        test_email = f"test_celery_{timestamp}@example.com"
        
        # Create lead
        create_response = requests.post(
            f"{BASE_URL}/api/discovery/leads",
            json={
                "source": "instagram",
                "platform_username": test_username,
                "platform_url": f"https://instagram.com/{test_username}",
                "display_name": "Test Celery Lead",
                "email": test_email,
                "followers_count": 25000,
                "score_total": 95,
                "target_fit_level": "altissimo"
            }
        )
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead_id"]
        
        try:
            # Start email sequence
            start_response = requests.post(
                f"{BASE_URL}/api/discovery/lead/{lead_id}/start-email-sequence"
            )
            assert start_response.status_code == 200
            
            # Wait for Celery task to execute (first email is immediate)
            time.sleep(5)
            
            # Check lead record for email sent
            lead_response = requests.get(f"{BASE_URL}/api/discovery/leads/{lead_id}")
            lead_data = lead_response.json()
            
            # Verify first email was sent
            assert lead_data.get("email_sequence_step_1_sent") is True, "First email should be marked as sent"
            assert "email_sequence_step_1_sent_at" in lead_data
            print(f"✅ Celery task executed: email_sequence_step_1_sent_at={lead_data['email_sequence_step_1_sent_at']}")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/discovery/leads/{lead_id}")


class TestLeadCRUD:
    """Tests for lead CRUD operations related to email sequence"""
    
    def test_create_lead_with_high_score(self):
        """POST /api/discovery/leads - create lead eligible for auto-approve"""
        timestamp = int(time.time())
        
        response = requests.post(
            f"{BASE_URL}/api/discovery/leads",
            json={
                "source": "linkedin",
                "platform_username": f"test_high_score_{timestamp}",
                "platform_url": f"https://linkedin.com/in/test_high_score_{timestamp}",
                "display_name": "High Score Lead",
                "email": f"high_score_{timestamp}@example.com",
                "followers_count": 50000,
                "score_total": 90,
                "target_fit_level": "altissimo"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["lead"]["score_total"] == 90
        assert data["lead"]["target_fit_level"] == "altissimo"
        print(f"✅ High score lead created: {data['lead_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/discovery/leads/{data['lead_id']}")
    
    def test_get_lead_with_sequence_info(self):
        """GET /api/discovery/leads/{lead_id} - includes sequence fields"""
        timestamp = int(time.time())
        
        # Create lead
        create_response = requests.post(
            f"{BASE_URL}/api/discovery/leads",
            json={
                "source": "instagram",
                "platform_username": f"test_get_{timestamp}",
                "platform_url": f"https://instagram.com/test_get_{timestamp}",
                "display_name": "Test Get Lead",
                "email": f"test_get_{timestamp}@example.com",
                "followers_count": 15000
            }
        )
        lead_id = create_response.json()["lead_id"]
        
        try:
            # Start sequence
            requests.post(f"{BASE_URL}/api/discovery/lead/{lead_id}/start-email-sequence")
            
            # Get lead
            response = requests.get(f"{BASE_URL}/api/discovery/leads/{lead_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert "email_sequence_started" in data
            assert "email_sequence_started_at" in data
            assert "email_sequence_step" in data
            print("✅ Lead includes email sequence fields")
            
        finally:
            requests.delete(f"{BASE_URL}/api/discovery/leads/{lead_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
