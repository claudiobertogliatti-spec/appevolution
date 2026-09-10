"""La ricerca Places parallela non deve duplicare lo stesso luogo."""
import asyncio
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routers import discovery_engine  # noqa: E402


class DuplicateIdError(Exception):
    code = 11000


class Collection:
    def __init__(self, unique_ids=None):
        self.unique_ids = unique_ids
        self.docs = []

    async def find_one(self, query):
        # Entrambe le query arrivano qui prima dell'insert: riproduce la race
        # check-then-insert che esisteva prima dell'_id deterministico.
        await asyncio.sleep(0)
        return next((doc for doc in self.docs if all(doc.get(k) == v for k, v in query.items())), None)

    async def insert_one(self, doc):
        await asyncio.sleep(0)
        if self.unique_ids is not None:
            if doc.get("_id") in self.unique_ids:
                raise DuplicateIdError("duplicate _id")
            self.unique_ids.add(doc.get("_id"))
        self.docs.append(dict(doc))


class FakeDb:
    def __init__(self):
        self.discovery_leads = Collection(set())
        self.systeme_daily_queue = Collection()
        self.system_alerts = Collection()


class Response:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class Client:
    async def get(self, url, params=None, **kwargs):
        if "textsearch" in url:
            return Response({"status": "OK", "results": [{
                "place_id": "same-place", "name": "Studio Uno",
                "rating": 4.2, "user_ratings_total": 12,
                "formatted_address": "Roma", "types": [],
                "business_status": "OPERATIONAL",
            }]})
        return Response({"status": "OK", "result": {}})


def test_due_query_concorrenti_importano_un_solo_documento(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr(discovery_engine, "db", fake_db)

    async def run():
        args = (Client(), "key", "commercialista", "Commercialisti", "Roma", 20, 0.0, False)
        return await asyncio.gather(
            discovery_engine._run_places_query(*args),
            discovery_engine._run_places_query(*args),
        )

    results = asyncio.run(run())
    assert sum(item["imported"] for item in results) == 1
    assert sum(item["skipped"] for item in results) == 1
    assert len(fake_db.discovery_leads.docs) == 1
    assert fake_db.discovery_leads.docs[0]["_id"] == discovery_engine.generate_lead_id("google_places", "same-place")
