"""
Test suite for Contract Parameters Admin API endpoints
Tests: GET/PATCH /api/admin/partners/{partner_id}/contract-params
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestContractParamsAPI:
    """Tests for contract params admin endpoints"""
    
    def test_get_contract_params_partner_2(self):
        """GET /api/admin/partners/2/contract-params - should return params for signed partner"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/2/contract-params")
        assert response.status_code == 200
        
        data = response.json()
        assert "partner_name" in data
        assert "contract_signed" in data
        assert "params" in data
        assert "is_customized" in data
        
        # Verify params structure
        params = data["params"]
        assert "corrispettivo" in params
        assert "royalty_perc" in params
        assert "durata_mesi" in params
        assert "num_rate" in params
        
        # Verify partner name
        assert data["partner_name"] == "Arianna Aceto"
        assert data["contract_signed"] == True
        print(f"SUCCESS: GET contract params for partner 2 - {data['partner_name']}")
    
    def test_get_contract_params_nonexistent_partner(self):
        """GET /api/admin/partners/999/contract-params - should return 404"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/999/contract-params")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        assert "non trovato" in data["detail"].lower()
        print("SUCCESS: GET contract params for nonexistent partner returns 404")
    
    def test_patch_contract_params_signed_contract(self):
        """PATCH /api/admin/partners/2/contract-params - should fail for signed contract"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/2/contract-params",
            json={"corrispettivo": 3000}
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "già firmato" in data["detail"].lower()
        print("SUCCESS: PATCH contract params for signed contract returns 400")
    
    def test_patch_contract_params_nonexistent_partner(self):
        """PATCH /api/admin/partners/999/contract-params - should return 404"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/999/contract-params",
            json={"corrispettivo": 3000}
        )
        assert response.status_code == 404
        print("SUCCESS: PATCH contract params for nonexistent partner returns 404")


class TestContractPDFDownload:
    """Tests for contract PDF download endpoint"""
    
    def test_pdf_download_partner_2(self):
        """GET /api/contract/pdf-download/2 - should return PDF for signed partner"""
        response = requests.get(f"{BASE_URL}/api/contract/pdf-download/2")
        assert response.status_code == 200
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or response.content[:4] == b'%PDF'
        
        # Verify content length
        assert len(response.content) > 1000  # PDF should be at least 1KB
        print(f"SUCCESS: PDF download for partner 2 - {len(response.content)} bytes")


class TestContractSign:
    """Tests for contract sign endpoint"""
    
    def test_contract_sign_already_signed(self):
        """POST /api/contract/sign - should handle already signed contract"""
        # Partner 2 already has signed contract
        response = requests.post(
            f"{BASE_URL}/api/contract/sign",
            json={
                "partner_id": "2",
                "signature_base64": "test_signature",
                "clausole_vessatorie_approved": True
            }
        )
        # Should either succeed (idempotent) or return appropriate error
        assert response.status_code in [200, 400]
        print(f"SUCCESS: Contract sign endpoint responds correctly - status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
