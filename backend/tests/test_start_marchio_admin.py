"""
Admin: imposta a mano il marchio di un cliente Start (identita' gia' esistente,
es. studio esterno). Scrive solo i dati del brand kit con la stessa validazione
della pagina del cliente. DB fittizio.
"""
import pytest
from fastapi import HTTPException

from routers import ciak_admin

pytestmark = pytest.mark.unit

ADMIN = type("A", (), {"email": "claudio@x.it"})()
START = {"id": "c1", "name": "Linda Pavia", "access_level": "cliente_start"}
COLORI = ["#402e36", "#a97a98", "#f2f2e5"]


class _Coll:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return dict(d)
        return None

    async def update_one(self, query, update):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                for k, v in update["$set"].items():
                    if k.startswith("data."):
                        d.setdefault("data", {})[k[5:]] = v
                    else:
                        d[k] = v
                return


class _Db:
    def __init__(self, clients, steps):
        self.ciak_clients = _Coll(clients)
        self.partner_journey_steps = _Coll(steps)


def _body(**valori):
    return ciak_admin.MarchioStartAdminBody(valori=valori)


@pytest.mark.asyncio
async def test_palette_miei_e_logo_salvati_senza_toccare_stato(monkeypatch):
    step = {"partner_id": "c1", "step_id": "03-brand-kit", "status": "in_progress",
            "data": {"font": "Poppins", "brand_completed_at": "2026-10-01"}}
    db = _Db([START], [step])
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.imposta_marchio_start(
        "c1", _body(palette_id="miei", colori_miei=COLORI, logo_url="https://x.it/ape.svg"), admin=ADMIN)
    assert res["success"] is True
    salvato = db.partner_journey_steps.docs[0]
    assert salvato["data"]["colors"] == ["#402E36", "#A97A98", "#F2F2E5"]
    assert salvato["data"]["colore_primario"] == "#402E36"
    assert salvato["data"]["logo_url"] == "https://x.it/ape.svg"
    assert salvato["data"]["font"] == "Poppins"  # non toccato
    assert salvato["data"]["brand_completed_at"] == "2026-10-01"  # non toccato
    assert salvato["status"] == "in_progress"  # lo stato non cambia
    assert salvato["last_edited_by"] == "claudio@x.it"


@pytest.mark.asyncio
async def test_valori_non_validi_422_e_niente_scritto(monkeypatch):
    db = _Db([START], [{"partner_id": "c1", "step_id": "03-brand-kit", "data": {}}])
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.imposta_marchio_start(
            "c1", _body(palette_id="miei", colori_miei=["viola", "#a97a98", "#f2f2e5"]), admin=ADMIN)
    assert exc.value.status_code == 422
    assert db.partner_journey_steps.docs[0]["data"] == {}


@pytest.mark.asyncio
async def test_cliente_non_start_409_e_step_mancante_409(monkeypatch):
    monkeypatch.setattr(ciak_admin, "db", _Db([{"id": "c2", "access_level": "lead"}], []))
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.imposta_marchio_start("c2", _body(palette_id="miei", colori_miei=COLORI), admin=ADMIN)
    assert exc.value.status_code == 409
    monkeypatch.setattr(ciak_admin, "db", _Db([START], []))
    with pytest.raises(HTTPException) as exc:
        await ciak_admin.imposta_marchio_start("c1", _body(palette_id="miei", colori_miei=COLORI), admin=ADMIN)
    assert exc.value.status_code == 409
