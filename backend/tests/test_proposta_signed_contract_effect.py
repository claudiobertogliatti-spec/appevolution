"""Unit test per la logica pura estratta da _finalize_signed_contract_effect.

`_finalize_signed_contract_effect` (routers/proposta.py) genera il PDF del
contratto firmato DOPO il pagamento (vedi task-3move) e tocca DB/rete/filesystem,
quindi non e' testabile in questo harness (skip DB tests). L'unica parte pura
- la derivazione del path locale del PDF da un pdf_url - e' isolata in
`_resolve_local_pdf_candidate` proprio per poter essere verificata qui senza mock.
"""
import importlib.util
import os
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_pdf_candidate_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit


def test_api_static_path_is_remapped_under_app():
    """'/api/static/...' e' servito da FastAPI da dentro /app: il candidate
    per leggere il file dal filesystem del container deve riflettere questo."""
    assert proposta._resolve_local_pdf_candidate("/api/static/contracts/foo.pdf") == \
        os.path.join("/app", "api/static/contracts/foo.pdf")


def test_already_absolute_local_path_is_returned_unchanged():
    """Un path locale che non passa da /api/static/ (es. /app/storage/...)
    e' gia' assoluto: nessuna riscrittura."""
    assert proposta._resolve_local_pdf_candidate("/app/storage/contracts/foo.pdf") == \
        "/app/storage/contracts/foo.pdf"
