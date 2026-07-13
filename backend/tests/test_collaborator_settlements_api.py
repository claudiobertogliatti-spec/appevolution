import os
from types import SimpleNamespace

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-for-collaborator-billing")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

import pytest
from fastapi import HTTPException
from auth import create_access_token, decode_token

from routers.collaborator_settlements import (
    _actor,
    _validate_document,
    require_billing_admin,
)

pytestmark = pytest.mark.unit


def test_invoice_requires_real_pdf():
    with pytest.raises(HTTPException) as exc:
        _validate_document("invoice", "application/pdf", b"not a pdf")
    assert exc.value.status_code == 422
    _validate_document("invoice", "application/pdf", b"%PDF-1.7\n")


def test_receipt_accepts_pdf_png_and_jpeg():
    _validate_document("payment_receipt", "application/pdf", b"%PDF-x")
    _validate_document("payment_receipt", "image/png", b"\x89PNG\r\n\x1a\n")
    _validate_document("payment_receipt", "image/jpeg", b"\xff\xd8\xff")


def test_document_size_is_limited():
    with pytest.raises(HTTPException) as exc:
        _validate_document("invoice", "application/pdf", b"%PDF" + b"x" * (10 * 1024 * 1024))
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_antonella_is_denied_billing_access():
    with pytest.raises(HTTPException) as exc:
        await require_billing_admin(SimpleNamespace(role="admin", admin_type="antonella"))
    assert exc.value.status_code == 403
    admin = SimpleNamespace(role="admin", admin_type="claudio", email="claudio@ciak.io")
    assert await require_billing_admin(admin) is admin
    assert _actor(admin) == "claudio@ciak.io"


def test_admin_type_survives_jwt_decode_for_billing_guard():
    token = create_access_token({"sub": "ant", "email": "antonella@evolutionpro.it", "role": "admin", "admin_type": "antonella"})
    assert decode_token(token).admin_type == "antonella"
