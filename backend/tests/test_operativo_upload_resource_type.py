"""Un upload del Percorso deve scegliere il resource_type Cloudinary giusto.

Regressione: gli Office (xlsx/docx) cadevano su "image" -> Cloudinary li
rifiutava -> fallback locale non servibile -> 404 all'apertura nei Materiali.
Ora vanno come "raw".
"""

import pytest

from routers.partner_journey import operativo_resource_type

pytestmark = pytest.mark.unit


def test_office_documents_go_raw():
    for ext in ("xlsx", "docx", "pptx", "csv", "txt", "zip", "odt"):
        assert operativo_resource_type(ext) == "raw", ext


def test_pdf_goes_raw():
    assert operativo_resource_type("pdf") == "raw"


def test_real_images_go_image():
    for ext in ("jpg", "jpeg", "png", "gif", "webp", "svg"):
        assert operativo_resource_type(ext) == "image", ext


def test_videos_go_video():
    for ext in ("mp4", "mov", "webm"):
        assert operativo_resource_type(ext) == "video", ext


def test_case_insensitive_and_unknown():
    assert operativo_resource_type("XLSX") == "raw"
    assert operativo_resource_type("PNG") == "image"
    assert operativo_resource_type("bin") == "raw"
    assert operativo_resource_type("") == "raw"
