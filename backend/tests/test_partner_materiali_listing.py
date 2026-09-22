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

CLOUD = "https://res.cloudinary.com/demo/raw/upload/v1/x.pdf"  # storage fidato -> apribile
DRIVE = "https://drive.google.com/uc?id=abc123"                # solo Drive -> 404 al click

FILES = [
    {"file_id": "consegna", "status": "uploaded", "internal_url": CLOUD},   # upload admin/consegna
    {"file_id": "prodotto", "status": "approved", "visibility": "partner_visible", "internal_url": CLOUD},
    {"file_id": "legacy", "status": "pending_review", "internal_url": CLOUD},  # visibility mancante -> visibile
    {"file_id": "interno", "status": "pending_review", "visibility": "admin_only", "internal_url": CLOUD},
    {"file_id": "review", "status": "approved", "visibility": "needs_review", "internal_url": CLOUD},
    {"file_id": "vecchio", "status": "approved", "superseded": True, "internal_url": CLOUD},  # versione superata
    # Documento ancora solo su Drive: visibile per visibility, ma NON servibile -> 404 al click.
    {"file_id": "drive_rotto", "status": "uploaded", "internal_url": DRIVE, "original_name": "Calendario.xlsx"},
]


def test_partner_vede_i_suoi_file_non_gli_interni():
    ids = {f["file_id"] for f in partner_materiali_listing(FILES)}
    # Consegne e upload contano anche senza status 'approved'.
    assert "consegna" in ids
    assert "prodotto" in ids
    assert "legacy" in ids           # visibility mancante = visibile (record legacy)
    # Interni, superseded e non-apribili fuori.
    assert "interno" not in ids      # admin_only
    assert "review" not in ids       # needs_review
    assert "vecchio" not in ids      # superseded
    assert "drive_rotto" not in ids  # solo su Drive -> darebbe 404, nascosto al partner


def test_admin_vede_anche_gli_admin_only_ma_mai_i_superseded():
    ids = {f["file_id"] for f in partner_materiali_listing(FILES, include_hidden=True)}
    assert "interno" in ids          # admin vede gli admin_only
    assert "review" in ids
    assert "consegna" in ids
    assert "drive_rotto" in ids      # l'admin li vede (per migrarli), il partner no
    assert "vecchio" not in ids      # superseded resta fuori anche per l'admin


def test_partner_non_vede_i_file_non_apribili_tranne_i_video():
    # Il bug "i materiali non si aprono": i file solo-Drive davano 404. Ora il
    # partner li vede solo se apribili (storage fidato). I video sono esenti dal
    # filtro (non passano da _serve, hanno il loro streaming).
    files = [
        {"file_id": "cloud_doc", "internal_url": CLOUD},
        {"file_id": "drive_doc", "internal_url": DRIVE, "original_name": "Calendario.xlsx"},
        {"file_id": "drive_video", "internal_url": DRIVE, "original_name": "reel.mp4"},
    ]
    partner = {f["file_id"] for f in partner_materiali_listing(files)}
    admin = {f["file_id"] for f in partner_materiali_listing(files, include_hidden=True)}
    assert partner == {"cloud_doc", "drive_video"}
    assert admin == {"cloud_doc", "drive_doc", "drive_video"}
