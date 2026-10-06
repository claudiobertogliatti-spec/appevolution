"""
Admin: lettura delle bozze Start per verificare il lavoro prima di approvarlo.
Sola lettura: mostra anche le bozze NON approvate e l'html della vetrina, che il
cliente non vede. DB fittizio.
"""
import pytest
from fastapi import HTTPException

from routers import ciak_admin

pytestmark = pytest.mark.unit


def _match(doc, query):
    return all(doc.get(k) == v for k, v in query.items())


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _match(d, query):
                return dict(d)
        return None

    def find(self, query, projection=None):
        return _Cursor([dict(d) for d in self.docs if _match(d, query)])


class _Db:
    def __init__(self, clients, steps, deliverables):
        self.ciak_clients = _Coll(clients)
        self.partner_journey_steps = _Coll(steps)
        self.ciak_start_deliverables = _Coll(deliverables)


ADMIN = object()
START = {"id": "c1", "name": "Linda Pavia", "access_level": "cliente_start"}


@pytest.mark.asyncio
async def test_bozze_mostra_risposte_e_bozza_non_approvata(monkeypatch):
    db = _Db(
        [START],
        [
            {"partner_id": "c1", "step_id": "04-posizionamento", "data": {"answers": {"nicchia": "yoga"}}},
            {"partner_id": "c1", "step_id": "03-brand-kit", "data": {"font": "Poppins"}},
        ],
        [{
            "partner_id": "c1", "type": "positioning", "approval_status": "pending_review",
            "frase": "Aiuto chi fa yoga", "generated_by": "x@y.it", "generated_at": "2026-10-06",
        }],
    )
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.bozze_start("c1", _admin=ADMIN)
    assert res["risposte"] == {"nicchia": "yoga"}
    assert res["marchio_scelto"] == {"font": "Poppins"}
    pos = next(i for i in res["items"] if i["type"] == "positioning")
    assert pos["generato"] is True and pos["approval_status"] == "pending_review"
    assert pos["contenuto"] == {"frase": "Aiuto chi fa yoga"}  # niente campi tecnici
    assert "generated_by" not in pos["contenuto"]


@pytest.mark.asyncio
async def test_bozze_non_generato_e_vetrina_con_html(monkeypatch):
    db = _Db(
        [START],
        [{"partner_id": "c1", "step_id": "start-contenuti-90", "generation_status": "in_corso"}],
        [{"partner_id": "c1", "type": "showcase", "html": "<html>ok</html>", "approval_status": "approved",
          "live_url": "https://linda.it"}],
    )
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.bozze_start("c1", _admin=ADMIN)
    tipi = [i["type"] for i in res["items"]]
    assert tipi == ["positioning", "brand_kit", "social_profiles", "showcase",
                    "content_plan_90d", "partnership_readiness"]
    assert next(i for i in res["items"] if i["type"] == "brand_kit")["generato"] is False
    vet = next(i for i in res["items"] if i["type"] == "showcase")
    assert vet["html"] == "<html>ok</html>" and vet["live_url"] == "https://linda.it"
    cal = next(i for i in res["items"] if i["type"] == "content_plan_90d")
    assert cal["generato"] is False and cal["generation_status"] == "in_corso"


@pytest.mark.asyncio
async def test_bozze_cliente_non_start_409(monkeypatch):
    monkeypatch.setattr(ciak_admin, "db", _Db([{"id": "c2", "access_level": "lead"}], [], []))
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.bozze_start("c2", _admin=ADMIN)
    assert exc.value.status_code == 409
