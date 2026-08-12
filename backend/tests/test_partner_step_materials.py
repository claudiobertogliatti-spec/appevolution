import pytest
from services.partner_step_materials import allowed_public_url, categories_for_step, current_files, normalize_file_material, safe_step_data, trusted_storage_url

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

def test_structured_data_is_whitelisted():
    result = safe_step_data("burocrazia", {"ragione_sociale": "ACME", "partita_iva": "IT1", "password": "secret"})
    assert result == {"ragione_sociale": "ACME", "partita_iva": "IT1"}

def test_superseded_and_unapproved_files_are_hidden():
    files = current_files([{"file_id": "a", "approval_status": "approved"}, {"file_id": "b", "superseded": True}, {"file_id": "c", "approval_status": "draft"}])
    assert [f["file_id"] for f in files] == ["a"]
