"""
Test Dashboard Operativa - Operational Dashboard for Antonella view
Tests the GET /api/partner-journey/dashboard-operativa endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://evoluzione-pro.preview.emergentagent.com')


class TestDashboardOperativa:
    """Tests for Dashboard Operativa endpoint"""

    def test_dashboard_operativa_returns_success(self):
        """Test that dashboard-operativa endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        print("✓ Dashboard operativa returns success")

    def test_dashboard_operativa_has_summary(self):
        """Test that response includes summary with correct fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary")
        assert summary is not None, "Summary should be present"
        assert "total" in summary, "Summary should have 'total'"
        assert "bloccati" in summary, "Summary should have 'bloccati'"
        assert "rallentati" in summary, "Summary should have 'rallentati'"
        assert "in_linea" in summary, "Summary should have 'in_linea'"
        
        # Verify counts are integers
        assert isinstance(summary["total"], int)
        assert isinstance(summary["bloccati"], int)
        assert isinstance(summary["rallentati"], int)
        assert isinstance(summary["in_linea"], int)
        
        # Verify counts add up
        assert summary["total"] == summary["bloccati"] + summary["rallentati"] + summary["in_linea"]
        print(f"✓ Summary: total={summary['total']}, bloccati={summary['bloccati']}, rallentati={summary['rallentati']}, in_linea={summary['in_linea']}")

    def test_dashboard_operativa_has_partners_list(self):
        """Test that response includes partners list"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        partners = data.get("partners")
        assert partners is not None, "Partners list should be present"
        assert isinstance(partners, list), "Partners should be a list"
        print(f"✓ Partners list present with {len(partners)} partners")

    def test_partner_has_required_fields(self):
        """Test that each partner has all required fields"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        partners = data.get("partners", [])
        assert len(partners) > 0, "Should have at least one partner"
        
        required_fields = [
            "id", "name", "niche", "phase", "phase_label",
            "days_in_step", "current_block", "execution_level",
            "risk", "suggested_action"
        ]
        
        for partner in partners[:5]:  # Check first 5 partners
            for field in required_fields:
                assert field in partner, f"Partner should have '{field}' field"
            print(f"✓ Partner '{partner['name']}' has all required fields")

    def test_partner_risk_values_are_valid(self):
        """Test that risk values are one of: bloccato, rallentato, in_linea"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        valid_risks = {"bloccato", "rallentato", "in_linea"}
        partners = data.get("partners", [])
        
        for partner in partners:
            assert partner["risk"] in valid_risks, f"Invalid risk value: {partner['risk']}"
        print(f"✓ All {len(partners)} partners have valid risk values")

    def test_partner_execution_level_values_are_valid(self):
        """Test that execution_level values are one of: alto, medio, basso"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        valid_levels = {"alto", "medio", "basso"}
        partners = data.get("partners", [])
        
        for partner in partners:
            assert partner["execution_level"] in valid_levels, f"Invalid execution_level: {partner['execution_level']}"
        print(f"✓ All {len(partners)} partners have valid execution_level values")

    def test_partners_sorted_by_risk(self):
        """Test that partners are sorted by risk (bloccati first, then rallentati, then in_linea)"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        partners = data.get("partners", [])
        risk_order = {"bloccato": 0, "rallentato": 1, "in_linea": 2}
        
        # Check that partners are sorted by risk
        prev_risk_order = -1
        for partner in partners:
            current_risk_order = risk_order.get(partner["risk"], 2)
            assert current_risk_order >= prev_risk_order, "Partners should be sorted by risk (bloccati first)"
            prev_risk_order = current_risk_order
        
        print("✓ Partners are correctly sorted by risk (bloccati → rallentati → in_linea)")

    def test_percorso_veloce_badge_present(self):
        """Test that partners with percorso veloce active have the badge info"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        partners = data.get("partners", [])
        pv_partners = [p for p in partners if p.get("percorso_veloce") and p["percorso_veloce"].get("active")]
        
        for partner in pv_partners:
            pv = partner["percorso_veloce"]
            assert "active" in pv, "percorso_veloce should have 'active' field"
            assert "current_day" in pv, "percorso_veloce should have 'current_day' field"
            print(f"✓ Partner '{partner['name']}' has percorso_veloce active (day {pv['current_day']})")
        
        if not pv_partners:
            print("✓ No partners with percorso_veloce active (this is OK)")

    def test_phase_label_matches_phase(self):
        """Test that phase_label is correctly mapped from phase"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        phase_labels = {
            "F0": "Onboarding",
            "F1": "Posizionamento",
            "F2": "Masterclass",
            "F3": "Videocorso",
            "F4": "Funnel",
            "F5": "Lancio",
            "F6": "Post-Lancio",
            "F7": "Ottimizzazione",
            "F8": "Accademia Live",
            "F9": "Scaling",
            "F10": "Accademia Matura",
        }
        
        partners = data.get("partners", [])
        for partner in partners[:5]:
            phase = partner["phase"]
            expected_label = phase_labels.get(phase, phase)
            assert partner["phase_label"] == expected_label, f"Phase label mismatch for {partner['name']}"
            print(f"✓ Partner '{partner['name']}' phase {phase} → {partner['phase_label']}")

    def test_suggested_action_not_empty(self):
        """Test that suggested_action is not empty for any partner"""
        response = requests.get(f"{BASE_URL}/api/partner-journey/dashboard-operativa")
        assert response.status_code == 200
        data = response.json()
        
        partners = data.get("partners", [])
        for partner in partners:
            assert partner["suggested_action"], f"suggested_action should not be empty for {partner['name']}"
        
        print(f"✓ All {len(partners)} partners have suggested_action")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
