"""
Test suite for Partner Documents Upload API endpoints (Evolution PRO)
Tests: GET status, POST upload, POST submit-review, DELETE, Admin verify/reject

Document types: identity_front, identity_back, codice_fiscale, piva, logo, distinta
Required: identity_front, identity_back, codice_fiscale, distinta
Optional: piva, logo

Test partners: 23 (Daniele Andolfi), 2 (Arianna Aceto)
Admin: claudio.bertogliatti@gmail.com / Evoluzione74
"""
import pytest
import requests
import os
from PIL import Image
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com')
PARTNER_ID_23 = "23"  # Daniele Andolfi
PARTNER_ID_2 = "2"    # Arianna Aceto
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"

# Document types configuration
DOC_TYPES_REQUIRED = ["identity_front", "identity_back", "codice_fiscale", "distinta"]
DOC_TYPES_OPTIONAL = ["piva", "logo"]
ALL_DOC_TYPES = DOC_TYPES_REQUIRED + DOC_TYPES_OPTIONAL


def create_test_image():
    """Create a small test image in memory"""
    img = Image.new('RGB', (100, 100), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes


class TestPartnerDocumentsStatus:
    """Test GET /api/partner/documents/status endpoint"""
    
    def test_01_get_documents_status_partner_23(self):
        """Test GET status for partner 23 - returns 6 document types"""
        response = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        
        print(f"GET status partner 23: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "documents" in data
        assert "documents_status" in data
        assert "progress" in data
        assert "config" in data
        
        # Verify all 6 document types are present in config
        config = data["config"]
        assert len(config) == 6, f"Expected 6 doc types, got {len(config)}"
        for doc_type in ALL_DOC_TYPES:
            assert doc_type in config, f"Missing doc type: {doc_type}"
        
        # Verify required/optional flags
        for doc_type in DOC_TYPES_REQUIRED:
            assert config[doc_type]["required"] == True, f"{doc_type} should be required"
        for doc_type in DOC_TYPES_OPTIONAL:
            assert config[doc_type]["required"] == False, f"{doc_type} should be optional"
        
        # Verify progress structure
        progress = data["progress"]
        assert "required_total" in progress
        assert "required_uploaded" in progress
        assert progress["required_total"] == 4, "Should have 4 required docs"
        
        print(f"Documents status: {data['documents_status']}")
        print(f"Progress: {progress}")
    
    def test_02_get_documents_status_invalid_partner(self):
        """Test GET status with invalid partner ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id=invalid-999")
        
        print(f"GET invalid partner: {response.status_code}")
        
        assert response.status_code == 404


class TestPartnerDocumentsUpload:
    """Test POST /api/partner/documents/upload/{doc_type} endpoint"""
    
    def test_03_upload_identity_back_partner_23(self):
        """Test upload identity_back for partner 23"""
        img_bytes = create_test_image()
        
        files = {'file': ('test_identity_back.jpg', img_bytes, 'image/jpeg')}
        data = {'partner_id': PARTNER_ID_23}
        
        response = requests.post(
            f"{BASE_URL}/api/partner/documents/upload/identity_back",
            files=files,
            data=data
        )
        
        print(f"Upload identity_back: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["doc_type"] == "identity_back"
        assert result["document"]["status"] == "uploaded"
        assert result["document"]["url"] != ""
    
    def test_04_upload_invalid_doc_type(self):
        """Test upload with invalid document type returns 400"""
        img_bytes = create_test_image()
        
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        data = {'partner_id': PARTNER_ID_23}
        
        response = requests.post(
            f"{BASE_URL}/api/partner/documents/upload/invalid_type",
            files=files,
            data=data
        )
        
        print(f"Upload invalid type: {response.status_code}")
        
        assert response.status_code == 400
        assert "non valido" in response.json()["detail"]
    
    def test_05_upload_invalid_format(self):
        """Test upload with invalid file format returns 400"""
        # Create a fake .exe file
        fake_file = io.BytesIO(b"fake executable content")
        
        files = {'file': ('test.exe', fake_file, 'application/octet-stream')}
        data = {'partner_id': PARTNER_ID_23}
        
        response = requests.post(
            f"{BASE_URL}/api/partner/documents/upload/identity_front",
            files=files,
            data=data
        )
        
        print(f"Upload invalid format: {response.status_code}")
        
        assert response.status_code == 400
        assert "Formato non supportato" in response.json()["detail"]


class TestPartnerDocumentsDelete:
    """Test DELETE /api/partner/documents/{doc_type} endpoint"""
    
    def test_06_delete_uploaded_document(self):
        """Test delete a non-verified document"""
        # First check current status
        status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        docs = status_resp.json().get("documents", {})
        
        # Find identity_back which we just uploaded
        identity_back = docs.get("identity_back", {})
        if identity_back.get("status") == "uploaded":
            response = requests.delete(
                f"{BASE_URL}/api/partner/documents/identity_back?partner_id={PARTNER_ID_23}"
            )
            
            print(f"Delete identity_back: {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 200
            assert response.json()["success"] == True
            
            # Verify it's reset to pending
            status_resp2 = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
            docs2 = status_resp2.json().get("documents", {})
            assert docs2.get("identity_back", {}).get("status") == "pending"
        else:
            print(f"identity_back status is {identity_back.get('status')}, skipping delete test")
            pytest.skip("identity_back not in uploaded status")
    
    def test_07_delete_verified_document_fails(self):
        """Test that deleting a verified document fails"""
        # Check if identity_front is verified (from previous testing)
        status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        docs = status_resp.json().get("documents", {})
        
        identity_front = docs.get("identity_front", {})
        if identity_front.get("status") == "verified":
            response = requests.delete(
                f"{BASE_URL}/api/partner/documents/identity_front?partner_id={PARTNER_ID_23}"
            )
            
            print(f"Delete verified doc: {response.status_code}")
            
            assert response.status_code == 400
            assert "già verificato" in response.json()["detail"]
        else:
            print(f"identity_front status is {identity_front.get('status')}, skipping verified delete test")
            pytest.skip("No verified document to test")


class TestAdminDocumentsEndpoints:
    """Test Admin endpoints for document verification"""
    
    def test_08_admin_get_documents_partner_23(self):
        """Test GET /api/admin/partners/{id}/documents"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents")
        
        print(f"Admin GET docs: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "partner_name" in data
        assert "documents" in data
        assert "documents_status" in data
        assert "config" in data
        
        print(f"Partner: {data['partner_name']}")
        print(f"Documents status: {data['documents_status']}")
    
    def test_09_admin_verify_document(self):
        """Test PATCH /api/admin/partners/{id}/documents/{doc_type}/verify"""
        # First upload a document to verify
        img_bytes = create_test_image()
        files = {'file': ('test_codice_fiscale.jpg', img_bytes, 'image/jpeg')}
        data = {'partner_id': PARTNER_ID_23}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/partner/documents/upload/codice_fiscale",
            files=files,
            data=data
        )
        
        if upload_resp.status_code == 200:
            # Now verify it
            response = requests.patch(
                f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents/codice_fiscale/verify"
            )
            
            print(f"Admin verify: {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] == True
            assert result["status"] == "verified"
        else:
            # Document might already exist, try to verify anyway
            status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
            docs = status_resp.json().get("documents", {})
            cf = docs.get("codice_fiscale", {})
            
            if cf.get("status") == "uploaded":
                response = requests.patch(
                    f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents/codice_fiscale/verify"
                )
                assert response.status_code == 200
            else:
                print(f"codice_fiscale status: {cf.get('status')}")
                pytest.skip("No uploaded document to verify")
    
    def test_10_admin_reject_document(self):
        """Test PATCH /api/admin/partners/{id}/documents/{doc_type}/reject"""
        # First upload a document to reject
        img_bytes = create_test_image()
        files = {'file': ('test_distinta.jpg', img_bytes, 'image/jpeg')}
        data = {'partner_id': PARTNER_ID_23}
        
        upload_resp = requests.post(
            f"{BASE_URL}/api/partner/documents/upload/distinta",
            files=files,
            data=data
        )
        
        if upload_resp.status_code == 200:
            # Now reject it
            response = requests.patch(
                f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents/distinta/reject",
                json={"note": "Test rejection - documento non leggibile"}
            )
            
            print(f"Admin reject: {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 200
            result = response.json()
            assert result["success"] == True
            assert result["status"] == "rejected"
            assert result["note"] == "Test rejection - documento non leggibile"
        else:
            # Try to reject existing uploaded document
            status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
            docs = status_resp.json().get("documents", {})
            distinta = docs.get("distinta", {})
            
            if distinta.get("status") == "uploaded":
                response = requests.patch(
                    f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents/distinta/reject",
                    json={"note": "Test rejection"}
                )
                assert response.status_code == 200
            else:
                print(f"distinta status: {distinta.get('status')}")
                pytest.skip("No uploaded document to reject")
    
    def test_11_admin_verify_non_uploaded_fails(self):
        """Test that verifying a non-uploaded document fails"""
        # Try to verify a document that's not uploaded
        status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        docs = status_resp.json().get("documents", {})
        
        # Find a pending document
        for doc_type, doc_data in docs.items():
            if doc_data.get("status") == "pending":
                response = requests.patch(
                    f"{BASE_URL}/api/admin/partners/{PARTNER_ID_23}/documents/{doc_type}/verify"
                )
                
                print(f"Verify pending doc: {response.status_code}")
                
                assert response.status_code == 400
                assert "uploaded" in response.json()["detail"]
                return
        
        pytest.skip("No pending documents to test")


class TestSubmitForReview:
    """Test POST /api/partner/documents/submit-review endpoint"""
    
    def test_12_submit_review_missing_required(self):
        """Test submit-review fails when required docs are missing"""
        # First check current status
        status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        progress = status_resp.json().get("progress", {})
        
        if progress.get("required_uploaded", 0) < progress.get("required_total", 4):
            # Missing required docs, submit should fail
            response = requests.post(
                f"{BASE_URL}/api/partner/documents/submit-review",
                data={"partner_id": PARTNER_ID_23}
            )
            
            print(f"Submit review (missing docs): {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 400
            assert "obbligatorio mancante" in response.json()["detail"]
        else:
            print("All required docs uploaded, skipping missing docs test")
            pytest.skip("All required docs already uploaded")


class TestDocumentStatusValues:
    """Test that document statuses are correctly returned"""
    
    def test_13_verify_status_values(self):
        """Verify all possible status values are handled"""
        response = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["pending", "not_required", "uploaded", "verified", "rejected", "under_review"]
        
        for doc_type, doc_data in data["documents"].items():
            status = doc_data.get("status")
            assert status in valid_statuses, f"Invalid status '{status}' for {doc_type}"
            print(f"{doc_type}: {status}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_99_cleanup_test_documents(self):
        """Reset test documents to clean state"""
        # Delete any uploaded but not verified documents
        status_resp = requests.get(f"{BASE_URL}/api/partner/documents/status?partner_id={PARTNER_ID_23}")
        docs = status_resp.json().get("documents", {})
        
        for doc_type, doc_data in docs.items():
            if doc_data.get("status") in ["uploaded", "rejected"]:
                delete_resp = requests.delete(
                    f"{BASE_URL}/api/partner/documents/{doc_type}?partner_id={PARTNER_ID_23}"
                )
                print(f"Cleanup {doc_type}: {delete_resp.status_code}")
        
        print("Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
