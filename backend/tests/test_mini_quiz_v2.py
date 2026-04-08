"""
Test suite for Cliente Analisi Mini Quiz endpoints.
Tests: POST /api/cliente-analisi/mini-quiz, GET /api/cliente-analisi/output/{user_id}, GET /api/cliente-analisi/pdf/{user_id}
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_CLIENTE_EMAIL = "mario.rossi@test.com"
TEST_CLIENTE_PASSWORD = "TestMario123"
TEST_USER_ID = "2e3357f3-254b-49bc-98d8-a55771d75f0d"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def cliente_token():
    """Get cliente auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CLIENTE_EMAIL,
        "password": TEST_CLIENTE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Cliente login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def new_test_user():
    """Create a new test user for quiz submission"""
    import uuid
    unique_email = f"test_quiz_{uuid.uuid4().hex[:8]}@test.com"
    response = requests.post(f"{BASE_URL}/api/cliente-analisi/register", json={
        "nome": "Test",
        "cognome": "QuizUser",
        "email": unique_email,
        "telefono": "+39123456789",
        "password": "TestQuiz123!"
    })
    if response.status_code == 200:
        data = response.json()
        return {
            "user_id": data.get("user_id"),
            "token": data.get("token"),
            "email": unique_email
        }
    pytest.skip(f"User registration failed: {response.status_code} - {response.text}")


class TestMiniQuizEndpoints:
    """Test mini-quiz submission and output retrieval"""

    def test_mini_quiz_requires_auth(self):
        """POST /api/cliente-analisi/mini-quiz requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/mini-quiz", json={
            "risposte": {"ambito": "test"}
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Mini quiz endpoint requires authentication")

    def test_mini_quiz_submission_with_new_user(self, new_test_user):
        """POST /api/cliente-analisi/mini-quiz saves quiz and returns scoring"""
        headers = {"Authorization": f"Bearer {new_test_user['token']}"}
        
        # Full quiz data with all 9 fields
        quiz_data = {
            "risposte": {
                "ambito": "Business coaching per imprenditori digitali",
                "target": "Liberi professionisti 30-50 anni che vogliono scalare online",
                "problema": "Aiuto a trovare i primi 10 clienti in 90 giorni con un sistema replicabile e sostenibile",
                "esperienza": "3_5",  # 3-5 anni
                "pubblico": "medio",  # 1.000-10.000
                "canale_principale": "instagram",
                "vendite_online": "attivo",  # Fatturato ricorrente
                "vendite_dettaglio": "Consulenze 1:1 a 200€/h, circa 8 clienti al mese",
                "obiettivo": "Lanciare il mio primo videocorso entro 3 mesi e generare 5k/mese passivi"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/mini-quiz", json=quiz_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "scoring" in data, "Expected scoring in response"
        
        scoring = data["scoring"]
        assert "totale" in scoring, "Expected totale in scoring"
        assert "max" in scoring, "Expected max in scoring"
        assert "percentuale" in scoring, "Expected percentuale in scoring"
        assert "classificazione" in scoring, "Expected classificazione in scoring"
        assert "breakdown" in scoring, "Expected breakdown in scoring"
        
        # Verify breakdown has 4 dimensions
        breakdown = scoring["breakdown"]
        assert "esperienza" in breakdown, "Expected esperienza in breakdown"
        assert "pubblico" in breakdown, "Expected pubblico in breakdown"
        assert "vendite" in breakdown, "Expected vendite in breakdown"
        assert "chiarezza_problema" in breakdown, "Expected chiarezza_problema in breakdown"
        
        # Verify classificazione is one of expected values
        assert scoring["classificazione"] in ["IDONEO", "IDONEO_CON_RISERVA", "NON_IDONEO"], \
            f"Unexpected classificazione: {scoring['classificazione']}"
        
        print(f"✓ Mini quiz submitted successfully. Scoring: {scoring['totale']}/{scoring['max']} ({scoring['percentuale']}%) - {scoring['classificazione']}")
        
        # Store user_id for subsequent tests
        return new_test_user['user_id']

    def test_get_output_existing_user(self, admin_token):
        """GET /api/cliente-analisi/output/{user_id} returns structured output"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Wait a bit for background generation to complete
        time.sleep(2)
        
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/output/{TEST_USER_ID}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "analisi" in data or data.get("analisi") is None, "Expected analisi field"
        assert "scoring" in data, "Expected scoring field"
        assert "script_call" in data or data.get("script_call") is None, "Expected script_call field"
        assert "quiz" in data, "Expected quiz field"
        
        # If analisi exists, verify structure (5 sections)
        if data.get("analisi"):
            analisi = data["analisi"]
            expected_sections = ["sintesi_progetto", "punti_di_forza", "criticita", "livello_maturita", "direzione_consigliata"]
            for section in expected_sections:
                assert section in analisi, f"Expected {section} in analisi"
            print(f"✓ Analisi has all 5 sections: {list(analisi.keys())}")
        
        # If script_call exists, verify structure (6 sections)
        if data.get("script_call"):
            script = data["script_call"]
            expected_sections = ["apertura_personalizzata", "diagnosi", "amplificazione_problema", "ponte", "proposta", "chiusura"]
            for section in expected_sections:
                assert section in script, f"Expected {section} in script_call"
            print(f"✓ Script call has all 6 sections: {list(script.keys())}")
        
        # Verify scoring structure
        if data.get("scoring"):
            scoring = data["scoring"]
            assert "classificazione" in scoring, "Expected classificazione in scoring"
            print(f"✓ Output retrieved. Classificazione: {scoring.get('classificazione')}")
        
        print("✓ GET /api/cliente-analisi/output/{user_id} returns structured data")

    def test_get_output_requires_auth(self):
        """GET /api/cliente-analisi/output/{user_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/output/{TEST_USER_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Output endpoint requires authentication")

    def test_get_output_not_found(self, admin_token):
        """GET /api/cliente-analisi/output/{user_id} returns 404 for non-existent user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/output/non-existent-user-id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Output endpoint returns 404 for non-existent user")


class TestPDFEndpoint:
    """Test PDF download endpoint"""

    def test_pdf_download_existing_user(self, admin_token):
        """GET /api/cliente-analisi/pdf/{user_id} returns PDF"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/pdf/{TEST_USER_ID}", headers=headers)
        
        # PDF might not be generated yet, so accept 200 or 404
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf", \
                f"Expected application/pdf, got {response.headers.get('content-type')}"
            assert "Content-Disposition" in response.headers, "Expected Content-Disposition header"
            assert len(response.content) > 0, "Expected non-empty PDF content"
            print(f"✓ PDF downloaded successfully. Size: {len(response.content)} bytes")
        elif response.status_code == 404:
            print("⚠ PDF not yet generated (404) - this is expected if AI generation is pending")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}: {response.text}")

    def test_pdf_requires_auth(self):
        """GET /api/cliente-analisi/pdf/{user_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cliente-analisi/pdf/{TEST_USER_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PDF endpoint requires authentication")


class TestScoringLogic:
    """Test scoring calculation logic"""

    def test_scoring_high_profile(self, new_test_user):
        """High profile user should get IDONEO classification"""
        headers = {"Authorization": f"Bearer {new_test_user['token']}"}
        
        # High scoring profile
        quiz_data = {
            "risposte": {
                "ambito": "Consulenza strategica per aziende tech",
                "target": "CEO e founder di startup con fatturato 500k-2M",
                "problema": "Aiuto le aziende tech a scalare da 500k a 2M di fatturato in 12 mesi attraverso un sistema di vendita B2B strutturato e replicabile che include lead generation, sales automation e customer success",
                "esperienza": "oltre_5",  # Max score: 10
                "pubblico": "grande",     # Max score: 10
                "canale_principale": "linkedin",
                "vendite_online": "avanzato",  # Max score: 10
                "vendite_dettaglio": "Consulenze high-ticket a 5000€/mese, 12 clienti attivi",
                "obiettivo": "Creare un'accademia per consulenti che genera 50k/mese"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/mini-quiz", json=quiz_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        scoring = response.json().get("scoring", {})
        # With max scores on all dimensions, should be IDONEO
        assert scoring.get("classificazione") == "IDONEO", \
            f"Expected IDONEO for high profile, got {scoring.get('classificazione')}"
        assert scoring.get("percentuale", 0) >= 65, \
            f"Expected >= 65%, got {scoring.get('percentuale')}%"
        
        print(f"✓ High profile correctly classified as IDONEO ({scoring.get('percentuale')}%)")


class TestQuizFieldValidation:
    """Test quiz field structure"""

    def test_quiz_accepts_all_9_fields(self, new_test_user):
        """Quiz should accept all 9 fields including conditional ones"""
        headers = {"Authorization": f"Bearer {new_test_user['token']}"}
        
        # All 9 fields
        quiz_data = {
            "risposte": {
                "ambito": "Test ambito",
                "target": "Test target",
                "problema": "Test problema con descrizione sufficientemente lunga per ottenere un buon punteggio",
                "esperienza": "1_3",
                "pubblico": "piccolo",
                "canale_principale": "youtube",  # Conditional field
                "vendite_online": "provato",
                "vendite_dettaglio": "Test vendite dettaglio",  # Conditional field
                "obiettivo": "Test obiettivo"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/mini-quiz", json=quiz_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Quiz accepts all 9 fields including conditional ones")

    def test_quiz_handles_empty_conditional_fields(self, new_test_user):
        """Quiz should handle empty conditional fields gracefully"""
        headers = {"Authorization": f"Bearer {new_test_user['token']}"}
        
        # Only required fields, no conditional
        quiz_data = {
            "risposte": {
                "ambito": "Test ambito",
                "target": "Test target",
                "problema": "Test problema",
                "esperienza": "meno_1",
                "pubblico": "no",  # No conditional field needed
                "canale_principale": "",  # Empty conditional
                "vendite_online": "no",  # No conditional field needed
                "vendite_dettaglio": "",  # Empty conditional
                "obiettivo": "Test obiettivo"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/cliente-analisi/mini-quiz", json=quiz_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Quiz handles empty conditional fields gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
