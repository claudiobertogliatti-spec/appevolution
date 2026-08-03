"""Unit test di POST /api/partner/forgot-password ("Password dimenticata").

Copre le proprietà che, se si rompono, non si vedono da fuori:
  - la response è SEMPRE identica (niente user enumeration)
  - il token nuovo azzera `partner_setup_consumed_at`, altrimenti il link
    arriva ma la pagina di setup lo rifiuta come "già utilizzato"
  - il cooldown non manda due email a raffica
  - un invio SMTP fallito viene registrato nell'audit, non nascosto

Più una regressione su setup_password: deve scrivere SIA `password_hash` SIA
`hashed_password`, perché authenticate_user legge il secondo per primo.
"""
import asyncio
from datetime import datetime, timedelta, timezone

import bcrypt
import pytest

from routers import partner_setup

pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(doc) for doc in (docs or [])]

    @staticmethod
    def _matches(doc, query):
        for key, value in query.items():
            if isinstance(value, dict) and "$regex" in value:
                import re as _re
                flags = _re.I if "i" in value.get("$options", "") else 0
                if not _re.match(value["$regex"], str(doc.get(key) or ""), flags):
                    return False
            elif doc.get(key) != value:
                return False
        return True

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if self._matches(doc, query):
                data = dict(doc)
                if projection and projection.get("_id") == 0:
                    data.pop("_id", None)
                return data
        return None

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                for key, value in update.get("$set", {}).items():
                    doc[key] = value
                for key in update.get("$unset", {}):
                    doc.pop(key, None)
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("Result", (), {"inserted_id": doc.get("id")})()


class FakeDb:
    def __init__(self, users=None):
        self.users = FakeCollection(users)
        self.ciak_password_reset_requests = FakeCollection([])


def _user(**overrides):
    base = {
        "id": "user-1",
        "email": "partner@example.it",
        "name": "Mario Rossi",
        "role": "partner",
        "is_active": True,
        "password_hash": "$2b$12$hash-vecchio",
        "hashed_password": "$2b$12$hash-vecchio",
    }
    base.update(overrides)
    return base


@pytest.fixture
def sent_emails(monkeypatch):
    """Cattura le chiamate SMTP invece di aprire una connessione vera."""
    calls = []

    def _fake_send(email, nome, reset_url, ore_validita):
        calls.append({
            "email": email, "nome": nome,
            "reset_url": reset_url, "ore": ore_validita,
        })
        return True, None

    monkeypatch.setattr(partner_setup, "send_password_reset_email_sync", _fake_send)
    return calls


def _forgot(email):
    return asyncio.run(
        partner_setup.forgot_password(partner_setup.ForgotPasswordRequest(email=email))
    )


# ─── Nessuna user enumeration ────────────────────────────────────────────

def test_indirizzo_sconosciuto_risponde_ok_senza_mandare_niente(monkeypatch, sent_emails):
    db = FakeDb([_user()])
    monkeypatch.setattr(partner_setup, "db", db)

    res = _forgot("nessuno@example.it")

    assert res.ok is True
    assert sent_emails == [], "non deve partire nessuna email per un indirizzo non registrato"
    assert db.ciak_password_reset_requests.docs == []


def test_account_disattivato_risponde_ok_senza_mandare_niente(monkeypatch, sent_emails):
    db = FakeDb([_user(is_active=False)])
    monkeypatch.setattr(partner_setup, "db", db)

    res = _forgot("partner@example.it")

    assert res.ok is True
    assert sent_emails == []


def test_invio_fallito_risponde_comunque_ok_ma_lo_registra(monkeypatch):
    db = FakeDb([_user()])
    monkeypatch.setattr(partner_setup, "db", db)
    monkeypatch.setattr(
        partner_setup, "send_password_reset_email_sync",
        lambda *a, **k: (False, "SMTP non configurato"),
    )

    res = _forgot("partner@example.it")

    assert res.ok is True, "un errore SMTP non deve rivelarsi al chiamante"
    audit = db.ciak_password_reset_requests.docs[-1]
    assert audit["sent"] is False
    assert audit["error"] == "SMTP non configurato"
    assert audit["sent_at"] is None


# ─── Token ───────────────────────────────────────────────────────────────

def test_genera_token_azzerando_consumed_at(monkeypatch, sent_emails):
    """Il caso che rompe tutto: chi ha già impostato la password una volta ha
    partner_setup_consumed_at valorizzato. Se il reset non lo azzera, il link
    arriva ma verify-setup-token risponde "già utilizzato"."""
    db = FakeDb([_user(
        partner_setup_token="vecchio" * 5,
        partner_setup_consumed_at="2026-05-01T10:00:00+00:00",
    )])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("partner@example.it")

    user = db.users.docs[0]
    assert user["partner_setup_consumed_at"] is None
    assert user["partner_setup_token"] != "vecchio" * 5
    assert len(user["partner_setup_token"]) == 32
    assert user["partner_setup_reason"] == "password_reset"


def test_scadenza_a_24_ore(monkeypatch, sent_emails):
    db = FakeDb([_user()])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("partner@example.it")

    expires = datetime.fromisoformat(db.users.docs[0]["partner_setup_expires_at"])
    atteso = datetime.now(timezone.utc) + timedelta(hours=partner_setup.RESET_TOKEN_TTL_HOURS)
    assert abs((expires - atteso).total_seconds()) < 60


def test_il_link_inviato_contiene_il_token_appena_creato(monkeypatch, sent_emails):
    db = FakeDb([_user()])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("partner@example.it")

    token = db.users.docs[0]["partner_setup_token"]
    assert sent_emails[0]["reset_url"].endswith(f"/partner/setup-password?token={token}")
    assert sent_emails[0]["email"] == "partner@example.it"


def test_email_maiuscola_trova_lutente_e_scrive_allindirizzo_registrato(monkeypatch, sent_emails):
    db = FakeDb([_user(email="partner@example.it")])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("  PARTNER@Example.IT ")

    assert len(sent_emails) == 1
    assert sent_emails[0]["email"] == "partner@example.it"


# ─── Cooldown ────────────────────────────────────────────────────────────

def test_cooldown_blocca_la_seconda_email_ravvicinata(monkeypatch, sent_emails):
    db = FakeDb([_user()])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("partner@example.it")
    _forgot("partner@example.it")

    assert len(sent_emails) == 1, "due click ravvicinati devono produrre una sola email"


def test_dopo_il_cooldown_si_puo_richiedere(monkeypatch, sent_emails):
    vecchio = (datetime.now(timezone.utc) - timedelta(seconds=partner_setup.RESET_COOLDOWN_SECONDS + 10))
    db = FakeDb([_user(password_reset_requested_at=vecchio.isoformat())])
    monkeypatch.setattr(partner_setup, "db", db)

    _forgot("partner@example.it")

    assert len(sent_emails) == 1


# ─── Regressione: setup_password deve scrivere entrambi gli hash ─────────

def test_setup_password_scrive_entrambi_i_campi_hash(monkeypatch):
    """auth.py:211 legge `hashed_password` PRIMA di `password_hash`. Scrivendo
    solo il secondo, il partner imposta la password e resta comunque fuori."""
    db = FakeDb([_user(
        partner_setup_token="t" * 32,
        partner_setup_consumed_at=None,
    )])
    monkeypatch.setattr(partner_setup, "db", db)

    asyncio.run(partner_setup.setup_password(
        partner_setup.SetupPasswordRequest(token="t" * 32, new_password="nuova-password-1")
    ))

    user = db.users.docs[0]
    assert user["password_hash"] == user["hashed_password"]
    assert bcrypt.checkpw(b"nuova-password-1", user["hashed_password"].encode())
    assert "partner_setup_token" not in user
    assert user["partner_setup_consumed_at"] is not None
