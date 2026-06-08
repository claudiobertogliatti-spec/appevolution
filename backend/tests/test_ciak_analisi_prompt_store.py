import pytest
from services import ciak_analisi_prompt_store as store

pytestmark = pytest.mark.unit


class FakeColl:
    def __init__(self):
        self.docs = []
    async def find_one(self, q):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return d
        return None
    def find(self, q):
        items = [d for d in self.docs if all(d.get(k) == v for k, v in q.items())]
        class Cur:
            def sort(self, *a, **k): return self
            def limit(self, n): return self
            async def to_list(self, n): return items
        return Cur()
    async def update_many(self, q, upd):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"])
    async def insert_one(self, doc):
        self.docs.append(doc)
    async def update_one(self, q, upd):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"]); return


class FakeDB:
    def __init__(self):
        self.ciak_analisi_prompts = FakeColl()


@pytest.mark.asyncio
async def test_create_and_get_active_per_key():
    store.set_db(FakeDB())
    await store.create_version(key="bozza", content="P1", label="v1", author_email="a@b.it")
    assert await store.get_active_content("bozza") == "P1"
    assert await store.get_active_content("definitiva") is None
    await store.create_version(key="bozza", content="P2", label="v2", author_email="a@b.it")
    assert await store.get_active_content("bozza") == "P2"
