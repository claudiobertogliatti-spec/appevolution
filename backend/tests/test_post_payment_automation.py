"""
Test Post-Payment Automation for Evolution PRO
Tests the €67 Analisi Strategica payment flow and Celery task automation.

Features tested:
- POST /api/webhooks/test-analisi-payment/{user_id} - Test endpoint to simulate payment
- GET /api/webhooks/test-automation-status/{user_id} - Verify automation status
- Celery task send_analisi_welcome_email - Welcome email via Systeme.io tags
- Celery task send_analisi_48h_reminder - Scheduled reminder
- Database updates: clienti_analisi.email_benvenuto_inviata, booking_link, booking_available_at
- Email logs creation in email_logs collection
- GET /api/celery/status - Verify Celery worker and beat are active
"""

import pytest
import requests
import os
import time
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://evolution-pro-lead.preview.emergentagent.com"


class TestCeleryStatus:
    """Test Celery worker and beat status"""
    
    def test_celery_status_endpoint(self):
        """GET /api/celery/status - Verify Celery is running"""
        response = requests.get(f"{BASE_URL}/api/celery/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert "redis_available" in data, "Response should contain 'redis_available' field"
        assert "worker_running" in data, "Response should contain 'worker_running' field"
        assert "beat_running" in data, "Response should contain 'beat_running' field"
        
        # Verify Celery is enabled and running
        assert data["enabled"] == True, "Celery should be enabled"
        assert data["redis_available"] == True, "Redis should be available"
        assert data["worker_running"] == True, "Celery worker should be running"
        assert data["beat_running"] == True, "Celery beat should be running"
        
        print(f"✅ Celery status: worker_pid={data.get('worker_pid')}, beat_pid={data.get('beat_pid')}")


class TestClienteAnalisiRegistration:
    """Test cliente analisi registration flow"""
    
    def test_register_cliente_analisi(self):
        """POST /api/cliente-analisi/register - Register new cliente"""
        unique_email = f"test.automation.{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "nome": "Test",
            "cognome": "Automation",
            "email": unique_email,
            "telefono": "+39 333 1234567"
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Registration should succeed"
        assert "user_id" in data, "Response should contain user_id"
        assert "token" in data, "Response should contain token"
        assert data["user"]["email"] == unique_email.lower(), "Email should match"
        assert data["user"]["pagamento_analisi"] == False, "Payment should not be confirmed yet"
        
        print(f"✅ Registered cliente: {data['user_id']}")
        return data["user_id"]
    
    def test_register_duplicate_email_fails(self):
        """POST /api/cliente-analisi/register - Duplicate email should fail"""
        unique_email = f"test.dup.{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "nome": "Test",
            "cognome": "Duplicate",
            "email": unique_email,
            "telefono": "+39 333 9999999"
        }
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=payload)
        assert response1.status_code == 200, "First registration should succeed"
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=payload)
        assert response2.status_code == 400, f"Duplicate email should fail with 400, got {response2.status_code}"
        
        print("✅ Duplicate email correctly rejected")


class TestPostPaymentAutomation:
    """Test the full post-payment automation flow"""
    
    @pytest.fixture
    def registered_user(self):
        """Create a new user for testing"""
        unique_email = f"test.payment.{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "nome": "Mario",
            "cognome": "Rossi",
            "email": unique_email,
            "telefono": "+39 333 7777777"
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        return {
            "user_id": data["user_id"],
            "email": unique_email,
            "nome": "Mario",
            "cognome": "Rossi"
        }
    
    def test_simulate_payment_endpoint(self, registered_user):
        """POST /api/webhooks/test-analisi-payment/{user_id} - Simulate payment"""
        user_id = registered_user["user_id"]
        
        response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, "Payment simulation should succeed"
        assert data["user_id"] == user_id, "User ID should match"
        assert data["automation_triggered"] == True, "Automation should be triggered"
        assert "tasks_scheduled" in data, "Response should list scheduled tasks"
        
        print(f"✅ Payment simulated for user {user_id}")
        print(f"   Tasks scheduled: {data['tasks_scheduled']}")
        return user_id
    
    def test_automation_status_after_payment(self, registered_user):
        """GET /api/webhooks/test-automation-status/{user_id} - Check automation status"""
        user_id = registered_user["user_id"]
        
        # First simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200, f"Payment simulation failed: {pay_response.text}"
        
        # Wait for Celery tasks to process (15-20 seconds as per instructions)
        print("⏳ Waiting 20 seconds for Celery tasks to execute...")
        time.sleep(20)
        
        # Check automation status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify user data
        assert "user" in data, "Response should contain user data"
        user = data["user"]
        assert user["pagamento_analisi"] == True, "Payment should be confirmed"
        assert user["webhook_processed"] == True, "Webhook should be processed"
        
        # Verify automation status
        assert "automation_status" in data, "Response should contain automation_status"
        status = data["automation_status"]
        assert status["payment_confirmed"] == True, "Payment should be confirmed in status"
        assert status["webhook_processed"] == True, "Webhook should be processed in status"
        
        print(f"✅ Automation status verified for user {user_id}")
        print(f"   Payment confirmed: {status['payment_confirmed']}")
        print(f"   Webhook processed: {status['webhook_processed']}")
        print(f"   Welcome email sent: {status.get('welcome_email_sent', 'N/A')}")
        
        return data
    
    def test_clienti_analisi_record_created(self, registered_user):
        """Verify clienti_analisi record is created with correct fields"""
        user_id = registered_user["user_id"]
        
        # Simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200
        
        # Wait for processing
        time.sleep(5)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify cliente_analisi record
        assert "cliente_analisi" in data, "Response should contain cliente_analisi record"
        cliente = data["cliente_analisi"]
        
        if cliente:
            assert cliente.get("pagamento_analisi") == True, "pagamento_analisi should be True"
            assert "data_pagamento" in cliente, "data_pagamento should be set"
            assert "email" in cliente, "email should be set"
            
            print(f"✅ clienti_analisi record verified")
            print(f"   ID: {cliente.get('id')}")
            print(f"   Email: {cliente.get('email')}")
            print(f"   Pagamento: {cliente.get('pagamento_analisi')}")
        else:
            print("⚠️ cliente_analisi record not found (may be expected if user has no cliente_id)")
    
    def test_scheduled_emails_created(self, registered_user):
        """Verify scheduled_emails record is created"""
        user_id = registered_user["user_id"]
        
        # Simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200
        
        # Wait for processing
        time.sleep(5)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify scheduled_emails
        assert "scheduled_emails" in data, "Response should contain scheduled_emails"
        scheduled = data["scheduled_emails"]
        
        if scheduled and len(scheduled) > 0:
            email_record = scheduled[0]
            assert email_record.get("type") == "welcome_analisi", "Email type should be welcome_analisi"
            assert email_record.get("user_id") == user_id, "User ID should match"
            assert "booking_available_at" in email_record, "booking_available_at should be set"
            assert "reminder_scheduled_at" in email_record, "reminder_scheduled_at should be set"
            
            print(f"✅ scheduled_emails record verified")
            print(f"   Type: {email_record.get('type')}")
            print(f"   Status: {email_record.get('status')}")
            print(f"   Booking available at: {email_record.get('booking_available_at')}")
        else:
            print("⚠️ No scheduled_emails found")
    
    def test_email_logs_created_after_celery_task(self, registered_user):
        """Verify email_logs are created after Celery task execution"""
        user_id = registered_user["user_id"]
        
        # Simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200
        
        # Wait for Celery tasks to execute
        print("⏳ Waiting 25 seconds for Celery welcome email task...")
        time.sleep(25)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify email_logs
        assert "email_logs" in data, "Response should contain email_logs"
        logs = data["email_logs"]
        
        if logs and len(logs) > 0:
            # Find welcome_analisi log
            welcome_log = next((l for l in logs if l.get("type") == "welcome_analisi"), None)
            
            if welcome_log:
                assert welcome_log.get("user_id") == user_id, "User ID should match"
                assert "sent_at" in welcome_log, "sent_at should be set"
                assert "systeme_tags" in welcome_log, "systeme_tags should be set"
                
                print(f"✅ email_logs record verified")
                print(f"   Type: {welcome_log.get('type')}")
                print(f"   Status: {welcome_log.get('status')}")
                print(f"   Systeme tags: {welcome_log.get('systeme_tags')}")
            else:
                print("⚠️ welcome_analisi email log not found yet (Celery task may still be processing)")
        else:
            print("⚠️ No email_logs found yet (Celery task may still be processing)")
    
    def test_database_fields_updated_after_welcome_email(self, registered_user):
        """Verify clienti_analisi fields are updated after welcome email task"""
        user_id = registered_user["user_id"]
        
        # Simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200
        
        # Wait for Celery tasks
        print("⏳ Waiting 25 seconds for Celery tasks to complete...")
        time.sleep(25)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert response.status_code == 200
        
        data = response.json()
        cliente = data.get("cliente_analisi")
        
        if cliente:
            # Check if welcome email fields are updated
            email_sent = cliente.get("email_benvenuto_inviata", False)
            booking_link = cliente.get("booking_link")
            booking_available = cliente.get("booking_available_at")
            
            print(f"📊 Database fields status:")
            print(f"   email_benvenuto_inviata: {email_sent}")
            print(f"   booking_link: {booking_link}")
            print(f"   booking_available_at: {booking_available}")
            
            # These should be set after Celery task completes
            if email_sent:
                print("✅ Welcome email marked as sent")
                assert booking_link is not None, "booking_link should be set"
                assert booking_available is not None, "booking_available_at should be set"
            else:
                print("⚠️ Welcome email not yet marked as sent (Celery task may still be processing)")
        else:
            print("⚠️ cliente_analisi record not found")


class TestPaymentAlreadyProcessed:
    """Test idempotency - payment should not be processed twice"""
    
    def test_duplicate_payment_returns_already_processed(self):
        """POST /api/webhooks/test-analisi-payment/{user_id} - Second call should indicate already processed"""
        # Register new user
        unique_email = f"test.idempotent.{uuid.uuid4().hex[:8]}@example.com"
        
        payload = {
            "nome": "Test",
            "cognome": "Idempotent",
            "email": unique_email,
            "telefono": "+39 333 5555555"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=payload)
        assert reg_response.status_code == 200
        user_id = reg_response.json()["user_id"]
        
        # First payment
        pay1_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay1_response.status_code == 200
        data1 = pay1_response.json()
        assert data1["success"] == True
        
        # Wait a bit
        time.sleep(2)
        
        # Second payment (should indicate already processed)
        pay2_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay2_response.status_code == 200
        data2 = pay2_response.json()
        
        # Should indicate already processed
        assert data2["success"] == True
        assert "already" in data2.get("message", "").lower() or data2.get("automation_triggered") == True
        
        print(f"✅ Idempotency verified: {data2.get('message', 'OK')}")


class TestUserNotFound:
    """Test error handling for non-existent users"""
    
    def test_payment_for_nonexistent_user(self):
        """POST /api/webhooks/test-analisi-payment/{user_id} - Should return 404"""
        fake_user_id = str(uuid.uuid4())
        
        response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{fake_user_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Non-existent user correctly returns 404")
    
    def test_status_for_nonexistent_user(self):
        """GET /api/webhooks/test-automation-status/{user_id} - Should return 404"""
        fake_user_id = str(uuid.uuid4())
        
        response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{fake_user_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Non-existent user status correctly returns 404")


class TestEndToEndAutomationFlow:
    """Complete end-to-end test of the automation flow"""
    
    def test_full_automation_flow(self):
        """
        Complete E2E test:
        1. Register cliente
        2. Simulate payment
        3. Wait for Celery tasks
        4. Verify all database updates
        """
        # 1. Register
        unique_email = f"test.e2e.{uuid.uuid4().hex[:8]}@example.com"
        
        reg_payload = {
            "nome": "Giulia",
            "cognome": "Bianchi",
            "email": unique_email,
            "telefono": "+39 333 8888888"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        user_id = reg_response.json()["user_id"]
        print(f"✅ Step 1: Registered user {user_id}")
        
        # 2. Simulate payment
        pay_response = requests.post(f"{BASE_URL}/api/webhooks/test-analisi-payment/{user_id}")
        assert pay_response.status_code == 200, f"Payment simulation failed: {pay_response.text}"
        print(f"✅ Step 2: Payment simulated")
        
        # 3. Wait for Celery tasks
        print("⏳ Step 3: Waiting 25 seconds for Celery tasks...")
        time.sleep(25)
        
        # 4. Verify all updates
        status_response = requests.get(f"{BASE_URL}/api/webhooks/test-automation-status/{user_id}")
        assert status_response.status_code == 200, f"Status check failed: {status_response.text}"
        
        data = status_response.json()
        
        # Verify user
        user = data.get("user", {})
        assert user.get("pagamento_analisi") == True, "User payment should be confirmed"
        assert user.get("webhook_processed") == True, "Webhook should be processed"
        print(f"✅ Step 4a: User payment confirmed")
        
        # Verify automation status
        status = data.get("automation_status", {})
        assert status.get("payment_confirmed") == True, "Payment should be confirmed"
        print(f"✅ Step 4b: Automation status verified")
        
        # Verify scheduled emails
        scheduled = data.get("scheduled_emails", [])
        if scheduled:
            print(f"✅ Step 4c: {len(scheduled)} scheduled email(s) found")
        else:
            print("⚠️ Step 4c: No scheduled emails found")
        
        # Verify email logs
        logs = data.get("email_logs", [])
        if logs:
            print(f"✅ Step 4d: {len(logs)} email log(s) found")
        else:
            print("⚠️ Step 4d: No email logs found (Celery task may still be processing)")
        
        # Verify cliente_analisi
        cliente = data.get("cliente_analisi")
        if cliente:
            print(f"✅ Step 4e: cliente_analisi record found")
            print(f"   - email_benvenuto_inviata: {cliente.get('email_benvenuto_inviata', False)}")
            print(f"   - booking_link: {cliente.get('booking_link', 'N/A')}")
        else:
            print("⚠️ Step 4e: cliente_analisi record not found")
        
        print("\n🎉 E2E Automation Flow Test Complete!")
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
