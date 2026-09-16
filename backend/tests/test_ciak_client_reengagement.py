"""
Re-engagement area cliente (ponte Partnership): "rimandami l'accesso" + richiamo
quando un deliverable e' pronto. SMTP e magic-link mockati; le funzioni non sollevano.
"""
import pytest

from services import ciak_client_reengagement as reeng

pytestmark = pytest.mark.unit


class _Coll:
    def __init__(self, docs):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, q):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return dict(d)
        return None


class _Db:
    def __init__(self, docs):
        self.ciak_clients = _Coll(docs)


CLIENT = {"id": "c1", "email": "linda@x.it", "name": "Linda Pavia"}


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    async def _tok(db, cid, email):
        return {"token": "T"}
    monkeypatch.setattr(reeng, "create_magic_login_token", _tok)
    sent = []
    monkeypatch.setattr(reeng, "_send",
                        lambda email, nome, subject, corpo, link: sent.append({"to": email, "subject": subject, "link": link}) or True)
    return sent


@pytest.mark.asyncio
async def test_rimandami_accesso_invia_se_cliente_esiste(_patch):
    ok = await reeng.invia_link_accesso(_Db([CLIENT]), "Linda@x.it")
    assert ok is True
    assert _patch[0]["to"] == "linda@x.it"
    assert "token=T" in _patch[0]["link"]


@pytest.mark.asyncio
async def test_rimandami_accesso_silenzioso_se_non_esiste(_patch):
    ok = await reeng.invia_link_accesso(_Db([]), "ignoto@x.it")
    assert ok is False
    assert _patch == []  # nessuna email, nessun leak


@pytest.mark.asyncio
async def test_email_senza_chiocciola_scartata(_patch):
    assert await reeng.invia_link_accesso(_Db([CLIENT]), "non-una-email") is False
    assert _patch == []


@pytest.mark.asyncio
async def test_deliverable_pronto_usa_etichetta_leggibile(_patch):
    ok = await reeng.invia_deliverable_pronto(_Db([CLIENT]), "c1", "social_profiles")
    assert ok is True
    assert "profili social" in _patch[0]["subject"]


@pytest.mark.asyncio
async def test_endpoint_request_access_risponde_sempre_ok(monkeypatch):
    from routers import ciak_clients
    monkeypatch.setattr(ciak_clients, "db", _Db([CLIENT]))
    called = {}

    async def _fake(db, email):
        called["email"] = email
        return False  # anche se False, l'endpoint risponde ok
    monkeypatch.setattr(reeng, "invia_link_accesso", _fake)
    res = await ciak_clients.request_access(ciak_clients.RequestAccessRequest(email="chiunque@x.it"))
    assert res["ok"] is True
    assert called["email"] == "chiunque@x.it"
