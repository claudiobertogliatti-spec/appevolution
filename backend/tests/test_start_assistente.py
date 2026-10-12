"""Assistente di Ciak Start: regole pure + endpoint (modello finto, nessuna rete)."""
import json

import pytest

from services import proposta_chat, start_assistente as sa
from tests.test_ciak_clients_router import (  # noqa: F401 - fixture e helper condivisi
    FakeCollection, _cliente_loggato, ciak_clients, client_app, fake_db, fake_stripe_checkout_module,
)

pytestmark = pytest.mark.unit


# ── regole pure ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize("testo", [
    "Voglio un rimborso", "Come faccio a disdire?", "Mi serve la fattura", "Ho pagato due volte, c'è un doppio addebito",
    "Posso pagare a rate?", "Cosa dice il contratto sull'esclusiva?", "Ho bisogno di un avvocato",
    "Non riesco ad entrare nel mio account", "C'è una garanzia?", "Ho la partita IVA, cosa cambia?",
])
def test_argomenti_delicati_non_vanno_al_modello(testo):
    assert sa.argomento_delicato(testo)


@pytest.mark.parametrize("testo", [
    "Come scelgo i colori del marchio?", "Cosa devo fare adesso?", "Quando arriva il sito?",
    "Le domande sono tutte obbligatorie?", "Ho creato i profili separate per Instagram", "Posso scrivere in modo creativa?",
])
def test_domande_normali_non_sono_delicate(testo):
    assert not sa.argomento_delicato(testo)


def test_passa_al_team_riconosce_la_frase():
    assert sa.passa_al_team(f"Questo non lo so. {sa.FRASE_PASSAGGIO}")
    assert not sa.passa_al_team("Il sito arriva entro la terza tappa.")


def test_scheda_cliente_non_inventa_date_ne_stati():
    vuoto = sa.scheda_cliente(nome="Linda Pavia")
    assert "non disponibili" in vuoto and "stato non disponibile" in vuoto
    pieno = sa.scheda_cliente(
        nome="Linda Pavia", consegne=["08/10/2026", "15/10/2026", "22/10/2026"],
        materiali=[{"titolo": "Il tuo marchio", "stato": "approvato"}, {"titolo": "La pagina web", "stato": "da_fare"}],
        domande_mancanti=5, domande_riaperte=True,
    )
    assert "08/10/2026, 15/10/2026, 22/10/2026" in pieno
    assert "già pronti e visibili al cliente: Il tuo marchio" in pieno
    assert "ne mancano 5" in pieno and "riaperto solo le mancanti" in pieno


def test_system_prompt_ha_i_fatti_veri_e_le_regole_che_non_si_piegano():
    blocchi = sa.build_system_blocks(first_name="Linda", contesto="Nome: Linda")
    stabile, personale = blocchi[0]["text"], blocchi[1]["text"]
    assert blocchi[0]["cache_control"] == {"type": "ephemeral"}
    assert "Linda" in stabile and "Nome: Linda" in personale
    for titolo in ("Chi sei e cosa offri", "Il tuo marchio", "I profili social", "La pagina web", "Il calendario dei 60 giorni", "Il controllo finale"):
        assert titolo in stabile
    assert "390 euro" in stabile and "2.990 euro" in stabile and "2.600 euro" in stabile
    assert "7, 14 e 21 giorni" in stabile
    assert "MAI promettere guadagni" in stabile and "MAI parlare di rimborsi" in stabile
    assert sa.FRASE_PASSAGGIO in stabile
    assert "garanzia di rimborso" not in stabile.lower()


# ── endpoint ────────────────────────────────────────────────────────────────
def _eventi(response):
    return [json.loads(b[5:]) for b in response.text.split("\n\n") if b.startswith("data:")]


@pytest.fixture
def assistente_db(fake_db, monkeypatch):
    fake_db.ciak_start_assistente = FakeCollection()
    monkeypatch.setattr(ciak_clients, "_assistente_limiter", None)
    return fake_db


def _modello_finto(monkeypatch, testo):
    visti = {}

    async def finto(system, history, message):
        visti.update(system=system, history=history, message=message)
        for pezzo in testo:
            yield pezzo

    monkeypatch.setattr(proposta_chat, "stream_reply", finto)
    return visti


def test_risposta_normale_in_streaming_e_senza_coda(monkeypatch, client_app, assistente_db):
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)
    visti = _modello_finto(monkeypatch, ["Scegli tre colori ", "che ti somigliano."])
    r = client_app.post("/api/ciak/client/start/assistente", json={"message": "Come scelgo i colori?"}, headers=auth)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/event-stream")
    ev = _eventi(r)
    assert "".join(e["t"] for e in ev if "t" in e) == "Scegli tre colori che ti somigliano."
    assert ev[-1] == {"done": True, "passato": False}
    riga = assistente_db.ciak_start_assistente.docs[0]
    assert riga["client_id"] == "client-1" and riga["passato_al_team"] is False and riga["motivo"] == ""
    assert visti["message"] == "Come scelgo i colori?"
    assert "DATI DEL CLIENTE" in visti["system"][1]["text"]


def test_argomento_delicato_non_chiama_il_modello_e_va_in_coda(monkeypatch, client_app, assistente_db):
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)
    chiamato = []

    async def non_deve_essere_chiamato(*a, **k):
        chiamato.append(1)
        yield "no"

    monkeypatch.setattr(proposta_chat, "stream_reply", non_deve_essere_chiamato)
    r = client_app.post("/api/ciak/client/start/assistente", json={"message": "Voglio un rimborso"}, headers=auth)
    ev = _eventi(r)
    assert chiamato == []
    assert sa.FRASE_PASSAGGIO in "".join(e.get("t", "") for e in ev)
    assert ev[-1]["passato"] is True
    assert assistente_db.ciak_start_assistente.docs[0]["motivo"] == "argomento_delicato"


def test_se_il_modello_non_sa_la_domanda_va_in_coda(monkeypatch, client_app, assistente_db):
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)
    _modello_finto(monkeypatch, [f"Questo non lo so. {sa.FRASE_PASSAGGIO}"])
    r = client_app.post("/api/ciak/client/start/assistente", json={"message": "Posso avere un sito in inglese?"}, headers=auth)
    assert _eventi(r)[-1]["passato"] is True
    riga = assistente_db.ciak_start_assistente.docs[0]
    assert riga["passato_al_team"] is True and riga["motivo"] == "non_sa" and riga["gestita"] is False


def test_servizio_non_raggiungibile_risponde_onesto_e_mette_in_coda(monkeypatch, client_app, assistente_db):
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)

    async def rotto(*a, **k):
        raise RuntimeError("API giù")
        yield  # pragma: no cover

    monkeypatch.setattr(proposta_chat, "stream_reply", rotto)
    r = client_app.post("/api/ciak/client/start/assistente", json={"message": "Quando arriva il sito?"}, headers=auth)
    ev = _eventi(r)
    assert ev[0] == {"error": proposta_chat.UNAVAILABLE_REPLY}
    assert assistente_db.ciak_start_assistente.docs[0]["motivo"] == "errore_servizio"


def test_senza_accesso_o_senza_start_non_risponde(monkeypatch, client_app, assistente_db):
    assert client_app.post("/api/ciak/client/start/assistente", json={"message": "ciao"}).status_code in (401, 403)
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)
    assistente_db.ciak_clients.docs[0].update(access_level="cliente_blueprint", start_credit_amount=0)
    assistente_db.ciak_clients.docs[0].pop("start_purchased_at", None)
    r = client_app.post("/api/ciak/client/start/assistente", json={"message": "ciao"}, headers=auth)
    assert r.status_code == 403


def test_limite_di_messaggi_protegge_la_spesa(monkeypatch, client_app, assistente_db):
    auth = _cliente_loggato(monkeypatch, client_app, assistente_db)
    _modello_finto(monkeypatch, ["ok"])
    ultimi = None
    for _ in range(proposta_chat.RATE_MAX_MESSAGES + 1):
        ultimi = _eventi(client_app.post("/api/ciak/client/start/assistente", json={"message": "ciao"}, headers=auth))
    assert ultimi[0] == {"t": proposta_chat.RATE_LIMIT_REPLY}
