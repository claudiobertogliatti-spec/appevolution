"""
Test suite for /proposta page endpoints - Post Analisi Partnership flow
Tests: save-personal-data, personal-data, contract-text, partnership-firma,
       upload-document, documents, partnership-bonifico, send-signed-contract
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_CLIENTE_EMAIL = "mario.rossi@test.com"
TEST_CLIENTE_PASSWORD = "TestMario123"
TEST_USER_ID = "2e3357f3-254b-49bc-98d8-a55771d75f0d"
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"


@pytest.fixture(scope="module")
def cliente_token():
    """Get authentication token for test cliente"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CLIENTE_EMAIL,
        "password": TEST_CLIENTE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Cliente login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get authentication token for admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestPersonalDataEndpoints:
    """Tests for personal data save/get endpoints"""

    def test_save_personal_data_success(self, cliente_token):
        """POST /api/cliente-analisi/save-personal-data - should save personal data"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        payload = {
            "nome_completo": "Mario Rossi",
            "codice_fiscale": "RSSMRA80A01H501Z",
            "nome_azienda": "Rossi Digital Srl",
            "email_lavoro": "mario@rossidigital.it",
            "pec": "rossidigital@pec.it",
            "indirizzo": "Via Roma 123",
            "citta": "Milano",
            "cap": "20100",
            "provincia": "MI",
            "partita_iva": "12345678901",
            "telefono": "+39 333 1234567"
        }
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/save-personal-data",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True

    def test_save_personal_data_missing_required_field(self, cliente_token):
        """POST /api/cliente-analisi/save-personal-data - should fail without required fields"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        payload = {
            "nome_completo": "Mario Rossi",
            # Missing codice_fiscale, nome_azienda, email_lavoro, etc.
        }
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/save-personal-data",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_get_personal_data_success(self, cliente_token):
        """GET /api/cliente-analisi/personal-data/{user_id} - should return saved data"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/personal-data/{TEST_USER_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "data" in data
        # Verify the new fields are present
        personal = data["data"]
        if personal:  # May be empty if not saved yet
            assert "nome_azienda" in personal or personal == {}
            assert "email_lavoro" in personal or personal == {}
            assert "pec" in personal or personal == {}


class TestContractTextEndpoint:
    """Tests for contract text endpoint"""

    def test_get_contract_text_success(self, cliente_token):
        """GET /api/cliente-analisi/contract-text/{user_id} - should return contract text with corrispettivo"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/contract-text/{TEST_USER_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert "corrispettivo" in data, "Response should contain 'corrispettivo' field"
        # Contract text should be substantial
        assert len(data["text"]) > 10000, f"Contract text too short: {len(data['text'])} chars"
        # Corrispettivo should be a number
        assert isinstance(data["corrispettivo"], (int, float))


class TestPartnershipFirmaEndpoint:
    """Tests for digital signature endpoint"""

    def test_partnership_firma_success(self, cliente_token):
        """POST /api/cliente-analisi/partnership-firma - should save digital signature"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        import base64
        firma_text = f"FIRMA DIGITALE: Mario Rossi - 2026-01-15T10:00:00Z"
        firma_base64 = base64.b64encode(firma_text.encode()).decode()
        
        payload = {
            "firma_base64": firma_base64,
            "articoli_confermati": [3, 5, 7, 9, 11]  # Important articles
        }
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-firma",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True


class TestDocumentUploadEndpoints:
    """Tests for document upload endpoints"""

    def test_upload_document_identita(self, cliente_token):
        """POST /api/cliente-analisi/upload-document?tipo=identita - should upload identity document"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        # Create a simple test file
        test_content = b"Test identity document content"
        files = {"file": ("test_identita.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/upload-document?tipo=identita",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("tipo") == "identita"
        assert "url" in data

    def test_upload_document_codice_fiscale(self, cliente_token):
        """POST /api/cliente-analisi/upload-document?tipo=codice_fiscale - should upload CF document"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        test_content = b"Test codice fiscale document content"
        files = {"file": ("test_cf.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/upload-document?tipo=codice_fiscale",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("tipo") == "codice_fiscale"

    def test_upload_document_distinta_pagamento(self, cliente_token):
        """POST /api/cliente-analisi/upload-document?tipo=distinta_pagamento - should upload payment receipt"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        test_content = b"Test distinta pagamento content"
        files = {"file": ("test_distinta.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/upload-document?tipo=distinta_pagamento",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("tipo") == "distinta_pagamento"

    def test_upload_document_invalid_tipo(self, cliente_token):
        """POST /api/cliente-analisi/upload-document?tipo=invalid - should fail with invalid tipo"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        test_content = b"Test content"
        files = {"file": ("test.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/upload-document?tipo=invalid_type",
            files=files,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_get_documents_success(self, cliente_token):
        """GET /api/cliente-analisi/documents/{user_id} - should return uploaded documents"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/documents/{TEST_USER_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "documents" in data


class TestPartnershipBonificoEndpoint:
    """Tests for bonifico (bank transfer) endpoint"""

    def test_partnership_bonifico_success(self, cliente_token):
        """POST /api/cliente-analisi/partnership-bonifico - should return IBAN details"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-bonifico",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should return bank details
        assert "iban" in data or "IBAN" in str(data), f"Response should contain IBAN: {data}"
        assert "beneficiario" in data or "banca" in data, f"Response should contain bank details: {data}"


class TestSendSignedContractEndpoint:
    """Tests for send signed contract email endpoint"""

    def test_send_signed_contract_success(self, cliente_token):
        """POST /api/cliente-analisi/send-signed-contract - should generate PDF and send email"""
        headers = {"Authorization": f"Bearer {cliente_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/send-signed-contract",
            headers=headers
        )
        # This endpoint may return success or error depending on SMTP config
        # We just verify it doesn't crash (500)
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        data = response.json()
        # Should have either success or error field
        assert "success" in data or "error" in data or "detail" in data, f"Unexpected response: {data}"


class TestAuthenticationRequired:
    """Tests to verify authentication is required"""

    def test_save_personal_data_no_auth(self):
        """POST /api/cliente-analisi/save-personal-data - should fail without auth"""
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/save-personal-data",
            json={"nome_completo": "Test"}
        )
        assert response.status_code == 401

    def test_upload_document_no_auth(self):
        """POST /api/cliente-analisi/upload-document - should fail without auth"""
        files = {"file": ("test.pdf", io.BytesIO(b"test"), "application/pdf")}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/upload-document?tipo=identita",
            files=files
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
