"""
Sicurezza di /api/stefania/*: prima erano endpoint aperti. Un partner puo' scrivere solo per se'
stesso; storico conversazioni ed escalation sono solo admin. Token e DB finti, nessuna rete.

Trucco per provare «e' passato oltre l'auth» senza chiamare il modello: senza chiave Anthropic la
chat risponde 500 «ANTHROPIC_API_KEY non configurata» DOPO l'autenticazione. Un 401/403 invece
significa che l'auth l'ha fermata prima di leggere qualunque dato.
"""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import auth
from routers import partner_journey
from routers import stefania_chat as sc

pytestmark = pytest.mark.unit

TOKENS = {
    "tok-sarah": SimpleNamespace(role="partner", user_id="u-sarah", email="s@x.it"),
    "tok-altro": SimpleNamespace(role="partner", user_id="u-altro", email="a@x.it"),
    "tok-admin": SimpleNamespace(role="admin", user_id="u-admin", email="c@x.it"),
}


class _Coll:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]
        self.updates = []

    async def find_one(self, q, projection=None):
        return next((dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)

    async def update_one(self, q, upd, upsert=False):
        self.updates.append((q, upd))

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    def find(self, q, projection=None):
        outer = self

        class _C:
            def sort(self, *a):
                return self

            async def to_list(self, length):
                return [dict(d) for d in outer.docs]

        return _C()


class _Db:
    def __init__(self):
        self.users = _Coll([{"id": "u-sarah", "partner_id": "p-sarah"}, {"id": "u-altro", "partner_id": "p-altro"}])
        self.stefania_conversations = _Coll([{"partner_id": "p-sarah", "messages": [{"role": "user", "content": "privato"}]}])
        self.stefania_escalations = _Coll([{"id": "e1", "partner_id": "p-sarah", "status": "pending"}])
        self.partners = _Coll()
        self.partner_journey_steps = _Coll()
        self.partner_hub = _Coll()


@pytest.fixture
def api(monkeypatch):
    db = _Db()
    sc.set_db(db)
    monkeypatch.setattr(partner_journey, "db", db)
    monkeypatch.setattr(auth, "decode_token", lambda t: TOKENS.get(t))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)
    app = FastAPI()
    app.include_router(sc.router)
    return TestClient(app), db


def H(token):
    return {"Authorization": f"Bearer {token}"}


CHAT = {"partner_id": "p-sarah", "message": "ciao", "user_name": "Sarah"}


# ── chat ────────────────────────────────────────────────────────────────────
def test_chat_senza_token_401_e_non_legge_niente(api):
    client, db = api
    assert client.post("/api/stefania/chat", json=CHAT).status_code == 401
    assert db.stefania_conversations.updates == []


def test_chat_token_non_valido_401(api):
    client, _ = api
    assert client.post("/api/stefania/chat", json=CHAT, headers=H("inventato")).status_code == 401


def test_un_partner_non_puo_scrivere_come_un_altro_partner(api):
    client, db = api
    r = client.post("/api/stefania/chat", json=CHAT, headers=H("tok-altro"))
    assert r.status_code == 403
    assert db.stefania_conversations.updates == []  # nessuno storico scritto per Sarah


def test_il_partner_giusto_e_l_admin_passano_l_auth(api):
    client, _ = api
    for tok in ("tok-sarah", "tok-admin"):
        r = client.post("/api/stefania/chat", json=CHAT, headers=H(tok))
        assert r.status_code == 500 and "ANTHROPIC_API_KEY" in r.json()["detail"]  # passato l'auth, manca solo la chiave


# ── escalation ──────────────────────────────────────────────────────────────
def test_escalation_richiede_il_partner_giusto(api):
    client, db = api
    corpo = {"partner_id": "p-sarah", "message": "aiuto"}
    assert client.post("/api/stefania/escalation", json=corpo).status_code == 401
    assert client.post("/api/stefania/escalation", json=corpo, headers=H("tok-altro")).status_code == 403
    assert db.stefania_escalations.docs == [{"id": "e1", "partner_id": "p-sarah", "status": "pending"}]
    ok = client.post("/api/stefania/escalation", json=corpo, headers=H("tok-sarah"))
    assert ok.status_code == 200 and ok.json()["success"] is True


# ── storico ed escalation: solo admin ───────────────────────────────────────
@pytest.mark.parametrize("metodo,url", [
    ("get", "/api/stefania/conversations/p-sarah"),
    ("get", "/api/stefania/escalations"),
    ("patch", "/api/stefania/escalations/e1?status=resolved"),
])
def test_storico_ed_escalation_sono_solo_admin(api, metodo, url):
    client, db = api
    chiama = getattr(client, metodo)
    assert chiama(url).status_code == 401
    assert chiama(url, headers=H("tok-sarah")).status_code == 403  # nemmeno il proprio partner
    assert chiama(url, headers=H("tok-altro")).status_code == 403
    assert db.stefania_escalations.updates == []
    assert chiama(url, headers=H("tok-admin")).status_code == 200


def test_l_admin_legge_lo_storico(api):
    client, _ = api
    r = client.get("/api/stefania/conversations/p-sarah", headers=H("tok-admin"))
    assert r.json()["messages"][0]["content"] == "privato"


# ── fail-open sulla stringa vuota (revisione 14/10/2026) ────────────────────
def test_partner_id_vuoto_non_autorizza_nessuno(api):
    client, db = api
    db.users.docs.append({"id": "u-orfano", "partner_id": None})  # utente non collegato a un partner
    TOKENS["tok-orfano"] = SimpleNamespace(role="partner", user_id="u-orfano", email="o@x.it")
    try:
        for corpo in ({"partner_id": "", "message": "x"}, {"partner_id": "   ", "message": "x"}):
            assert client.post("/api/stefania/chat", json=corpo, headers=H("tok-orfano")).status_code == 400
            assert client.post("/api/stefania/escalation", json=corpo, headers=H("tok-orfano")).status_code == 400
        assert db.stefania_conversations.updates == []
    finally:
        TOKENS.pop("tok-orfano", None)


@pytest.mark.asyncio
async def test_la_guardia_comune_non_fa_passare_vuoto_contro_vuoto(api):
    from fastapi.security import HTTPAuthorizationCredentials

    _, db = api
    db.users.docs.append({"id": "u-orfano", "partner_id": None})
    TOKENS["tok-orfano"] = SimpleNamespace(role="partner", user_id="u-orfano", email="o@x.it")
    try:
        cred = HTTPAuthorizationCredentials(scheme="Bearer", credentials="tok-orfano")
        for vuoto in ("", None):
            with pytest.raises(Exception) as e:
                await partner_journey.require_partner_or_admin_for_partner(vuoto or "", cred)
            assert getattr(e.value, "status_code", None) == 403
    finally:
        TOKENS.pop("tok-orfano", None)


# ── solo gli agenti ufficiali ───────────────────────────────────────────────
def test_agenti_ammessi_sono_solo_quelli_ufficiali():
    assert sc.AGENTI_CHAT_PARTNER == {"STEFANIA", "VALENTINA", "ANDREA", "GAIA", "MARCO", "MATTEO"}
    from agent_prompts import AGENT_SYSTEM_PROMPTS

    assert sc.AGENTI_CHAT_PARTNER <= set(AGENT_SYSTEM_PROMPTS)  # ogni agente ammesso ha davvero un prompt


@pytest.mark.parametrize("richiesto,atteso", [("MAIN", None), ("elena", None), ("RESEARCH", None), ("inventato", None), ("andrea", "ANDREA")])
def test_il_partner_non_puo_scegliere_prompt_interni(api, monkeypatch, richiesto, atteso):
    import agent_prompts
    import anthropic

    client, db = api
    monkeypatch.setenv("ANTHROPIC_API_KEY", "k")
    chiesti = []
    monkeypatch.setattr(agent_prompts, "get_agent_prompt", lambda a: chiesti.append(a) or "PROMPT")

    class _Msgs:
        async def create(self, **k):
            return SimpleNamespace(content=[SimpleNamespace(text="ok")])

    monkeypatch.setattr(anthropic, "AsyncAnthropic", lambda api_key: SimpleNamespace(messages=_Msgs()))
    r = client.post("/api/stefania/chat", json={**CHAT, "target_agent": richiesto}, headers=H("tok-sarah"))
    assert r.status_code == 200
    assert r.json()["agent"] == (atteso or "STEFANIA")
    assert chiesti == ([atteso] if atteso else [])  # MAIN/ELENA/RESEARCH non arrivano mai a get_agent_prompt


# ── Telegram: i testi liberi del partner non rompono il Markdown ─────────────
def test_testo_sicuro_toglie_la_formattazione_e_limita():
    assert sc._testo_sicuro("*Claudio* [clicca](http://x) _ciao_\nsecondo", 100) == "Claudio clicca http://x ciao secondo"
    assert len(sc._testo_sicuro("a" * 500, 80)) == 80
    assert sc._testo_sicuro(None, 10) == ""
