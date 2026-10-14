"""Assistente dell'area partner: scheda verificata, regole e endpoint (modello finto, nessuna rete)."""
import json
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION, MACRO_PHASES_DEFINITION
from routers import partner_assistente as router_mod
from services import partner_assistente as pa
from services import proposta_chat

pytestmark = pytest.mark.unit


# ── scheda e regole ─────────────────────────────────────────────────────────
def test_la_scheda_contiene_tutti_i_20_passi_e_le_3_fasi_dalla_definizione_ufficiale():
    testo = pa.build_system_blocks(first_name="Sarah", contesto="x")[0]["text"]
    for d in JOURNEY_STEPS_DEFINITION:
        assert d["label"] in testo
    for f in MACRO_PHASES_DEFINITION:
        assert f"«{f['label']}»" in testo
    assert "Metodo EVO: Esamina, Valida, Ottimizza" in testo
    assert "21 giorni operativi" in testo
    assert "Valentina (brand e posizionamento)" in testo


def test_la_sezione_su_cosa_fa_evolution_pro_esiste_ancora_nella_scheda_del_contratto():
    # se qualcuno rinomina la sezione in proposta_chat, l'assistente non deve restare muto in silenzio
    sezione = pa._sezione_contratto("COSA FA EVOLUTION PRO")
    assert sezione.startswith("COSA FA EVOLUTION PRO") and "NON inclusi" in sezione
    testo = pa.build_system_blocks(first_name="Sarah", contesto="x")[0]["text"]
    assert "gestione delle campagne pubblicitarie" in testo


def test_il_prompt_non_porta_clausole_sensibili_ne_promesse():
    testo = pa.build_system_blocks(first_name="Sarah", contesto="x")[0]["text"]
    for vietato in ("ROYALTY DEL 10%", "RIMBORSO E USCITA", "ESCLUSIVA (Art. 1.4)", "2.990 EUR"):
        assert vietato not in testo  # il contratto lo spiega il team, non la chat
    assert "MAI promettere guadagni" in testo and pa.FRASE_PASSAGGIO in testo
    assert "garanzia di rimborso" not in testo.lower()


@pytest.mark.parametrize("testo", [
    "Quanto sono le royalty?", "Ho l'esclusiva?", "Mi sospendono il progetto?", "Come si risolve il contratto?",
    "Voglio un rimborso", "Mi serve la fattura", "Posso pagare a rate?", "Non riesco ad entrare",
])
def test_temi_delicati_per_i_partner(testo):
    assert pa.argomento_delicato(testo)


@pytest.mark.parametrize("testo", [
    "Come carico la masterclass?", "Quanto ci mette il montaggio?", "Chi mi segue sul funnel?",
    "Cosa fate voi per me?", "Cosa devo fare adesso?",
])
def test_domande_operative_non_sono_delicate(testo):
    assert not pa.argomento_delicato(testo)


def test_scheda_partner_dai_passi_reali_e_non_inventa():
    assert "non disponibile" in pa.scheda_partner(nome="Sarah")
    passi = [
        {"step_id": "02-discovery-video", "status": "done"},
        {"step_id": "01-contratto", "status": "done"},
        {"step_id": "03-brand-kit", "status": "in_progress"},
        {"step_id": "burocrazia", "status": "blocked"},
    ]
    t = pa.scheda_partner(nome="Sarah Arensi", passi=passi)
    assert "Passi completati: 2 su 4 (1. Benvenuto, 2. Contratto + distinta)" in t
    assert "Passo in corso: 4. Brand kit" in t
    assert "Passi bloccati: 3. I tuoi dati" in t


# ── endpoint ────────────────────────────────────────────────────────────────
class _Cur:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return dict(next(self._it))
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, q, projection=None):
        return next((dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)

    def find(self, q, projection=None):
        return _Cur([d for d in self.docs if all(d.get(k) == v for k, v in q.items())])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))


class _Db:
    def __init__(self):
        self.partners = _Coll([{"id": "p1", "name": "Sarah Arensi"}])
        self.partner_journey_steps = _Coll([{"partner_id": "p1", "step_id": "03-brand-kit", "status": "in_progress"}])
        self.partner_assistente = _Coll()


@pytest.fixture
def app_db(monkeypatch):
    db = _Db()
    router_mod.set_db(db)
    monkeypatch.setattr(router_mod, "_limiter", None)
    app = FastAPI()
    app.include_router(router_mod.router)
    return TestClient(app), db


def _auth(monkeypatch, role="partner", consenti=True):
    from routers import partner_journey

    async def finto(partner_id, credentials):
        if not consenti:
            raise HTTPException(403, "Partner non autorizzato")
        return SimpleNamespace(role=role)

    monkeypatch.setattr(partner_journey, "require_partner_or_admin_for_partner", finto)


def _eventi(r):
    return [json.loads(b[5:]) for b in r.text.split("\n\n") if b.startswith("data:")]


def _modello(monkeypatch, pezzi):
    visti = {}

    async def finto(system, history, message):
        visti.update(system=system, message=message)
        for p in pezzi:
            yield p

    monkeypatch.setattr(proposta_chat, "stream_reply", finto)
    return visti


def test_risposta_in_streaming_con_i_dati_del_partner_e_log_senza_coda(monkeypatch, app_db):
    client, db = app_db
    _auth(monkeypatch)
    visti = _modello(monkeypatch, ["Carichi il video ", "e noi lo montiamo."])
    r = client.post("/api/partner-assistente/p1/chat", json={"message": "Come carico la masterclass?"})
    assert r.status_code == 200
    ev = _eventi(r)
    assert "".join(e.get("t", "") for e in ev) == "Carichi il video e noi lo montiamo."
    assert ev[-1] == {"done": True, "passato": False}
    assert "Passo in corso: 4. Brand kit" in visti["system"][1]["text"]
    riga = db.partner_assistente.docs[0]
    assert riga["partner_id"] == "p1" and riga["da"] == "partner" and riga["passato_al_team"] is False
    assert "client_id" not in riga


def test_tema_delicato_non_chiama_il_modello_e_va_in_coda(monkeypatch, app_db):
    client, db = app_db
    _auth(monkeypatch)
    chiamato = []

    async def no(*a, **k):
        chiamato.append(1)
        yield "x"

    monkeypatch.setattr(proposta_chat, "stream_reply", no)
    ev = _eventi(client.post("/api/partner-assistente/p1/chat", json={"message": "Quanto sono le royalty?"}))
    assert chiamato == [] and ev[-1]["passato"] is True
    assert db.partner_assistente.docs[0]["motivo"] == "argomento_delicato"


def test_se_non_sa_va_in_coda_e_se_il_servizio_cade_lo_dice(monkeypatch, app_db):
    client, db = app_db
    _auth(monkeypatch)
    _modello(monkeypatch, [f"Questo non lo so. {pa.FRASE_PASSAGGIO}"])
    assert _eventi(client.post("/api/partner-assistente/p1/chat", json={"message": "Fate anche i podcast?"}))[-1]["passato"] is True
    assert db.partner_assistente.docs[-1]["motivo"] == "non_sa"

    async def rotto(*a, **k):
        raise RuntimeError("giu'")
        yield  # pragma: no cover

    monkeypatch.setattr(proposta_chat, "stream_reply", rotto)
    ev = _eventi(client.post("/api/partner-assistente/p1/chat", json={"message": "Quando arriva il montaggio?"}))
    assert ev[0] == {"error": proposta_chat.UNAVAILABLE_REPLY}
    assert db.partner_assistente.docs[-1]["motivo"] == "errore_servizio"


def test_non_scrive_per_un_altro_partner_ne_per_un_cliente_start(monkeypatch, app_db):
    client, db = app_db
    _auth(monkeypatch, consenti=False)
    assert client.post("/api/partner-assistente/p1/chat", json={"message": "ciao"}).status_code == 403
    _auth(monkeypatch, role="ciak_client")
    assert client.post("/api/partner-assistente/p1/chat", json={"message": "ciao"}).status_code == 403
    assert db.partner_assistente.docs == []


def test_l_admin_in_supervisione_e_tracciato_come_tale(monkeypatch, app_db):
    client, db = app_db
    _auth(monkeypatch, role="admin")
    _modello(monkeypatch, ["ok"])
    client.post("/api/partner-assistente/p1/chat", json={"message": "Cosa devo fare adesso?"})
    assert db.partner_assistente.docs[0]["da"] == "admin"


def test_limite_di_messaggi(monkeypatch, app_db):
    client, _ = app_db
    _auth(monkeypatch)
    _modello(monkeypatch, ["ok"])
    ultimo = None
    for _ in range(proposta_chat.RATE_MAX_MESSAGES + 1):
        ultimo = _eventi(client.post("/api/partner-assistente/p1/chat", json={"message": "ciao"}))
    assert ultimo[0] == {"t": proposta_chat.RATE_LIMIT_REPLY}


# ── auth REALE (senza sostituire la guardia): 401 senza token, 403 per un altro partner ─────────
def test_auth_reale_senza_token_o_con_token_inventato_401(monkeypatch, app_db):
    import auth
    from routers import partner_journey

    client, db = app_db
    db.users = _Coll([{"id": "u1", "partner_id": "p1"}, {"id": "u2", "partner_id": "p2"}])
    monkeypatch.setattr(partner_journey, "db", db)
    tokens = {"t1": SimpleNamespace(role="partner", user_id="u1"), "t2": SimpleNamespace(role="partner", user_id="u2")}
    monkeypatch.setattr(auth, "decode_token", lambda t: tokens.get(t))
    _modello(monkeypatch, ["ok"])
    url = "/api/partner-assistente/p1/chat"
    corpo = {"message": "ciao"}
    assert client.post(url, json=corpo).status_code == 401
    assert client.post(url, json=corpo, headers={"Authorization": "Bearer inventato"}).status_code == 401
    assert client.post(url, json=corpo, headers={"Authorization": "Bearer t2"}).status_code == 403  # un altro partner
    assert db.partner_assistente.docs == []
    assert client.post(url, json=corpo, headers={"Authorization": "Bearer t1"}).status_code == 200
