"""
Ciak Start: i materiali approvati diventano PDF veri nell'archivio del cliente,
con parole di Start (niente "EVO", che e' della Partnership). Render/upload mockati.
"""
import pytest

from routers import ciak_admin
from services import brand_kit_pdf_renderer as bk
from services import start_pdf

pytestmark = pytest.mark.unit

POS = {
    "partner_id": "c1", "type": "positioning", "approval_status": "approved",
    "frase": "Aiuto le neomamme a rientrare nel mondo del lavoro con un piano chiaro",
    "elementi": {
        "brand": "Nuovi inizi", "categoria": "orientamento professionale",
        "idea_differenziante": "percorso One to One", "a_differenza_di": "percorsi standard",
        "vantaggio_cliente": "un piano d'azione utile",
    },
    "promessa": "Ti aiuto a capire la strada professionale da prendere",
}
BRAND = {"colors": ["#0F2A4A", "#5B7C99", "#D9A441"], "tone_of_voice": "Parlo in modo caldo",
         "parole_chiave": ["autenticita", "presenza"]}


def test_posizionamento_start_parla_di_start_non_di_evo():
    html = start_pdf.render_posizionamento_html(POS, "Linda Pavia")
    assert "Ciak Start" in html and "Aiuto le neomamme" in html and "Nuovi inizi" in html
    assert "Ti aiuto a capire la strada professionale" in html
    assert "Metodo EVO" not in html and "Fase Esamina" not in html


def test_brand_kit_start_senza_parole_della_partnership():
    html = bk.render_brand_kit_html(BRAND, "Linda Pavia", start=True)
    assert "Ciak Start" in html and "Il tuo marchio" in html
    assert "Metodo EVO" not in html and "Fase Esamina" not in html
    assert "Parole da evitare" not in html  # a Start non viene chiesto


def test_brand_kit_partnership_resta_com_era():
    html = bk.render_brand_kit_html(BRAND, "Daniele")
    assert "Metodo EVO" in html and "Il tuo Brand Kit" in html and "Parole da evitare" in html


def _match(doc, q):
    return all(doc.get(k) == v for k, v in q.items() if not isinstance(v, dict))


class _Coll:
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, q, projection=None):
        for d in self.docs:
            if _match(d, q):
                return dict(d)
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_many(self, q, upd):
        for d in self.docs:
            if _match(d, q) and d.get("superseded") is not True:
                d.update(upd["$set"])


class _Db:
    def __init__(self, deliverables, files=()):
        self.ciak_start_deliverables = _Coll(deliverables)
        self.ciak_clients = _Coll([{"id": "c1", "name": "Linda Pavia"}])
        self.partner_journey_steps = _Coll([{"partner_id": "c1", "step_id": "03-brand-kit", "data": BRAND}])
        self.files = _Coll(files)


@pytest.fixture
def servizi(monkeypatch):
    chiamate = {"render": [], "upload": []}

    async def _pdf_brand(dati, nome, *, start=False):
        chiamate["render"].append(("brand", dati, nome, start))
        return b"%PDF-brand"

    async def _pdf_html(html, etichetta="Ciak"):
        chiamate["render"].append(("html", etichetta))
        return b"%PDF-pos"

    async def _upload(pdf, client_id, filename):
        chiamate["upload"].append(filename)
        return {"url": "https://res.cloudinary.com/x/raw/" + filename, "public_id": "p", "storage": "cloudinary"}

    monkeypatch.setattr(start_pdf, "genera_brand_kit_pdf", _pdf_brand)
    monkeypatch.setattr(start_pdf, "render_pdf", _pdf_html)
    monkeypatch.setattr(start_pdf, "upload_brand_kit_pdf", _upload)
    return chiamate


@pytest.mark.asyncio
async def test_approvato_registra_il_pdf_nell_archivio_del_cliente(servizi):
    db = _Db([{**POS, "type": "brand_kit"}])
    assert await start_pdf.registra_pdf_start(db, "c1", "brand_kit") is True
    (f,) = db.files.docs
    assert f["category"] == "brand_kit" and f["step_id"] == "03-brand-kit" and f["step_ref"] == "03-brand-kit"
    assert f["source"] == "ciak_start" and f["content_type"] == "application/pdf" and f["superseded"] is False
    assert f["original_name"] == "Il tuo marchio - Linda Pavia.pdf"
    assert servizi["render"][0][1] == BRAND and servizi["render"][0][3] is True  # versione Start


@pytest.mark.asyncio
async def test_posizionamento_usa_il_suo_renderer_e_la_sua_categoria(servizi):
    db = _Db([POS])
    assert await start_pdf.registra_pdf_start(db, "c1", "positioning") is True
    assert db.files.docs[0]["category"] == "posizionamento" and db.files.docs[0]["step_id"] == "04-posizionamento"


@pytest.mark.asyncio
async def test_non_approvato_non_crea_nulla(servizi):
    db = _Db([{**POS, "approval_status": "pending_review"}])
    assert await start_pdf.registra_pdf_start(db, "c1", "positioning") is False
    assert db.files.docs == [] and servizi["upload"] == []


@pytest.mark.asyncio
async def test_rifare_il_pdf_sostituisce_il_precedente(servizi):
    vecchio = {"file_id": "old", "partner_id": "c1", "category": "posizionamento", "source": "ciak_start",
               "superseded": False}
    db = _Db([POS], files=[vecchio])
    assert await start_pdf.registra_pdf_start(db, "c1", "positioning") is True
    assert [f["superseded"] for f in db.files.docs] == [True, False]


@pytest.mark.asyncio
async def test_storage_locale_non_registra_un_file_che_sparira(monkeypatch, servizi):
    async def _locale(pdf, client_id, filename):
        return {"url": "/tmp/x.pdf", "public_id": "", "storage": "local"}
    monkeypatch.setattr(start_pdf, "upload_brand_kit_pdf", _locale)
    db = _Db([POS])
    assert await start_pdf.registra_pdf_start(db, "c1", "positioning") is False
    assert db.files.docs == []


@pytest.mark.asyncio
async def test_render_fallito_non_solleva(monkeypatch, servizi):
    async def _rotto(html, etichetta="Ciak"):
        raise RuntimeError("chrome giu")
    monkeypatch.setattr(start_pdf, "render_pdf", _rotto)
    db = _Db([POS])
    assert await start_pdf.registra_pdf_start(db, "c1", "positioning") is False
    assert db.files.docs == []


@pytest.mark.asyncio
async def test_tipo_senza_pdf_e_ignorato(servizi):
    assert await start_pdf.registra_pdf_start(_Db([POS]), "c1", "showcase") is False


@pytest.mark.asyncio
async def test_endpoint_crea_pdf_riporta_creati_e_falliti(monkeypatch, servizi):
    class _Clienti(_Coll):
        pass
    db = _Db([POS, {**POS, "type": "brand_kit", "approval_status": "pending_review"}])
    db.ciak_clients = _Clienti([{"id": "c1", "name": "Linda", "access_level": "cliente_start"}])
    monkeypatch.setattr(ciak_admin, "db", db)
    res = await ciak_admin.crea_pdf_start("c1", _admin=object())
    assert res == {"success": True, "creati": ["positioning"], "falliti": []}
