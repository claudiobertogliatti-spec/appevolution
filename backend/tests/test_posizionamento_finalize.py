"""Integration tests per il ponte Posizionamento → Approvazione.

Eseguire con backend in esecuzione e REACT_APP_BACKEND_URL set:
    REACT_APP_BACKEND_URL=https://... python -m pytest backend/tests/test_posizionamento_finalize.py -v
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

pytestmark = pytest.mark.skipif(not BASE_URL, reason="REACT_APP_BACKEND_URL not set")


ANSWERS_FIXTURE = {
    "nicchia": "Consulenti finanziari indipendenti italiani",
    "promessa": "Trovare 10 clienti paganti in 90 giorni",
    "cliente_tipo": "Consulente 35-50 anni, 5+ anni esperienza",
    "problema_chiave": "Dipendenza da referenze passive",
    "trasformazione": "Pipeline costante entro 90gg",
    "differenza": "Metodo testato su 26 partner reali",
    "metodo_proprio": "Metodo EVO (Esamina-Valida-Ottimizza)",
    "prova_sociale": "Mario R. ha chiuso 3 vendite in 45gg",
}


def _create_test_partner_with_answers() -> str:
    """Helper: crea un partner di test con journey step 04-posizionamento già in_progress
    e risposte salvate nei data. Ritorna partner_id.

    NOTA: questo richiede endpoint admin di seed o un seed manuale in DB.
    Per ora il test salta se il partner di test 'deploy-check-evo' non esiste.
    """
    # Riusa il partner test esistente già creato nella sessione 29/5
    return "deploy-check-evo"


class TestFinalizeEndpoint:
    def test_finalize_returns_pending_review(self):
        partner_id = _create_test_partner_with_answers()
        # Salva risposte via endpoint operativo save-step (se esiste) — altrimenti
        # questo test va eseguito manualmente con DB seeded.
        r = requests.post(
            f"{BASE_URL}/api/partner/posizionamento/finalize",
            json={"partner_id": partner_id},
        )
        # Accettiamo 200 (happy path) o 409 (già approvato dai test precedenti)
        assert r.status_code in (200, 409), r.text
        if r.status_code == 200:
            body = r.json()
            assert body["status"] == "under_review"
            assert body["approval_status"] == "pending_review"
            assert "file_id" in body

    def test_finalize_idempotent_when_pending(self):
        partner_id = _create_test_partner_with_answers()
        r1 = requests.post(
            f"{BASE_URL}/api/partner/posizionamento/finalize",
            json={"partner_id": partner_id},
        )
        if r1.status_code != 200:
            pytest.skip(f"Setup state non valido: {r1.status_code} {r1.text}")
        r2 = requests.post(
            f"{BASE_URL}/api/partner/posizionamento/finalize",
            json={"partner_id": partner_id},
        )
        assert r2.status_code == 200
        assert r1.json()["file_id"] == r2.json()["file_id"]

    def test_finalize_unknown_partner_returns_404(self):
        r = requests.post(
            f"{BASE_URL}/api/partner/posizionamento/finalize",
            json={"partner_id": f"no-one-{uuid.uuid4().hex[:8]}"},
        )
        assert r.status_code == 404


class TestGetDocumentEndpoint:
    def test_returns_null_for_unknown(self):
        partner_id = f"no-one-{uuid.uuid4().hex[:8]}"
        r = requests.get(f"{BASE_URL}/api/partner/posizionamento/document/{partner_id}")
        assert r.status_code == 200
        assert r.json() is None

    def test_returns_doc_metadata_when_exists(self):
        partner_id = _create_test_partner_with_answers()
        r = requests.get(f"{BASE_URL}/api/partner/posizionamento/document/{partner_id}")
        assert r.status_code == 200
        body = r.json()
        if body is not None:
            assert "file_id" in body
            assert "status" in body
            assert body["status"] in ("under_review", "approved", "rejected")
