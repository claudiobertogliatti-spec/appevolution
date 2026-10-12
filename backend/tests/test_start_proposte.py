"""
Il team prepara PROPOSTE per le domande Start senza risposta; il cliente le conferma.
Le proposte non sono mai risposte del cliente: stanno in `data.proposte`, non in `data.answers`.
"""
import copy

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services.ciak_start_domande import DOMANDE_START_LEGACY_IDS

pytestmark = pytest.mark.unit


def _match(doc, query):
    return all(doc.get(k) == v for k, v in query.items())


class _Coll:
    def __init__(self, docs):
        self.docs = [copy.deepcopy(d) for d in docs]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _match(d, query):
                return {k: v for k, v in d.items() if k != "_id"}
        return None

    async def update_one(self, query, update, upsert=False):
        for d in self.docs:
            if _match(d, query):
                for chiave, valore in update.get("$set", {}).items():
                    bersaglio = d
                    *percorso, ultima = chiave.split(".")
                    for parte in percorso:
                        bersaglio = bersaglio.setdefault(parte, {})
                    bersaglio[ultima] = valore


class _Db:
    def __init__(self, client, steps):
        self.ciak_clients = _Coll([client])
        self.partner_journey_steps = _Coll(steps)


ADMIN = type("A", (), {"email": "claudio@evolution-pro.it"})()
CLIENT = {"id": "c1", "name": "Linda Pavia", "access_level": "cliente_start"}
RISPOSTE_8 = {k: f"Risposta vera di Linda per {k}" for k in DOMANDE_START_LEGACY_IDS}
STEP = {
    "partner_id": "c1", "step_id": "04-posizionamento", "status": "in_progress",
    "data": {"answers": dict(RISPOSTE_8), "answers_completed_at": "2026-10-02T10:00:00+00:00"},
}


def _body(**proposte):
    return ciak_admin.ProponiRisposteStartRequest(proposte=proposte)


@pytest.mark.asyncio
async def test_le_proposte_vanno_in_proposte_mai_nelle_risposte_e_riaprono_il_questionario(monkeypatch):
    db = _Db(CLIENT, [STEP])
    monkeypatch.setattr(ciak_admin, "db", db)
    esito = await ciak_admin.proponi_risposte_start(
        "c1", _body(desideri_avatar="  Capire quale strada   prendere  ", concorrenti_principali="Percorsi standard"), admin=ADMIN
    )
    assert esito == {"success": True, "proposte": ["concorrenti_principali", "desideri_avatar"]}
    dati = db.partner_journey_steps.docs[0]["data"]
    assert dati["proposte"]["desideri_avatar"] == "Capire quale strada prendere"  # spazi ripuliti
    assert "desideri_avatar" not in dati["answers"]  # NON e' una risposta del cliente
    assert dati["answers"] == RISPOSTE_8  # le sue risposte vere restano intatte
    assert dati["integrazione_richiesta_at"] and dati["proposte_da"] == ADMIN.email
    assert db.partner_journey_steps.docs[0]["status"] == "in_progress"  # nessuno stato toccato


@pytest.mark.asyncio
async def test_non_sovrascrive_una_risposta_vera_ne_accetta_domande_estranee(monkeypatch):
    db = _Db(CLIENT, [STEP])
    monkeypatch.setattr(ciak_admin, "db", db)
    esito = await ciak_admin.proponi_risposte_start(
        "c1", _body(nicchia="Proposta sbagliata sopra una risposta vera", inventata="x", paure_avatar="Paura di non essere all'altezza"),
        admin=ADMIN,
    )
    assert esito["proposte"] == ["paure_avatar"]
    assert "nicchia" not in db.partner_journey_steps.docs[0]["data"]["proposte"]


@pytest.mark.asyncio
async def test_senza_proposte_valide_422_e_niente_scritto(monkeypatch):
    db = _Db(CLIENT, [STEP])
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as e:
        await ciak_admin.proponi_risposte_start("c1", _body(nicchia="x" * 20, inventata="y", origin_story="   "), admin=ADMIN)
    assert e.value.status_code == 422
    assert "integrazione_richiesta_at" not in db.partner_journey_steps.docs[0]["data"]


@pytest.mark.asyncio
async def test_cliente_non_start_409(monkeypatch):
    db = _Db({**CLIENT, "access_level": "cliente_blueprint"}, [STEP])
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as e:
        await ciak_admin.proponi_risposte_start("c1", _body(paure_avatar="Paura di non essere all'altezza"), admin=ADMIN)
    assert e.value.status_code == 409
