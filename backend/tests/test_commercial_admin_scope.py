"""
Unit test: scope ristretto per account "commerciale" (oggi solo Mariangela).

Un account con admin_type in COMMERCIAL_ADMIN_TYPES è comunque role="admin" (stessa
autenticazione di Claudio/Antonella), ma deve poter toccare solo l'allowlist del
reparto Acquisizione — 403 default-deny su tutto il resto, anche chiamato
direttamente via API (non basta nascondere il link nel menu admin).

Copre le DUE dependency separate che un account così attraversa:
  - require_ciak_admin (routers/ciak_admin.py) — usata anche da discovery_engine,
    proposta, clienti e altri 8 router che la importano.
  - require_admin_or_internal (routers/ciak_clients.py) — dependency indipendente,
    stesso controllo replicato perché mescola blueprint-pdf (consentito, sola
    lettura) con consegna-blueprint e affini (vietati, territorio Vendite/Delivery).

Nessuna rete/Mongo: mock diretti, chiamata diretta alla funzione (stesso stile di
test_ciak_mark_call_booked.py).
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import routers.ciak_admin as admin_router
import routers.ciak_clients as clients_router
from routers.ciak_admin import _path_allowed_for_commercial, require_ciak_admin
from routers.ciak_clients import require_admin_or_internal

pytestmark = pytest.mark.unit


def _req(path):
    return SimpleNamespace(url=SimpleNamespace(path=path))


def _creds():
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake-token")


def _token(admin_type, role="admin"):
    return SimpleNamespace(role=role, admin_type=admin_type, email="x@evolution-pro.it", user_id="u1")


# ─── _path_allowed_for_commercial (funzione pura) ──────────────────────────

@pytest.mark.parametrize("path", [
    "/api/admin/ciak/acquisizione-command-center",
    "/api/admin/ciak/leads",
    "/api/admin/ciak/lead",
    "/api/admin/ciak/lead/mark-call-booked",
    "/api/admin/ciak/leads/abc123/contatta",
    "/api/admin/ciak/leads/abc123/avanza",
    "/api/admin/ciak/editorial/brands",
    "/api/admin/ciak/editorial/brands/brand-1",
    "/api/admin/ciak/editorial/contents/generate",
    "/api/admin/ciak/ads/overview",
    "/api/discovery/leads",
    "/api/discovery/leads/42",
    "/api/discovery/import-csv",
    "/api/ciak/client/admin/blueprint-pdf",
])
def test_path_allowed(path):
    assert _path_allowed_for_commercial(path) is True


@pytest.mark.parametrize("path", [
    "/api/admin/ciak/partners",
    "/api/admin/ciak/crediti/riepilogo",
    "/api/admin/ciak/invoices",
    "/api/admin/ciak/start/attiva",
    "/api/proposta/admin/genera-cliente",
    "/api/ciak/client/admin/consegna-blueprint",
    "/api/ciak/client/admin/consegna-manuale",
    "/api/ciak/client/admin/offer-decision",
    "/api/ciak/client/start/activate",
])
def test_path_not_allowed(path):
    assert _path_allowed_for_commercial(path) is False


# ─── require_ciak_admin ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ciak_admin_mariangela_su_path_consentito(monkeypatch):
    monkeypatch.setattr("auth.decode_token", lambda _t: _token("mariangela"))
    data = await require_ciak_admin(_req("/api/admin/ciak/leads"), _creds())
    assert data.admin_type == "mariangela"


@pytest.mark.asyncio
async def test_ciak_admin_mariangela_su_path_vietato(monkeypatch):
    monkeypatch.setattr("auth.decode_token", lambda _t: _token("mariangela"))
    with pytest.raises(HTTPException) as exc:
        await require_ciak_admin(_req("/api/admin/ciak/partners"), _creds())
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_ciak_admin_claudio_nessuna_restrizione(monkeypatch):
    monkeypatch.setattr("auth.decode_token", lambda _t: _token("claudio"))
    data = await require_ciak_admin(_req("/api/admin/ciak/partners"), _creds())
    assert data.admin_type == "claudio"


# ─── require_admin_or_internal (routers/ciak_clients.py) ───────────────────

@pytest.mark.asyncio
async def test_clients_mariangela_blueprint_pdf_consentito(monkeypatch):
    monkeypatch.setattr(clients_router, "decode_token", lambda _t: _token("mariangela"))
    result = await require_admin_or_internal(
        _req("/api/ciak/client/admin/blueprint-pdf"), None, _creds()
    )
    assert result["auth_type"] == "admin"


@pytest.mark.asyncio
async def test_clients_mariangela_consegna_blueprint_vietato(monkeypatch):
    monkeypatch.setattr(clients_router, "decode_token", lambda _t: _token("mariangela"))
    with pytest.raises(HTTPException) as exc:
        await require_admin_or_internal(
            _req("/api/ciak/client/admin/consegna-blueprint"), None, _creds()
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_clients_claudio_nessuna_restrizione(monkeypatch):
    monkeypatch.setattr(clients_router, "decode_token", lambda _t: _token("claudio"))
    result = await require_admin_or_internal(
        _req("/api/ciak/client/admin/consegna-blueprint"), None, _creds()
    )
    assert result["auth_type"] == "admin"


@pytest.mark.asyncio
async def test_clients_internal_key_bypassa_lo_scope(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "shh")
    result = await require_admin_or_internal(
        _req("/api/ciak/client/admin/consegna-blueprint"), "shh", None
    )
    assert result["auth_type"] == "internal"
