"""Identita' canonica del cliente lungo il percorso Blueprint -> Partnership.

Il percorso commerciale documentato e': Blueprint EUR 27 -> analisi -> call ->
Partnership EUR 2.790. Il Blueprint crea SOLO un record in `ciak_clients`
(services/ciak_client_accounts.py non tocca mai `db.users`) e nessun endpoint
scrive `ciak_clients.user_id`.

Conseguenza prima di questa correzione: `resolve_canonical_client_identity`
ripiegava sull'id di `ciak_clients`, la proposta nasceva con
`partner_id = <id ciak_clients>`, e alla finalizzazione del pagamento
`db.users.update_one({"id": partner_id})` non aggiornava nulla (nessun upsert).
`_activate_partner_account_and_notify` usciva con un warning, l'effetto veniva
marcato "done" e la risposta era `success: true`.

Risultato: cliente che paga EUR 2.790, `partners` attivo, nessun account,
nessun magic link, nessuna email — e invisibile anche in
`/api/admin/ciak/partner-setup-pending`, che filtra su `users.role`.

Questi test bloccano quel percorso.
"""
import importlib.util
from pathlib import Path

import pytest
from fastapi import HTTPException

from tests.test_proposta_security import FakeCollection


MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "proposta.py"
SPEC = importlib.util.spec_from_file_location("proposta_identity_under_test", MODULE_PATH)
proposta = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(proposta)

pytestmark = pytest.mark.unit


class IdentityDb:
    """Solo le collection toccate dalla risoluzione dell'identita'."""

    def __init__(self, clients=None, users=None):
        self.ciak_clients = FakeCollection(clients or [])
        self.users = FakeCollection(users or [])


BLUEPRINT_ONLY = [
    {"id": "client-blueprint-1", "email": "mario@example.com", "name": "Mario Bianchi"}
]


@pytest.fixture
def blueprint_client(monkeypatch):
    db = IdentityDb(clients=BLUEPRINT_ONLY)
    monkeypatch.setattr(proposta, "db", db)
    return db


@pytest.mark.asyncio
async def test_blueprint_client_gets_a_real_user_record(blueprint_client):
    """Il cliente nato dal Blueprint non ha `users`: va creato, non aggirato."""
    identity = await proposta.resolve_canonical_client_identity("mario@example.com")

    user = await blueprint_client.users.find_one({"email": "mario@example.com"})
    assert user is not None, "nessun record users creato: il partner non potra' entrare"
    assert identity["canonical_id"] == user["id"]
    assert identity["user_id"] == user["id"]
    # Senza questo, la proposta punterebbe all'id di ciak_clients.
    assert identity["canonical_id"] != "client-blueprint-1"


@pytest.mark.asyncio
async def test_client_record_is_linked_to_the_user(blueprint_client):
    """Il legame va persistito, altrimenti si ricrea un utente a ogni giro."""
    identity = await proposta.resolve_canonical_client_identity("mario@example.com")

    client = await blueprint_client.ciak_clients.find_one({"id": "client-blueprint-1"})
    assert identity["user_id"], "identita' senza user_id: il legame non esiste"
    assert client.get("user_id") == identity["user_id"]


@pytest.mark.asyncio
async def test_resolution_is_idempotent(blueprint_client):
    """Due chiamate non devono produrre due utenti per la stessa email."""
    first = await proposta.resolve_canonical_client_identity("mario@example.com")
    second = await proposta.resolve_canonical_client_identity("mario@example.com")

    assert first["canonical_id"] == second["canonical_id"]
    assert len(blueprint_client.users.docs) == 1


@pytest.mark.asyncio
async def test_existing_user_is_reused_and_not_duplicated(monkeypatch):
    """Chi ha gia' un account (es. registrato) mantiene il suo id."""
    db = IdentityDb(
        clients=[{"id": "client-2", "email": "luca@example.com"}],
        users=[{"id": "user-existing", "email": "luca@example.com", "role": "partner"}],
    )
    monkeypatch.setattr(proposta, "db", db)

    identity = await proposta.resolve_canonical_client_identity("luca@example.com")

    assert identity["canonical_id"] == "user-existing"
    assert len(db.users.docs) == 1


@pytest.mark.asyncio
async def test_unknown_email_is_still_rejected(monkeypatch):
    """Nessun cliente => 404. La creazione vale solo per chi ha gia' comprato."""
    monkeypatch.setattr(proposta, "db", IdentityDb())

    with pytest.raises(HTTPException) as err:
        await proposta.resolve_canonical_client_identity("sconosciuto@example.com")

    assert err.value.status_code == 404


@pytest.mark.asyncio
async def test_activation_fails_loudly_when_user_is_missing(monkeypatch):
    """Difesa in profondita': mai marcare "done" un'attivazione non avvenuta.

    Se per qualsiasi ragione il record users non c'e', la finalizzazione deve
    sollevare: lo stato per-effetto la rende ritentabile e l'errore resta
    visibile. Un `return` silenzioso e' esattamente il fallimento invisibile
    che questo percorso non puo' permettersi.
    """
    monkeypatch.setattr(proposta, "db", IdentityDb())

    with pytest.raises(HTTPException) as err:
        await proposta._activate_partner_account_and_notify(
            "partner-inesistente", "nessuno@example.com", "Nessuno"
        )

    assert err.value.status_code >= 400
