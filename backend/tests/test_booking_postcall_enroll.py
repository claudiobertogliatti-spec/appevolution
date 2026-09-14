"""
Unit test: arruolamento post-call per il modello Blueprint GRATUITO.

A fine call (MEETING_ENDED → call_done) il webhook deve creare/aggiornare l'account
cliente e avviare in background la generazione+consegna dell'analisi Carlo — ciò che
prima faceva solo il webhook di pagamento. Non-bloccante: un errore non deve propagarsi.

Tutte le dipendenze (ciak_clients, magic-link, delivery) sono mockate: gira in CI.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import routers.booking as bk

pytestmark = pytest.mark.unit


class _BG:
    """Fake BackgroundTasks: registra i task schedulati."""

    def __init__(self):
        self.tasks = []

    def add_task(self, func, **kwargs):
        self.tasks.append((func, kwargs))


def _fake_db():
    db = MagicMock()
    db.ciak_clients.update_one = AsyncMock()
    return db


_DIAG = {
    "session_token": "tok-postcall",
    "user_email": "lead@ciak.it",
    "user_name": "Lead Test",
    "current_state": "call_done",
}


@pytest.mark.asyncio
async def test_enroll_crea_account_e_avvia_analisi(monkeypatch):
    monkeypatch.setattr(bk, "db", _fake_db())
    bg = _BG()
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})) as ensure, \
            patch("services.ciak_client_accounts.create_magic_login_token",
                  AsyncMock(return_value={"token": "tk", "expires_at": "2026-12-31"})), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()):
        await bk._enroll_client_post_call(dict(_DIAG), bg)

    ensure.assert_awaited_once()
    # l'analisi Carlo (processa_acquisto) è stata schedulata per il session_token giusto
    assert len(bg.tasks) == 1
    func, kwargs = bg.tasks[0]
    assert getattr(func, "__name__", "") == "processa_acquisto"
    assert kwargs["session_token"] == "tok-postcall"
    assert kwargs["email"] == "lead@ciak.it"
    # magic-link persistito sul cliente
    bk.db.ciak_clients.update_one.assert_awaited()


@pytest.mark.asyncio
async def test_enroll_non_solleva_se_ensure_fallisce(monkeypatch):
    monkeypatch.setattr(bk, "db", _fake_db())
    bg = _BG()
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(side_effect=RuntimeError("mongo down"))), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()):
        # non deve sollevare: il webhook Cal.com non va rotto
        await bk._enroll_client_post_call(dict(_DIAG), bg)
    # nessuna analisi schedulata (arruolamento fallito prima)
    assert bg.tasks == []


@pytest.mark.asyncio
async def test_enroll_avvia_analisi_anche_se_magic_link_fallisce(monkeypatch):
    """Il magic-link è secondario: se fallisce, l'analisi Carlo parte comunque."""
    monkeypatch.setattr(bk, "db", _fake_db())
    bg = _BG()
    with patch("services.ciak_client_accounts.ensure_client_for_blueprint",
               AsyncMock(return_value={"id": "c1", "email": "lead@ciak.it", "name": "Lead Test"})), \
            patch("services.ciak_client_accounts.create_magic_login_token",
                  AsyncMock(side_effect=RuntimeError("token svc down"))), \
            patch("services.ciak_analisi_delivery.set_db", MagicMock()):
        await bk._enroll_client_post_call(dict(_DIAG), bg)
    assert len(bg.tasks) == 1
    assert bg.tasks[0][1]["session_token"] == "tok-postcall"
