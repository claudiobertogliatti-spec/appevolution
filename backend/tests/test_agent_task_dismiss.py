"""
Regressione del bug coda approvazioni (4/9/2026):
- i task-guscio `valentina_auto_*` intasavano "Cosa aspetta il tuo OK" senza modo
  di toglierli (solo Approva / Rifiuta-con-motivo). `dismiss_task` li scarta senza
  rigenerare;
- il generatore ora scrive `title`/`description` cosi' la card non e' mai vuota.
"""
import os
import re
import pytest

from approval_workflow import dismiss_task, get_pending_approvals

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, query, projection=None, sort=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def update_one(self, query, update):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                for k, v in update.get("$set", {}).items():
                    doc[k] = v  # chiavi puntate ("approval.status") restano letterali: ok, testiamo status
                return type("R", (), {"matched_count": 1, "modified_count": 1})()
        return type("R", (), {"matched_count": 0, "modified_count": 0})()

    def find(self, query, projection=None):
        matched = [dict(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())]

        class Cursor:
            def sort(self, *_a, **_k):
                return self

            async def to_list(self, _n):
                return matched

        return Cursor()


class FakeDB:
    def __init__(self, tasks):
        self.agent_tasks = FakeCollection(tasks)


@pytest.mark.asyncio
async def test_dismiss_toglie_dalla_coda_senza_motivo():
    db = FakeDB([
        {"id": "valentina_auto_x_1", "status": "awaiting_approval", "agent": "VALENTINA"},
    ])
    out = await dismiss_task(db, "valentina_auto_x_1", "Claudio")
    assert out["status"] == "dismissed"
    # non compare piu' tra i pending
    pending = await get_pending_approvals(db)
    assert all(t["id"] != "valentina_auto_x_1" for t in pending)


@pytest.mark.asyncio
async def test_dismiss_solo_su_awaiting():
    db = FakeDB([
        {"id": "gia_approvato", "status": "approved", "agent": "ANDREA"},
    ])
    with pytest.raises(ValueError):
        await dismiss_task(db, "gia_approvato", "Claudio")


@pytest.mark.asyncio
async def test_dismiss_task_inesistente():
    db = FakeDB([])
    with pytest.raises(ValueError):
        await dismiss_task(db, "non_esiste", "Claudio")


def test_generatore_outreach_scrive_titolo_e_descrizione():
    """La card non deve mai essere vuota: il task_data deve includere title+description."""
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = open(os.path.join(here, "celery_tasks.py"), encoding="utf-8").read()
    blocco = src[src.index('"type": "auto_outreach_lead"'):]
    blocco = blocco[:2000]
    assert '"title"' in blocco, "il task outreach deve scrivere 'title'"
    assert '"description"' in blocco, "il task outreach deve scrivere 'description'"
