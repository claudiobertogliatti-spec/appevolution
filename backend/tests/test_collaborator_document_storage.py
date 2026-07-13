import pytest

from services.collaborator_document_storage import (
    build_object_key,
    delete_private_document,
    download_private_document,
    upload_private_document,
)

pytestmark = pytest.mark.unit


class FakeBlob:
    def __init__(self, key):
        self.key = key
        self.content_type = None
        self.data = None
        self.deleted = False

    def upload_from_string(self, data, content_type):
        self.data = data
        self.content_type = content_type

    def exists(self):
        return self.data is not None

    def download_as_bytes(self):
        return self.data

    def delete(self):
        self.deleted = True


class FakeBucket:
    def __init__(self):
        self.blobs = {}

    def blob(self, key):
        return self.blobs.setdefault(key, FakeBlob(key))


class FakeClient:
    def __init__(self, bucket):
        self._bucket = bucket

    def bucket(self, _name):
        return self._bucket


def test_object_key_is_private_and_ignores_original_path():
    key = build_object_key("antonella", "set_123", "invoice", "../../fattura luglio.pdf")
    assert key.startswith("private/collaborators/antonella/settlements/set_123/invoice/")
    assert ".." not in key
    assert key.endswith(".pdf")


def test_upload_download_and_delete_remain_private(monkeypatch):
    bucket = FakeBucket()
    monkeypatch.setattr("services.collaborator_document_storage.storage.Client", lambda: FakeClient(bucket))
    metadata = upload_private_document("antonella", "set_123", "invoice", "fattura.pdf", "application/pdf", b"%PDF-test")
    assert "url" not in metadata
    assert metadata["filename"] == "fattura.pdf"
    assert metadata["size"] == 9
    data, content_type = download_private_document(metadata["object_key"])
    assert data == b"%PDF-test"
    assert content_type == "application/pdf"
    delete_private_document(metadata["object_key"])
    assert bucket.blobs[metadata["object_key"]].deleted is True


def test_download_missing_object_raises(monkeypatch):
    bucket = FakeBucket()
    monkeypatch.setattr("services.collaborator_document_storage.storage.Client", lambda: FakeClient(bucket))
    with pytest.raises(FileNotFoundError):
        download_private_document("private/missing.pdf")
