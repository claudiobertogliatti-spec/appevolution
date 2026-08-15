import pytest
import services.partner_step_materials as materials
from services.partner_step_materials import (
    allowed_public_url,
    categories_for_step,
    content_type_for_material,
    current_files,
    normalize_file_material,
    safe_step_data,
    trusted_storage_url,
)

pytestmark = pytest.mark.unit

def test_historical_categories_map_to_canonical_steps():
    assert "brand_kit" in categories_for_step("03-brand-kit")
    assert "posizionamento" in categories_for_step("04-posizionamento")
    assert "lezione_video" in categories_for_step("09-registra-lezioni")

def test_drive_and_gcs_are_never_public_but_youtube_is_allowed():
    assert allowed_public_url("https://drive.google.com/file/d/1") is None
    assert allowed_public_url("https://storage.googleapis.com/bucket/a.pdf") is None
    assert allowed_public_url("https://www.youtube.com/playlist?list=abc") is not None
    assert allowed_public_url("http://youtube.com/watch?v=x") is None
    assert trusted_storage_url("https://res.cloudinary.com/demo/a.pdf") is not None
    assert trusted_storage_url("https://evil.example/a.pdf") is None

def test_file_urls_are_always_internal_and_video_has_no_download():
    pdf = normalize_file_material({"file_id": "f1", "original_name": "Brand.pdf", "internal_url": "https://drive.google.com/x"})
    assert pdf["preview_url"].startswith("/api/partner-step-materials/")
    assert "drive" not in str(pdf)
    video = normalize_file_material({"file_id": "v1", "original_name": "lezione.mp4"})
    assert video["download_url"] is None


def test_pdf_proxy_uses_pdf_mime_when_storage_returns_octet_stream():
    doc = {"original_name": "Brand_Kit.pdf"}

    assert content_type_for_material(doc, "application/octet-stream") == "application/pdf"


def test_proxy_preserves_a_specific_registered_mime_type():
    doc = {"original_name": "brand-kit.pdf", "content_type": "application/pdf"}

    assert content_type_for_material(doc, "application/octet-stream") == "application/pdf"


def test_contract_step_accepts_canonical_signed_contract_and_receipt_categories():
    assert {"contratto_firmato", "distinta_pagamento"} <= categories_for_step("01-contratto")

def test_structured_data_is_whitelisted():
    result = safe_step_data("burocrazia", {"ragione_sociale": "ACME", "partita_iva": "IT1", "password": "secret"})
    assert result == {"ragione_sociale": "ACME", "partita_iva": "IT1"}

def test_superseded_and_unapproved_files_are_hidden():
    files = current_files([{"file_id": "a", "approval_status": "approved"}, {"file_id": "b", "superseded": True}, {"file_id": "c", "approval_status": "draft"}])
    assert [f["file_id"] for f in files] == ["a"]


def test_sensitive_and_unreviewed_visibility_classes_are_hidden_from_partner_materials():
    files = current_files([
        {"file_id": "legacy", "approval_status": "approved"},
        {"file_id": "visible", "approval_status": "approved", "visibility": "partner_visible"},
        {"file_id": "admin", "approval_status": "approved", "visibility": "admin_only"},
        {"file_id": "legal", "approval_status": "approved", "visibility": "legal_dispute"},
        {"file_id": "review", "approval_status": "approved", "visibility": "needs_review"},
        {"file_id": "foreign", "approval_status": "approved", "visibility": "foreign_owner"},
    ])

    assert [item["file_id"] for item in files] == ["legacy", "visible"]


def test_direct_file_access_uses_the_same_visibility_gate_as_the_material_list():
    assert materials.file_visible_to_partner({"approval_status": "approved"}) is True
    assert materials.file_visible_to_partner({"approval_status": "approved", "visibility": "partner_visible"}) is True
    assert materials.file_visible_to_partner({"approval_status": "approved", "visibility": "admin_only"}) is False
    assert materials.file_visible_to_partner({"approval_status": "approved", "visibility": "legal_dispute"}) is False
    assert materials.file_visible_to_partner({"approval_status": "approved", "visibility": "needs_review"}) is False
    assert materials.file_visible_to_partner({"approval_status": "approved", "visibility": "foreign_owner"}) is False


def test_drive_registration_defaults_to_admin_only_and_pending_review():
    record = materials.build_drive_registration_record(
        partner_id="p1",
        item={
            "name": "Contratto.pdf",
            "url": "https://drive.google.com/file/d/abc/view",
            "drive_id": "abc",
            "category": "contratto",
            "mime_type": "application/pdf",
            "size": 123,
        },
        now="2026-08-15T10:00:00+00:00",
        record_id="record-1",
    )

    assert record["visibility"] == "admin_only"
    assert record["status"] == "pending_review"
    assert record["approval_status"] == "pending_review"
    assert record["file_id"] == "abc"
    assert materials.drive_registration_key("p1", record) == {"partner_id": "p1", "drive_id": "abc"}


def test_drive_registration_rejects_unknown_visibility_and_requires_explicit_approval():
    base = {"name": "Materiale.pdf", "url": "https://drive.google.com/file/d/abc/view", "drive_id": "abc"}

    with pytest.raises(ValueError, match="visibility"):
        materials.build_drive_registration_record("p1", {**base, "visibility": "public"}, "now", "id")

    visible = materials.build_drive_registration_record(
        "p1", {**base, "visibility": "partner_visible"}, "now", "id"
    )
    assert visible["status"] == "pending_review"

    approved = materials.build_drive_registration_record(
        "p1",
        {
            **base,
            "url": "https://res.cloudinary.com/evolution/image/upload/materiale.pdf",
            "visibility": "partner_visible",
            "approval_status": "approved",
        },
        "now",
        "id",
    )
    assert approved["status"] == "approved"
    assert approved["approval_status"] == "approved"

    unservable = materials.build_drive_registration_record(
        "p1",
        {**base, "visibility": "partner_visible", "approval_status": "approved"},
        "now",
        "id",
    )
    assert unservable["status"] == "pending_review"


@pytest.mark.asyncio
async def test_register_drive_file_once_is_idempotent_and_never_overwrites_review_decisions():
    class Result:
        def __init__(self, upserted_id):
            self.upserted_id = upserted_id

    class Files:
        def __init__(self):
            self.calls = []

        async def update_one(self, key, update, upsert=False):
            self.calls.append((key, update, upsert))
            return Result("mongo-id" if len(self.calls) == 1 else None)

    files = Files()
    item = {
        "name": "Contratto.pdf",
        "url": "https://drive.google.com/file/d/abc/view",
        "drive_id": "abc",
        "visibility": "admin_only",
    }

    first, first_record = await materials.register_drive_file_once(files, "p1", item, "now", "id-1")
    second, second_record = await materials.register_drive_file_once(files, "p1", item, "later", "id-2")

    assert first == "inserted"
    assert second == "existing"
    assert first_record["status"] == "pending_review"
    assert second_record["status"] == "pending_review"
    assert files.calls[0][0] == {"partner_id": "p1", "drive_id": "abc"}
    assert files.calls[0][1] == {"$setOnInsert": first_record}
    assert files.calls[1][1] == {"$setOnInsert": second_record}
    assert all(call[2] is True for call in files.calls)
