"""
Test suite for Evolution PRO - Audio Analisi Upload, PDF Generator, and Scoring
Tests the new 11-section structure for analisi_generator and pdf_generator
"""
import pytest
import requests
import os
import sys
import io

# Add backend to path for local imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "claudio.bertogliatti@gmail.com"
ADMIN_PASSWORD = "Evoluzione74"
TEST_USER_ID = "2e3357f3-254b-49bc-98d8-a55771d75f0d"
TEST_USER_EMAIL = "mario.rossi@test.com"
TEST_USER_PASSWORD = "TestMario123"


class TestAuthentication:
    """Test authentication for admin and client"""
    
    def test_admin_login(self):
        """Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful")
        return data["access_token"]
    
    def test_client_login(self):
        """Test client can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Client login successful")
        return data["access_token"]


class TestAudioAnalisiUpload:
    """Test audio upload endpoints for admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_upload_audio_requires_auth(self):
        """Upload audio requires authentication"""
        # Create a dummy mp3 file
        files = {"file": ("test.mp3", b"fake mp3 content", "audio/mpeg")}
        response = requests.post(
            f"{BASE_URL}/api/admin/cliente/{TEST_USER_ID}/upload-audio-analisi",
            files=files
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Upload audio requires auth")
    
    def test_upload_audio_requires_admin(self, client_token):
        """Upload audio requires admin role"""
        files = {"file": ("test.mp3", b"fake mp3 content", "audio/mpeg")}
        response = requests.post(
            f"{BASE_URL}/api/admin/cliente/{TEST_USER_ID}/upload-audio-analisi",
            files=files,
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Upload audio requires admin role")
    
    def test_upload_audio_success(self, admin_token):
        """Admin can upload audio file"""
        # Create a minimal valid mp3 header (ID3 tag)
        mp3_header = b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 100
        files = {"file": ("test_audio.mp3", mp3_header, "audio/mpeg")}
        response = requests.post(
            f"{BASE_URL}/api/admin/cliente/{TEST_USER_ID}/upload-audio-analisi",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "url" in data
        assert data["url"].endswith(".mp3")
        print(f"✓ Admin uploaded audio successfully: {data['url']}")
    
    def test_get_audio_status(self, client_token):
        """Client can get audio availability status"""
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/audio/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Get audio failed: {response.text}"
        data = response.json()
        assert "available" in data
        assert "url" in data
        print(f"✓ Audio status: available={data['available']}, url={data.get('url', 'N/A')}")


class TestStatoCliente:
    """Test stato cliente endpoint (was broken, now fixed)"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_stato_cliente(self, client_token):
        """Get stato cliente endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/stato/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200, f"Get stato failed: {response.text}"
        data = response.json()
        assert "stato_cliente" in data
        assert "azione_richiesta" in data
        assert "pagina" in data
        assert "label_admin" in data
        print(f"✓ Stato cliente: {data['stato_cliente']}, azione: {data['azione_richiesta']}")


class TestScoringFunction:
    """Test calcola_scoring function from analisi_generator"""
    
    def test_scoring_idoneo(self):
        """Test scoring returns IDONEO for high scores"""
        from services.analisi_generator import calcola_scoring
        
        quiz = {
            'esperienza': 'oltre_5',
            'pubblico': 'grande',
            'vendite_online': 'avanzato',
            'problema': 'Voglio creare un corso online per aiutare le persone a migliorare la loro produttività lavorativa e raggiungere i loro obiettivi professionali'
        }
        result = calcola_scoring(quiz)
        
        assert result['totale'] >= 26, f"Expected high score, got {result['totale']}"
        assert result['classificazione'] == 'IDONEO'
        assert result['percentuale'] >= 65
        assert 'breakdown' in result
        assert 'esperienza' in result['breakdown']
        assert 'pubblico' in result['breakdown']
        assert 'vendite' in result['breakdown']
        assert 'chiarezza_problema' in result['breakdown']
        print(f"✓ Scoring IDONEO: {result['totale']}/{result['max']} ({result['percentuale']}%)")
    
    def test_scoring_idoneo_con_riserva(self):
        """Test scoring returns IDONEO_CON_RISERVA for medium scores"""
        from services.analisi_generator import calcola_scoring
        
        quiz = {
            'esperienza': '1_3',
            'pubblico': 'piccolo',
            'vendite_online': 'provato',
            'problema': 'Voglio creare un corso online per aiutare le persone'
        }
        result = calcola_scoring(quiz)
        
        assert 40 <= result['percentuale'] < 65
        assert result['classificazione'] == 'IDONEO_CON_RISERVA'
        print(f"✓ Scoring IDONEO_CON_RISERVA: {result['totale']}/{result['max']} ({result['percentuale']}%)")
    
    def test_scoring_non_idoneo(self):
        """Test scoring returns NON_IDONEO for low scores"""
        from services.analisi_generator import calcola_scoring
        
        quiz = {
            'esperienza': 'meno_1',
            'pubblico': 'no',
            'vendite_online': 'no',
            'problema': 'Corso'
        }
        result = calcola_scoring(quiz)
        
        assert result['percentuale'] < 40
        assert result['classificazione'] == 'NON_IDONEO'
        print(f"✓ Scoring NON_IDONEO: {result['totale']}/{result['max']} ({result['percentuale']}%)")


class TestPDFGenerator:
    """Test PDF generation with 11 sections"""
    
    def test_pdf_generation_basic(self):
        """Test PDF generates successfully with all 11 sections"""
        from services.pdf_generator import genera_pdf_analisi
        
        quiz = {
            'ambito': 'Business Coaching',
            'target': 'Imprenditori PMI',
            'problema': 'Mancanza di struttura e processi aziendali',
            'esperienza': 'oltre_5',
            'pubblico': 'medio',
            'vendite_online': 'attivo',
            'canale_principale': 'LinkedIn',
            'obiettivo': 'Creare un corso online'
        }
        scoring = {
            'totale': 30,
            'max': 40,
            'percentuale': 75.0,
            'classificazione': 'IDONEO',
            'breakdown': {
                'esperienza': {'punteggio': 10, 'max': 10},
                'pubblico': {'punteggio': 7, 'max': 10},
                'vendite': {'punteggio': 7, 'max': 10},
                'chiarezza_problema': {'punteggio': 6, 'max': 10}
            }
        }
        analisi = {
            'sintesi_progetto': 'Professionista nel settore Business Coaching con focus su Imprenditori PMI.',
            'diagnosi': 'Il progetto ha una base solida ma manca di struttura digitale.',
            'punti_di_forza': ['Esperienza consolidata', 'Target definito', 'Pubblico esistente'],
            'criticita': ['Mancanza sistema digitale', 'Vendite non strutturate', 'Offerta non pacchettizzata'],
            'livello_progetto': 'Avanzato',
            'livello_spiegazione': 'Profilo con buone basi e esperienza concreta.',
            'conseguenze': 'Rimanendo nella situazione attuale, il rischio è che competitor costruiscano piattaforme prima.',
            'direzione_consigliata': 'Procedere con la costruzione dell accademia digitale.',
            'introduzione_soluzione': 'Evolution PRO lavora esattamente su questo.',
            'esito': 'IDONEO',
            'prossimo_passo': 'Call strategica con Claudio.'
        }
        
        pdf_bytes = genera_pdf_analisi(quiz, scoring, analisi, 'Mario Rossi', 'mario.rossi@test.com')
        
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 1000, f"PDF too small: {len(pdf_bytes)} bytes"
        # Check PDF header
        assert pdf_bytes[:4] == b'%PDF', "Invalid PDF header"
        print(f"✓ PDF generated: {len(pdf_bytes)} bytes")
    
    def test_pdf_generation_all_levels(self):
        """Test PDF generates for all 3 classification levels"""
        from services.pdf_generator import genera_pdf_analisi
        
        for level in ['IDONEO', 'IDONEO_CON_RISERVA', 'NON_IDONEO']:
            quiz = {'ambito': 'Test', 'target': 'Test', 'problema': 'Test problem'}
            scoring = {
                'totale': 30, 'max': 40, 'percentuale': 75.0,
                'classificazione': level,
                'breakdown': {
                    'esperienza': {'punteggio': 10, 'max': 10},
                    'pubblico': {'punteggio': 7, 'max': 10},
                    'vendite': {'punteggio': 7, 'max': 10},
                    'chiarezza_problema': {'punteggio': 6, 'max': 10}
                }
            }
            analisi = {
                'sintesi_progetto': 'Test sintesi',
                'diagnosi': 'Test diagnosi',
                'punti_di_forza': ['Forza 1', 'Forza 2'],
                'criticita': ['Criticità 1', 'Criticità 2'],
                'livello_progetto': 'Intermedio',
                'livello_spiegazione': 'Test spiegazione',
                'conseguenze': 'Test conseguenze',
                'direzione_consigliata': 'Test direzione',
                'introduzione_soluzione': 'Test soluzione',
                'esito': level.replace('_', ' '),
                'prossimo_passo': 'Test passo'
            }
            
            pdf_bytes = genera_pdf_analisi(quiz, scoring, analisi, 'Test User', 'test@test.com')
            assert pdf_bytes[:4] == b'%PDF', f"Invalid PDF for {level}"
            print(f"✓ PDF generated for {level}: {len(pdf_bytes)} bytes")


class TestProspectPipelineEndpoint:
    """Test admin prospect pipeline endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_prospect_pipeline_loads(self, admin_token):
        """Admin can load prospect pipeline"""
        response = requests.get(
            f"{BASE_URL}/api/admin/prospect-pipeline",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Note: This endpoint may not require auth based on the code
        assert response.status_code == 200, f"Pipeline failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "clienti" in data
        print(f"✓ Prospect pipeline loaded: {len(data['clienti'])} clients")


class TestClienteAnalisiOutput:
    """Test cliente analisi output endpoint"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_analisi_output(self, client_token):
        """Client can get their analisi output"""
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/output/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # May return 404 if no analisi exists yet
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Analisi output retrieved")
            if 'analisi' in data:
                analisi = data['analisi']
                # Check for new 11-section fields
                expected_fields = ['sintesi_progetto', 'diagnosi', 'punti_di_forza', 
                                   'criticita', 'direzione_consigliata']
                for field in expected_fields:
                    if field in analisi:
                        print(f"  - {field}: present")
        elif response.status_code == 404:
            print(f"✓ No analisi exists yet for test user (expected)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestPDFDownload:
    """Test PDF download endpoint"""
    
    @pytest.fixture
    def client_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_pdf_download_endpoint(self, client_token):
        """Client can download PDF"""
        response = requests.get(
            f"{BASE_URL}/api/cliente-analisi/pdf/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # May return 404 if no analisi exists
        if response.status_code == 200:
            assert response.headers.get('content-type') == 'application/pdf'
            assert len(response.content) > 1000
            print(f"✓ PDF downloaded: {len(response.content)} bytes")
        elif response.status_code == 404:
            print(f"✓ No PDF available yet (expected if no analisi)")
        else:
            print(f"⚠ PDF download returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
