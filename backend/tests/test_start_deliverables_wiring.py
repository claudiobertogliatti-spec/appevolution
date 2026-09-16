"""
Cablaggio dei motori Start "profili social" e "sito vetrina" (traccia A).
Prima erano generatori orfani (nessun endpoint) e l'approvazione era in deadlock.
Qui: gli endpoint /genera producono il deliverable + avanzano lo step, e
l'approvazione funziona (niente piu' "step done con dati" irraggiungibile).
Generatori e statement mockati; DB fittizio.
"""
import pytest

from routers import ciak_admin
from services import start_final_deliverables as sfd
from services import posizionamento_statement as pos

pytestmark = pytest.mark.unit


def _match(doc, query):
    return all(doc.get(k) == v for k, v in query.items() if not str(k).startswith("$"))


class _Coll:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _match(d, query):
                return {k: v for k, v in d.items() if k != "_id"}
        return None

    async def update_one(self, query, update, upsert=False):
        target = next((d for d in self.docs if _match(d, query)), None)
        if target is None:
            if not upsert:
                return None
            target = {k: v for k, v in query.items() if not str(k).startswith("$")}
            target.update(update.get("$setOnInsert", {}))
            self.docs.append(target)
        target.update(update.get("$set", {}))
        return None


class _Db:
    def __init__(self, client, steps):
        self.ciak_clients = _Coll([client])
        self.partner_journey_steps = _Coll(steps)
        self.ciak_start_deliverables = _Coll([])


ADMIN = type("A", (), {"email": "claudio@evolution-pro.it"})()

CLIENT = {"id": "c1", "name": "Maria Restifo", "access_level": "cliente_start"}
POS_STEP = {
    "partner_id": "c1", "step_id": "04-posizionamento",
    "data": {"answers": {"metodo_nome": "Metodo Sabai", "nicchia": "massaggio thai", "promessa": "riempi l'agenda"}},
}
BRAND_STEP = {"partner_id": "c1", "step_id": "03-brand-kit", "data": {"colori": ["#111"], "font": "Poppins"}}


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    async def _stmt(answers):
        return {"brand": "Metodo Sabai", "categoria": "formazione", "idea_differenziante": "x", "vantaggio_cliente": "y"}
    monkeypatch.setattr(pos, "build_brand_positioning_statement", _stmt)

    async def _social(dati):
        return {"nome_visualizzato": dati.get("nome"), "instagram": {"bio": "bio"}, "_fallback": False}
    monkeypatch.setattr(sfd, "build_profili_social", _social)

    async def _vetrina(dati):
        return {"html": "<html>ok</html>", "dns_checklist": []}
    monkeypatch.setattr(sfd, "build_vetrina", _vetrina)


def _db():
    return _Db(dict(CLIENT), [dict(POS_STEP), dict(BRAND_STEP)])


@pytest.mark.asyncio
async def test_genera_profili_scrive_deliverable_e_avanza_step(monkeypatch):
    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.genera_profili_start("c1", admin=ADMIN)
    assert res["success"] is True
    d = await db.ciak_start_deliverables.find_one({"partner_id": "c1", "type": "social_profiles"})
    assert d and d["nome_visualizzato"] == "Maria Restifo" and d["approval_status"] == "pending_review"
    step = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": "start-profili"})
    assert step["status"] == "in_progress"


@pytest.mark.asyncio
async def test_genera_vetrina_scrive_deliverable(monkeypatch):
    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.genera_vetrina_start("c1", admin=ADMIN)
    assert res["deliverable"]["type"] == "showcase"
    d = await db.ciak_start_deliverables.find_one({"partner_id": "c1", "type": "showcase"})
    assert "<html>" in d["html"]


@pytest.mark.asyncio
async def test_approva_profili_niente_deadlock(monkeypatch):
    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.genera_profili_start("c1", admin=ADMIN)
    body = ciak_admin.ApprovaStartDeliverableRequest(tipo="social_profiles")
    res = await ciak_admin.approva_deliverable_start("c1", body, admin=ADMIN)
    assert res["approval_status"] == "approved"
    step = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": "start-profili"})
    assert step["status"] == "done"


@pytest.mark.asyncio
async def test_approva_senza_generare_da_409(monkeypatch):
    from fastapi import HTTPException
    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    body = ciak_admin.ApprovaStartDeliverableRequest(tipo="social_profiles")
    with pytest.raises(HTTPException) as e:
        await ciak_admin.approva_deliverable_start("c1", body, admin=ADMIN)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_approva_vetrina_richiede_live_url(monkeypatch):
    from fastapi import HTTPException
    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.genera_vetrina_start("c1", admin=ADMIN)
    # senza live_url → 409
    with pytest.raises(HTTPException) as e:
        await ciak_admin.approva_deliverable_start(
            "c1", ciak_admin.ApprovaStartDeliverableRequest(tipo="showcase"), admin=ADMIN)
    assert e.value.status_code == 409
    # con live_url → ok + salvata
    res = await ciak_admin.approva_deliverable_start(
        "c1", ciak_admin.ApprovaStartDeliverableRequest(tipo="showcase", live_url="https://maria.it"), admin=ADMIN)
    assert res["approval_status"] == "approved"
    d = await db.ciak_start_deliverables.find_one({"partner_id": "c1", "type": "showcase"})
    assert d["live_url"] == "https://maria.it"
