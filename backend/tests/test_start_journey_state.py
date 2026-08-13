"""`/operativo/state/{partner_id}` deve essere consapevole del livello.

Il difetto che questi test chiudono: `get_operativo_state` fa auto-heal
inserendo TUTTI gli step di `JOURNEY_STEPS_DEFINITION` che mancano. Un cliente
Ciak Start che apre l'area si sarebbe visto seedare l'intera journey partner —
20 step comprati da nessuno — e sarebbe finito nei conteggi come un partner.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from auth import create_access_token
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from models.start_journey import START_JOURNEY_STEPS_DEFINITION
from routers import partner_journey

pytestmark = pytest.mark.unit

START_CLIENT_ID = "client-start-1"


def _matches(doc, query):
    for key, value in query.items():
        if isinstance(value, dict) and "$ne" in value:
            if doc.get(key) == value["$ne"]:
                return False
            continue
        if doc.get(key) != value:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, key, direction=1):
        self._docs = sorted(self._docs, key=lambda d: d.get(key, 0), reverse=direction < 0)
        return self

    async def to_list(self, length=None):
        return [dict(d) for d in self._docs[:length]]


class _Collection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None, sort=None):
        for doc in self.docs:
            if _matches(doc, query):
                return dict(doc)
        return None

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query or {})])

    async def count_documents(self, query):
        return len([d for d in self.docs if _matches(d, query)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("R", (), {"inserted_id": doc.get("id")})()

    async def insert_many(self, docs):
        self.docs.extend(dict(d) for d in docs)
        return type("R", (), {"inserted_ids": []})()

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return type("R", (), {"matched_count": 1, "modified_count": 1})()
        if upsert:
            new_doc = {k: v for k, v in query.items() if not isinstance(v, dict)}
            new_doc.update(update.get("$set", {}))
            self.docs.append(new_doc)
            return type("R", (), {"matched_count": 0, "modified_count": 1})()
        return type("R", (), {"matched_count": 0, "modified_count": 0})()


class _Db:
    def __init__(self, *, steps=None, partners=None, clients=None, users=None):
        self.partner_journey_steps = _Collection(steps)
        self.partners = _Collection(partners)
        self.ciak_clients = _Collection(clients)
        self.users = _Collection(users)


def _client_creds(client_id=START_CLIENT_ID):
    import os

    secret = (
        os.environ.get("JWT_SECRET")
        or os.environ.get("SECRET_KEY")
        or os.environ.get("JWT_SECRET_KEY")
    )
    token = jwt.encode(
        {
            "sub": client_id,
            "email": "marta@example.com",
            "role": "ciak_client",
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        secret,
        algorithm="HS256",
    )
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _admin_creds():
    token = create_access_token({"sub": "a1", "email": "a@x.it", "role": "admin"})
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


START_CLIENT_DOC = {
    "id": START_CLIENT_ID,
    "email": "marta@example.com",
    "access_level": "cliente_start",
    "start_purchased_at": "2026-08-12T10:00:00+00:00",
}


def _seeded_start_steps():
    return [
        {
            "partner_id": START_CLIENT_ID,
            "step_id": d["step_id"],
            "step_number": d["step_number"],
            "fase_legacy": d["fase_legacy"],
            "code": d["code"],
            "macro_phase": d["macro_phase"],
            "owner": d["owner"],
            "completion_policy": d["completion_policy"],
            "material_categories": d["material_categories"],
            "status": "pending",
            "data": {},
        }
        for d in START_JOURNEY_STEPS_DEFINITION
    ]


@pytest.fixture(autouse=True)
def _restore_db():
    old = partner_journey.db
    yield
    partner_journey.db = old


# ─── cliente Start ─────────────────────────────────────────────────────────────


async def test_lo_stato_start_non_seeda_i_venti_step_partner():
    """Il difetto vero: l'auto-heal inseriva l'intera journey partner."""
    db = _Db(
        steps=_seeded_start_steps(),
        partners=[{"id": START_CLIENT_ID, "tier": "start"}],
        clients=[START_CLIENT_DOC],
    )
    partner_journey.db = db

    state = await partner_journey.get_operativo_state(START_CLIENT_ID, _client_creds())

    assert len(state["steps"]) == len(START_JOURNEY_STEPS_DEFINITION)
    ids = {s["step_id"] for s in state["steps"]}
    assert "05-script-masterclass" not in ids
    assert await db.partner_journey_steps.count_documents({"partner_id": START_CLIENT_ID}) == len(
        START_JOURNEY_STEPS_DEFINITION
    )


async def test_primo_accesso_start_seeda_solo_i_suoi_step():
    db = _Db(
        steps=[],
        partners=[{"id": START_CLIENT_ID, "tier": "start"}],
        clients=[START_CLIENT_DOC],
    )
    partner_journey.db = db

    state = await partner_journey.get_operativo_state(START_CLIENT_ID, _client_creds())

    assert {s["step_id"] for s in state["steps"]} == {
        d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION
    }


async def test_lo_stato_start_dichiara_il_livello():
    db = _Db(
        steps=_seeded_start_steps(),
        partners=[{"id": START_CLIENT_ID, "tier": "start"}],
        clients=[START_CLIENT_DOC],
    )
    partner_journey.db = db

    state = await partner_journey.get_operativo_state(START_CLIENT_ID, _client_creds())

    assert state["tier"] == "start"


async def test_lo_stato_start_mostra_gli_step_partner_lucchettati():
    """Visibili ma lucchettati: e' la leva di upgrade decisa il 30/7."""
    db = _Db(
        steps=_seeded_start_steps(),
        partners=[{"id": START_CLIENT_ID, "tier": "start"}],
        clients=[START_CLIENT_DOC],
    )
    partner_journey.db = db

    state = await partner_journey.get_operativo_state(START_CLIENT_ID, _client_creds())

    locked = state["locked_steps"]
    assert len(locked) == len(JOURNEY_STEPS_DEFINITION) - 2
    assert all(s["locked"] is True for s in locked)
    assert all("label" in s for s in locked)
    # Nessun dato del partner finisce negli step lucchettati: sono solo etichette.
    assert all("data" not in s for s in locked)


async def test_gli_step_start_only_hanno_label_e_owner():
    db = _Db(
        steps=_seeded_start_steps(),
        partners=[{"id": START_CLIENT_ID, "tier": "start"}],
        clients=[START_CLIENT_DOC],
    )
    partner_journey.db = db

    state = await partner_journey.get_operativo_state(START_CLIENT_ID, _client_creds())

    vetrina = next(s for s in state["steps"] if s["step_id"] == "start-vetrina")
    assert vetrina["label"] == "Sito vetrina"
    assert vetrina["owner"] == "GAIA"
    assert vetrina["macro_phase"] == "esamina"


# ─── regressioni partner ───────────────────────────────────────────────────────


async def test_regressione_partner_senza_tier_riceve_i_venti_step():
    db = _Db(steps=[], partners=[{"id": "13", "phase": "F1"}])
    partner_journey.db = db

    state = await partner_journey.get_operativo_state("13", _admin_creds())

    assert len(state["steps"]) == len(JOURNEY_STEPS_DEFINITION)
    assert state["tier"] == "partnership"
    assert state["locked_steps"] == []


async def test_regressione_autoheal_partner_reinserisce_gli_step_mancanti():
    """L'auto-heal esistente resta: un partner seedato prima che uno step
    esistesse non deve avere buchi nella mappa."""
    steps = [
        {
            "partner_id": "13",
            "step_id": d["step_id"],
            "step_number": d["step_number"],
            "status": "pending",
            "data": {},
        }
        for d in JOURNEY_STEPS_DEFINITION
        if d["step_id"] != "la-tua-storia"
    ]
    db = _Db(steps=steps, partners=[{"id": "13"}])
    partner_journey.db = db

    state = await partner_journey.get_operativo_state("13", _admin_creds())

    assert "la-tua-storia" in {s["step_id"] for s in state["steps"]}
    assert len(state["steps"]) == len(JOURNEY_STEPS_DEFINITION)


async def test_regressione_partner_promosso_conserva_gli_step_start():
    """Chi e' salito da Start ha 24 step: i 20 canonici + i 4 Start. Nessuno
    dei due gruppi deve sparire, e gli step Start restano etichettati."""
    steps = [
        {"partner_id": "p9", "step_id": d["step_id"], "step_number": d["step_number"],
         "status": "pending", "data": {}}
        for d in JOURNEY_STEPS_DEFINITION
    ] + [
        {"partner_id": "p9", "step_id": d["step_id"], "step_number": d["step_number"],
         "status": "done", "data": {}}
        for d in START_JOURNEY_STEPS_DEFINITION
        if d["step_id"].startswith("start-")
    ]
    db = _Db(steps=steps, partners=[{"id": "p9", "tier": "partnership"}])
    partner_journey.db = db

    state = await partner_journey.get_operativo_state("p9", _admin_creds())

    ids = {s["step_id"] for s in state["steps"]}
    assert {d["step_id"] for d in JOURNEY_STEPS_DEFINITION} <= ids
    assert "start-vetrina" in ids
    vetrina = next(s for s in state["steps"] if s["step_id"] == "start-vetrina")
    assert vetrina["label"] == "Sito vetrina"
    assert state["locked_steps"] == []
