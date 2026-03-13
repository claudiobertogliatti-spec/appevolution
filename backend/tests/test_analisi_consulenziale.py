"""
Test suite for Analisi Consulenziale endpoints
Tests the new consultancy workflow:
1. Analisi Preliminare (internal)
2. Script Call (8 blocks)
3. Analisi Finale (post-call)
4. Admin review + Send to client via Systeme.io
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test client ID from manual testing
TEST_CLIENTE_ID = "0aad124a-4fd2-4159-b75a-86b3481ddb5f"


class TestAnalisiConsulenzialeStato:
    """Test GET /api/analisi-consulenziale/stato/{user_id}"""
    
    def test_get_stato_success(self):
        """Test getting analysis state for existing client"""
        response = requests.get(f"{BASE_URL}/api/analisi-consulenziale/stato/{TEST_CLIENTE_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert data["user_id"] == TEST_CLIENTE_ID
        assert "cliente" in data
        assert "stato_analisi" in data
        assert "has_questionario" in data
        assert "has_analisi_preliminare" in data
        assert "has_script_call" in data
        assert "has_analisi_finale" in data
        assert "timestamps" in data
        
        # Verify client data
        assert "nome" in data["cliente"]
        assert "cognome" in data["cliente"]
        assert "email" in data["cliente"]
        
        print(f"✅ Stato analisi: {data['stato_analisi']}")
        print(f"✅ Has questionario: {data['has_questionario']}")
        print(f"✅ Has analisi preliminare: {data['has_analisi_preliminare']}")
        print(f"✅ Has script call: {data['has_script_call']}")
        print(f"✅ Has analisi finale: {data['has_analisi_finale']}")
    
    def test_get_stato_not_found(self):
        """Test getting state for non-existent client"""
        response = requests.get(f"{BASE_URL}/api/analisi-consulenziale/stato/non-existent-id")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✅ 404 returned for non-existent client: {data['detail']}")


class TestAnalisiPreliminare:
    """Test POST /api/analisi-consulenziale/genera-preliminare"""
    
    def test_genera_preliminare_success(self):
        """Test generating preliminary analysis"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-preliminare",
            json={"user_id": TEST_CLIENTE_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "analisi_preliminare" in data
        assert "stato" in data
        
        # Verify analisi_preliminare structure
        ap = data["analisi_preliminare"]
        assert "profilo_sintetico" in ap
        assert "punti_forza" in ap
        assert "criticita" in ap
        assert "domande_call" in ap
        assert "potenziale_accademia" in ap
        assert "note_preparazione" in ap
        assert "livello_priorita" in ap
        assert "generated_at" in ap
        
        print(f"✅ Analisi preliminare generata")
        print(f"✅ Livello priorità: {ap['livello_priorita']}")
        print(f"✅ Punti forza: {len(ap['punti_forza'])} items")
    
    def test_genera_preliminare_not_found(self):
        """Test generating for non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-preliminare",
            json={"user_id": "non-existent-id"}
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestScriptCall:
    """Test POST /api/analisi-consulenziale/genera-script-call"""
    
    def test_genera_script_call_success(self):
        """Test generating 8-block call script"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-script-call",
            json={"user_id": TEST_CLIENTE_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "script_call" in data
        
        # Verify script_call structure
        sc = data["script_call"]
        assert "titolo_script" in sc
        assert "durata_stimata" in sc
        assert "blocchi" in sc
        assert "generated_at" in sc
        
        # Verify 8 blocks
        assert len(sc["blocchi"]) == 8
        
        # Verify each block has required fields
        for blocco in sc["blocchi"]:
            assert "numero" in blocco
            assert "titolo" in blocco
            assert "obiettivo" in blocco
        
        print(f"✅ Script call generato: {sc['titolo_script']}")
        print(f"✅ Durata stimata: {sc['durata_stimata']}")
        print(f"✅ Numero blocchi: {len(sc['blocchi'])}")
        
        # Print block titles
        for b in sc["blocchi"]:
            print(f"   Blocco {b['numero']}: {b['titolo']}")
    
    def test_genera_script_call_not_found(self):
        """Test generating for non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-script-call",
            json={"user_id": "non-existent-id"}
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestAnalisiFinale:
    """Test POST /api/analisi-consulenziale/genera-finale"""
    
    def test_genera_finale_success(self):
        """Test generating final analysis"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-finale",
            json={
                "user_id": TEST_CLIENTE_ID,
                "note_call": "Cliente molto motivato, progetto interessante"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "analisi_finale" in data
        assert data["stato"] == "analisi_finale_da_revisionare"
        
        # Verify analisi_finale structure
        af = data["analisi_finale"]
        assert "copertina" in af
        assert "introduzione" in af
        assert "profilo_professionale" in af
        assert "problema_mercato" in af
        assert "potenziale_mercato" in af
        assert "ipotesi_accademia" in af
        assert "modello_business" in af
        assert "valutazione_progetto" in af
        assert "prossimi_passi" in af
        assert "chiusura" in af
        assert "generated_at" in af
        
        # Verify copertina
        assert "titolo" in af["copertina"]
        assert "sottotitolo" in af["copertina"]
        assert "data" in af["copertina"]
        assert "preparato_da" in af["copertina"]
        
        # Verify valutazione_progetto
        vp = af["valutazione_progetto"]
        assert "punteggio" in vp
        assert "motivazione" in vp
        assert "raccomandazione" in vp
        
        print(f"✅ Analisi finale generata")
        print(f"✅ Punteggio: {vp['punteggio']}/10")
        print(f"✅ Raccomandazione: {vp['raccomandazione']}")
    
    def test_genera_finale_not_found(self):
        """Test generating for non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/genera-finale",
            json={"user_id": "non-existent-id"}
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestModificaFinale:
    """Test PUT /api/analisi-consulenziale/modifica-finale"""
    
    def test_modifica_sezione_success(self):
        """Test modifying a section of final analysis"""
        response = requests.put(
            f"{BASE_URL}/api/analisi-consulenziale/modifica-finale",
            json={
                "user_id": TEST_CLIENTE_ID,
                "sezione": "introduzione",
                "contenuto": "Caro Test, è stato un piacere conoscerti durante la nostra call strategica. Questo documento rappresenta la mia analisi approfondita del tuo progetto."
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "message" in data
        assert "analisi_finale" in data
        
        # Verify modification was applied
        af = data["analisi_finale"]
        assert "last_modified_at" in af
        assert af["modified_by"] == "admin"
        
        print(f"✅ Sezione 'introduzione' modificata")
        print(f"✅ Modified at: {af['last_modified_at']}")
    
    def test_modifica_sezione_invalid(self):
        """Test modifying invalid section"""
        response = requests.put(
            f"{BASE_URL}/api/analisi-consulenziale/modifica-finale",
            json={
                "user_id": TEST_CLIENTE_ID,
                "sezione": "sezione_inesistente",
                "contenuto": "Test content"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✅ 400 returned for invalid section: {data['detail']}")
    
    def test_modifica_not_found(self):
        """Test modifying for non-existent client"""
        response = requests.put(
            f"{BASE_URL}/api/analisi-consulenziale/modifica-finale",
            json={
                "user_id": "non-existent-id",
                "sezione": "introduzione",
                "contenuto": "Test"
            }
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestApprovaInvia:
    """Test POST /api/analisi-consulenziale/approva-invia"""
    
    def test_approva_invia_success(self):
        """Test approving and sending final analysis"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/approva-invia",
            json={"user_id": TEST_CLIENTE_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["stato"] == "analisi_consegnata"
        assert "email_inviata" in data
        assert "message" in data
        
        print(f"✅ Analisi approvata e inviata")
        print(f"✅ Stato: {data['stato']}")
        print(f"✅ Email inviata (Systeme.io tag): {data['email_inviata']}")
    
    def test_approva_invia_not_found(self):
        """Test approving for non-existent client"""
        response = requests.post(
            f"{BASE_URL}/api/analisi-consulenziale/approva-invia",
            json={"user_id": "non-existent-id"}
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestScriptCallPDF:
    """Test GET /api/analisi-consulenziale/script-call-pdf/{user_id}"""
    
    def test_download_script_pdf_success(self):
        """Test downloading script call PDF"""
        response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/script-call-pdf/{TEST_CLIENTE_ID}"
        )
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
        assert ".pdf" in response.headers["content-disposition"]
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF'
        
        print(f"✅ Script call PDF downloaded")
        print(f"✅ Content-Type: {response.headers.get('content-type')}")
        print(f"✅ Content-Disposition: {response.headers.get('content-disposition')}")
        print(f"✅ PDF size: {len(response.content)} bytes")
    
    def test_download_script_pdf_not_found(self):
        """Test downloading for non-existent client"""
        response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/script-call-pdf/non-existent-id"
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestAnalisiFinalePDF:
    """Test GET /api/analisi-consulenziale/analisi-finale-pdf/{user_id}"""
    
    def test_download_analisi_pdf_success(self):
        """Test downloading final analysis PDF (requires analisi_consegnata state)"""
        # First verify the client is in analisi_consegnata state
        stato_response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/stato/{TEST_CLIENTE_ID}"
        )
        stato_data = stato_response.json()
        
        if stato_data.get("stato_analisi") != "analisi_consegnata":
            # Approve first
            requests.post(
                f"{BASE_URL}/api/analisi-consulenziale/approva-invia",
                json={"user_id": TEST_CLIENTE_ID}
            )
        
        response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/analisi-finale-pdf/{TEST_CLIENTE_ID}"
        )
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
        assert ".pdf" in response.headers["content-disposition"]
        
        # Verify PDF content (starts with %PDF)
        assert response.content[:4] == b'%PDF'
        
        print(f"✅ Analisi finale PDF downloaded")
        print(f"✅ Content-Type: {response.headers.get('content-type')}")
        print(f"✅ Content-Disposition: {response.headers.get('content-disposition')}")
        print(f"✅ PDF size: {len(response.content)} bytes")
    
    def test_download_analisi_pdf_not_found(self):
        """Test downloading for non-existent client"""
        response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/analisi-finale-pdf/non-existent-id"
        )
        
        assert response.status_code == 404
        print("✅ 404 returned for non-existent client")


class TestWorkflowIntegration:
    """Test complete workflow integration"""
    
    def test_verify_complete_workflow_state(self):
        """Verify the test client has all workflow data"""
        response = requests.get(
            f"{BASE_URL}/api/analisi-consulenziale/stato/{TEST_CLIENTE_ID}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all workflow steps completed
        assert data["has_questionario"] == True, "Questionario should be present"
        assert data["has_analisi_preliminare"] == True, "Analisi preliminare should be present"
        assert data["has_script_call"] == True, "Script call should be present"
        assert data["has_analisi_finale"] == True, "Analisi finale should be present"
        
        # Verify timestamps
        ts = data["timestamps"]
        assert ts["questionario_at"] is not None
        assert ts["analisi_preliminare_at"] is not None
        assert ts["script_call_at"] is not None
        assert ts["analisi_finale_at"] is not None
        
        print("✅ Complete workflow verified:")
        print(f"   - Questionario: {ts['questionario_at']}")
        print(f"   - Analisi Preliminare: {ts['analisi_preliminare_at']}")
        print(f"   - Script Call: {ts['script_call_at']}")
        print(f"   - Analisi Finale: {ts['analisi_finale_at']}")
        print(f"   - Stato: {data['stato_analisi']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
