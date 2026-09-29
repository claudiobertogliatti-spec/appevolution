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


# ─── 29/9/2026: lo scope deve valere col token VERO del login ──────────────
# Prima di questa data il JWT emesso da AuthService.login non conteneva
# admin_type: tutti i test sopra passavano (usano un token finto) mentre in
# produzione le guardie non scattavano mai.

class _Users:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return dict(d)
        return None


@pytest.mark.asyncio
async def test_il_login_vero_mette_admin_type_nel_token(monkeypatch):
    import auth

    user = {"id": "u-m", "email": "mariangela@example.test", "name": "Mariangela", "role": "admin",
            "admin_type": "mariangela", "hashed_password": auth.get_password_hash("pw-test"),
            "is_active": True}
    service = auth.AuthService.__new__(auth.AuthService)
    monkeypatch.setattr(service, "get_user_by_email", AsyncMock(return_value=user), raising=False)
    monkeypatch.setattr(service, "authenticate_user", AsyncMock(return_value=user), raising=False)

    token = await service.login(user["email"], "pw-test")
    data = auth.decode_token(token.access_token)
    assert data.admin_type == "mariangela"


@pytest.mark.asyncio
async def test_token_vecchio_senza_admin_type_legge_il_tipo_dal_database(monkeypatch):
    monkeypatch.setattr(admin_router, "db", SimpleNamespace(users=_Users([{"id": "u1", "admin_type": "mariangela"}])))
    monkeypatch.setattr("auth.decode_token", lambda _t: _token(None))
    with pytest.raises(HTTPException) as exc:
        await require_ciak_admin(_req("/api/admin/ciak/partners"), _creds())
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_pieno_senza_admin_type_passa(monkeypatch):
    monkeypatch.setattr(admin_router, "db", SimpleNamespace(users=_Users([{"id": "u1"}])))
    monkeypatch.setattr("auth.decode_token", lambda _t: _token(None))
    data = await require_ciak_admin(_req("/api/admin/ciak/partners"), _creds())
    assert data.role == "admin"


def test_commerciale_non_puo_eliminare_un_lead():
    assert _path_allowed_for_commercial("/api/admin/ciak/lead", "GET") is True
    assert _path_allowed_for_commercial("/api/admin/ciak/lead", "PATCH") is True
    assert _path_allowed_for_commercial("/api/admin/ciak/lead", "DELETE") is False


@pytest.mark.asyncio
async def test_analisi_admin_rispetta_lo_scope_commerciale(monkeypatch):
    import routers.ciak_analisi_admin as analisi_admin

    monkeypatch.setattr("auth.decode_token", lambda _t: _token("mariangela"))
    req = SimpleNamespace(url=SimpleNamespace(path="/api/admin/ciak/analisi/genera/tok"), method="POST")
    with pytest.raises(HTTPException) as exc:
        await analisi_admin.require_ciak_admin(req, _creds())
    assert exc.value.status_code == 403


# ─── Nessun endpoint discovery / vecchio flusso €67 aperto agli estranei ───

def _dependency_names(route):
    names = set()
    stack = list(route.dependant.dependencies)
    while stack:
        dep = stack.pop()
        if dep.call is not None:
            names.add(getattr(dep.call, "__name__", ""))
        stack.extend(dep.dependencies)
    return names


def test_ogni_endpoint_discovery_richiede_un_admin_o_la_chiave():
    from fastapi.routing import APIRoute
    import routers.discovery_engine as de

    aperti = [
        f"{sorted(r.methods)} {r.path}"
        for r in de.router.routes
        if isinstance(r, APIRoute)
        and not ({"require_ciak_admin", "require_admin_or_report_key"} & _dependency_names(r))
    ]
    assert aperti == []


def test_pulizia_duplicati_solo_admin_e_mai_al_commerciale():
    from fastapi.routing import APIRoute
    import routers.discovery_engine as de

    route = next(r for r in de.router.routes
                 if isinstance(r, APIRoute) and r.path.endswith("/worker/cleanup-duplicates"))
    names = _dependency_names(route)
    assert "require_ciak_admin" in names
    assert "require_admin_or_report_key" not in names  # la chiave report è di sola lettura
    assert _path_allowed_for_commercial("/api/discovery/worker/cleanup-duplicates", "POST") is False


@pytest.mark.parametrize("modulo", ["routers.clienti", "routers.flusso_analisi", "routers.analisi_consulenziale"])
def test_router_vecchio_flusso_67_chiusi(modulo):
    import importlib
    from fastapi.routing import APIRoute

    mod = importlib.import_module(modulo)
    # flusso_analisi: admin oppure X-Internal-Key (chiamate interne ad attiva-partnership)
    guardie = {"require_ciak_admin", "_require_ciak_admin_or_internal_key"}
    aperti = [r.path for r in mod.router.routes
              if isinstance(r, APIRoute) and not (guardie & _dependency_names(r))]
    assert aperti == []


def test_job_notturno_di_deduplica_spento():
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[1].joinpath("scheduler.py").read_text(encoding="utf-8")
    assert 'id="discovery_cleanup"' not in src


def test_promemoria_vecchio_flusso_67_spento():
    from celery_app import celery_app as app
    assert "check-pending-analisi-reminders" not in (app.conf.beat_schedule or {})


# ─── 30/9/2026: filtro unico su tutto /api (CommercialScopeMiddleware) ─────
# Le dependency sopra coprivano solo 3 guardie: con il token vero Mariangela
# entrava ancora in crediti/riepilogo (require_admin_or_report_key), template
# email e partner (require_admin_role di server.py), chat di Luca, ecc.
# Qui le route NON hanno guardie: se il filtro non c'è, rispondono 200.

def _jwt(admin_type=None, role="admin", sub="u-m"):
    import auth
    payload = {"sub": sub, "email": "x@example.test", "role": role}
    if admin_type:
        payload["admin_type"] = admin_type
    return auth.create_access_token(data=payload)


def _client_con_filtro():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from starlette.middleware.cors import CORSMiddleware
    from routers.ciak_admin import CommercialScopeMiddleware

    app = FastAPI()
    app.add_middleware(CommercialScopeMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=["https://ciak.io"],
                       allow_methods=["*"], allow_headers=["*"])
    for method, path in [
        ("GET", "/api/admin/ciak/crediti/riepilogo"),
        ("GET", "/api/admin/ciak/leads"),
        ("GET", "/api/admin/ciak/partners"),
        ("DELETE", "/api/admin/ciak/lead"),
        ("PUT", "/api/admin/email-templates/partnership_welcome"),
        ("POST", "/api/partner-journey/operativo/admin/set-status/p1/s1"),
        ("POST", "/api/discovery/worker/cleanup-duplicates"),
    ]:
        app.add_api_route(path, lambda: {"ok": True}, methods=[method])
    return TestClient(app)


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("method,path", [
    ("GET", "/api/admin/ciak/crediti/riepilogo"),
    ("GET", "/api/admin/ciak/partners"),
    ("DELETE", "/api/admin/ciak/lead"),
    ("PUT", "/api/admin/email-templates/partnership_welcome"),
    ("POST", "/api/partner-journey/operativo/admin/set-status/p1/s1"),
    ("POST", "/api/discovery/worker/cleanup-duplicates"),
])
def test_filtro_nega_al_commerciale_qualunque_guardia_abbia_la_route(method, path):
    r = _client_con_filtro().request(method, path, headers=_bearer(_jwt("mariangela")))
    assert r.status_code == 403
    assert r.json()["detail"] == admin_router.COMMERCIAL_SCOPE_DETAIL


def test_filtro_lascia_passare_l_allowlist_al_commerciale():
    r = _client_con_filtro().get("/api/admin/ciak/leads", headers=_bearer(_jwt("mariangela")))
    assert r.status_code == 200


@pytest.mark.parametrize("admin_type", ["claudio", "antonella"])
def test_filtro_non_tocca_gli_altri_admin(admin_type):
    client = _client_con_filtro()
    for method, path in [("GET", "/api/admin/ciak/crediti/riepilogo"),
                         ("PUT", "/api/admin/email-templates/partnership_welcome"),
                         ("DELETE", "/api/admin/ciak/lead")]:
        assert client.request(method, path, headers=_bearer(_jwt(admin_type))).status_code == 200


def test_filtro_non_decide_per_chi_non_e_admin():
    # Senza token, token non validi o di un partner: decide la dependency della
    # route (qui assente), il filtro non aggiunge né toglie nulla.
    client = _client_con_filtro()
    assert client.get("/api/admin/ciak/partners").status_code == 200
    assert client.get("/api/admin/ciak/partners", headers=_bearer("non-un-jwt")).status_code == 200
    assert client.get("/api/admin/ciak/partners",
                      headers=_bearer(_jwt("mariangela", role="partner"))).status_code == 200


def test_filtro_non_si_aggira_con_un_host_manipolato():
    client = _client_con_filtro()
    token = _bearer(_jwt("mariangela"))
    for host in ("testserver/api/admin/ciak/leads?", "testserver/api/admin/ciak/leads#"):
        r = client.get("/api/admin/ciak/partners", headers={**token, "Host": host})
        assert r.status_code == 403, host


@pytest.mark.asyncio
async def test_dependency_usa_il_path_del_router_non_quello_dell_url(monkeypatch):
    monkeypatch.setattr("auth.decode_token", lambda _t: _token("mariangela"))
    req = SimpleNamespace(scope={"path": "/api/admin/ciak/partners"},
                          url=SimpleNamespace(path="/api/admin/ciak/leads"), method="GET")
    with pytest.raises(HTTPException) as exc:
        await require_ciak_admin(req, _creds())
    assert exc.value.status_code == 403


def test_il_403_del_filtro_porta_gli_header_cors():
    r = _client_con_filtro().get(
        "/api/admin/ciak/partners",
        headers={**_bearer(_jwt("mariangela")), "Origin": "https://ciak.io"},
    )
    assert r.status_code == 403
    assert r.headers.get("access-control-allow-origin") == "https://ciak.io"


def test_filtro_token_vecchio_senza_admin_type_legge_il_database(monkeypatch):
    monkeypatch.setattr(admin_router, "db",
                        SimpleNamespace(users=_Users([{"id": "u-old", "admin_type": "mariangela"}])))
    r = _client_con_filtro().get("/api/admin/ciak/partners", headers=_bearer(_jwt(None, sub="u-old")))
    assert r.status_code == 403


def test_filtro_database_giu_non_apre_l_accesso(monkeypatch):
    class _Rotto:
        async def find_one(self, *_a, **_k):
            raise RuntimeError("mongo giù")

    monkeypatch.setattr(admin_router, "db", SimpleNamespace(users=_Rotto()))
    r = _client_con_filtro().get("/api/admin/ciak/partners", headers=_bearer(_jwt(None, sub="u-x")))
    assert r.status_code == 503


def test_server_monta_il_filtro_dentro_il_cors():
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[1].joinpath("server.py").read_text(encoding="utf-8")
    filtro = src.index("app.add_middleware(CommercialScopeMiddleware)")
    cors = src.index("app.add_middleware(\n    CORSMiddleware")
    # Starlette: l'ultimo add_middleware è il più esterno → il CORS va dopo.
    assert filtro < cors


# ─── Vie pubbliche del vecchio flusso €67 in server.py ──────────────────────

@pytest.mark.parametrize("funzione", [
    "register_cliente_analisi",
    "create_analisi_checkout",
    "verify_analisi_payment",
    "get_cliente_analisi_status",
    "save_questionario_cliente",
    # letture che accettavano un header Authorization qualsiasi, anche finto
    "get_analisi_output",
    "download_analisi_pdf",
    "get_client_contract_text",
    "get_personal_data",
    "get_client_documents",
    "get_stato_cliente",
])
def test_vie_pubbliche_flusso_67_rispondono_410(funzione):
    import ast
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[1].joinpath("server.py").read_text(encoding="utf-8")
    fn = next(n for n in ast.walk(ast.parse(src))
              if isinstance(n, ast.AsyncFunctionDef) and n.name == funzione)
    body = fn.body[1:] if isinstance(fn.body[0], ast.Expr) and isinstance(fn.body[0].value, ast.Constant) else fn.body
    primo = body[0]
    assert isinstance(primo, ast.Expr) and isinstance(primo.value, ast.Call)
    assert getattr(primo.value.func, "id", None) == "_analisi_67_dismessa"


# ─── attiva-partnership: la chiave interna del backend passa ancora ─────────

@pytest.mark.asyncio
async def test_flusso_analisi_accetta_la_chiave_interna(monkeypatch):
    import routers.flusso_analisi as fa

    monkeypatch.setenv("INTERNAL_API_KEY", "k-test")
    req = _req("/api/flusso-analisi/attiva-partnership/u1")
    assert await fa._require_ciak_admin_or_internal_key(req, "k-test", None) is None
    with pytest.raises(HTTPException) as exc:
        await fa._require_ciak_admin_or_internal_key(req, "sbagliata", None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_flusso_analisi_senza_chiave_configurata_nessuna_scorciatoia(monkeypatch):
    import routers.flusso_analisi as fa

    monkeypatch.delenv("INTERNAL_API_KEY", raising=False)
    with pytest.raises(HTTPException) as exc:
        await fa._require_ciak_admin_or_internal_key(_req("/api/flusso-analisi/x"), "", None)
    assert exc.value.status_code == 401


def test_attiva_partnership_con_chiave_interna_supera_tutte_le_guardie(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    import routers.flusso_analisi as fa

    monkeypatch.setenv("INTERNAL_API_KEY", "k-test")
    app = FastAPI()
    app.include_router(fa.router)
    client = TestClient(app, raise_server_exceptions=False)
    assert client.post("/api/flusso-analisi/attiva-partnership/u1").status_code == 401
    r = client.post("/api/flusso-analisi/attiva-partnership/u1", headers={"X-Internal-Key": "k-test"})
    assert r.status_code not in (401, 403)


# ─── Revisione mirata 30/9: "a capo" in fondo al path, audio solo admin ─────

@pytest.mark.parametrize("path", [
    "/api/discovery/worker/cleanup-duplicates\n",
    "/api/admin/ciak/leads/abc/contatta\n",
    "/api/discovery/leads\r",
    "/api/admin/ciak/leads\x7f",
])
def test_path_con_caratteri_di_controllo_mai_consentito(path):
    assert _path_allowed_for_commercial(path, "POST") is False
    assert _path_allowed_for_commercial(path, "GET") is False


@pytest.mark.parametrize("suffisso", ["%0A", "%0a"])
def test_filtro_non_si_aggira_con_un_a_capo_in_fondo(suffisso):
    # Le regex delle route Starlette finiscono con "$", che accetta un "\n"
    # finale: senza il controllo, cleanup-duplicates%0A arrivava all'handler.
    r = _client_con_filtro().post(
        "/api/discovery/worker/cleanup-duplicates" + suffisso,
        headers=_bearer(_jwt("mariangela")),
    )
    assert r.status_code == 403


def test_audio_analisi_solo_con_token_admin_valido():
    import ast
    import pathlib
    src = pathlib.Path(__file__).resolve().parents[1].joinpath("server.py").read_text(encoding="utf-8")
    fn = next(n for n in ast.walk(ast.parse(src))
              if isinstance(n, ast.AsyncFunctionDef) and n.name == "get_audio_analisi")
    guardie = [getattr(d.func, "id", None) for d in fn.args.defaults if isinstance(d, ast.Call)]
    assert guardie == ["Depends"]
    assert fn.args.defaults[0].args[0].id == "require_admin_role"


@pytest.mark.asyncio
async def test_flusso_analisi_chiave_assente_e_header_vuoto_resta_chiuso(monkeypatch):
    # Com'è oggi in produzione (30/9: INTERNAL_API_KEY non impostata): le
    # chiamate interne mandano un header vuoto e devono prendere 401, non passare.
    import routers.flusso_analisi as fa

    monkeypatch.delenv("INTERNAL_API_KEY", raising=False)
    with pytest.raises(HTTPException) as exc:
        await fa._require_ciak_admin_or_internal_key(
            _req("/api/flusso-analisi/attiva-partnership/u1"), "", None)
    assert exc.value.status_code == 401
