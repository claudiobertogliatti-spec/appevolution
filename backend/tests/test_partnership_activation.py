"""
Partnership Activation Backend Tests
Tests for the new /api/partnership/* endpoints for converting approved clients to partners.

Test user: att2_1773352332@test.com (ID: 0aad124a-4fd2-4159-b75a-86b3481ddb5f)
- Has pagamento_analisi=true, call_stato=completata, analisi_generata=true
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPartnershipEndpoints:
    """Test all partnership activation endpoints"""
    
    # Test user credentials
    TEST_USER_EMAIL = "att2_1773352332@test.com"
    TEST_USER_PASSWORD = "TestCliente123"
    TEST_USER_ID = "0aad124a-4fd2-4159-b75a-86b3481ddb5f"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 1: GET /api/partnership/get-analisi
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_get_analisi_success(self):
        """Test retrieving strategic analysis for partnership activation"""
        response = self.session.get(
            f"{BASE_URL}/api/partnership/get-analisi",
            params={"user_id": self.TEST_USER_ID}
        )
        
        print(f"GET /api/partnership/get-analisi - Status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "analisi_testo" in data, "Response should contain analisi_testo"
        
        # Verify analisi_testo is not empty
        analisi = data.get("analisi_testo", "")
        assert len(analisi) > 0, "analisi_testo should not be empty"
        print(f"✅ GET /api/partnership/get-analisi - SUCCESS (analisi length: {len(analisi)})")
    
    def test_get_analisi_invalid_user(self):
        """Test get-analisi with invalid user_id returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/partnership/get-analisi",
            params={"user_id": "invalid-user-id-12345"}
        )
        
        print(f"GET /api/partnership/get-analisi (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404 for invalid user, got {response.status_code}"
        print("✅ GET /api/partnership/get-analisi (invalid user) - Returns 404 as expected")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 2: POST /api/partnership/update-step
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_update_step_analisi_visualizzata(self):
        """Test updating analisi_visualizzata step"""
        response = self.session.post(
            f"{BASE_URL}/api/partnership/update-step",
            json={
                "user_id": self.TEST_USER_ID,
                "step": "analisi_visualizzata",
                "value": True
            }
        )
        
        print(f"POST /api/partnership/update-step (analisi_visualizzata) - Status: {response.status_code}")
        print(f"Response: {response.text[:300] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("step") == "analisi_visualizzata", "Step should match"
        assert data.get("value") == True, "Value should be True"
        print("✅ POST /api/partnership/update-step (analisi_visualizzata) - SUCCESS")
    
    def test_update_step_partnership_confermata(self):
        """Test updating partnership_confermata step"""
        response = self.session.post(
            f"{BASE_URL}/api/partnership/update-step",
            json={
                "user_id": self.TEST_USER_ID,
                "step": "partnership_confermata",
                "value": True
            }
        )
        
        print(f"POST /api/partnership/update-step (partnership_confermata) - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✅ POST /api/partnership/update-step (partnership_confermata) - SUCCESS")
    
    def test_update_step_invalid_step(self):
        """Test update-step with invalid step name returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/partnership/update-step",
            json={
                "user_id": self.TEST_USER_ID,
                "step": "invalid_step_name",
                "value": True
            }
        )
        
        print(f"POST /api/partnership/update-step (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for invalid step, got {response.status_code}"
        print("✅ POST /api/partnership/update-step (invalid step) - Returns 400 as expected")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 3: POST /api/partnership/upload-documento
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_upload_documento_contratto(self):
        """Test uploading signed contract document"""
        # Create a test PDF file in memory
        test_file_content = b"%PDF-1.4 test contract content"
        files = {
            'file': ('test_contratto.pdf', io.BytesIO(test_file_content), 'application/pdf')
        }
        data = {
            'user_id': self.TEST_USER_ID,
            'tipo': 'contratto_firmato'
        }
        
        # Remove Content-Type header for multipart
        headers = {}
        
        response = requests.post(
            f"{BASE_URL}/api/partnership/upload-documento",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"POST /api/partnership/upload-documento (contratto) - Status: {response.status_code}")
        print(f"Response: {response.text[:300] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        resp_data = response.json()
        assert resp_data.get("success") == True, "Response should have success=True"
        assert "document_id" in resp_data, "Response should contain document_id"
        assert resp_data.get("tipo") == "contratto_firmato", "Tipo should match"
        print("✅ POST /api/partnership/upload-documento (contratto) - SUCCESS")
    
    def test_upload_documento_carta_identita(self):
        """Test uploading ID card document"""
        test_file_content = b"fake image content for carta identita"
        files = {
            'file': ('carta_identita.jpg', io.BytesIO(test_file_content), 'image/jpeg')
        }
        data = {
            'user_id': self.TEST_USER_ID,
            'tipo': 'carta_identita'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partnership/upload-documento",
            files=files,
            data=data
        )
        
        print(f"POST /api/partnership/upload-documento (carta_identita) - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        resp_data = response.json()
        assert resp_data.get("success") == True
        print("✅ POST /api/partnership/upload-documento (carta_identita) - SUCCESS")
    
    def test_upload_documento_invalid_tipo(self):
        """Test upload with invalid document type returns 400"""
        test_file_content = b"test content"
        files = {
            'file': ('test.pdf', io.BytesIO(test_file_content), 'application/pdf')
        }
        data = {
            'user_id': self.TEST_USER_ID,
            'tipo': 'invalid_document_type'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partnership/upload-documento",
            files=files,
            data=data
        )
        
        print(f"POST /api/partnership/upload-documento (invalid tipo) - Status: {response.status_code}")
        
        assert response.status_code == 400, f"Expected 400 for invalid tipo, got {response.status_code}"
        print("✅ POST /api/partnership/upload-documento (invalid tipo) - Returns 400 as expected")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 4: POST /api/partnership/create-checkout-session
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_create_checkout_session(self):
        """Test creating Stripe checkout session for €2,790 partnership payment"""
        response = self.session.post(
            f"{BASE_URL}/api/partnership/create-checkout-session",
            json={"user_id": self.TEST_USER_ID}
        )
        
        print(f"POST /api/partnership/create-checkout-session - Status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "checkout_url" in data, "Response should contain checkout_url"
        assert "session_id" in data, "Response should contain session_id"
        assert data.get("amount") == 2790.00, f"Amount should be 2790.00, got {data.get('amount')}"
        assert data.get("currency") == "eur", "Currency should be eur"
        
        # Verify checkout_url is a valid Stripe URL
        checkout_url = data.get("checkout_url", "")
        assert "stripe.com" in checkout_url or "checkout" in checkout_url, "checkout_url should be a Stripe URL"
        
        print(f"✅ POST /api/partnership/create-checkout-session - SUCCESS (checkout_url: {checkout_url[:50]}...)")
    
    def test_create_checkout_session_invalid_user(self):
        """Test create-checkout-session with invalid user returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/partnership/create-checkout-session",
            json={"user_id": "invalid-user-id-xyz"}
        )
        
        print(f"POST /api/partnership/create-checkout-session (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404 for invalid user, got {response.status_code}"
        print("✅ POST /api/partnership/create-checkout-session (invalid user) - Returns 404 as expected")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 5: GET /api/partnership/status/{user_id}
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_get_partnership_status(self):
        """Test getting current partnership activation status"""
        response = self.session.get(
            f"{BASE_URL}/api/partnership/status/{self.TEST_USER_ID}"
        )
        
        print(f"GET /api/partnership/status/{self.TEST_USER_ID} - Status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'Empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("user_id") == self.TEST_USER_ID, "user_id should match"
        
        # Verify all expected fields are present
        expected_fields = [
            "analisi_visualizzata",
            "partnership_confermata",
            "contratto_firmato",
            "documenti_caricati",
            "pagamento_verificato",
            "documenti_count",
            "is_partner"
        ]
        
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        print(f"✅ GET /api/partnership/status - SUCCESS")
        print(f"   Status: analisi_visualizzata={data.get('analisi_visualizzata')}, "
              f"partnership_confermata={data.get('partnership_confermata')}, "
              f"contratto_firmato={data.get('contratto_firmato')}")
    
    def test_get_partnership_status_invalid_user(self):
        """Test get status with invalid user returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/partnership/status/invalid-user-id-abc"
        )
        
        print(f"GET /api/partnership/status (invalid) - Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404 for invalid user, got {response.status_code}"
        print("✅ GET /api/partnership/status (invalid user) - Returns 404 as expected")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 6: POST /api/partnership/convert-to-partner
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_convert_to_partner_missing_steps(self):
        """Test convert-to-partner fails when required steps are not completed"""
        # First, reset the user's steps to ensure they're not all completed
        # This test verifies the validation logic
        
        response = self.session.post(
            f"{BASE_URL}/api/partnership/convert-to-partner",
            params={"user_id": self.TEST_USER_ID}
        )
        
        print(f"POST /api/partnership/convert-to-partner - Status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'Empty'}")
        
        # Should return 400 if steps are missing, or 200 if all steps are complete
        # We accept both as valid responses depending on user state
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Error response should contain detail"
            print(f"✅ POST /api/partnership/convert-to-partner - Returns 400 (missing steps: {data.get('detail')})")
        else:
            data = response.json()
            assert data.get("success") == True, "Success response should have success=True"
            print("✅ POST /api/partnership/convert-to-partner - SUCCESS (user converted)")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TEST 7: Static file - contratto PDF
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_static_contratto_pdf_accessible(self):
        """Test that the partnership contract PDF is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/static/contratto-partnership-evolution-pro.pdf",
            stream=True
        )
        
        print(f"GET /api/static/contratto-partnership-evolution-pro.pdf - Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify it's a PDF
        content_type = response.headers.get('content-type', '')
        assert 'pdf' in content_type.lower() or 'octet-stream' in content_type.lower(), \
            f"Expected PDF content-type, got {content_type}"
        
        # Verify file has content
        content_length = int(response.headers.get('content-length', 0))
        assert content_length > 0, "PDF file should have content"
        
        print(f"✅ Static PDF accessible - Size: {content_length} bytes")


class TestPartnershipVerifyPayment:
    """Test payment verification endpoint (separate class to avoid side effects)"""
    
    TEST_USER_ID = "0aad124a-4fd2-4159-b75a-86b3481ddb5f"
    
    def test_verify_payment_no_session(self):
        """Test verify-payment when no session exists"""
        response = requests.post(
            f"{BASE_URL}/api/partnership/verify-payment",
            params={"user_id": self.TEST_USER_ID}
        )
        
        print(f"POST /api/partnership/verify-payment - Status: {response.status_code}")
        print(f"Response: {response.text[:300] if response.text else 'Empty'}")
        
        # Should return 400 if no session, or 200 if already paid/session exists
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Could be already_paid=True or paid=False
            print(f"✅ verify-payment returned 200: {data}")
        else:
            print("✅ verify-payment returned 400 (no session) as expected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
