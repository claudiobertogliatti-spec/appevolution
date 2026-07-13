"""Storage GCS privato per fatture e distinte dei collaboratori."""

import os
from pathlib import Path
from uuid import uuid4

from google.cloud import storage


BUCKET = os.environ.get("GCS_BUCKET", "gen-lang-client-0744698012_cloudbuild")


def build_object_key(collaborator_id, settlement_id, kind, filename):
    ext = Path(filename or "document").suffix.lower()
    return f"private/collaborators/{collaborator_id}/settlements/{settlement_id}/{kind}/{uuid4().hex}{ext}"


def upload_private_document(collaborator_id, settlement_id, kind, filename, content_type, data):
    key = build_object_key(collaborator_id, settlement_id, kind, filename)
    blob = storage.Client().bucket(BUCKET).blob(key)
    blob.upload_from_string(data, content_type=content_type)
    return {
        "object_key": key,
        "filename": Path(filename or "document").name,
        "content_type": content_type,
        "size": len(data),
    }


def download_private_document(object_key):
    blob = storage.Client().bucket(BUCKET).blob(object_key)
    if not blob.exists():
        raise FileNotFoundError(object_key)
    return blob.download_as_bytes(), blob.content_type or "application/octet-stream"


def delete_private_document(object_key):
    storage.Client().bucket(BUCKET).blob(object_key).delete()
