"""
Test Contract Params Feature - Evolution PRO
Tests for admin contract parameter customization endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test partner IDs from requirements
PARTNER_ID_NOT_SIGNED = "23"  # Daniele Andolfi - not signed
PARTNER_ID_SIGNED = "2"  # Arianna Aceto - may be signed


class TestContractParamsGet:
    """Tests for GET /api/admin/partners/{partner_id}/contract-params"""
    
    def test_get_contract_params_partner_23(self):
        """Should return contract params for partner 23 (Daniele Andolfi)"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "params" in data, "Response should contain 'params'"
        assert "partner_name" in data, "Response should contain 'partner_name'"
        assert "contract_signed" in data, "Response should contain 'contract_signed'"
        
        # Verify params structure
        params = data["params"]
        assert "corrispettivo" in params, "Params should contain 'corrispettivo'"
        assert "royalty_perc" in params, "Params should contain 'royalty_perc'"
        assert "durata_mesi" in params, "Params should contain 'durata_mesi'"
        assert "num_rate" in params, "Params should contain 'num_rate'"
        
        print(f"✅ Partner 23 params: corrispettivo={params['corrispettivo']}, royalty={params['royalty_perc']}%, durata={params['durata_mesi']} mesi, rate={params['num_rate']}")
    
    def test_get_contract_params_partner_2(self):
        """Should return contract params for partner 2 (Arianna Aceto)"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/2/contract-params")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "params" in data
        assert "contract_signed" in data
        
        print(f"✅ Partner 2 contract_signed: {data['contract_signed']}")
    
    def test_get_contract_params_nonexistent_partner(self):
        """Should return 404 for nonexistent partner"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/99999/contract-params")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Correctly returns 404 for nonexistent partner")


class TestContractParamsPatch:
    """Tests for PATCH /api/admin/partners/{partner_id}/contract-params"""
    
    def test_update_contract_params_partner_23(self):
        """Should update contract params for partner 23 (not signed)"""
        # First get current params
        get_response = requests.get(f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params")
        assert get_response.status_code == 200
        
        initial_data = get_response.json()
        if initial_data.get("contract_signed"):
            pytest.skip("Partner 23 contract is already signed, cannot test update")
        
        # Update params with test values
        update_payload = {
            "corrispettivo": 3500.00,
            "corrispettivo_testo": "tremilacinquecento/00",
            "royalty_perc": 12,
            "durata_mesi": 18,
            "num_rate": 4,
            "note_admin": "Test update from pytest"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params",
            json=update_payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "params" in data, "Response should contain updated params"
        
        # Verify updated values
        params = data["params"]
        assert params["corrispettivo"] == 3500.00, f"Expected corrispettivo 3500, got {params['corrispettivo']}"
        assert params["royalty_perc"] == 12, f"Expected royalty 12, got {params['royalty_perc']}"
        assert params["durata_mesi"] == 18, f"Expected durata 18, got {params['durata_mesi']}"
        assert params["num_rate"] == 4, f"Expected num_rate 4, got {params['num_rate']}"
        
        print(f"✅ Successfully updated partner 23 params: {params}")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params")
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        assert verify_data["params"]["corrispettivo"] == 3500.00, "Corrispettivo should persist"
        assert verify_data["params"]["royalty_perc"] == 12, "Royalty should persist"
        
        print("✅ Verified params persisted correctly")
    
    def test_update_contract_params_empty_body(self):
        """Should reject update with empty body"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params",
            json={}
        )
        
        # Should return 400 for empty update
        assert response.status_code == 400, f"Expected 400 for empty body, got {response.status_code}"
        print("✅ Correctly rejects empty update body")
    
    def test_update_contract_params_nonexistent_partner(self):
        """Should return 404 for nonexistent partner"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/99999/contract-params",
            json={"corrispettivo": 1000}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Correctly returns 404 for nonexistent partner")


class TestContractText:
    """Tests for GET /api/contract/text/{partner_id}"""
    
    def test_get_contract_text_default_values(self):
        """Should return contract text with default values for partner without customization"""
        # First reset partner 23 to default values
        requests.patch(
            f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params",
            json={
                "corrispettivo": 2790.00,
                "corrispettivo_testo": "duemilasettecentonovanta/00",
                "royalty_perc": 10,
                "durata_mesi": 12,
                "num_rate": 3
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/contract/text/{PARTNER_ID_NOT_SIGNED}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contract_text" in data, "Response should contain 'contract_text'"
        assert "params" in data, "Response should contain 'params'"
        
        contract_text = data["contract_text"]
        
        # Verify default values appear in text
        assert "€ 2.790,00" in contract_text, "Default corrispettivo should appear in text"
        assert "10%" in contract_text, "Default royalty should appear in text"
        assert "dodici (12) mesi" in contract_text, "Default durata should appear in text"
        
        print("✅ Contract text contains default values")
    
    def test_get_contract_text_custom_values(self):
        """Should return contract text with custom values after PATCH"""
        # First update params
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params",
            json={
                "corrispettivo": 5000.00,
                "corrispettivo_testo": "cinquemila/00",
                "royalty_perc": 15,
                "durata_mesi": 24,
                "num_rate": 6
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Now get contract text
        response = requests.get(f"{BASE_URL}/api/contract/text/{PARTNER_ID_NOT_SIGNED}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        contract_text = data["contract_text"]
        
        # Verify custom values appear in text
        assert "€ 5.000,00" in contract_text, f"Custom corrispettivo should appear in text. Got: {contract_text[:500]}"
        assert "15%" in contract_text, "Custom royalty should appear in text"
        assert "ventiquattro (24) mesi" in contract_text, "Custom durata should appear in text"
        
        print("✅ Contract text contains custom values after PATCH")
        print(f"   - Corrispettivo: €5.000,00 ✓")
        print(f"   - Royalty: 15% ✓")
        print(f"   - Durata: 24 mesi ✓")
    
    def test_get_contract_text_nonexistent_partner(self):
        """Should return default contract text for nonexistent partner"""
        response = requests.get(f"{BASE_URL}/api/contract/text/99999")
        
        # Should still return 200 with default text (graceful fallback)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "contract_text" in data
        
        # Should have default values
        assert data["params"]["corrispettivo"] == 2790.00
        print("✅ Returns default contract text for nonexistent partner")


class TestContractSignedRestriction:
    """Tests for contract modification restrictions when already signed"""
    
    def test_check_partner_2_signed_status(self):
        """Check if partner 2 has signed contract"""
        response = requests.get(f"{BASE_URL}/api/admin/partners/2/contract-params")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"Partner 2 (Arianna Aceto) contract_signed: {data.get('contract_signed')}")
        
        if data.get("contract_signed"):
            # Try to update - should fail
            update_response = requests.patch(
                f"{BASE_URL}/api/admin/partners/2/contract-params",
                json={"corrispettivo": 9999}
            )
            
            assert update_response.status_code == 400, f"Expected 400 for signed contract, got {update_response.status_code}"
            
            error_data = update_response.json()
            assert "firmato" in error_data.get("detail", "").lower() or "signed" in error_data.get("detail", "").lower(), \
                f"Error should mention contract is signed: {error_data}"
            
            print("✅ Correctly rejects update for signed contract")
        else:
            print("⚠️ Partner 2 contract not signed - skipping signed restriction test")


class TestCleanup:
    """Cleanup test data"""
    
    def test_restore_partner_23_defaults(self):
        """Restore partner 23 to reasonable values after testing"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/partners/{PARTNER_ID_NOT_SIGNED}/contract-params",
            json={
                "corrispettivo": 2790.00,
                "corrispettivo_testo": "duemilasettecentonovanta/00",
                "royalty_perc": 10,
                "durata_mesi": 12,
                "num_rate": 3,
                "note_admin": ""
            }
        )
        
        # May fail if contract is signed, that's ok
        if response.status_code == 200:
            print("✅ Restored partner 23 to default values")
        else:
            print(f"⚠️ Could not restore defaults: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
