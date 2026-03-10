"""
Test suite for Evolution PRO OS - Onboarding and Agents endpoints
Tests the fixes for:
1. ObjectId bug on /api/partner/{id}/onboarding endpoint
2. GET /api/agents returns 6 agents including MARCO
3. GET /api/agent-hub/summary shows active_partners > 0
4. POST /api/agents/marco/run returns 200
5. POST /api/agents/andrea/run returns 200
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestOnboardingEndpoint:
    """Tests for the onboarding endpoint with ObjectId fix"""
    
    def test_onboarding_partner_5_returns_200(self):
        """GET /api/partner/5/onboarding should return 200 (not 500)"""
        response = requests.get(f"{BASE_URL}/api/partner/5/onboarding")
        
        # Status code assertion - this was the main bug (500 error)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - validate response structure
        data = response.json()
        assert "step_corrente" in data
        assert "completato" in data
        assert "profilo" in data
        assert "contratto" in data
        assert "pagamento" in data
        assert "documenti" in data
        assert "distinta" in data
        
        # Validate payment info structure
        assert "iban" in data["pagamento"]
        assert "bic" in data["pagamento"]
        assert "banca" in data["pagamento"]
        assert "importo" in data["pagamento"]
    
    def test_onboarding_with_string_id(self):
        """Test onboarding endpoint with various string IDs"""
        # Test with numeric string ID
        response = requests.get(f"{BASE_URL}/api/partner/1/onboarding")
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        # Test with another numeric string ID
        response = requests.get(f"{BASE_URL}/api/partner/10/onboarding")
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


class TestAgentsEndpoint:
    """Tests for the agents list endpoint"""
    
    def test_agents_returns_6_agents(self):
        """GET /api/agents should return 6 agents including MARCO"""
        response = requests.get(f"{BASE_URL}/api/agents")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 6, f"Expected 6 agents, got {len(data)}"
        
        # Extract agent IDs
        agent_ids = [agent["id"] for agent in data]
        
        # Verify MARCO is present
        assert "MARCO" in agent_ids, f"MARCO not found in agents: {agent_ids}"
        
        # Verify all expected agents are present
        expected_agents = ["STEFANIA", "VALENTINA", "MAIN", "GAIA", "ANDREA", "MARCO"]
        for expected in expected_agents:
            assert expected in agent_ids, f"{expected} not found in agents: {agent_ids}"
    
    def test_agents_have_required_fields(self):
        """Each agent should have required fields"""
        response = requests.get(f"{BASE_URL}/api/agents")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "role", "status", "budget", "category"]
        
        for agent in data:
            for field in required_fields:
                assert field in agent, f"Agent {agent.get('id', 'unknown')} missing field: {field}"
    
    def test_marco_agent_details(self):
        """MARCO agent should have correct details"""
        response = requests.get(f"{BASE_URL}/api/agents")
        assert response.status_code == 200
        
        data = response.json()
        marco = next((a for a in data if a["id"] == "MARCO"), None)
        
        assert marco is not None, "MARCO agent not found"
        assert marco["role"] == "Accountability", f"MARCO role incorrect: {marco['role']}"
        assert marco["category"] == "Coaching", f"MARCO category incorrect: {marco['category']}"
        assert marco["status"] in ["ACTIVE", "ALERT", "IDLE"], f"Invalid status: {marco['status']}"


class TestAgentHubSummary:
    """Tests for the agent hub summary endpoint"""
    
    def test_summary_returns_active_partners(self):
        """GET /api/agent-hub/summary should show active_partners > 0"""
        response = requests.get(f"{BASE_URL}/api/agent-hub/summary")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert "summary" in data, "Response missing 'summary' field"
        
        summary = data["summary"]
        assert "active_partners" in summary, "Summary missing 'active_partners'"
        assert "total_partners" in summary, "Summary missing 'total_partners'"
        
        # Verify active_partners > 0
        assert summary["active_partners"] > 0, f"Expected active_partners > 0, got {summary['active_partners']}"
    
    def test_summary_has_health_info(self):
        """Summary should include health information"""
        response = requests.get(f"{BASE_URL}/api/agent-hub/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "health" in data, "Response missing 'health' field"
        
        health = data["health"]
        assert "accountability" in health
        assert "tech" in health
        assert "engagement" in health
        assert "overall" in health


class TestMarcoRunEndpoint:
    """Tests for MARCO scheduler endpoint"""
    
    def test_marco_run_returns_200(self):
        """POST /api/agents/marco/run should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/agents/marco/run",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") is True, f"Expected success=True, got {data.get('success')}"
        assert data.get("agente") == "MARCO", f"Expected agente=MARCO, got {data.get('agente')}"
        assert "partners_contacted" in data, "Response missing 'partners_contacted'"
        assert "checkins" in data, "Response missing 'checkins'"
        assert "timestamp" in data, "Response missing 'timestamp'"
    
    def test_marco_run_with_specific_partner(self):
        """POST /api/agents/marco/run with specific partner_id"""
        response = requests.post(
            f"{BASE_URL}/api/agents/marco/run",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 even if partner not in F3+ phase
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestAndreaRunEndpoint:
    """Tests for ANDREA scheduler endpoint"""
    
    def test_andrea_run_returns_200(self):
        """POST /api/agents/andrea/run should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/agents/andrea/run",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") is True, f"Expected success=True, got {data.get('success')}"
        assert data.get("agente") == "ANDREA", f"Expected agente=ANDREA, got {data.get('agente')}"
        assert "partners_reviewed" in data, "Response missing 'partners_reviewed'"
        assert "plans" in data, "Response missing 'plans'"
        assert "timestamp" in data, "Response missing 'timestamp'"
    
    def test_andrea_run_with_specific_partner(self):
        """POST /api/agents/andrea/run with specific partner_id"""
        response = requests.post(
            f"{BASE_URL}/api/agents/andrea/run",
            json={"partner_id": "1"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 even if partner not in F4+ phase
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """API health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
