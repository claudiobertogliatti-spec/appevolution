"""Filtro della vista Materiali del partner (partner_materiali_listing).

Regole (decisione Claudio): il partner vede TUTTI i suoi file — prodotti da Ciak,
caricati da lui o dall'admin — TRANNE i superseded e quelli marcati come interni
(`admin_only`, `needs_review`, `legal_dispute`, `foreign_owner`). NON si richiede
lo status 'approved' (a differenza del flusso di review per-step): contano anche
gli upload (status 'uploaded') e le consegne. L'admin in vista vede anche gli
`admin_only`.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

pytestmark = pytest.mark.unit

from services.partner_step_materials import partner_materiali_listing  # noqa: E402

FILES = [
    {"file_id": "consegna", "status": "uploaded"},                       # upload admin/consegna
    {"file_id": "prodotto", "status": "approved", "visibility": "partner_visible"},
    {"file_id": "legacy", "status": "pending_review"},                   # visibility mancante -> visibile
    {"file_id": "interno", "status": "pending_review", "visibility": "admin_only"},
    {"file_id": "review", "status": "approved", "visibility": "needs_review"},
    {"file_id": "vecchio", "status": "approved", "superseded": True},     # versione superata
]


def test_partner_vede_i_suoi_file_non_gli_interni():
    ids = {f["file_id"] for f in partner_materiali_listing(FILES)}
    # Consegne e upload contano anche senza status 'approved'.
    assert "consegna" in ids
    assert "prodotto" in ids
    assert "legacy" in ids           # visibility mancante = visibile (record legacy)
    # Interni e superseded fuori.
    assert "interno" not in ids      # admin_only
    assert "review" not in ids       # needs_review
    assert "vecchio" not in ids      # superseded


def test_admin_vede_anche_gli_admin_only_ma_mai_i_superseded():
    ids = {f["file_id"] for f in partner_materiali_listing(FILES, include_hidden=True)}
    assert "interno" in ids          # admin vede gli admin_only
    assert "review" in ids
    assert "consegna" in ids
    assert "vecchio" not in ids      # superseded resta fuori anche per l'admin
