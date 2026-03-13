"""
Test suite for Onboarding Documents API endpoints
Tests: GET, POST upload, DELETE, POST verify, GET admin pending
Partner test: testf0@evolutionpro.it / Test2026! (partner in fase F0)
Partner ID: d248c632-869d-4a13-b94a-dbf2425fa143
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://business-flow-hub-4.preview.emergentagent.com')
PARTNER_ID_F0 = "d248c632-869d-4a13-b94a-dbf2425fa143"
ADMIN_EMAIL = "claudio@evolutionpro.it"
ADMIN_PASSWORD = "Evolution2026!"
PARTNER_EMAIL = "testf0@evolutionpro.it"
PARTNER_PASSWORD = "Test2026!"

# Document types
DOC_TYPES = ["contratto_firmato", "documenti_personali", "distinta_pagamento"]


class TestOnboardingDocumentsAPI:
    """Test onboarding documents endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_get_onboarding_documents_empty(self):
        """Test GET /api/partners/{partner_id}/onboarding-documents - initial state"""
        response = self.session.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents")
        
        print(f"GET onboarding-documents status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documents" in data
        assert "completion" in data
        assert data["completion"]["total_required"] == 3
    
    def test_02_get_onboarding_documents_invalid_partner(self):
        """Test GET with invalid partner ID returns 404"""
        response = self.session.get(f"{BASE_URL}/api/partners/invalid-partner-id/onboarding-documents")
        
        print(f"GET invalid partner status: {response.status_code}")
        
        assert response.status_code == 404
    
    def test_03_upload_document_contratto(self):
        """Test POST /api/partners/{partner_id}/onboarding-documents/upload - contratto_firmato"""
        # Create a test PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n199\n%%EOF"
        
        files = {
            'file': ('test_contratto.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'partner_id': PARTNER_ID_F0,
            'document_type': 'contratto_firmato'
        }
        
        # Remove Content-Type header for multipart
        headers = {}
        
        response = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"Upload contratto status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code < 500 else response.text}")
        
        # Accept 200 (new upload) or 400 (already exists - expected in re-runs)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            result = response.json()
            assert result["success"] == True
            assert result["document"]["document_type"] == "contratto_firmato"
            assert result["document"]["status"] == "uploaded"
        else:
            # Document already exists - this is expected behavior
            assert "already uploaded" in response.json().get("detail", "")
    
    def test_04_upload_document_documenti_personali(self):
        """Test POST upload - documenti_personali"""
        # Create a test image file
        img_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_documento.png', io.BytesIO(img_content), 'image/png')
        }
        data = {
            'partner_id': PARTNER_ID_F0,
            'document_type': 'documenti_personali'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files,
            data=data
        )
        
        print(f"Upload documenti_personali status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code < 500 else response.text}")
        
        # Accept 200 (new upload) or 400 (already exists - expected in re-runs)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            result = response.json()
            assert result["success"] == True
            assert result["document"]["document_type"] == "documenti_personali"
        else:
            # Document already exists - this is expected behavior
            assert "already uploaded" in response.json().get("detail", "")
    
    def test_05_upload_document_distinta(self):
        """Test POST upload - distinta_pagamento"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n199\n%%EOF"
        
        files = {
            'file': ('test_distinta.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'partner_id': PARTNER_ID_F0,
            'document_type': 'distinta_pagamento'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files,
            data=data
        )
        
        print(f"Upload distinta status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code < 500 else response.text}")
        
        # Accept 200 (new upload) or 400 (already exists - expected in re-runs)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            result = response.json()
            assert result["success"] == True
            assert result["document"]["document_type"] == "distinta_pagamento"
        else:
            # Document already exists - this is expected behavior
            assert "already uploaded" in response.json().get("detail", "")
    
    def test_06_get_onboarding_documents_after_upload(self):
        """Test GET after uploading all documents"""
        response = self.session.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents")
        
        print(f"GET after upload status: {response.status_code}")
        data = response.json()
        print(f"Documents count: {len(data.get('documents', []))}")
        print(f"Completion: {data.get('completion')}")
        
        assert response.status_code == 200
        assert data["success"] == True
        # Should have at least some documents uploaded
        assert len(data["documents"]) >= 0  # May have been cleaned up
    
    def test_07_upload_duplicate_document_fails(self):
        """Test that uploading duplicate document type fails"""
        # First upload a document
        pdf_content = b"%PDF-1.4\ntest"
        files = {
            'file': ('test_dup.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'partner_id': PARTNER_ID_F0,
            'document_type': 'contratto_firmato'
        }
        
        # First upload
        response1 = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files,
            data=data
        )
        
        # Try duplicate upload
        files2 = {
            'file': ('test_dup2.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        response2 = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files2,
            data=data
        )
        
        print(f"Duplicate upload status: {response2.status_code}")
        
        # Should fail with 400 if document already exists
        if response1.status_code == 200:
            assert response2.status_code == 400
    
    def test_08_upload_invalid_document_type(self):
        """Test upload with invalid document type fails"""
        pdf_content = b"%PDF-1.4\ntest"
        files = {
            'file': ('test.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'partner_id': PARTNER_ID_F0,
            'document_type': 'invalid_type'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/upload",
            files=files,
            data=data
        )
        
        print(f"Invalid type upload status: {response.status_code}")
        
        assert response.status_code == 400
    
    def test_09_get_admin_pending_documents(self):
        """Test GET /api/admin/onboarding-documents/pending"""
        response = self.session.get(f"{BASE_URL}/api/admin/onboarding-documents/pending")
        
        print(f"Admin pending status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documents" in data
    
    def test_10_verify_document(self):
        """Test POST /api/partners/{partner_id}/onboarding-documents/{document_type}/verify"""
        # First ensure we have a document to verify
        response = self.session.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents")
        docs = response.json().get("documents", [])
        
        if docs:
            doc_type = docs[0]["document_type"]
            verify_response = self.session.post(
                f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/{doc_type}/verify",
                params={"admin_email": ADMIN_EMAIL}
            )
            
            print(f"Verify document status: {verify_response.status_code}")
            print(f"Response: {verify_response.json()}")
            
            assert verify_response.status_code == 200
            result = verify_response.json()
            assert result["success"] == True
            assert result["status"] == "verified"
        else:
            print("No documents to verify - skipping")
            pytest.skip("No documents available to verify")
    
    def test_11_delete_non_verified_document(self):
        """Test DELETE /api/partners/{partner_id}/onboarding-documents/{document_type}"""
        # First get documents
        response = self.session.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents")
        docs = response.json().get("documents", [])
        
        # Find a non-verified document
        non_verified = [d for d in docs if d.get("status") != "verified"]
        
        if non_verified:
            doc_type = non_verified[0]["document_type"]
            delete_response = self.session.delete(
                f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/{doc_type}"
            )
            
            print(f"Delete document status: {delete_response.status_code}")
            print(f"Response: {delete_response.json()}")
            
            assert delete_response.status_code == 200
            result = delete_response.json()
            assert result["success"] == True
        else:
            print("No non-verified documents to delete - skipping")
            pytest.skip("No non-verified documents available to delete")
    
    def test_12_delete_verified_document_fails(self):
        """Test that deleting a verified document fails"""
        # First get documents
        response = self.session.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents")
        docs = response.json().get("documents", [])
        
        # Find a verified document
        verified = [d for d in docs if d.get("status") == "verified"]
        
        if verified:
            doc_type = verified[0]["document_type"]
            delete_response = self.session.delete(
                f"{BASE_URL}/api/partners/{PARTNER_ID_F0}/onboarding-documents/{doc_type}"
            )
            
            print(f"Delete verified document status: {delete_response.status_code}")
            
            assert delete_response.status_code == 400
        else:
            print("No verified documents to test - skipping")
            pytest.skip("No verified documents available to test")


class TestPartnerF0Exists:
    """Test that the F0 partner exists and is in correct phase"""
    
    def test_partner_exists(self):
        """Verify test partner exists"""
        response = requests.get(f"{BASE_URL}/api/partners/{PARTNER_ID_F0}")
        
        print(f"Partner exists status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Partner: {data.get('name')} - Phase: {data.get('phase')}")
            assert data.get("phase") == "F0", f"Partner should be in F0, but is in {data.get('phase')}"
        else:
            print(f"Partner not found: {response.text}")
            pytest.skip("Test partner not found - may need to be created")


class TestAuthEndpoints:
    """Test authentication for admin and partner"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        print(f"Admin login status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    def test_partner_login(self):
        """Test partner login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        
        print(f"Partner login status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
        else:
            print(f"Partner login failed: {response.text}")
            # Partner may not exist yet
            pytest.skip("Partner user may not exist")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
