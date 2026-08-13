"""Form di contatto del sito vetrina — endpoint pubblico, quindi ostile per default.

La pagina vive sul dominio del cliente e chiunque puo' chiamare questo endpoint:
niente token, niente sessione. I test difendono le tre cose che contano — che il
messaggio arrivi davvero a chi lo deve leggere, che uno spammer non lo usi come
megafono, e che il consenso privacy non sia aggirabile.

Nota su CORS: il form e' nativo (`method=post`), quindi il browser fa una
NAVIGAZIONE, non una fetch. CORS non entra in gioco e la risposta e' una pagina.
"""
import pytest

from routers import vetrina_contatti as vc

pytestmark = pytest.mark.unit


class Collection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return None

    async def count_documents(self, query):
        totale = 0
        for doc in self.docs:
            ok = True
            for chiave, atteso in query.items():
                valore = doc.get(chiave)
                if isinstance(atteso, dict) and "$gte" in atteso:
                    if not (valore and valore >= atteso["$gte"]):
                        ok = False
                elif valore != atteso:
                    ok = False
            totale += 1 if ok else 0
        return totale


class DB:
    def __init__(self, clienti=None, messaggi=None):
        self.ciak_clients = Collection(clienti or [CLIENTE])
        self.vetrina_messaggi = Collection(messaggi)


CLIENTE = {
    "id": "client-1",
    "email": "maria@mariarestifo.it",
    "name": "Maria Restifo",
    "access_level": "cliente_start",
    "start_purchased_at": "2026-08-01T09:00:00+00:00",
}


class FakeRequest:
    def __init__(self, ip="203.0.113.7"):
        self.client = type("C", (), {"host": ip})()
        self.headers = {}


def _patch_invio(monkeypatch, esito=True, sink=None):
    def invia(**kwargs):
        if sink is not None:
            sink.update(kwargs)
        return esito

    monkeypatch.setattr(vc, "_invia_notifica", invia)


async def _posta(monkeypatch, **override):
    campi = {
        "nome": "Luca Bianchi",
        "email": "luca@example.it",
        "messaggio": "Buongiorno, vorrei sapere come funziona il percorso in otto settimane.",
        "consenso": "si",
        "azienda": "",
        "client_id": "client-1",
        "request": FakeRequest(),
    }
    campi.update(override)
    return await vc.ricevi_contatto(
        client_id=campi["client_id"],
        request=campi["request"],
        nome=campi["nome"],
        email=campi["email"],
        messaggio=campi["messaggio"],
        consenso=campi["consenso"],
        azienda=campi["azienda"],
    )


@pytest.mark.asyncio
async def test_un_messaggio_valido_viene_salvato_e_notificato(monkeypatch):
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    inviato = {}
    _patch_invio(monkeypatch, sink=inviato)

    risposta = await _posta(monkeypatch)

    assert risposta.status_code == 200
    salvato = database.vetrina_messaggi.docs[0]
    assert salvato["client_id"] == "client-1"
    assert salvato["email"] == "luca@example.it"
    assert salvato["consenso"] is True
    assert salvato["notificato"] is True
    assert inviato["destinatario"] == "maria@mariarestifo.it"
    assert "otto settimane" in inviato["messaggio"]


@pytest.mark.asyncio
async def test_il_visitatore_vede_una_conferma_leggibile_senza_javascript(monkeypatch):
    monkeypatch.setattr(vc, "db", DB())
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch)
    corpo = risposta.body.decode("utf-8")

    assert "<!DOCTYPE html>" in corpo
    assert "Messaggio inviato" in corpo
    assert "<script" not in corpo


@pytest.mark.asyncio
async def test_senza_consenso_il_messaggio_non_viene_registrato(monkeypatch):
    """Il consenso e' il presupposto del trattamento: senza, non si salva niente."""
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, consenso=None)

    assert risposta.status_code == 400
    assert database.vetrina_messaggi.docs == []


@pytest.mark.asyncio
async def test_il_bot_che_riempie_il_campo_trappola_non_arriva_a_nessuno(monkeypatch):
    """Honeypot: si finge successo, ma non si salva e non si notifica.

    Dire allo spammer che e' stato scoperto gli insegna solo come riprovare.
    """
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    inviato = {}
    _patch_invio(monkeypatch, sink=inviato)

    risposta = await _posta(monkeypatch, azienda="Acme SEO Ltd")

    assert risposta.status_code == 200
    assert database.vetrina_messaggi.docs == []
    assert inviato == {}


@pytest.mark.asyncio
async def test_oltre_il_tetto_orario_lo_stesso_ip_viene_fermato(monkeypatch):
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    for _ in range(vc.MAX_MESSAGGI_ORA):
        assert (await _posta(monkeypatch)).status_code == 200

    risposta = await _posta(monkeypatch)

    assert risposta.status_code == 429
    assert len(database.vetrina_messaggi.docs) == vc.MAX_MESSAGGI_ORA


@pytest.mark.asyncio
async def test_una_vetrina_inesistente_risponde_404_senza_rivelare_nulla(monkeypatch):
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, client_id="non-esiste")

    assert risposta.status_code == 404
    assert database.vetrina_messaggi.docs == []


@pytest.mark.asyncio
async def test_un_cliente_senza_ciak_start_non_ha_un_form_attivo(monkeypatch):
    """Il form esiste perche' esiste la vetrina, e la vetrina e' un deliverable Start."""
    database = DB(clienti=[{"id": "client-2", "email": "x@y.it", "access_level": "cliente_blueprint"}])
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, client_id="client-2")

    assert risposta.status_code == 404
    assert database.vetrina_messaggi.docs == []


@pytest.mark.asyncio
async def test_una_email_non_valida_viene_rifiutata(monkeypatch):
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, email="non-una-email")

    assert risposta.status_code == 400
    assert database.vetrina_messaggi.docs == []


@pytest.mark.asyncio
async def test_un_messaggio_lunghissimo_viene_troncato_non_rifiutato(monkeypatch):
    """Chi scrive tanto e' un potenziale cliente, non un attacco: si tronca."""
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, messaggio="a" * 20000)

    assert risposta.status_code == 200
    assert len(database.vetrina_messaggi.docs[0]["messaggio"]) == vc.MAX_MESSAGGIO


@pytest.mark.asyncio
async def test_se_l_email_non_parte_il_messaggio_resta_salvato_e_segnato(monkeypatch):
    """Il messaggio non si perde per colpa dell'SMTP: resta a DB, da recuperare."""
    database = DB()
    monkeypatch.setattr(vc, "db", database)
    _patch_invio(monkeypatch, esito=False)

    risposta = await _posta(monkeypatch)

    assert risposta.status_code == 200
    salvato = database.vetrina_messaggi.docs[0]
    assert salvato["notificato"] is False


@pytest.mark.asyncio
async def test_l_html_nel_messaggio_non_finisce_grezzo_nella_conferma(monkeypatch):
    monkeypatch.setattr(vc, "db", DB())
    _patch_invio(monkeypatch)

    risposta = await _posta(monkeypatch, nome="<script>alert(1)</script>")
    corpo = risposta.body.decode("utf-8")

    assert "<script>alert(1)</script>" not in corpo
