"""Ponte di identita' Ciak Start: un cliente da 499 EUR diventa un soggetto che
i motori esistenti (brand kit, posizionamento) accettano, senza creare un
secondo mondo da riconciliare.

Il ponte NON scrive password: il cliente Start entra con magic link, che emette
un JWT `ciak_client` a partire da `ciak_clients`. In `users` esistono due campi
hash (`hashed_password` e `password_hash`) e il login legge il primo che trova
(auth.py:211): scriverne uno solo lascia l'utente fuori senza errori. Qui non se
ne scrive nessuno dei due — si lascia l'accesso al magic link.
"""
from __future__ import annotations

import pytest

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
from models.start_journey import START_JOURNEY_STEPS_DEFINITION
from services.start_partner_bridge import ensure_start_partner_bridge

pytestmark = pytest.mark.unit


# ─── fake mongo ────────────────────────────────────────────────────────────────


def _matches(doc: dict, query: dict) -> bool:
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
        self._docs = sorted(
            self._docs, key=lambda d: d.get(key, 0), reverse=direction < 0
        )
        return self

    async def to_list(self, length=None):
        return [dict(d) for d in self._docs[:length]]


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None, sort=None):
        found = [d for d in self.docs if _matches(d, query)]
        if sort:
            key, direction = sort[0]
            found = sorted(found, key=lambda d: d.get(key) or "", reverse=direction < 0)
        if not found:
            return None
        data = dict(found[0])
        data.pop("_id", None)
        return data

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query or {})])

    async def count_documents(self, query):
        return len([d for d in self.docs if _matches(d, query)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("R", (), {"inserted_id": doc.get("id")})()

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return type("R", (), {"matched_count": 1, "modified_count": 1})()
        if upsert:
            new_doc = {k: v for k, v in query.items() if not isinstance(v, dict)}
            new_doc.update(update.get("$set", {}))
            self.docs.append(new_doc)
            return type("R", (), {"matched_count": 0, "modified_count": 1, "upserted_id": new_doc.get("id")})()
        return type("R", (), {"matched_count": 0, "modified_count": 0})()


class FakeDb:
    def __init__(self, *, clients=None, users=None, partners=None, sessions=None, steps=None):
        self.ciak_clients = FakeCollection(clients)
        self.users = FakeCollection(users)
        self.partners = FakeCollection(partners)
        self.diagnostic_sessions = FakeCollection(sessions)
        self.partner_journey_steps = FakeCollection(steps)


START_CLIENT = {
    "id": "client-start-1",
    "email": "marta@example.com",
    "name": "Marta Bianchi",
    "access_level": "cliente_start",
    "start_purchased_at": "2026-08-12T10:00:00+00:00",
    "start_credit_amount": 49900,
    "session_token": "sess-1",
}

DIAGNOSTIC_SESSION = {
    "session_token": "sess-1",
    "email": "marta@example.com",
    "competenza_raw": "Fotografia di matrimonio per coppie over 30",
}


# ─── creazione del record partners ─────────────────────────────────────────────


async def test_crea_il_partner_con_lo_stesso_id_del_cliente():
    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])

    partner = await ensure_start_partner_bridge(db, START_CLIENT)

    assert partner["id"] == START_CLIENT["id"]
    assert partner["tier"] == "start"
    assert partner["email"] == "marta@example.com"
    assert partner["name"] == "Marta Bianchi"
    stored = await db.partners.find_one({"id": START_CLIENT["id"]})
    assert stored is not None


async def test_prende_la_nicchia_dalla_diagnostic_session():
    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])

    partner = await ensure_start_partner_bridge(db, START_CLIENT)

    assert partner["nicchia"] == "Fotografia di matrimonio per coppie over 30"


async def test_senza_diagnostic_session_non_inventa_la_nicchia():
    db = FakeDb(clients=[START_CLIENT])

    partner = await ensure_start_partner_bridge(db, START_CLIENT)

    assert not partner.get("nicchia")


async def test_rifiuta_un_cliente_senza_entitlement_start():
    """Un cliente Blueprint non deve ritrovarsi un record partners: entrerebbe
    nei conteggi e nell'area partner senza aver comprato niente."""
    blueprint = {"id": "c-bp", "email": "bp@example.com", "access_level": "cliente_blueprint"}
    db = FakeDb(clients=[blueprint])

    with pytest.raises(ValueError):
        await ensure_start_partner_bridge(db, blueprint)

    assert await db.partners.count_documents({}) == 0


async def test_rifiuta_un_cliente_senza_email():
    db = FakeDb()

    with pytest.raises(ValueError):
        await ensure_start_partner_bridge(db, {"id": "c-x", "access_level": "cliente_start"})


# ─── idempotenza ───────────────────────────────────────────────────────────────


async def test_idempotente_non_duplica_il_partner():
    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])

    await ensure_start_partner_bridge(db, START_CLIENT)
    await ensure_start_partner_bridge(db, START_CLIENT)

    assert await db.partners.count_documents({"id": START_CLIENT["id"]}) == 1
    assert await db.partner_journey_steps.count_documents({"partner_id": START_CLIENT["id"]}) == len(
        START_JOURNEY_STEPS_DEFINITION
    )


async def test_non_azzera_il_lavoro_gia_fatto_su_uno_step():
    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])
    await ensure_start_partner_bridge(db, START_CLIENT)
    await db.partner_journey_steps.update_one(
        {"partner_id": START_CLIENT["id"], "step_id": "04-posizionamento"},
        {"$set": {"status": "done", "data": {"answers": {"nicchia": "gia' scritto"}}}},
    )

    await ensure_start_partner_bridge(db, START_CLIENT)

    step = await db.partner_journey_steps.find_one(
        {"partner_id": START_CLIENT["id"], "step_id": "04-posizionamento"}
    )
    assert step["status"] == "done"
    assert step["data"]["answers"]["nicchia"] == "gia' scritto"


async def test_non_declassa_un_partner_gia_salito_a_partnership():
    """Se il ponte venisse richiamato dopo l'upgrade (retry di un webhook
    vecchio), riportare `tier` a start chiuderebbe fuori un partner pagante."""
    db = FakeDb(
        clients=[START_CLIENT],
        partners=[{"id": START_CLIENT["id"], "tier": "partnership", "name": "Marta Bianchi"}],
    )

    partner = await ensure_start_partner_bridge(db, START_CLIENT)

    assert partner["tier"] == "partnership"


# ─── collegamento users ────────────────────────────────────────────────────────


async def test_collega_lo_users_esistente_al_partner_id():
    db = FakeDb(
        clients=[START_CLIENT],
        users=[{"id": "user-esistente", "email": "marta@example.com", "role": "cliente"}],
    )

    await ensure_start_partner_bridge(db, START_CLIENT)

    user = await db.users.find_one({"id": "user-esistente"})
    assert user["partner_id"] == START_CLIENT["id"]
    assert await db.users.count_documents({}) == 1


async def test_crea_lo_users_mancante_con_lo_stesso_id_del_cliente():
    db = FakeDb(clients=[START_CLIENT])

    await ensure_start_partner_bridge(db, START_CLIENT)

    user = await db.users.find_one({"email": "marta@example.com"})
    assert user["id"] == START_CLIENT["id"]
    assert user["partner_id"] == START_CLIENT["id"]


async def test_non_scrive_nessuno_dei_due_campi_hash_password():
    """Il cliente Start entra con magic link. Scrivere un hash qui — o peggio
    uno solo dei due campi — creerebbe una credenziale che nessuno gli ha dato."""
    db = FakeDb(clients=[START_CLIENT])

    await ensure_start_partner_bridge(db, START_CLIENT)

    user = await db.users.find_one({"email": "marta@example.com"})
    assert user.get("hashed_password") is None
    assert user.get("password_hash") is None


async def test_non_promuove_il_ruolo_users_a_partner():
    """`role` resta cliente: e' `partners.tier` l'asse di accesso, non il ruolo.
    Promuoverlo aprirebbe tutta l'area partner a un cliente da 499 EUR."""
    db = FakeDb(
        clients=[START_CLIENT],
        users=[{"id": "user-esistente", "email": "marta@example.com", "role": "cliente"}],
    )

    await ensure_start_partner_bridge(db, START_CLIENT)

    user = await db.users.find_one({"id": "user-esistente"})
    assert user["role"] == "cliente"


# ─── journey seedata ───────────────────────────────────────────────────────────


async def test_seeda_i_sei_step_start_e_nessuno_step_partner():
    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])

    await ensure_start_partner_bridge(db, START_CLIENT)

    steps = await db.partner_journey_steps.find({"partner_id": START_CLIENT["id"]}).to_list(50)
    ids = {s["step_id"] for s in steps}
    assert ids == {d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION}
    assert "05-script-masterclass" not in ids


async def test_il_primo_step_start_e_aperto():
    db = FakeDb(clients=[START_CLIENT])

    await ensure_start_partner_bridge(db, START_CLIENT)

    steps = await db.partner_journey_steps.find({"partner_id": START_CLIENT["id"]}).to_list(50)
    in_progress = [s for s in steps if s["status"] == "in_progress"]
    assert len(in_progress) == 1
    assert in_progress[0]["step_id"] == START_JOURNEY_STEPS_DEFINITION[0]["step_id"]
    assert not [s for s in steps if s["status"] == "done"]


# ─── upgrade additivo ──────────────────────────────────────────────────────────


async def test_upgrade_a_partner_aggiunge_i_mancanti_e_non_perde_nulla():
    """La prova che l'area unica regge: il cliente Start che diventa partner
    riceve i 18 step che gli mancano e si tiene i 6 che aveva, con i dati."""
    from services.journey_seed import seed_partner_journey

    db = FakeDb(clients=[START_CLIENT], sessions=[DIAGNOSTIC_SESSION])
    await ensure_start_partner_bridge(db, START_CLIENT)
    await db.partner_journey_steps.update_one(
        {"partner_id": START_CLIENT["id"], "step_id": "04-posizionamento"},
        {"$set": {"status": "done", "data": {"answers": {"nicchia": "gia' scritto"}}}},
    )
    await db.partners.update_one({"id": START_CLIENT["id"]}, {"$set": {"tier": "partnership"}})

    created = await seed_partner_journey(db, START_CLIENT["id"], tier="partnership")

    steps = await db.partner_journey_steps.find({"partner_id": START_CLIENT["id"]}).to_list(50)
    ids = {s["step_id"] for s in steps}
    canonical_ids = {d["step_id"] for d in JOURNEY_STEPS_DEFINITION}
    start_ids = {d["step_id"] for d in START_JOURNEY_STEPS_DEFINITION}

    assert created == len(canonical_ids - start_ids)
    assert canonical_ids <= ids, "gli step partner mancanti devono essere arrivati"
    assert start_ids <= ids, "gli step Start non devono sparire"

    posizionamento = next(s for s in steps if s["step_id"] == "04-posizionamento")
    assert posizionamento["status"] == "done"
    assert posizionamento["data"]["answers"]["nicchia"] == "gia' scritto"
