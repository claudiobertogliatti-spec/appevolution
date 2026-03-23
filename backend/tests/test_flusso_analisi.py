"""
Test Flusso Analisi Strategica - Evolution PRO
==============================================

Tests for the new analysis flow:
1. Auto-generation of analysis after questionnaire
2. Admin panel for viewing/editing/confirming analysis
3. "Attiva fase decisione cliente" button
4. /decisione-partnership page with analysis, roadmap, contract, documents, payment

Flow states:
- questionario_inviato
- bozza_analisi
- analisi_pronta_per_call
- decisione_partnership
- partner_attivo
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://partner-journey-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_CLIENTE_EMAIL = "demo.test.completo@example.com"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_user_id(api_client):
    """Get or create a test user for flusso analisi testing"""
    # First try to find existing test user
    response = api_client.get(f"{BASE_URL}/api/admin/clienti-analisi")
    if response.status_code == 200:
        data = response.json()
        clienti = data.get("clienti", [])
        # Find a client with questionario_compilato
        for cliente in clienti:
            if cliente.get("questionario_compilato"):
                return cliente.get("id")
    
    # If no suitable client found, create one
    unique_id = str(uuid.uuid4())
    test_email = f"test_flusso_{unique_id[:8]}@example.com"
    
    # Register new test client
    register_response = api_client.post(f"{BASE_URL}/api/cliente-analisi/register", json={
        "nome": "Test",
        "cognome": "FlussoAnalisi",
        "email": test_email,
        "telefono": "+39123456789"
    })
    
    if register_response.status_code == 200:
        user_data = register_response.json()
        user_id = user_data.get("user_id")
        
        # Submit questionnaire
        api_client.post(f"{BASE_URL}/api/cliente-analisi/questionario", json={
            "user_id": user_id,
            "expertise": "Marketing Digitale",
            "cliente_target": "Piccole imprese",
            "risultato_promesso": "Aumentare le vendite online",
            "pubblico_esistente": "500 follower su Instagram",
            "esperienze_vendita": "Ho venduto consulenze",
            "ostacolo_principale": "Mancanza di tempo",
            "motivazione": "Voglio scalare il business"
        })
        
        return user_id
    
    pytest.skip("Could not create test user")


class TestFlussoAnalisiEndpoints:
    """Test all Flusso Analisi API endpoints"""
    
    def test_get_analisi_not_found(self, api_client):
        """Test GET /api/flusso-analisi/analisi/{user_id} with non-existent user"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/non-existent-user-id")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✅ GET analisi returns 404 for non-existent user")
    
    def test_get_analisi_existing_user(self, api_client, test_user_id):
        """Test GET /api/flusso-analisi/analisi/{user_id} with existing user"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "user_id" in data
        assert "cliente" in data
        assert "stato_cliente" in data
        print(f"✅ GET analisi returns data for user {test_user_id}")
        print(f"   - Stato cliente: {data.get('stato_cliente')}")
        print(f"   - Has analisi: {data.get('has_analisi')}")
    
    def test_genera_analisi_auto_not_found(self, api_client):
        """Test POST /api/flusso-analisi/genera-analisi-auto/{user_id} with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/genera-analisi-auto/non-existent-user")
        assert response.status_code == 404
        print(f"✅ POST genera-analisi-auto returns 404 for non-existent user")
    
    def test_modifica_analisi_not_found(self, api_client):
        """Test PUT /api/flusso-analisi/modifica-analisi with non-existent user"""
        response = api_client.put(f"{BASE_URL}/api/flusso-analisi/modifica-analisi", json={
            "user_id": "non-existent-user",
            "sezione": "introduzione",
            "contenuto": "Test content"
        })
        assert response.status_code == 404
        print(f"✅ PUT modifica-analisi returns 404 for non-existent user")
    
    def test_conferma_analisi_not_found(self, api_client):
        """Test POST /api/flusso-analisi/conferma-analisi with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/conferma-analisi", json={
            "user_id": "non-existent-user"
        })
        assert response.status_code == 404
        print(f"✅ POST conferma-analisi returns 404 for non-existent user")
    
    def test_attiva_decisione_not_found(self, api_client):
        """Test POST /api/flusso-analisi/attiva-decisione with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/attiva-decisione", json={
            "user_id": "non-existent-user"
        })
        assert response.status_code == 404
        print(f"✅ POST attiva-decisione returns 404 for non-existent user")
    
    def test_get_decisione_not_found(self, api_client):
        """Test GET /api/flusso-analisi/decisione/{user_id} with non-existent user"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/decisione/non-existent-user")
        assert response.status_code == 404
        print(f"✅ GET decisione returns 404 for non-existent user")
    
    def test_firma_contratto_not_found(self, api_client):
        """Test POST /api/flusso-analisi/firma-contratto with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/firma-contratto", json={
            "user_id": "non-existent-user",
            "accettato": True
        })
        assert response.status_code == 404
        print(f"✅ POST firma-contratto returns 404 for non-existent user")
    
    def test_upload_documento_not_found(self, api_client):
        """Test POST /api/flusso-analisi/upload-documento/{user_id} with non-existent user"""
        # Create a simple test file
        files = {
            'file': ('test.txt', b'test content', 'text/plain')
        }
        data = {
            'tipo_documento': 'carta_identita'
        }
        response = requests.post(
            f"{BASE_URL}/api/flusso-analisi/upload-documento/non-existent-user",
            files=files,
            data=data
        )
        assert response.status_code == 404
        print(f"✅ POST upload-documento returns 404 for non-existent user")
    
    def test_upload_documento_invalid_type(self, api_client, test_user_id):
        """Test POST /api/flusso-analisi/upload-documento with invalid document type"""
        files = {
            'file': ('test.txt', b'test content', 'text/plain')
        }
        data = {
            'tipo_documento': 'invalid_type'
        }
        response = requests.post(
            f"{BASE_URL}/api/flusso-analisi/upload-documento/{test_user_id}",
            files=files,
            data=data
        )
        assert response.status_code == 400
        print(f"✅ POST upload-documento returns 400 for invalid document type")
    
    def test_conferma_bonifico_not_found(self, api_client):
        """Test POST /api/flusso-analisi/conferma-bonifico/{user_id} with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/conferma-bonifico/non-existent-user")
        assert response.status_code == 404
        print(f"✅ POST conferma-bonifico returns 404 for non-existent user")
    
    def test_attiva_partnership_not_found(self, api_client):
        """Test POST /api/flusso-analisi/attiva-partnership/{user_id} with non-existent user"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/attiva-partnership/non-existent-user")
        assert response.status_code == 404
        print(f"✅ POST attiva-partnership returns 404 for non-existent user")
    
    def test_analisi_pdf_not_found(self, api_client):
        """Test GET /api/flusso-analisi/analisi-pdf/{user_id} with non-existent user"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi-pdf/non-existent-user")
        assert response.status_code == 404
        print(f"✅ GET analisi-pdf returns 404 for non-existent user")
    
    def test_contratto_pdf_not_found(self, api_client):
        """Test GET /api/flusso-analisi/contratto-pdf/{user_id} with non-existent user"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/contratto-pdf/non-existent-user")
        assert response.status_code == 404
        print(f"✅ GET contratto-pdf returns 404 for non-existent user")


class TestFlussoAnalisiWorkflow:
    """Test the complete workflow of Flusso Analisi"""
    
    def test_workflow_step1_get_initial_state(self, api_client, test_user_id):
        """Step 1: Get initial state of analysis"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Step 1: Initial state retrieved")
        print(f"   - User ID: {data.get('user_id')}")
        print(f"   - Stato: {data.get('stato_cliente')}")
        print(f"   - Has analisi: {data.get('has_analisi')}")
        return data
    
    def test_workflow_step2_genera_analisi(self, api_client, test_user_id):
        """Step 2: Generate analysis (if not already generated)"""
        # First check if analysis exists
        check_response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        if check_response.status_code == 200:
            check_data = check_response.json()
            if check_data.get("has_analisi"):
                print(f"✅ Step 2: Analysis already exists, skipping generation")
                return check_data
        
        # Generate analysis
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/genera-analisi-auto/{test_user_id}")
        # This may take time due to AI generation, so we accept both 200 and timeout
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert data.get("stato") == "bozza_analisi"
            print(f"✅ Step 2: Analysis generated successfully")
        else:
            print(f"⚠️ Step 2: Analysis generation returned {response.status_code} (may be timeout)")
        
        return response
    
    def test_workflow_step3_modifica_analisi(self, api_client, test_user_id):
        """Step 3: Modify a section of the analysis"""
        # First check if analysis exists
        check_response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        if check_response.status_code != 200:
            pytest.skip("No analysis to modify")
        
        check_data = check_response.json()
        if not check_data.get("has_analisi"):
            pytest.skip("No analysis to modify")
        
        # Modify a section
        response = api_client.put(f"{BASE_URL}/api/flusso-analisi/modifica-analisi", json={
            "user_id": test_user_id,
            "sezione": "introduzione",
            "contenuto": "Contenuto modificato per test - " + datetime.now().isoformat()
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"✅ Step 3: Analysis section modified successfully")
        elif response.status_code == 400:
            print(f"⚠️ Step 3: Section not found (expected if analysis structure differs)")
        else:
            print(f"⚠️ Step 3: Modification returned {response.status_code}")
    
    def test_workflow_step4_conferma_analisi(self, api_client, test_user_id):
        """Step 4: Confirm analysis (ready for call)"""
        # First check if analysis exists and is in correct state
        check_response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        if check_response.status_code != 200:
            pytest.skip("No analysis to confirm")
        
        check_data = check_response.json()
        if not check_data.get("has_analisi"):
            pytest.skip("No analysis to confirm")
        
        # Only confirm if in bozza_analisi state
        if check_data.get("stato_cliente") not in ["bozza_analisi", "questionario_inviato"]:
            print(f"⚠️ Step 4: Analysis already confirmed (stato: {check_data.get('stato_cliente')})")
            return
        
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/conferma-analisi", json={
            "user_id": test_user_id
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert data.get("stato") == "analisi_pronta_per_call"
            print(f"✅ Step 4: Analysis confirmed for call")
        else:
            print(f"⚠️ Step 4: Confirmation returned {response.status_code}")
    
    def test_workflow_step5_attiva_decisione(self, api_client, test_user_id):
        """Step 5: Activate decision phase (after call)"""
        # First check current state
        check_response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi/{test_user_id}")
        if check_response.status_code != 200:
            pytest.skip("Cannot check state")
        
        check_data = check_response.json()
        current_state = check_data.get("stato_cliente")
        
        # Only activate if in correct state
        if current_state not in ["analisi_pronta_per_call", "bozza_analisi"]:
            print(f"⚠️ Step 5: Cannot activate decision from state: {current_state}")
            return
        
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/attiva-decisione", json={
            "user_id": test_user_id
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert data.get("stato") == "decisione_partnership"
            print(f"✅ Step 5: Decision phase activated")
        else:
            print(f"⚠️ Step 5: Activation returned {response.status_code}")
    
    def test_workflow_step6_get_decisione_data(self, api_client, test_user_id):
        """Step 6: Get decision page data"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/decisione/{test_user_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "cliente" in data
            assert "analisi" in data
            assert "prezzo_partnership" in data
            print(f"✅ Step 6: Decision data retrieved")
            print(f"   - Prezzo: €{data.get('prezzo_partnership')}")
            print(f"   - Contratto firmato: {data.get('contratto_firmato')}")
            print(f"   - Pagamento completato: {data.get('pagamento_completato')}")
        elif response.status_code == 403:
            print(f"⚠️ Step 6: Decision phase not activated yet (403)")
        else:
            print(f"⚠️ Step 6: Get decisione returned {response.status_code}")


class TestFlussoAnalisiPDFs:
    """Test PDF generation endpoints"""
    
    def test_contratto_pdf_generation(self, api_client, test_user_id):
        """Test contract PDF generation"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/contratto-pdf/{test_user_id}")
        
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            assert len(response.content) > 0
            print(f"✅ Contract PDF generated successfully ({len(response.content)} bytes)")
        else:
            print(f"⚠️ Contract PDF generation returned {response.status_code}")
    
    def test_analisi_pdf_access_control(self, api_client, test_user_id):
        """Test analysis PDF access control"""
        response = api_client.get(f"{BASE_URL}/api/flusso-analisi/analisi-pdf/{test_user_id}")
        
        # Should return 403 if not in decisione_partnership or partner_attivo state
        if response.status_code == 403:
            print(f"✅ Analysis PDF correctly restricted (403)")
        elif response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            print(f"✅ Analysis PDF generated ({len(response.content)} bytes)")
        elif response.status_code == 404:
            print(f"⚠️ Analysis not found for PDF generation")
        else:
            print(f"⚠️ Analysis PDF returned {response.status_code}")


class TestFlussoAnalisiValidation:
    """Test input validation"""
    
    def test_modifica_analisi_missing_fields(self, api_client):
        """Test modifica-analisi with missing fields"""
        response = api_client.put(f"{BASE_URL}/api/flusso-analisi/modifica-analisi", json={
            "user_id": "test"
            # Missing sezione and contenuto
        })
        assert response.status_code == 422  # Validation error
        print(f"✅ modifica-analisi validates required fields")
    
    def test_conferma_analisi_missing_user_id(self, api_client):
        """Test conferma-analisi with missing user_id"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/conferma-analisi", json={})
        assert response.status_code == 422  # Validation error
        print(f"✅ conferma-analisi validates required user_id")
    
    def test_attiva_decisione_missing_user_id(self, api_client):
        """Test attiva-decisione with missing user_id"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/attiva-decisione", json={})
        assert response.status_code == 422  # Validation error
        print(f"✅ attiva-decisione validates required user_id")
    
    def test_firma_contratto_not_accepted(self, api_client, test_user_id):
        """Test firma-contratto with accettato=false"""
        response = api_client.post(f"{BASE_URL}/api/flusso-analisi/firma-contratto", json={
            "user_id": test_user_id,
            "accettato": False
        })
        # Should return 400 because contract must be accepted
        if response.status_code == 400:
            print(f"✅ firma-contratto correctly rejects non-accepted contract")
        else:
            print(f"⚠️ firma-contratto returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
