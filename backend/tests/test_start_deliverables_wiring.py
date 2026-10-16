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


@pytest.mark.asyncio
async def test_la_vetrina_riceve_la_foto_del_cliente(monkeypatch):
    """La foto sta nel brand kit; il generatore la legge da `dati`. Senza questo
    passaggio il ritratto non compariva mai nella vetrina."""
    visti = {}

    async def _vetrina(dati):
        visti.update(dati)
        return {"html": "<html>ok</html>", "dns_checklist": []}

    monkeypatch.setattr(sfd, "build_vetrina", _vetrina)
    step = dict(BRAND_STEP)
    step["data"] = {**BRAND_STEP["data"], "foto_url": "https://cdn.example.com/foto.jpg"}
    db = _Db(dict(CLIENT), [dict(POS_STEP), step])
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.genera_vetrina_start("c1", admin=ADMIN)
    assert visti["foto_url"] == "https://cdn.example.com/foto.jpg"


# ─── Tappa 1: posizionamento e marchio come materiali del cliente ───────────

from services.ciak_start_marchio import normalizza  # noqa: E402

MARCHIO_SCELTO = normalizza({
    "palette_id": "naturale", "font_id": "classico", "tono_id": "caldo",
    "parole_chiave": ["calma", "ascolto", "metodo"],
    "logo_url": "https://cdn.example.com/logo.png",
})
BRAND_CLIENTE = {
    "partner_id": "c1", "step_id": "03-brand-kit",
    "data": {**MARCHIO_SCELTO, "brand_completed_at": "2026-10-02T11:00:00+00:00"},
}


def _db_tappa1():
    return _Db(dict(CLIENT), [dict(POS_STEP), dict(BRAND_CLIENTE)])


@pytest.mark.asyncio
async def test_genera_posizionamento_non_cancella_le_risposte_del_cliente(monkeypatch):
    db = _db_tappa1()
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.genera_posizionamento_start("c1", admin=ADMIN)
    assert res["deliverable"]["type"] == "positioning"
    assert res["deliverable"]["elementi"]["brand"] == "Metodo Sabai"
    d = await db.ciak_start_deliverables.find_one({"partner_id": "c1", "type": "positioning"})
    assert d["approval_status"] == "pending_review"
    step = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": "04-posizionamento"})
    # Lo step e' pronto da approvare E le risposte sono ancora li'.
    assert step["approval_status"] == "pending_review"
    assert step["data"]["answers"]["metodo_nome"] == "Metodo Sabai"


@pytest.mark.asyncio
async def test_genera_marchio_da_la_scheda_e_conserva_le_scelte(monkeypatch):
    db = _db_tappa1()
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.genera_marchio_start("c1", admin=ADMIN)
    d = res["deliverable"]
    assert d["type"] == "brand_kit"
    assert d["palette"]["colori"][0] == "#1F4D3A" and d["font"]["famiglia"] == "Lora"
    assert d["logo_url"] == "https://cdn.example.com/logo.png"
    step = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": "03-brand-kit"})
    assert step["data"]["palette_id"] == "naturale"  # la scelta del cliente non si perde
    assert step["approval_status"] == "pending_review"


@pytest.mark.asyncio
async def test_genera_marchio_409_se_il_cliente_non_ha_scelto(monkeypatch):
    from fastapi import HTTPException

    db = _db()  # BRAND_STEP vecchio stile: nessuna scelta del cliente
    monkeypatch.setattr(ciak_admin, "db", db)
    with pytest.raises(HTTPException) as e:
        await ciak_admin.genera_marchio_start("c1", admin=ADMIN)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_approvando_la_tappa_1_la_readiness_la_riconosce(monkeypatch):
    db = _db_tappa1()
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.genera_posizionamento_start("c1", admin=ADMIN)
    await ciak_admin.genera_marchio_start("c1", admin=ADMIN)
    for tipo in ("positioning", "brand_kit"):
        body = ciak_admin.ApprovaStartDeliverableRequest(tipo=tipo)
        res = await ciak_admin.approva_deliverable_start("c1", body, admin=ADMIN)
        assert res["approval_status"] == "approved"
    for step_id in ("04-posizionamento", "03-brand-kit"):
        step = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": step_id})
        assert step["status"] == "done" and step["approval_status"] == "approved"
    # Le risposte del cliente sono ancora nello step dopo l'approvazione.
    pos = await db.partner_journey_steps.find_one({"partner_id": "c1", "step_id": "04-posizionamento"})
    assert pos["data"]["answers"]["nicchia"] == "massaggio thai"

    res = await ciak_admin.genera_readiness_start("c1", admin=ADMIN)
    checks = res["deliverable"]["checks"]
    assert checks["brand_kit"] is True and checks["positioning"] is True


@pytest.mark.asyncio
async def test_la_vetrina_si_approva_solo_con_un_indirizzo_https(monkeypatch):
    from fastapi import HTTPException

    db = _db()
    monkeypatch.setattr(ciak_admin, "db", db)
    await ciak_admin.genera_vetrina_start("c1", admin=ADMIN)
    for brutto in ("javascript:alert(1)", "http://example.com", "https://a.com/x y"):
        body = ciak_admin.ApprovaStartDeliverableRequest(tipo="showcase", live_url=brutto)
        with pytest.raises(HTTPException) as e:
            await ciak_admin.approva_deliverable_start("c1", body, admin=ADMIN)
        assert e.value.status_code == 422
    ok = ciak_admin.ApprovaStartDeliverableRequest(tipo="showcase", live_url="https://www.esempio.it")
    res = await ciak_admin.approva_deliverable_start("c1", ok, admin=ADMIN)
    assert res["approval_status"] == "approved"
