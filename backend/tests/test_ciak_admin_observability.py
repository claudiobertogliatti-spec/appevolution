import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from routers import ciak_admin

pytestmark = pytest.mark.unit


class FakeCursor:
    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, field, direction):
        self.docs.sort(key=lambda doc: doc.get(field) or "", reverse=direction < 0)
        return self

    def limit(self, limit):
        self.docs = self.docs[:limit]
        return self

    async def to_list(self, limit):
        return [dict(doc) for doc in self.docs[:limit]]


class FakeCollection:
    def __init__(self, docs):
        self.docs = [dict(doc) for doc in docs]

    async def count_documents(self, query):
        return sum(1 for doc in self.docs if _matches(doc, query))

    def find(self, query, projection=None):
        docs = []
        for doc in self.docs:
            if _matches(doc, query):
                item = dict(doc)
                if projection:
                    item = {key: item.get(key) for key, include in projection.items() if include}
                docs.append(item)
        return FakeCursor(docs)


class FakeDB:
    def __init__(self):
        self.stripe_webhook_events = FakeCollection([
            {
                "_id": "checkout.session.completed:cs_ok",
                "event_type": "checkout.session.completed",
                "reference_id": "cs_ok",
                "tipo": "ciak_start",
                "status": "processed",
                "created_at": "2026-07-10T08:00:00+00:00",
                "updated_at": "2026-07-10T08:00:01+00:00",
            },
            {
                "_id": "checkout.session.completed:cs_fail",
                "event_type": "checkout.session.completed",
                "reference_id": "cs_fail",
                "tipo": "partnership",
                "status": "failed",
                "error": "boom",
                "created_at": "2026-07-10T08:01:00+00:00",
                "updated_at": "2026-07-10T08:01:02+00:00",
            },
            {
                "_id": "checkout.session.completed:cs_stuck",
                "event_type": "checkout.session.completed",
                "reference_id": "cs_stuck",
                "tipo": "analisi_strategica",
                "status": "processing",
                "created_at": "2026-07-10T07:00:00+00:00",
                "updated_at": "2026-07-10T07:00:00+00:00",
            },
        ])
        self.payment_transactions = FakeCollection([
            {"session_id": "cs_ok", "payment_status": "paid", "tipo": "ciak_start"},
            {"session_id": "cs_fail", "payment_status": "pending", "tipo": "partnership"},
        ])


def _matches(doc, query):
    for key, expected in query.items():
        value = doc.get(key)
        if isinstance(expected, dict):
            if "$lt" in expected and not (value < expected["$lt"]):
                return False
            if "$gte" in expected and not (value >= expected["$gte"]):
                return False
        elif value != expected:
            return False
    return True


@pytest.mark.asyncio
async def test_stripe_webhook_observability_snapshot_reports_counts_and_recent_failures():
    result = await ciak_admin._stripe_webhook_observability_snapshot(
        FakeDB(),
        now_iso="2026-07-10T08:20:00+00:00",
    )

    assert result["events"]["total"] == 3
    assert result["events"]["processed"] == 1
    assert result["events"]["failed"] == 1
    assert result["events"]["processing"] == 1
    assert result["events"]["stuck_processing"] == 1
    assert result["payments"]["paid"] == 1
    assert result["payments"]["pending"] == 1
    assert result["recent_failures"][0]["reference_id"] == "cs_fail"
