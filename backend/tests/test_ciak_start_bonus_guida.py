"""
Consegna della guida in omaggio all'acquisto di Ciak Start.
La guida e' allegata SOLO se l'acquisto (paid_at) e' entro la finestra bonus 48h
(bonus_expires_at) e non e' gia' stata consegnata (idempotente). Enforcement del
bonus deciso con la sales page post-call.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services import ciak_start_delivery as d

pytestmark = pytest.mark.unit


def _iso(hours_from_now: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours_from_now)).isoformat()


# ─── unita': la regola del diritto al bonus ────────────────────────────────
def test_earned_se_acquisto_entro_finestra():
    assert d._bonus_guida_earned(bonus_expires_at=_iso(10), paid_at=_iso(0)) is True


def test_non_earned_se_acquisto_dopo_scadenza():
    # scadenza 1h fa, acquisto adesso
    assert d._bonus_guida_earned(bonus_expires_at=_iso(-1), paid_at=_iso(0)) is False


def test_non_earned_senza_scadenza():
    assert d._bonus_guida_earned(bonus_expires_at=None, paid_at=_iso(0)) is False


def test_earned_gestisce_z_e_naive():
    exp = (datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    paid = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")  # naive
    assert d._bonus_guida_earned(bonus_expires_at=exp, paid_at=paid) is True


# ─── deliver_start_access: allega / non allega ─────────────────────────────
class _Coll:
    def __init__(self, docs=None):
        self.docs = list(docs or [])
        self.updates = []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items() if not isinstance(v, dict)):
                return dict(doc)
        return None

    async def update_one(self, query, update, upsert=False):
        self.updates.append((query, update))
        for doc in self.docs:
            if doc.get("id") == query.get("id"):
                doc.update(update.get("$set", {}))
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None


class _Db:
    def __init__(self, client):
        self.ciak_clients = _Coll([client] if client else [])
        self.ciak_onboarding_emails = _Coll()
        self.ciak_client_access_recovery = _Coll()


async def _fake_token(db, client_id, email):
    return {"token": "tok"}


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    monkeypatch.setattr(d, "create_magic_login_token", _fake_token)
    monkeypatch.setattr(d, "_load_guide_pdf", lambda: b"GUIDE-PDF")


async def _deliver(db, paid_at):
    return await d.deliver_start_access(
        db, client_id="c1", email="c@x.it", name="Cliente",
        paid_at=paid_at, checkout_session_id="cs_1",
    )


@pytest.mark.asyncio
async def test_allega_guida_se_entro_finestra(monkeypatch):
    seen = {}
    monkeypatch.setattr(d, "_send_email", lambda *a: seen.update(guide=a[4]) or (True, None))
    db = _Db({"id": "c1", "bonus_expires_at": _iso(10)})
    paid = _iso(0)
    sent = await _deliver(db, paid)
    assert sent is True
    assert seen["guide"] == b"GUIDE-PDF"          # allegata
    assert db.ciak_clients.docs[0]["bonus_guida_consegnata_at"]  # flag consegna scritto


@pytest.mark.asyncio
async def test_niente_guida_se_finestra_scaduta(monkeypatch):
    seen = {}
    monkeypatch.setattr(d, "_send_email", lambda *a: seen.update(guide=a[4]) or (True, None))
    db = _Db({"id": "c1", "bonus_expires_at": _iso(-2)})
    sent = await _deliver(db, _iso(0))
    assert sent is True
    assert seen["guide"] is None
    assert "bonus_guida_consegnata_at" not in db.ciak_clients.docs[0]


@pytest.mark.asyncio
async def test_niente_guida_se_gia_consegnata(monkeypatch):
    seen = {}
    monkeypatch.setattr(d, "_send_email", lambda *a: seen.update(guide=a[4]) or (True, None))
    db = _Db({"id": "c1", "bonus_expires_at": _iso(10), "bonus_guida_consegnata_at": _iso(-1)})
    await _deliver(db, _iso(0))
    assert seen["guide"] is None  # niente doppio invio
