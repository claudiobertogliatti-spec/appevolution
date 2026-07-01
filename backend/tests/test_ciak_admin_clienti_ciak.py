import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "ciak_admin.py"
SPEC = importlib.util.spec_from_file_location("ciak_admin_under_test", MODULE_PATH)
ciak_admin = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(ciak_admin)

pytestmark = pytest.mark.unit


class FakeCursor:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]
        self._limit = None

    def sort(self, field, direction):
        reverse = direction == -1
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=reverse)
        return self

    def limit(self, value):
        self._limit = value
        return self

    async def to_list(self, length):
        size = self._limit if self._limit is not None else length
        return [dict(doc) for doc in self.docs[:size]]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    def find(self, query=None, projection=None):
        query = query or {}
        items = []
        for doc in self.docs:
            if all(doc.get(key) == value for key, value in query.items()):
                row = dict(doc)
                if projection and projection.get("_id") == 0:
                    row.pop("_id", None)
                items.append(row)
        return FakeCursor(items)


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection(
            [
                {
                    "_id": "mongo-1",
                    "id": "client-1",
                    "email": "uno@example.com",
                    "name": "Cliente Uno",
                    "access_level": "cliente_blueprint",
                    "offer_decision": "ciak_start",
                    "updated_at": "2026-06-01T09:00:00+00:00",
                },
                {
                    "_id": "mongo-2",
                    "id": "client-2",
                    "email": "due@example.com",
                    "name": "Cliente Due",
                    "access_level": "cliente_start",
                    "offer_decision": "partnership",
                    "updated_at": "2026-07-01T10:00:00+00:00",
                },
                {
                    "_id": "mongo-3",
                    "id": "client-3",
                    "email": "tre@example.com",
                    "name": "Cliente Tre",
                    "access_level": "partner",
                    "offer_decision": "partnership",
                    "updated_at": "2026-05-01T08:00:00+00:00",
                },
            ]
        )


@pytest.fixture
def client_app():
    app = FastAPI()
    ciak_admin.set_db(FakeDb())
    app.dependency_overrides[ciak_admin.require_ciak_admin] = lambda: SimpleNamespace(
        role="admin",
        email="admin@example.com",
    )
    app.include_router(ciak_admin.router)
    with TestClient(app) as client:
        yield client


def test_clienti_ciak_lists_clients_sorted_by_updated_at(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak")

    assert response.status_code == 200
    body = response.json()

    assert body["count"] == 3
    assert [item["id"] for item in body["items"]] == ["client-2", "client-1", "client-3"]
    assert all("_id" not in item for item in body["items"])


def test_clienti_ciak_respects_limit(client_app):
    response = client_app.get("/api/admin/ciak/clienti-ciak?limit=2")

    assert response.status_code == 200
    body = response.json()

    assert body["count"] == 2
    assert [item["id"] for item in body["items"]] == ["client-2", "client-1"]
