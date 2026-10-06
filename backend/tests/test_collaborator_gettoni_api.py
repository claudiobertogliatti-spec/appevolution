"""Router gettoni di Mariangela: lettura del mese, attribuzione manuale, accesso."""

import os
from types import SimpleNamespace

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-for-collaborator-gettoni")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

import pytest
from fastapi import HTTPException

from routers import collaborator_gettoni as mod
from routers.collaborator_settlements import require_billing_admin

pytestmark = pytest.mark.unit


class _Cursor:
    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, *_a, **_k):
        return self

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    def find(self, query=None, _proj=None):
        q = query or {}
        return _Cursor([d for d in self.docs if all(d.get(k) == v for k, v in q.items() if not isinstance(v, dict))])

    async def find_one(self, query, _proj=None):
        rx = (query.get("user_email") or {}).get("$regex") if isinstance(query.get("user_email"), dict) else None
        for d in self.docs:
            if rx:
                import re
                if re.match(rx, d.get("user_email", ""), re.I):
                    return d
            elif all(d.get(k) == v for k, v in query.items()):
                return d
        return None

    async def update_one(self, flt, upd, upsert=False):
        for d in self.docs:
            if all(d.get(k) == v for k, v in flt.items()):
                d.update(upd["$set"])
                return
        if upsert:
            self.docs.append({**flt, **upd["$set"]})

    async def delete_one(self, flt):
        before = len(self.docs)
        self.docs = [d for d in self.docs if not all(d.get(k) == v for k, v in flt.items())]
        return SimpleNamespace(deleted_count=before - len(self.docs))


def _db(diags, clients=(), attrib=()):
    return SimpleNamespace(
        diagnostic_sessions=_Coll(diags), ciak_clients=_Coll(clients), collaborator_attributions=_Coll(attrib))


LEAD = {"user_email": "Lead.Esempio@example.com", "user_name": "Lead Esempio", "tracking": {},
        "state_history": [{"state": "call_done", "timestamp": "2026-10-02T15:26:00+00:00"}]}
ADMIN = SimpleNamespace(role="admin", admin_type="claudio", email="claudio@ciak.io")


@pytest.mark.asyncio
async def test_lead_senza_utm_e_da_verificare_poi_attribuito_a_mano_matura(monkeypatch):
    db = _db([dict(LEAD)])
    monkeypatch.setattr(mod, "db", db)
    before = await mod.gettoni(month="2026-10", admin=ADMIN)
    assert before["total_cents"] == 0 and before["to_verify"][0]["email"] == "lead.esempio@example.com"
    await mod.add_attribution(mod.Attribution(email="LEAD.esempio@example.com", nota="nota di prova"), admin=ADMIN)
    after = await mod.gettoni(month="2026-10", admin=ADMIN)
    assert after["total_cents"] == 1500 and after["to_verify"] == []
    await mod.remove_attribution("lead.esempio@example.com", admin=ADMIN)
    assert (await mod.gettoni(month="2026-10", admin=ADMIN))["total_cents"] == 0


@pytest.mark.asyncio
async def test_attribuzione_a_email_sconosciuta_e_rifiutata(monkeypatch):
    monkeypatch.setattr(mod, "db", _db([dict(LEAD)]))
    with pytest.raises(HTTPException) as exc:
        await mod.add_attribution(mod.Attribution(email="nessuno@x.it"), admin=ADMIN)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_mese_non_valido_422(monkeypatch):
    monkeypatch.setattr(mod, "db", _db([]))
    with pytest.raises(HTTPException) as exc:
        await mod.gettoni(month="ottobre", admin=ADMIN)
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_antonella_non_vede_i_gettoni():
    with pytest.raises(HTTPException) as exc:
        await require_billing_admin(SimpleNamespace(role="admin", admin_type="antonella"))
    assert exc.value.status_code == 403
