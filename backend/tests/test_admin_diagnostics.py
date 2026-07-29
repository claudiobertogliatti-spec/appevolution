"""
Unit tests for GET /api/admin/diagnostics/partners endpoint
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from fastapi import FastAPI

from auth import create_access_token
from routers.admin_diagnostics import (
    router,
    set_db,
    inspect_partner_issues,
    _is_beyond_f2,
    _parse_iso_datetime,
    DEFAULT_HUB_STALE_DAYS
)


class MockCollection:
    def __init__(self, data=None):
        self.data = data or []

    def find(self, query=None, projection=None):
        return self

    async def to_list(self, length=1000):
        return self.data

    async def find_one(self, query=None, projection=None):
        if not query or "$or" not in query:
            return None
        conditions = query["$or"]
        for item in self.data:
            for cond in conditions:
                k, v = list(cond.items())[0]
                if item.get(k) == v:
                    return item
        return None


class MockDB:
    def __init__(self, partners=None, partner_hubs=None):
        self.partners = MockCollection(partners or [])
        self._hub_data = partner_hubs or []

    async def list_collection_names(self):
        return ["partners", "partner-hub"]

    def __getitem__(self, item):
        if item in ("partner-hub", "partner_hubs", "partner_hub", "hubs"):
            return MockCollection(self._hub_data)
        return MockCollection()


@pytest.fixture
def admin_token():
    return create_access_token({"sub": "admin_123", "email": "admin@evolutionpro.it", "role": "admin"})


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_is_beyond_f2():
    assert _is_beyond_f2("F1") is False
    assert _is_beyond_f2("F2") is False
    assert _is_beyond_f2("F3") is True
    assert _is_beyond_f2("F5") is True
    assert _is_beyond_f2("LIVE") is True
    assert _is_beyond_f2(None) is False


def test_inspect_partner_clean():
    clean_partner = {
        "id": "100",
        "name": "Mario Rossi",
        "phase": "F2",
        "revenue": 1000,
        "contract": "active",
        "systeme_subdomain": "mariorossi",
        "youtube_playlist_id": "PL1234567890abcdef",
        "updated_at": "2026-07-20T10:00:00Z"
    }
    hub = {
        "partner_id": "100",
        "offerName": "Mastery PRO",
        "offerPrice": "2790",
        "updated_at": "2026-07-19T10:00:00Z"
    }
    issues = inspect_partner_issues(clean_partner, hub)
    assert len(issues) == 0


def test_inspect_partner_multiple_issues():
    stale_hub_date = (datetime.now(timezone.utc) - timedelta(days=45)).isoformat()
    recent_partner_date = datetime.now(timezone.utc).isoformat()

    problem_partner = {
        "id": "demo-partner-99",
        "name": "Demo Test Partner",
        "phase": "F9",  # PHASE_OUT_OF_SCALE
        "revenue": 0,    # REVENUE_ZERO_WITH_ACTIVE_CONTRACT
        "contract": {"status": "active"},
        "youtube_playlist_id": "https://www.youtube.com/watch?v=12345",  # PLAYLIST_URL_INSTEAD_OF_ID
        "updated_at": recent_partner_date
    }
    hub = {
        "partner_id": "demo-partner-99",
        "offerName": "",  # EMPTY_OFFER
        "offerPrice": None,
        "updated_at": stale_hub_date  # HUB_STALE_VS_PARTNER
    }

    issues = inspect_partner_issues(problem_partner, hub)
    codes = [i.code for i in issues]

    assert "PLAYLIST_URL_INSTEAD_OF_ID" in codes
    assert "PHASE_OUT_OF_SCALE" in codes
    assert "DEMO_RECORD" in codes
    assert "EMPTY_OFFER" in codes
    assert "HUB_STALE_VS_PARTNER" in codes
    assert "REVENUE_ZERO_WITH_ACTIVE_CONTRACT" in codes
    assert "MISSING_SUBDOMAIN" in codes
    assert len(issues) == 7


def test_endpoint_missing_collection_does_not_crash(client, admin_token):
    mock_db = MockDB(partners=[], partner_hubs=[])
    set_db(mock_db)

    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/diagnostics/partners", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["partners_checked"] == 0
    assert data["issues_total"] == 0
    assert data["partners"] == []
    assert "by_code" in data
    assert data["by_code"]["PLAYLIST_URL_INSTEAD_OF_ID"] == 0


def test_endpoint_unauthorized(client):
    response = client.get("/api/admin/diagnostics/partners")
    assert response.status_code == 401


def test_endpoint_with_partners_data(client, admin_token):
    partners_data = [
        {
            "id": "1",
            "name": "Partner Clean",
            "phase": "F1",
            "revenue": 0,
            "contract": "",
            "youtube_playlist_id": "PLabc123"
        },
        {
            "id": "19",
            "name": "Michele Baggio",
            "phase": "F9",
            "revenue": 0,
            "contract": "active"
        }
    ]
    hubs_data = [
        {
            "partner_id": "1",
            "offerName": "Corso 1",
            "offerPrice": "500"
        }
    ]
    mock_db = MockDB(partners=partners_data, partner_hubs=hubs_data)
    set_db(mock_db)

    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/diagnostics/partners", headers=headers)
    assert response.status_code == 200

    data = response.json()
    assert data["partners_checked"] == 2
    assert data["issues_total"] > 0

    partner_19 = next(p for p in data["partners"] if p["id"] == "19")
    codes_19 = [i["code"] for i in partner_19["issues"]]
    assert "PHASE_OUT_OF_SCALE" in codes_19
    assert "REVENUE_ZERO_WITH_ACTIVE_CONTRACT" in codes_19
