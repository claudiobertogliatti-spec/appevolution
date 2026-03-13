"""
Test suite for Evolution PRO OS - Analisi Pronta Flow
Tests the new features:
1. Dashboard cliente shows 'Analisi pronta' state when analisi_generata=true
2. API /admin/clienti-analisi/{id}/salva-analisi returns email_sent in response
3. API /admin/clienti-analisi/send-reminders works for 24h reminder
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalisiProntaBackend:
    """Backend API tests for Analisi Pronta flow"""
    
    # Test credentials
    ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
    ADMIN_PASSWORD = "Evoluzione74"
    TEST_CLIENTE_EMAIL = "att2_1773352332@test.com"
    TEST_CLIENTE_PASSWORD = "TestCliente123"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.ADMIN_EMAIL,
            "password": self.ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def get_cliente_token(self):
        """Get cliente authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.TEST_CLIENTE_EMAIL,
            "password": self.TEST_CLIENTE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Test 1: Verify test cliente has analisi_generata=true
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_cliente_has_analisi_generata(self):
        """Verify test cliente att2_1773352332@test.com has analisi_generata=true"""
        token = self.get_cliente_token()
        assert token is not None, "Failed to login as test cliente"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get user profile
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Failed to get user profile: {response.text}"
        
        user = response.json()
        print(f"User data: {user}")
        
        # Verify analisi_generata is true
        assert user.get("analisi_generata") == True, f"Expected analisi_generata=true, got {user.get('analisi_generata')}"
        assert user.get("pagamento_analisi") == True, f"Expected pagamento_analisi=true, got {user.get('pagamento_analisi')}"
        
        print(f"✅ Cliente {self.TEST_CLIENTE_EMAIL} has analisi_generata=true")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Test 2: API /admin/clienti-analisi/{id}/salva-analisi returns email_sent
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_salva_analisi_returns_email_sent(self):
        """Test that salva-analisi endpoint returns email_sent field"""
        token = self.get_admin_token()
        assert token is not None, "Failed to login as admin"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First get the test cliente ID
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi")
        assert response.status_code == 200, f"Failed to get clienti list: {response.text}"
        
        data = response.json()
        clienti = data.get("clienti", [])
        
        # Find test cliente
        test_cliente = None
        for c in clienti:
            if c.get("email") == self.TEST_CLIENTE_EMAIL:
                test_cliente = c
                break
        
        assert test_cliente is not None, f"Test cliente {self.TEST_CLIENTE_EMAIL} not found"
        user_id = test_cliente.get("id")
        
        # Call salva-analisi endpoint
        analisi_testo = "Test analisi strategica per verifica email_sent response"
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{user_id}/salva-analisi",
            params={"analisi_testo": analisi_testo}
        )
        
        assert response.status_code == 200, f"salva-analisi failed: {response.text}"
        
        result = response.json()
        print(f"salva-analisi response: {result}")
        
        # Verify email_sent field is present in response
        assert "email_sent" in result, f"email_sent field missing from response: {result}"
        assert "success" in result, f"success field missing from response: {result}"
        assert result["success"] == True, f"Expected success=true, got {result['success']}"
        
        # Note: email_sent will be False because RESEND_API_KEY is not configured
        print(f"✅ salva-analisi returns email_sent={result['email_sent']} (expected False since RESEND_API_KEY is empty)")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Test 3: API /admin/clienti-analisi/send-reminders works
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_send_reminders_endpoint(self):
        """Test that send-reminders endpoint works"""
        token = self.get_admin_token()
        assert token is not None, "Failed to login as admin"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Call send-reminders endpoint
        response = self.session.post(f"{BASE_URL}/api/admin/clienti-analisi/send-reminders")
        
        assert response.status_code == 200, f"send-reminders failed: {response.text}"
        
        result = response.json()
        print(f"send-reminders response: {result}")
        
        # Verify response structure
        assert "success" in result or "message" in result, f"Invalid response structure: {result}"
        
        # Note: Will return success=False because RESEND_API_KEY is not configured
        if result.get("success") == False:
            assert "RESEND_API_KEY" in result.get("message", ""), f"Expected RESEND_API_KEY message: {result}"
            print(f"✅ send-reminders returns expected message about RESEND_API_KEY not configured")
        else:
            print(f"✅ send-reminders executed successfully: {result}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Test 4: Admin can view cliente with analisi_generata=true
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_admin_view_cliente_with_analisi(self):
        """Test admin can view cliente details with analisi_generata=true"""
        token = self.get_admin_token()
        assert token is not None, "Failed to login as admin"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get clienti list
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi")
        assert response.status_code == 200, f"Failed to get clienti list: {response.text}"
        
        data = response.json()
        clienti = data.get("clienti", [])
        
        # Find test cliente
        test_cliente = None
        for c in clienti:
            if c.get("email") == self.TEST_CLIENTE_EMAIL:
                test_cliente = c
                break
        
        assert test_cliente is not None, f"Test cliente {self.TEST_CLIENTE_EMAIL} not found"
        
        # Verify analisi_generata is true
        assert test_cliente.get("analisi_generata") == True, f"Expected analisi_generata=true in admin view"
        
        # Get detailed view
        user_id = test_cliente.get("id")
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{user_id}")
        assert response.status_code == 200, f"Failed to get cliente details: {response.text}"
        
        details = response.json()
        print(f"Cliente details: {details}")
        
        assert details.get("analisi_generata") == True, f"Expected analisi_generata=true in details"
        
        print(f"✅ Admin can view cliente with analisi_generata=true")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Test 5: Stats include analisi_pronta count
    # ═══════════════════════════════════════════════════════════════════════════
    
    def test_stats_include_analisi_pronta(self):
        """Test that stats include analisi_pronta count"""
        token = self.get_admin_token()
        assert token is not None, "Failed to login as admin"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi")
        assert response.status_code == 200, f"Failed to get clienti list: {response.text}"
        
        data = response.json()
        stats = data.get("stats", {})
        
        print(f"Stats: {stats}")
        
        # Verify analisi_pronta stat exists
        assert "analisi_pronta" in stats, f"analisi_pronta stat missing: {stats}"
        assert stats["analisi_pronta"] >= 1, f"Expected at least 1 analisi_pronta, got {stats['analisi_pronta']}"
        
        print(f"✅ Stats include analisi_pronta count: {stats['analisi_pronta']}")


class TestClienteDashboardState:
    """Test cliente dashboard shows correct state based on analisi_generata"""
    
    TEST_CLIENTE_EMAIL = "att2_1773352332@test.com"
    TEST_CLIENTE_PASSWORD = "TestCliente123"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cliente_login_returns_correct_state(self):
        """Test that cliente login returns correct state for dashboard"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.TEST_CLIENTE_EMAIL,
            "password": self.TEST_CLIENTE_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data.get("user", {})
        
        print(f"Login response user data: {user}")
        
        # Verify all required fields for dashboard state
        assert "pagamento_analisi" in user, "pagamento_analisi field missing"
        assert "analisi_generata" in user, "analisi_generata field missing"
        assert "questionario_compilato" in user, "questionario_compilato field missing"
        
        # For test cliente, should have:
        # - pagamento_analisi = true
        # - analisi_generata = true
        # - questionario_compilato = true
        assert user.get("pagamento_analisi") == True, f"Expected pagamento_analisi=true"
        assert user.get("analisi_generata") == True, f"Expected analisi_generata=true"
        
        print(f"✅ Cliente login returns correct state for 'Analisi pronta' dashboard")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
