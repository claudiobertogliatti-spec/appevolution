"""Durabilita' della consegna post-acquisto Blueprint.

Dopo il pagamento da 27 EUR il webhook deve consegnare due cose:
  1. il link di accesso all'area cliente (magic link, via Systeme);
  2. l'analisi strategica.

Entrambe partivano con `asyncio.create_task(...)`, cioe' fire-and-forget:

  - le eccezioni sollevate dentro il task NON arrivano al `try/except` che
    scrive `ciak_client_access_recovery`, perche' `create_task` ritorna subito.
    Se Systeme e' irraggiungibile il cliente non riceve il link e **non viene
    creata nessuna voce di recovery**: resta solo un `logger.warning`;
  - un riciclo del worker Cloud Run fra la risposta al webhook e l'esecuzione
    del task fa sparire la consegna senza lasciare traccia.

`BackgroundTasks` di FastAPI risolve il secondo punto (Cloud Run attende il
completamento delle background task prima di riciclare la worker — stesso
motivo per cui proposta.py le usa gia' per l'email post-firma). Il primo si
risolve facendo in modo che il fallimento della consegna scriva la recovery.
"""
import importlib.util
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

MODULE_PATH = Path(__file__).resolve().parents[1] / "routers" / "checkout.py"
SPEC = importlib.util.spec_from_file_location("checkout_durability", MODULE_PATH)
checkout = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(checkout)


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, query, sort=None, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("R", (), {"inserted_id": doc.get("id")})()

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get("$set", {}))
                return type("R", (), {"modified_count": 1})()
        return type("R", (), {"modified_count": 0})()

    async def replace_one(self, query, doc):
        return type("R", (), {"modified_count": 1})()


class FakeDb:
    def __init__(self):
        self.diagnostic_sessions = FakeCollection()
        self.ciak_clients = FakeCollection()
        self.ciak_client_access_recovery = FakeCollection()
        self.ciak_orphan_purchases = FakeCollection()


class RecordingBackgroundTasks:
    """Sostituto di fastapi.BackgroundTasks che tiene traccia delle chiamate."""

    def __init__(self):
        self.tasks = []

    def add_task(self, func, *args, **kwargs):
        self.tasks.append((func, args, kwargs))

    async def run_all(self):
        for func, args, kwargs in list(self.tasks):
            await func(*args, **kwargs)


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(checkout, "db", fake)
    return fake


@pytest.mark.asyncio
async def test_delivery_helper_reports_failure_instead_of_swallowing(monkeypatch):
    """`_deliver_client_access_link` non deve piu' inghiottire l'errore.

    Finche' restituiva None qualunque cosa accadesse, il chiamante non poteva
    sapere se il link era davvero partito: un Systeme irraggiungibile diventava
    un `logger.warning` e il cliente non riceveva niente.
    """
    async def emit_boom(**kwargs):
        raise RuntimeError("Systeme 503")

    async def fields_ok(**kwargs):
        return None

    import services.ciak_systeme as systeme
    monkeypatch.setattr(systeme, "ciak_emit_event", emit_boom)
    monkeypatch.setattr(systeme, "ciak_set_contact_fields", fields_ok)

    with pytest.raises(RuntimeError):
        await checkout._deliver_client_access_link(
            email="mario@example.com",
            name="Mario",
            magic_link="https://www.ciak.io/cliente/accesso?token=x",
            expires_at="2026-08-14T00:00:00+00:00",
        )


@pytest.mark.asyncio
async def test_contact_field_failure_alone_does_not_block_delivery(monkeypatch):
    """Il custom field e' accessorio: e' il tag che fa partire il workflow."""
    async def fields_boom(**kwargs):
        raise RuntimeError("campo assente su Systeme")

    async def emit_ok(**kwargs):
        return None

    import services.ciak_systeme as systeme
    monkeypatch.setattr(systeme, "ciak_set_contact_fields", fields_boom)
    monkeypatch.setattr(systeme, "ciak_emit_event", emit_ok)

    await checkout._deliver_client_access_link(
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=x",
        expires_at="2026-08-14T00:00:00+00:00",
    )


@pytest.mark.asyncio
async def test_failed_delivery_writes_recovery_entry(db, monkeypatch):
    """Systeme giu' => voce in ciak_client_access_recovery, non solo un log."""

    async def boom(**kwargs):
        raise RuntimeError("Systeme irraggiungibile")

    monkeypatch.setattr(checkout, "_deliver_client_access_link", boom)

    await checkout._deliver_access_or_record_recovery(
        data={"id": "cs_test"},
        diagnostic={"session_token": "tok-1", "user_name": "Mario"},
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=x",
        expires_at="2026-08-14T00:00:00+00:00",
    )

    assert len(db.ciak_client_access_recovery.docs) == 1
    entry = db.ciak_client_access_recovery.docs[0]
    assert entry["status"] == "pending"
    assert entry["email"] == "mario@example.com"
    assert "Systeme irraggiungibile" in entry["error"]


@pytest.mark.asyncio
async def test_successful_delivery_writes_no_recovery(db, monkeypatch):
    async def ok(**kwargs):
        return None

    monkeypatch.setattr(checkout, "_deliver_client_access_link", ok)

    await checkout._deliver_access_or_record_recovery(
        data={"id": "cs_test"},
        diagnostic={"session_token": "tok-1"},
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=x",
        expires_at="2026-08-14T00:00:00+00:00",
    )

    assert db.ciak_client_access_recovery.docs == []


@pytest.mark.asyncio
async def test_recovery_entry_never_stores_the_magic_link(db, monkeypatch):
    """La coda di recovery non e' il posto dove parcheggiare una credenziale.

    Il magic link fa entrare COME il cliente per 48h. In recovery basta sapere
    CHI va recuperato: il link si rigenera, non si conserva.
    """

    async def boom(**kwargs):
        raise RuntimeError("ko")

    monkeypatch.setattr(checkout, "_deliver_client_access_link", boom)

    await checkout._deliver_access_or_record_recovery(
        data={"id": "cs_test"},
        diagnostic={"session_token": "tok-1"},
        email="mario@example.com",
        name="Mario",
        magic_link="https://www.ciak.io/cliente/accesso?token=SEGRETO",
        expires_at="2026-08-14T00:00:00+00:00",
    )

    assert "SEGRETO" not in repr(db.ciak_client_access_recovery.docs)


def test_no_fire_and_forget_left_in_the_delivery_path():
    """Le consegne indispensabili non tornano a `create_task`.

    Il tracking (Meta CAPI) puo' restare fire-and-forget: se si perde un evento
    di analytics non si perde una consegna al cliente. Accesso e analisi no.
    """
    source = MODULE_PATH.read_text(encoding="utf-8")
    delivery_block = source.split("async def _handle_checkout_completed")[1]
    for indispensabile in ("_deliver_access_or_record_recovery", "processa_acquisto"):
        assert f"create_task({indispensabile}" not in delivery_block.replace(" ", "")
        assert f"add_task(\n            {indispensabile}" in delivery_block or (
            indispensabile in delivery_block
        )
