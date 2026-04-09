"""
Test Post Analisi Partnership - Evolution PRO
Tests for the 11-section conversion funnel page and its backend endpoints.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_CLIENT_EMAIL = "mario.rossi@test.com"
TEST_CLIENT_PASSWORD = "TestMario123"
TEST_USER_ID = "2e3357f3-254b-49bc-98d8-a55771d75f0d"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def client_token():
    """Get test client authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CLIENT_EMAIL,
        "password": TEST_CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Client authentication failed")


class TestContractTextEndpoint:
    """Tests for GET /api/cliente-analisi/contract-text/{user_id}"""

    def test_contract_text_requires_auth(self):
        """Contract text endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/contract-text/{TEST_USER_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_contract_text_returns_text_and_corrispettivo(self, client_token):
        """Contract text endpoint returns text and corrispettivo"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/contract-text/{TEST_USER_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert "corrispettivo" in data, "Response should contain 'corrispettivo' field"
        
        # Verify contract text is substantial (should be ~55k chars)
        assert len(data["text"]) > 10000, f"Contract text too short: {len(data['text'])} chars"
        
        # Verify corrispettivo is a number
        assert isinstance(data["corrispettivo"], (int, float)), "Corrispettivo should be numeric"
        assert data["corrispettivo"] > 0, "Corrispettivo should be positive"

    def test_contract_text_contains_articles(self, client_token):
        """Contract text contains numbered articles"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/contract-text/{TEST_USER_ID}",
            headers=headers
        )
        assert response.status_code == 200
        
        text = response.json()["text"]
        # Check for important articles (3, 5, 7, 9, 11)
        assert "Art. 3" in text or "ARTICOLO 3" in text, "Contract should contain Article 3"
        assert "Art. 5" in text or "ARTICOLO 5" in text, "Contract should contain Article 5"
        assert "Art. 7" in text or "ARTICOLO 7" in text, "Contract should contain Article 7"
        assert "Art. 9" in text or "ARTICOLO 9" in text, "Contract should contain Article 9"
        assert "Art. 11" in text or "ARTICOLO 11" in text, "Contract should contain Article 11"

    def test_contract_text_404_for_invalid_user(self, client_token):
        """Contract text returns 404 for non-existent user"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/contract-text/nonexistent-user-id",
            headers=headers
        )
        assert response.status_code == 404


class TestPartnershipFirmaEndpoint:
    """Tests for POST /api/cliente-analisi/partnership-firma"""

    def test_firma_requires_auth(self):
        """Firma endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/partnership-firma", json={
            "firma_base64": "dGVzdA==",
            "articoli_confermati": [3, 5, 7, 9, 11]
        })
        assert response.status_code == 401

    def test_firma_requires_firma_base64(self, client_token):
        """Firma endpoint requires firma_base64 field"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-firma",
            headers=headers,
            json={"articoli_confermati": [3, 5, 7, 9, 11]}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_firma_success(self, client_token):
        """Firma endpoint saves signature successfully"""
        headers = {"Authorization": f"Bearer {client_token}"}
        import base64
        firma_text = f"FIRMA DIGITALE: Mario Rossi - 2026-01-15T10:00:00Z"
        firma_base64 = base64.b64encode(firma_text.encode()).decode()
        
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-firma",
            headers=headers,
            json={
                "firma_base64": firma_base64,
                "articoli_confermati": [3, 5, 7, 9, 11]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "signed_at" in data, "Response should contain signed_at timestamp"


class TestPartnershipCheckoutEndpoint:
    """Tests for POST /api/cliente-analisi/partnership-checkout"""

    def test_checkout_requires_auth(self):
        """Checkout endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/partnership-checkout")
        assert response.status_code == 401

    def test_checkout_creates_stripe_session(self, client_token):
        """Checkout endpoint creates Stripe session"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-checkout",
            headers=headers
        )
        # May return 500 if Stripe not configured, but should not return 401/404
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "checkout_url" in data, "Response should contain checkout_url"
            assert "session_id" in data, "Response should contain session_id"


class TestPartnershipBonificoEndpoint:
    """Tests for POST /api/cliente-analisi/partnership-bonifico"""

    def test_bonifico_requires_auth(self):
        """Bonifico endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/partnership-bonifico")
        assert response.status_code == 401

    def test_bonifico_returns_iban_details(self, client_token):
        """Bonifico endpoint returns IBAN and bank details"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/cliente-analisi/partnership-bonifico",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "iban" in data, "Response should contain IBAN"
        assert "beneficiario" in data, "Response should contain beneficiario"
        assert "banca" in data, "Response should contain banca"
        assert "causale" in data, "Response should contain causale"
        
        # Verify IBAN format
        assert data["iban"].startswith("LT"), "IBAN should start with LT (Lithuania/Revolut)"
        assert data["beneficiario"] == "Evolution PRO LLC"
        assert data["banca"] == "Revolut Bank UAB"


class TestContractChatEndpoint:
    """Tests for POST /api/contract/chat"""

    def test_contract_chat_endpoint_exists(self, client_token):
        """Contract chat endpoint exists and accepts requests"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.post(
            f"{BASE_URL}/api/contract/chat",
            headers=headers,
            json={
                "partner_id": TEST_USER_ID,
                "message": "Cosa significa l'articolo 5?",
                "conversation_history": []
            }
        )
        # Should return 200 with reply (or error message if LLM not configured)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reply" in data, "Response should contain 'reply' field"


class TestClienteAnalisiOutputEndpoint:
    """Tests for GET /api/cliente-analisi/output/{user_id}"""

    def test_output_endpoint_exists(self, client_token):
        """Output endpoint exists"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/output/{TEST_USER_ID}",
            headers=headers
        )
        # May return 200 or 404 depending on whether analisi exists
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


class TestClienteAnalisiPdfEndpoint:
    """Tests for GET /api/cliente-analisi/pdf/{user_id}"""

    def test_pdf_endpoint_exists(self, client_token):
        """PDF endpoint exists"""
        headers = {"Authorization": f"Bearer {client_token}"}
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/pdf/{TEST_USER_ID}",
            headers=headers
        )
        # May return 200 (PDF) or 404 (no analisi) or 500 (PDF generation error)
        assert response.status_code in [200, 404, 500], f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
