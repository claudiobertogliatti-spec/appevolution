"""Come un cliente Ciak Start supera la guardia dell'area partner.

Scelta di design (opzione B): NON si emette un token `role="partner"` al
magic-login. Un token partner aprirebbe *tutte* le guardie dell'area partner a
un cliente da 499 EUR — comprese le 23 chiuse l'11/8. Si estende invece la
guardia condivisa perche' accetti anche il token cliente, ma solo:
  - se il token e' un `ciak_client` valido,
  - se `sub` e' esattamente il partner_id richiesto (mai un altro),
  - se il cliente ha davvero l'entitlement Ciak Start.

La guardia e' condivisa da tutta l'area partner: meta' di questo file sono
regressioni sui partner reali, che devono comportarsi esattamente come prima.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from auth import create_access_token
from routers import partner_journey

pytestmark = pytest.mark.unit


def _client_secret() -> str:
    return (
        os.environ.get("JWT_SECRET")
        or os.environ.get("SECRET_KEY")
        or os.environ.get("JWT_SECRET_KEY")
    )


def _client_token(client_id: str, email: str = "marta@example.com", access_level: str = "cliente_start") -> str:
    """Stesso payload emesso da `ciak_clients._create_client_jwt`."""
    return jwt.encode(
        {
            "sub": client_id,
            "email": email,
            "role": "ciak_client",
            "access_level": access_level,
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        _client_secret(),
        algorithm="HS256",
    )


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _partner_creds(user_id: str, email: str, role: str) -> HTTPAuthorizationCredentials:
    return _creds(create_access_token({"sub": user_id, "email": email, "role": role}))


class _FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None


class _FakeDb:
    def __init__(self, users=None, clients=None, partners=None):
        self.users = _FakeCollection(users)
        self.ciak_clients = _FakeCollection(clients)
        self.partners = _FakeCollection(partners)


START_CLIENT_ID = "client-start-1"
START_CLIENT = {
    "id": START_CLIENT_ID,
    "email": "marta@example.com",
    "access_level": "cliente_start",
    "start_purchased_at": "2026-08-12T10:00:00+00:00",
}
BLUEPRINT_CLIENT = {
    "id": "client-bp",
    "email": "bp@example.com",
    "access_level": "cliente_blueprint",
}


@pytest.fixture(autouse=True)
def _restore_db():
    old = partner_journey.db
    yield
    partner_journey.db = old


# ─── cliente Start ─────────────────────────────────────────────────────────────


async def test_cliente_start_entra_sul_proprio_id():
    partner_journey.db = _FakeDb(clients=[START_CLIENT])

    token_data = await partner_journey.require_partner_or_admin_for_partner(
        START_CLIENT_ID, _creds(_client_token(START_CLIENT_ID))
    )

    assert token_data.user_id == START_CLIENT_ID


async def test_cliente_start_non_entra_su_un_altro_partner():
    """Il perimetro resta chiuso: nessun cliente puo' leggere il posizionamento
    di un partner reale passando il suo id nell'URL."""
    partner_journey.db = _FakeDb(clients=[START_CLIENT])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "13", _creds(_client_token(START_CLIENT_ID))
        )

    assert exc.value.status_code == 403


async def test_cliente_blueprint_non_entra_nemmeno_sul_proprio_id():
    """Chi ha pagato 27 EUR non ha comprato il percorso: 403, non 200."""
    partner_journey.db = _FakeDb(clients=[BLUEPRINT_CLIENT])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "client-bp", _creds(_client_token("client-bp", "bp@example.com", "cliente_blueprint"))
        )

    assert exc.value.status_code == 403


async def test_token_cliente_di_un_client_inesistente_non_entra():
    partner_journey.db = _FakeDb(clients=[])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "client-fantasma", _creds(_client_token("client-fantasma"))
        )

    assert exc.value.status_code in (401, 403)


async def test_token_cliente_scaduto_non_entra():
    partner_journey.db = _FakeDb(clients=[START_CLIENT])
    scaduto = jwt.encode(
        {
            "sub": START_CLIENT_ID,
            "role": "ciak_client",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        _client_secret(),
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            START_CLIENT_ID, _creds(scaduto)
        )

    assert exc.value.status_code in (401, 403)


async def test_token_cliente_firmato_male_non_entra():
    partner_journey.db = _FakeDb(clients=[START_CLIENT])
    falso = jwt.encode(
        {"sub": START_CLIENT_ID, "role": "ciak_client",
         "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        "secret-che-non-e-il-nostro-e-abbastanza-lungo",
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            START_CLIENT_ID, _creds(falso)
        )

    assert exc.value.status_code in (401, 403)


# ─── regressioni sui partner reali (26 in produzione) ──────────────────────────


async def test_regressione_partner_entra_sul_proprio_id():
    partner_journey.db = _FakeDb(users=[{"id": "u1", "role": "partner", "partner_id": "p1"}])

    token_data = await partner_journey.require_partner_or_admin_for_partner(
        "p1", _partner_creds("u1", "p1@example.com", "partner")
    )

    assert token_data.user_id == "u1"


async def test_regressione_partner_bloccato_su_un_altro_partner():
    partner_journey.db = _FakeDb(users=[{"id": "u1", "role": "partner", "partner_id": "p1"}])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "p2", _partner_creds("u1", "p1@example.com", "partner")
        )

    assert exc.value.status_code == 403


async def test_regressione_admin_entra_su_qualsiasi_partner():
    partner_journey.db = _FakeDb()

    token_data = await partner_journey.require_partner_or_admin_for_partner(
        "p2", _partner_creds("admin1", "admin@example.com", "admin")
    )

    assert token_data.role == "admin"


async def test_regressione_senza_token_resta_401():
    partner_journey.db = _FakeDb()

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner("p1", None)

    assert exc.value.status_code == 401


async def test_regressione_token_spazzatura_resta_401():
    partner_journey.db = _FakeDb()

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner("p1", _creds("non-un-jwt"))

    assert exc.value.status_code == 401


async def test_regressione_ruolo_estraneo_resta_403():
    """Un token valido con un ruolo che non c'entra (es. `cliente`) continua a
    prendere 403, non deve cadere nel ramo Start."""
    partner_journey.db = _FakeDb(users=[{"id": "u9", "role": "cliente"}])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "p1", _partner_creds("u9", "tizio@example.com", "cliente")
        )

    assert exc.value.status_code == 403


async def test_regressione_partner_senza_record_users_resta_404():
    partner_journey.db = _FakeDb(users=[])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_partner_or_admin_for_partner(
            "p1", _partner_creds("u-sconosciuto", "x@example.com", "partner")
        )

    assert exc.value.status_code == 404


# ─── gate min_tier sugli step ──────────────────────────────────────────────────


async def test_start_bloccato_sugli_step_della_partnership():
    partner_journey.db = _FakeDb(partners=[{"id": START_CLIENT_ID, "tier": "start"}])

    with pytest.raises(HTTPException) as exc:
        await partner_journey.require_step_for_partner_tier(START_CLIENT_ID, "05-script-masterclass")

    assert exc.value.status_code == 403


async def test_start_ammesso_sui_propri_step():
    partner_journey.db = _FakeDb(partners=[{"id": START_CLIENT_ID, "tier": "start"}])

    await partner_journey.require_step_for_partner_tier(START_CLIENT_ID, "04-posizionamento")
    await partner_journey.require_step_for_partner_tier(START_CLIENT_ID, "start-vetrina")


async def test_partner_senza_tier_non_viene_limitato():
    """I 26 partner in produzione non hanno il campo `tier`: questo gate non
    deve toccarli."""
    partner_journey.db = _FakeDb(partners=[{"id": "13", "name": "Cosimo"}])

    await partner_journey.require_step_for_partner_tier("13", "13-lancio")


async def test_partner_inesistente_non_viene_limitato():
    partner_journey.db = _FakeDb(partners=[])

    await partner_journey.require_step_for_partner_tier("chiunque", "13-lancio")
