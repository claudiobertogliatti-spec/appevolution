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
        key = "user_email" if "user_email" in query else ("email" if isinstance(query.get("email"), dict) else None)
        rx = (query.get(key) or {}).get("$regex") if key and isinstance(query.get(key), dict) else None
        for d in self.docs:
            if rx:
                import re
                if re.match(rx, d.get(key, ""), re.I):
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
            self.docs.append({**flt, **upd.get("$setOnInsert", {}), **upd["$set"]})

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
    await mod.save_attribution(mod.Attribution(email="LEAD.esempio@example.com", nota="nota di prova"), admin=ADMIN)
    after = await mod.gettoni(month="2026-10", admin=ADMIN)
    assert after["total_cents"] == 1500 and after["to_verify"] == []
    await mod.remove_attribution("lead.esempio@example.com", admin=ADMIN)
    assert (await mod.gettoni(month="2026-10", admin=ADMIN))["total_cents"] == 0


@pytest.mark.asyncio
async def test_lead_sconosciuto_senza_nome_e_rifiutato(monkeypatch):
    monkeypatch.setattr(mod, "db", _db([dict(LEAD)]))
    with pytest.raises(HTTPException) as exc:
        await mod.save_attribution(mod.Attribution(email="nessuno@x.it"), admin=ADMIN)
    assert exc.value.status_code == 422


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


@pytest.mark.asyncio
async def test_lead_fuori_funnel_con_nome_e_call_dichiarata_e_modificabile_e_rimovibile(monkeypatch):
    db = _db([])
    monkeypatch.setattr(mod, "db", db)
    today = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%d")
    month = today[:7]
    await mod.save_attribution(mod.Attribution(email="Nuovo@Esempio.it", nome="Nuovo Lead", call_fatta_il=today), admin=ADMIN)
    out = await mod.gettoni(month=month, admin=ADMIN)
    row = next(r for r in out["leads"] if r["email"] == "nuovo@esempio.it")
    assert row["nome"] == "Nuovo Lead" and row["totale_cents"] == 1500 and row["manuale"] is True
    await mod.save_attribution(mod.Attribution(email="nuovo@esempio.it", nome="Nuovo Lead Corretto", nota="ricontattare"), admin=ADMIN)
    out = await mod.gettoni(month=month, admin=ADMIN)
    row = next(r for r in out["leads"] if r["email"] == "nuovo@esempio.it")
    assert row["nome"] == "Nuovo Lead Corretto" and row["nota"] == "ricontattare" and row["totale_cents"] == 0
    assert len(db.collaborator_attributions.docs) == 1  # stessa email = stesso lead, non un duplicato
    assert (await mod.remove_attribution("nuovo@esempio.it", admin=ADMIN))["removed"] == 1
    assert not any(r["email"] == "nuovo@esempio.it" for r in (await mod.gettoni(month=month, admin=ADMIN))["leads"])


@pytest.mark.asyncio
async def test_validazioni_email_e_data_call(monkeypatch):
    monkeypatch.setattr(mod, "db", _db([]))
    for bad in (mod.Attribution(email="non-una-email", nome="X"),
                mod.Attribution(email="a@b.it", nome="X", call_fatta_il="31/12/2026"),
                mod.Attribution(email="a@b.it", nome="X", call_fatta_il="2099-01-01")):
        with pytest.raises(HTTPException) as exc:
            await mod.save_attribution(bad, admin=ADMIN)
        assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_esito_su_misura_salvato_letto_e_validato(monkeypatch):
    import datetime as _dt
    db = _db([])
    monkeypatch.setattr(mod, "db", db)
    today = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d")
    await mod.save_attribution(mod.Attribution(email="su@misura.it", nome="Su Misura", esito_start_il=today), admin=ADMIN)
    out = await mod.gettoni(month=today[:7], admin=ADMIN)
    row = next(r for r in out["leads"] if r["email"] == "su@misura.it")
    assert row["esito_start_il"] == today and row["totale_cents"] == 5000
    for bad in ("2099-01-01", "non-una-data"):
        with pytest.raises(HTTPException) as exc:
            await mod.save_attribution(mod.Attribution(email="su@misura.it", nome="X", esito_start_il=bad), admin=ADMIN)
        assert exc.value.status_code == 422
