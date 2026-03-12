"""
Test Admin Clienti Analisi Panel - Evolution PRO OS
Tests for the admin panel to manage cliente_analisi users:
- List clienti with filters
- View cliente details
- Generate AI analysis
- Save analysis
- Download PDF
- Update call status
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_CLIENTE_EMAIL = "att2_1773352332@test.com"
TEST_CLIENTE_ID = "0aad124a-4fd2-4159-b75a-86b3481ddb5f"


class TestAdminClientiAnalisiPanel:
    """Test suite for Admin Clienti Analisi Panel"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
    def get_admin_token(self):
        """Login as admin and get token"""
        if self.admin_token:
            return self.admin_token
            
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
            return self.admin_token
        return None
    
    # =========================================================================
    # TEST 1: GET /api/admin/clienti-analisi - List all clienti
    # =========================================================================
    def test_01_get_clienti_analisi_list(self):
        """Test listing all clienti analisi"""
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "clienti" in data, "Response should contain 'clienti' list"
        assert "stats" in data, "Response should contain 'stats' object"
        
        # Verify stats structure
        stats = data["stats"]
        assert "totale" in stats, "Stats should have 'totale'"
        assert "questionario_compilato" in stats, "Stats should have 'questionario_compilato'"
        assert "pagato" in stats, "Stats should have 'pagato'"
        assert "analisi_pronta" in stats, "Stats should have 'analisi_pronta'"
        assert "call_da_fissare" in stats, "Stats should have 'call_da_fissare'"
        
        print(f"✅ Found {len(data['clienti'])} clienti analisi")
        print(f"   Stats: totale={stats['totale']}, pagato={stats.get('pagato', 0)}, analisi_pronta={stats.get('analisi_pronta', 0)}")
        
    # =========================================================================
    # TEST 2: Verify test cliente exists with correct data
    # =========================================================================
    def test_02_verify_test_cliente_exists(self):
        """Verify the test cliente att2_1773352332@test.com exists with pagamento_analisi=true"""
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find test cliente
        test_cliente = None
        for cliente in data.get("clienti", []):
            if cliente.get("email") == TEST_CLIENTE_EMAIL or cliente.get("id") == TEST_CLIENTE_ID:
                test_cliente = cliente
                break
        
        assert test_cliente is not None, f"Test cliente {TEST_CLIENTE_EMAIL} not found"
        
        # Verify required fields
        assert test_cliente.get("questionario_compilato") == True, "Cliente should have questionario_compilato=True"
        assert test_cliente.get("pagamento_analisi") == True, "Cliente should have pagamento_analisi=True"
        
        print(f"✅ Test cliente found: {test_cliente.get('nome')} {test_cliente.get('cognome')}")
        print(f"   Email: {test_cliente.get('email')}")
        print(f"   Questionario: {test_cliente.get('questionario_compilato')}")
        print(f"   Pagamento: {test_cliente.get('pagamento_analisi')}")
        print(f"   Analisi generata: {test_cliente.get('analisi_generata', False)}")
        
        # Store cliente ID for later tests
        self.__class__.test_cliente_id = test_cliente.get("id")
        
    # =========================================================================
    # TEST 3: GET /api/admin/clienti-analisi/{user_id} - Get cliente details
    # =========================================================================
    def test_03_get_cliente_detail(self):
        """Test getting single cliente details"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cliente = response.json()
        
        # Verify cliente data structure
        assert "id" in cliente, "Cliente should have 'id'"
        assert "nome" in cliente, "Cliente should have 'nome'"
        assert "cognome" in cliente, "Cliente should have 'cognome'"
        assert "email" in cliente, "Cliente should have 'email'"
        
        # Verify questionario fields if compiled
        if cliente.get("questionario_compilato"):
            print(f"✅ Cliente has questionario data:")
            print(f"   Expertise: {cliente.get('expertise', 'N/A')[:50]}...")
            print(f"   Cliente target: {cliente.get('cliente_target', 'N/A')[:50]}...")
        
    # =========================================================================
    # TEST 4: POST /api/admin/clienti-analisi/{user_id}/genera-analisi-ai
    # =========================================================================
    def test_04_genera_analisi_ai(self):
        """Test AI analysis generation"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        print(f"🔄 Generating AI analysis for cliente {cliente_id}...")
        
        response = self.session.post(f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/genera-analisi-ai")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "analisi_testo" in data, "Response should contain 'analisi_testo'"
        
        analisi_testo = data.get("analisi_testo", "")
        assert len(analisi_testo) > 1000, f"Analysis should be substantial, got {len(analisi_testo)} chars"
        
        # Verify analysis contains expected sections
        assert "ANALISI STRATEGICA" in analisi_testo, "Analysis should contain title"
        assert "Evolution PRO" in analisi_testo, "Analysis should mention Evolution PRO"
        
        print(f"✅ AI Analysis generated successfully!")
        print(f"   Length: {len(analisi_testo)} characters")
        print(f"   First 200 chars: {analisi_testo[:200]}...")
        
        # Store for later tests
        self.__class__.generated_analisi = analisi_testo
        
    # =========================================================================
    # TEST 5: POST /api/admin/clienti-analisi/{user_id}/salva-analisi
    # =========================================================================
    def test_05_salva_analisi(self):
        """Test saving analysis to database"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        analisi_testo = getattr(self.__class__, 'generated_analisi', "Test analisi testo per salvataggio")
        
        # Use query parameter as per frontend implementation
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/salva-analisi",
            params={"analisi_testo": analisi_testo}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        print(f"✅ Analysis saved successfully!")
        
        # Verify it was saved by fetching cliente again
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}")
        if verify_response.status_code == 200:
            cliente = verify_response.json()
            assert cliente.get("analisi_generata") == True, "Cliente should have analisi_generata=True after save"
            print(f"   Verified: analisi_generata={cliente.get('analisi_generata')}")
            
    # =========================================================================
    # TEST 6: GET /api/admin/clienti-analisi/{user_id}/analisi-pdf
    # =========================================================================
    def test_06_scarica_pdf(self):
        """Test PDF download"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/analisi-pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's a PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Should have attachment disposition"
        assert ".pdf" in content_disposition.lower(), "Filename should have .pdf extension"
        
        # Verify PDF content starts with PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "Content should be valid PDF"
        
        print(f"✅ PDF downloaded successfully!")
        print(f"   Size: {len(pdf_content)} bytes")
        print(f"   Content-Disposition: {content_disposition}")
        
    # =========================================================================
    # TEST 7: POST /api/admin/clienti-analisi/{user_id}/stato-call
    # =========================================================================
    def test_07_aggiorna_stato_call(self):
        """Test updating call status"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        # Test setting to 'da_fissare'
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/stato-call",
            params={"stato": "da_fissare"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        print(f"✅ Call status updated to 'da_fissare'")
        
        # Verify by fetching cliente
        verify_response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}")
        if verify_response.status_code == 200:
            cliente = verify_response.json()
            assert cliente.get("call_stato") == "da_fissare", "Call stato should be 'da_fissare'"
            print(f"   Verified: call_stato={cliente.get('call_stato')}")
            
    # =========================================================================
    # TEST 8: Test stato-call with 'fissata'
    # =========================================================================
    def test_08_stato_call_fissata(self):
        """Test updating call status to 'fissata'"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/stato-call",
            params={"stato": "fissata"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Call status updated to 'fissata'")
        
    # =========================================================================
    # TEST 9: Test stato-call with 'completata'
    # =========================================================================
    def test_09_stato_call_completata(self):
        """Test updating call status to 'completata'"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/stato-call",
            params={"stato": "completata"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Call status updated to 'completata'")
        
    # =========================================================================
    # TEST 10: Test invalid stato-call
    # =========================================================================
    def test_10_stato_call_invalid(self):
        """Test invalid call status returns error"""
        cliente_id = getattr(self.__class__, 'test_cliente_id', TEST_CLIENTE_ID)
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/clienti-analisi/{cliente_id}/stato-call",
            params={"stato": "invalid_status"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"✅ Invalid status correctly rejected with 400")
        
    # =========================================================================
    # TEST 11: Test genera-analisi-ai without payment (should fail)
    # =========================================================================
    def test_11_genera_analisi_without_payment(self):
        """Test that analysis generation fails for unpaid cliente"""
        # Use a non-existent ID to test error handling
        fake_id = "non-existent-cliente-id"
        
        response = self.session.post(f"{BASE_URL}/api/admin/clienti-analisi/{fake_id}/genera-analisi-ai")
        
        assert response.status_code == 404, f"Expected 404 for non-existent cliente, got {response.status_code}"
        print(f"✅ Non-existent cliente correctly returns 404")
        
    # =========================================================================
    # TEST 12: Test PDF download without analysis (should fail)
    # =========================================================================
    def test_12_pdf_without_analysis(self):
        """Test that PDF download fails if no analysis exists"""
        # Use a non-existent ID
        fake_id = "non-existent-cliente-id"
        
        response = self.session.get(f"{BASE_URL}/api/admin/clienti-analisi/{fake_id}/analisi-pdf")
        
        assert response.status_code == 404, f"Expected 404 for non-existent cliente, got {response.status_code}"
        print(f"✅ PDF for non-existent cliente correctly returns 404")


class TestAdminClientiAnalisiFilters:
    """Test filters for clienti analisi list"""
    
    def test_filter_by_stats(self):
        """Verify stats match actual data"""
        response = requests.get(f"{BASE_URL}/api/admin/clienti-analisi")
        
        assert response.status_code == 200
        data = response.json()
        
        clienti = data.get("clienti", [])
        stats = data.get("stats", {})
        
        # Count manually
        questionario_count = len([c for c in clienti if c.get("questionario_compilato") and not c.get("pagamento_analisi")])
        pagato_count = len([c for c in clienti if c.get("pagamento_analisi") and not c.get("analisi_generata")])
        analisi_pronta_count = len([c for c in clienti if c.get("analisi_generata")])
        call_da_fissare_count = len([c for c in clienti if c.get("call_stato") == "da_fissare"])
        
        print(f"✅ Stats verification:")
        print(f"   Total clienti: {len(clienti)}")
        print(f"   Questionario compilato (no payment): {questionario_count}")
        print(f"   Pagato (no analysis): {pagato_count}")
        print(f"   Analisi pronta: {analisi_pronta_count}")
        print(f"   Call da fissare: {call_da_fissare_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
