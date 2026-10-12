"""Admin: la coda delle domande che l'assistente di Start ha passato al team."""
import pytest
from fastapi import HTTPException

from routers import ciak_admin

pytestmark = pytest.mark.unit

START = {"id": "c1", "name": "Linda Pavia", "access_level": "cliente_start"}


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, chiave, verso):
        self.docs = sorted(self.docs, key=lambda d: d.get(chiave) or "", reverse=verso < 0)
        return self

    def limit(self, n):
        self.docs = self.docs[:n]
        return self

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

    @staticmethod
    def _ok(d, q):
        return all(d.get(k) == v for k, v in q.items())

    async def find_one(self, q, projection=None):
        return next((dict(d) for d in self.docs if self._ok(d, q)), None)

    def find(self, q, projection=None):
        return _Cursor([d for d in self.docs if self._ok(d, q)])

    async def update_one(self, q, upd):
        for d in self.docs:
            if self._ok(d, q):
                d.update(upd.get("$set", {}))
                return type("R", (), {"matched_count": 1})()
        return type("R", (), {"matched_count": 0})()


class _Db:
    def __init__(self, righe):
        self.ciak_clients = _Coll([START, {"id": "c2", "access_level": "cliente_blueprint"}])
        self.ciak_start_assistente = _Coll(righe)


def _riga(i, at, passato, gestita=False, client="c1"):
    return {"id": i, "client_id": client, "at": at, "domanda": f"d{i}", "risposta": "", "passato_al_team": passato, "gestita": gestita, "motivo": "non_sa" if passato else ""}


ADMIN = type("A", (), {"email": "claudio@x.it"})()


@pytest.mark.asyncio
async def test_coda_conta_solo_le_passate_non_gestite_e_non_mostra_le_altre_di_altri_clienti(monkeypatch):
    db = _Db([
        _riga("a", "2026-10-12T09:00", True),
        _riga("b", "2026-10-12T10:00", False),
        _riga("c", "2026-10-12T11:00", True, gestita=True),
        _riga("x", "2026-10-12T12:00", True, client="c9"),
    ])
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.assistente_start_cliente("c1", _admin=ADMIN)
    assert [r["id"] for r in res["righe"]] == ["c", "b", "a"]  # piu' recenti prima, solo di c1
    assert res["da_rispondere"] == 1


@pytest.mark.asyncio
async def test_segna_gestita_traccia_chi_e_non_tocca_altri_clienti(monkeypatch):
    db = _Db([_riga("a", "2026-10-12T09:00", True), _riga("x", "2026-10-12T12:00", True, client="c9")])
    monkeypatch.setattr(ciak_admin, "db", db)
    assert (await ciak_admin.assistente_start_gestita("c1", "a", admin=ADMIN)) == {"success": True}
    riga = db.ciak_start_assistente.docs[0]
    assert riga["gestita"] is True and riga["gestita_da"] == "claudio@x.it" and riga["gestita_at"]
    with pytest.raises(HTTPException) as e:  # una riga di un altro cliente non si tocca
        await ciak_admin.assistente_start_gestita("c1", "x", admin=ADMIN)
    assert e.value.status_code == 404
    assert db.ciak_start_assistente.docs[1]["gestita"] is False


@pytest.mark.asyncio
async def test_cliente_senza_start_409(monkeypatch):
    monkeypatch.setattr(ciak_admin, "db", _Db([]))
    with pytest.raises(HTTPException) as e:
        await ciak_admin.assistente_start_cliente("c2", _admin=ADMIN)
    assert e.value.status_code == 409
