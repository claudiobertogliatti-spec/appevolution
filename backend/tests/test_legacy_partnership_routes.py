from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import flusso_analisi

pytestmark = pytest.mark.unit


class RecordingCollection:
    def __init__(self):
        self.writes = []

    async def find_one(self, query, projection=None):
        return {"id": query.get("id"), "email": "existing@example.com"}

    async def update_one(self, *args, **kwargs):
        self.writes.append((args, kwargs))


class RecordingDb:
    def __init__(self):
        self.users = RecordingCollection()
        self.contratti_partnership = RecordingCollection()


@pytest.mark.asyncio
async def test_public_legacy_signature_is_retired_before_any_database_write(monkeypatch):
    fake_db = RecordingDb()
    monkeypatch.setattr(flusso_analisi, "db", fake_db)

    with pytest.raises(HTTPException) as err:
        await flusso_analisi.firma_contratto(
            flusso_analisi.FirmaContrattoRequest(
                user_id="existing-user",
                accettato=True,
                ip_address="audit",
            )
        )

    assert err.value.status_code == 410
    assert fake_db.users.writes == []
    assert fake_db.contratti_partnership.writes == []


@pytest.mark.asyncio
async def test_authenticated_legacy_signature_and_checkout_are_retired(monkeypatch):
    import server

    fake_db = SimpleNamespace(users=RecordingCollection())
    monkeypatch.setattr(server, "db", fake_db)
    credentials = SimpleNamespace(credentials="valid-token")
    monkeypatch.setattr(
        server,
        "decode_token",
        lambda _token: SimpleNamespace(user_id="existing-user"),
    )

    with pytest.raises(HTTPException) as signature_err:
        await server.firma_contratto_cliente(SimpleNamespace(), credentials)
    with pytest.raises(HTTPException) as checkout_err:
        await server.partnership_checkout(SimpleNamespace(), credentials)
    with pytest.raises(HTTPException) as bank_err:
        await server.partnership_bonifico(credentials)

    assert signature_err.value.status_code == 410
    assert checkout_err.value.status_code == 410
    assert bank_err.value.status_code == 410
    assert fake_db.users.writes == []
