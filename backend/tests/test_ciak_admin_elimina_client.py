"""Eliminazione a cascata di un cliente Ciak (DELETE /api/admin/ciak/clients/{id}).

Colma il buco per cui un cliente Ciak Start (ciak_clients + ponte partner +
journey) non era rimovibile: restava in Consegne Start e nella lista clienti.
Speculare a DELETE /lead e DELETE /partner/{id}.

Invarianti verificate qui:
- cascata su TUTTE le collezioni d'identita'/percorso legate all'id;
- i record FINANZIARI non si toccano (registro storico);
- salvaguardia sull'email (un id sbagliato non cancella il cliente altrui);
- 404 su cliente inesistente.
"""
import pytest

pytestmark = pytest.mark.unit


def _matches(doc, query):
    if "$or" in query:
        return any(_matches(doc, sub) for sub in query["$or"])
    return all(doc.get(k) == v for k, v in query.items())


class FakeCol:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _matches(d, query):
                r = dict(d)
                r.pop("_id", None)
                return r
        return None

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                self.docs.pop(i)
                return type("R", (), {"deleted_count": 1})()
        return type("R", (), {"deleted_count": 0})()

    async def delete_many(self, query):
        keep = [d for d in self.docs if not _matches(d, query)]
        n = len(self.docs) - len(keep)
        self.docs = keep
        return type("R", (), {"deleted_count": n})()


CID = "c-test-123"
EMAIL = "test+ciakstart@evolution-pro.it"


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCol([{"id": CID, "email": EMAIL, "access_level": "cliente_start"}])
        self.partners = FakeCol([{"id": CID, "tier": "start"}])
        self.users = FakeCol([{"id": CID, "partner_id": CID, "email": EMAIL}])
        self.partner_journey_steps = FakeCol([
            {"partner_id": CID, "step_id": "04-posizionamento"},
            {"partner_id": CID, "step_id": "start-profili"},
            {"partner_id": "altro", "step_id": "04-posizionamento"},  # di un ALTRO cliente
        ])
        self.ciak_start_deliverables = FakeCol([{"partner_id": CID, "type": "social_profiles"}])
        self.ciak_client_login_tokens = FakeCol([{"client_id": CID, "token_hash": "x"}])
        self.ciak_client_access_recovery = FakeCol([{"client_id": CID, "tier": "start"}])
        self.ciak_onboarding_emails = FakeCol([{"client_id": CID, "email": EMAIL}])
        # Registro finanziario: NON deve essere toccato.
        self.payment_transactions = FakeCol([{"client_id": CID, "amount_cents": 39000}])
        self.payments = FakeCol([{"client_id": CID, "amount": 390.0}])


ADMIN = type("Admin", (), {"email": "claudio@evolution-pro.it", "user_id": "a1"})()


@pytest.mark.asyncio
async def test_elimina_cliente_a_cascata_su_tutte_le_collezioni(monkeypatch):
    from routers import ciak_admin

    database = FakeDb()
    monkeypatch.setattr(ciak_admin, "db", database)

    res = await ciak_admin.elimina_ciak_client(client_id=CID, email=EMAIL, admin=ADMIN)

    assert res["ok"] is True
    d = res["deleted"]
    assert d["ciak_clients"] == 1
    assert d["partners"] == 1
    assert d["users"] == 1
    assert d["partner_journey_steps"] == 2  # solo i 2 del cliente, non quello "altro"
    assert d["ciak_start_deliverables"] == 1
    assert d["ciak_client_login_tokens"] == 1
    assert d["ciak_client_access_recovery"] == 1
    assert d["ciak_onboarding_emails"] == 1

    # Sparito da tutte le collezioni d'identita'.
    assert database.ciak_clients.docs == []
    assert database.partners.docs == []
    assert database.users.docs == []
    assert database.ciak_start_deliverables.docs == []
    # Lo step di un ALTRO cliente resta.
    assert [s["partner_id"] for s in database.partner_journey_steps.docs] == ["altro"]


@pytest.mark.asyncio
async def test_non_tocca_i_record_finanziari(monkeypatch):
    from routers import ciak_admin

    database = FakeDb()
    monkeypatch.setattr(ciak_admin, "db", database)

    await ciak_admin.elimina_ciak_client(client_id=CID, email=EMAIL, admin=ADMIN)

    # La contabilita' e' un registro storico: resta.
    assert len(database.payment_transactions.docs) == 1
    assert len(database.payments.docs) == 1


@pytest.mark.asyncio
async def test_email_che_non_combacia_annulla_tutto(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    database = FakeDb()
    monkeypatch.setattr(ciak_admin, "db", database)

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.elimina_ciak_client(client_id=CID, email="sbagliata@x.it", admin=ADMIN)
    assert exc.value.status_code == 400
    # Nulla e' stato cancellato.
    assert len(database.ciak_clients.docs) == 1
    assert len(database.partner_journey_steps.docs) == 3


@pytest.mark.asyncio
async def test_cliente_inesistente_da_404(monkeypatch):
    from fastapi import HTTPException
    from routers import ciak_admin

    monkeypatch.setattr(ciak_admin, "db", FakeDb())

    with pytest.raises(HTTPException) as exc:
        await ciak_admin.elimina_ciak_client(client_id="ignoto", email=EMAIL, admin=ADMIN)
    assert exc.value.status_code == 404


def test_endpoint_protetto_da_require_ciak_admin():
    from routers import ciak_admin

    route = next(
        (r for r in ciak_admin.router.routes
         if getattr(r, "path", "") == "/api/admin/ciak/clients/{client_id}"
         and "DELETE" in getattr(r, "methods", set())),
        None,
    )
    assert route is not None
    nomi = [d.call.__name__ for d in route.dependant.dependencies]
    assert "require_ciak_admin" in nomi
