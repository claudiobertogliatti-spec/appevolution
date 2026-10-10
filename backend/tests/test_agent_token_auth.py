"""
Unit test: token tecnico dell'agente (agent_token_auth.py).

Il token lungo non deve MAI arrivare alle route, deve valere solo sullo scope
partner, e senza variabile d'ambiente non deve valere affatto (fail-closed).
Nessuna rete/Mongo: si chiama il middleware ASGI con un'app finta a valle.
"""
import json

import pytest

import agent_token_auth as agent

pytestmark = pytest.mark.unit

KEY = "k" * 40


@pytest.fixture(autouse=True)
def _key(monkeypatch):
    monkeypatch.setenv(agent.ENV_VAR, KEY)
    monkeypatch.setattr(agent, "_exchange_token", lambda: "JWT-SCAMBIATO")


# ─── scope (funzione pura) ─────────────────────────────────────────────────

@pytest.mark.parametrize("method,path", [
    ("GET", "/api/partners/4"),
    ("GET", "/api/partners"),
    ("GET", "/api/partner-hub/4"),
    ("PATCH", "/api/partner-hub/4/field"),
    ("GET", "/api/partner-journey/masterclass/video-status/4"),
    ("GET", "/api/admin/partner/4/full-data"),
    ("PATCH", "/api/admin/partner/4/journey"),
    ("PATCH", "/api/admin/partner/4/step/03-brand-kit"),
])
def test_scope_consente_dati_partner(method, path):
    assert agent.agent_scope_allows(path, method) is True


@pytest.mark.parametrize("method,path", [
    ("DELETE", "/api/partners/4"),                       # mai cancellare
    ("PATCH", "/api/partners/4"),                        # anagrafica in sola lettura
    ("POST", "/api/partners"),
    ("POST", "/api/partner-journey/notifiche/invia"),    # messaggi al partner
    ("POST", "/api/partner-journey/funnel/admin-unlock"),
    ("POST", "/api/partner-journey/funnel/publish"),
    ("POST", "/api/partner-journey/masterclass/reset-pipeline"),
    ("POST", "/api/partner-journey/posizionamento/generate"),
    ("POST", "/api/admin/partner/4/retrigger-video"),
    ("POST", "/api/partners/4/content-credits/reset"),
    ("GET", "/api/partners/4/payments"),                 # niente pagamenti
    ("POST", "/api/partners/4/payments"),
    ("POST", "/api/partners/4/segna-pagamento-partnership"),
    ("POST", "/api/partners/4/attiva-piano"),
    ("GET", "/api/partners-unified"),                    # prefisso a segmento intero
    ("GET", "/api/partnersX"),
    ("GET", "/api/ciak-admin/transactions"),             # fuori dallo scope partner
    ("GET", "/api/admin/ciak/leads"),
    ("GET", "/api/users"),
    ("POST", "/api/auth/register"),
    ("GET", "/api/admin/backfill-evolution-ids"),
    ("GET", "/healthz"),
])
def test_scope_nega_il_resto(method, path):
    assert agent.agent_scope_allows(path, method) is False


# ─── chiave ────────────────────────────────────────────────────────────────

def test_fail_closed_senza_variabile(monkeypatch):
    monkeypatch.delenv(agent.ENV_VAR)
    assert agent.is_agent_token(KEY) is False


def test_fail_closed_se_troppo_corta(monkeypatch):
    monkeypatch.setenv(agent.ENV_VAR, "corta")
    assert agent.is_agent_token("corta") is False


def test_header_non_ascii_non_va_in_errore():
    assert agent.is_agent_token("chiave-è-diversa-" + "x" * 30) is False


def test_chiave_sbagliata_o_vuota():
    assert agent.is_agent_token("x" * 40) is False
    assert agent.is_agent_token("") is False
    assert agent.is_agent_token(None) is False


# ─── middleware ────────────────────────────────────────────────────────────

class _Downstream:
    def __init__(self):
        self.scope = None

    async def __call__(self, scope, receive, send):
        self.scope = scope


async def _run(headers, path="/api/partners/4", method="GET"):
    down = _Downstream()
    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request"}

    scope = {"type": "http", "path": path, "method": method, "headers": headers}
    await agent.AgentTokenMiddleware(down)(scope, receive, send)
    return down, sent


async def test_scambia_il_token_e_non_lo_fa_arrivare_alle_route():
    down, sent = await _run([(b"authorization", f"Bearer {KEY}".encode())])
    assert sent == []
    seen = dict(down.scope["headers"])[b"authorization"]
    assert seen == b"Bearer JWT-SCAMBIATO"
    assert KEY.encode() not in seen


async def test_fuori_scope_403_e_non_arriva_alla_route():
    down, sent = await _run(
        [(b"authorization", f"Bearer {KEY}".encode())], path="/api/partners/4", method="DELETE"
    )
    assert down.scope is None
    assert sent[0]["status"] == 403
    body = json.loads(sent[1]["body"])
    assert body["detail"] == agent.AGENT_SCOPE_DETAIL


async def test_altri_token_passano_intatti():
    original = [(b"authorization", b"Bearer un.jwt.qualunque"), (b"x-a", b"1")]
    down, sent = await _run(list(original), path="/api/ciak-admin/transactions")
    assert sent == []
    assert down.scope["headers"] == original


async def test_senza_header_passa_intatto():
    down, sent = await _run([])
    assert sent == []
    assert down.scope["headers"] == []


async def test_senza_variabile_la_chiave_non_viene_scambiata(monkeypatch):
    monkeypatch.delenv(agent.ENV_VAR)
    down, _ = await _run([(b"authorization", f"Bearer {KEY}".encode())])
    assert dict(down.scope["headers"])[b"authorization"] == f"Bearer {KEY}".encode()


async def test_non_http_passa(monkeypatch):
    down = _Downstream()
    scope = {"type": "websocket", "path": "/api/partners/4", "headers": []}
    await agent.AgentTokenMiddleware(down)(scope, None, None)
    assert down.scope is scope
