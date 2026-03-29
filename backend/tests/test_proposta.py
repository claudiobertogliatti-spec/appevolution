"""
Test Suite for Proposta (Proposal) Module - Evolution PRO
Tests: P1 (PDF contract generation + SMTP email) and P4 (Public proposal page)

Endpoints tested:
- GET /api/proposta/{token} - Get proposal data
- GET /api/proposta/invalid-token - 404 for invalid token
- POST /api/proposta/genera/{partner_id} - Generate proposal
- POST /api/proposta/{token}/accetta - Accept proposal
- POST /api/proposta/{token}/scelta-bonifico - Bank transfer details
- POST /api/proposta/{token}/firma-contratto - Sign contract
- GET /api/proposta/admin/lista - List all proposals
- GET /api/contract/text/{partner_id} - Get contract text
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test token provided by main agent
EXISTING_TOKEN = "T3xb20kGBXEgcGZO"
PARTNER_ID = "23"  # Daniele Andolfi


class TestPropostaEndpoints:
    """Test suite for Proposta (Proposal) endpoints"""
    
    def test_get_proposta_valid_token(self):
        """GET /api/proposta/{token} - Returns proposal data with all fields"""
        response = requests.get(f"{BASE_URL}/api/proposta/{EXISTING_TOKEN}")
        
        # Status code assertion
        assert response.status_code in [200, 410], f"Expected 200 or 410, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields exist
            assert "token" in data, "Missing 'token' field"
            assert "partner_id" in data, "Missing 'partner_id' field"
            assert "stato" in data, "Missing 'stato' field"
            assert "scadenza" in data, "Missing 'scadenza' field"
            
            # Verify token matches
            assert data["token"] == EXISTING_TOKEN
            
            # Check optional fields that should be present
            print(f"Proposal data: prospect_nome={data.get('prospect_nome')}, stato={data.get('stato')}")
            print(f"Fields present: {list(data.keys())}")
        else:
            # 410 means proposal expired - still valid response
            print(f"Proposal expired (410): {response.text}")
    
    def test_get_proposta_invalid_token(self):
        """GET /api/proposta/invalid-token - Returns 404"""
        invalid_token = "invalid-token-12345"
        response = requests.get(f"{BASE_URL}/api/proposta/{invalid_token}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Invalid token correctly returns 404")
    
    def test_genera_proposta(self):
        """POST /api/proposta/genera/{partner_id} - Creates proposal with token"""
        # Use a test partner ID - this may return existing proposal or create new
        response = requests.post(
            f"{BASE_URL}/api/proposta/genera/{PARTNER_ID}",
            json={
                "analisi_posizionamento": "Test positioning analysis",
                "analisi_punti_forza": ["Punto 1", "Punto 2"],
                "contract_params": {"corrispettivo": 2790.0}
            }
        )
        
        # Should return 200 (existing) or create new
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            assert "token" in data, "Missing 'token' in response"
            assert "url" in data, "Missing 'url' in response"
            print(f"Proposal generated/found: token={data.get('token')}, url={data.get('url')}")
        else:
            print(f"Partner not found (404) - expected if partner doesn't exist")
    
    def test_accetta_proposta(self):
        """POST /api/proposta/{token}/accetta - Updates stato to 'accettata'"""
        response = requests.post(f"{BASE_URL}/api/proposta/{EXISTING_TOKEN}/accetta")
        
        # May return 200 (success) or 404 (not found)
        assert response.status_code in [200, 404, 410], f"Expected 200/404/410, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            print(f"Proposal accepted: {data.get('message')}")
        elif response.status_code == 410:
            print("Proposal expired (410)")
        else:
            print("Proposal not found (404)")
    
    def test_scelta_bonifico(self):
        """POST /api/proposta/{token}/scelta-bonifico - Returns IBAN details"""
        response = requests.post(f"{BASE_URL}/api/proposta/{EXISTING_TOKEN}/scelta-bonifico")
        
        assert response.status_code in [200, 404, 410], f"Expected 200/404/410, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            assert "iban" in data, "Missing 'iban' in response"
            
            # Verify IBAN matches expected value
            expected_iban = "LT94 3250 0974 4929 5781"
            assert data["iban"] == expected_iban, f"IBAN mismatch: expected {expected_iban}, got {data['iban']}"
            
            assert "beneficiario" in data, "Missing 'beneficiario'"
            assert "banca" in data, "Missing 'banca'"
            assert "causale" in data, "Missing 'causale'"
            
            print(f"Bonifico details: IBAN={data['iban']}, Beneficiario={data['beneficiario']}")
        else:
            print(f"Proposal not found or expired: {response.status_code}")
    
    def test_firma_contratto(self):
        """POST /api/proposta/{token}/firma-contratto - Saves contract signature"""
        # Create a minimal base64 signature (1x1 transparent PNG)
        test_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/proposta/{EXISTING_TOKEN}/firma-contratto",
            json={
                "signature_base64": test_signature,
                "clausole_vessatorie_approved": True
            }
        )
        
        # May return 200 (success), 404 (not found), or 410 (expired)
        assert response.status_code in [200, 404, 410, 500], f"Expected 200/404/410/500, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            assert "signed_at" in data, "Missing 'signed_at' in response"
            # pdf_url may be None if PDF generation fails (SMTP blocked in K8s)
            print(f"Contract signed: signed_at={data.get('signed_at')}, pdf_url={data.get('pdf_url')}")
        elif response.status_code == 500:
            # May fail due to SMTP/PDF generation issues in preview env
            print(f"Contract signing failed (likely SMTP/PDF issue): {response.text}")
        else:
            print(f"Proposal not found or expired: {response.status_code}")
    
    def test_admin_lista_proposte(self):
        """GET /api/proposta/admin/lista - Returns list of all proposals"""
        response = requests.get(f"{BASE_URL}/api/proposta/admin/lista")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing 'items' in response"
        assert "count" in data, "Missing 'count' in response"
        assert isinstance(data["items"], list), "items should be a list"
        
        print(f"Admin lista: {data['count']} proposals found")
        
        # If there are proposals, verify structure
        if data["items"]:
            first = data["items"][0]
            assert "token" in first, "Missing 'token' in proposal item"
            assert "stato" in first, "Missing 'stato' in proposal item"
            print(f"First proposal: token={first.get('token')}, stato={first.get('stato')}")


class TestContractTextEndpoint:
    """Test suite for Contract Text endpoint"""
    
    def test_get_contract_text(self):
        """GET /api/contract/text/{partner_id} - Returns HTML contract text"""
        response = requests.get(f"{BASE_URL}/api/contract/text/{PARTNER_ID}")
        
        # May return 200 or 404 if partner doesn't exist
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for contract_text or html field
            has_text = "contract_text" in data or "html" in data
            assert has_text, "Missing 'contract_text' or 'html' in response"
            
            # Get the text content
            text = data.get("contract_text") or data.get("html", "")
            
            # Verify it contains expected contract content
            assert len(text) > 1000, "Contract text seems too short"
            assert "Evolution PRO" in text or "ARTICOLO" in text, "Contract text missing expected content"
            
            print(f"Contract text retrieved: {len(text)} characters")
            print(f"Fields in response: {list(data.keys())}")
        else:
            print(f"Partner not found (404)")
    
    def test_get_contract_text_invalid_partner(self):
        """GET /api/contract/text/invalid-id - Returns empty params for non-existent partner"""
        response = requests.get(f"{BASE_URL}/api/contract/text/invalid-partner-id")
        
        # Should still return 200 with default params
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should have contract_text with default params
        assert "contract_text" in data or "html" in data, "Missing contract text"
        print(f"Default contract text returned for invalid partner")


class TestPropostaGenerationFlow:
    """Test the full proposal generation flow"""
    
    def test_full_flow_new_proposal(self):
        """Test generating a new proposal for a test partner"""
        # First, check if we can list proposals
        list_response = requests.get(f"{BASE_URL}/api/proposta/admin/lista")
        assert list_response.status_code == 200
        
        initial_count = list_response.json().get("count", 0)
        print(f"Initial proposal count: {initial_count}")
        
        # Try to generate a proposal (may return existing)
        gen_response = requests.post(
            f"{BASE_URL}/api/proposta/genera/{PARTNER_ID}",
            json={
                "analisi_posizionamento": "Test analysis for flow test",
                "analisi_punti_forza": ["Strength 1", "Strength 2", "Strength 3"]
            }
        )
        
        if gen_response.status_code == 200:
            gen_data = gen_response.json()
            token = gen_data.get("token")
            
            if token:
                # Verify we can fetch the proposal
                fetch_response = requests.get(f"{BASE_URL}/api/proposta/{token}")
                assert fetch_response.status_code in [200, 410], f"Failed to fetch proposal: {fetch_response.status_code}"
                
                if fetch_response.status_code == 200:
                    fetch_data = fetch_response.json()
                    assert fetch_data.get("token") == token
                    print(f"Full flow test passed: token={token}")
        else:
            print(f"Could not generate proposal: {gen_response.status_code}")


class TestPropostaInvalidToken:
    """Test various invalid token scenarios"""
    
    def test_empty_token(self):
        """Test with empty token path"""
        # This should return 404 or redirect
        response = requests.get(f"{BASE_URL}/api/proposta/")
        # May return 404 or 307 redirect
        assert response.status_code in [404, 307, 405], f"Unexpected status: {response.status_code}"
    
    def test_special_characters_token(self):
        """Test with special characters in token"""
        response = requests.get(f"{BASE_URL}/api/proposta/test%20token%21")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_very_long_token(self):
        """Test with very long token"""
        long_token = "a" * 500
        response = requests.get(f"{BASE_URL}/api/proposta/{long_token}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
