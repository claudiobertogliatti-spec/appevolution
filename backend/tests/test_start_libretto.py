"""
Libretto del progetto Ciak Start: un PDF che mostra solo i materiali APPROVATI,
con parole di Start (niente EVO/Workbook) e un solo cenno alla Partnership in fondo.
"""
import pytest
from fastapi import HTTPException

from routers import partner_journey
from services import start_libretto as sl

pytestmark = pytest.mark.unit

POS = {"type": "positioning", "frase": "Aiuto le neomamme a rientrare nel lavoro",
       "elementi": {"brand": "Nuovi inizi", "categoria": "orientamento"}, "promessa": "Un piano chiaro"}
BRAND = {"colors": ["#0F2A4A", "#5B7C99", "#D9A441"], "tone_of_voice": "Caldo e rassicurante",
         "parole_chiave": ["presenza", "autenticita"], "font": "Poppins"}
SOCIAL = {"type": "social_profiles", "nome_visualizzato": "Linda Pavia | Nuovi inizi",
          "instagram": {"bio": "Orientamento per neomamme"}, "in_evidenza": ["Chi sono", "Il metodo"]}
VETRINA = {"type": "showcase", "live_url": "https://linda.example.it"}
CALENDARIO = {"type": "content_plan_90d", "calendar": {
    "ritmo": "Un ciclo di 60 giorni, da ripetere.",
    "fasi": [{"fase": "Presenza e valore", "obiettivo": "Esisti", "giorni": [{}, {}, {}]}]}}


def _html(approvati):
    return sl.render_libretto_html("Linda Pavia", {d["type"]: d for d in approvati}, BRAND)


def test_solo_gli_approvati_compaiono_e_gli_altri_sono_in_lavorazione():
    html = _html([POS])
    assert "1 su 5 materiali pronti" in html
    assert "Aiuto le neomamme a rientrare nel lavoro" in html
    assert "Marchio: in lavorazione" in html and "Profili social: in lavorazione" in html
    # il marchio NON approvato non deve mostrare i colori anche se il brand kit esiste
    assert "#0F2A4A" not in html


def test_con_marchio_approvato_si_vedono_colori_e_voce():
    html = _html([POS, {"type": "brand_kit"}])
    assert "2 su 5 materiali pronti" in html
    assert "#0F2A4A" in html and "Caldo e rassicurante" in html and "presenza" in html


def test_tutto_approvato_mostra_social_sito_e_ciclo():
    html = _html([POS, {"type": "brand_kit"}, SOCIAL, VETRINA, CALENDARIO])
    assert "Tutti e 5 i materiali sono pronti" in html
    assert "Orientamento per neomamme" in html and "Chi sono" in html
    assert "https://linda.example.it" in html
    assert "Presenza e valore" in html and "3 contenuti" in html and "da ripetere" in html


def test_indirizzo_non_https_non_compare():
    html = _html([{"type": "showcase", "live_url": "http://insicuro.example.it"}])
    assert "insicuro.example.it" not in html
    assert "la mettiamo online" in html


def test_parole_di_start_e_un_solo_cenno_alla_partnership():
    html = _html([POS])
    for vietata in ("Metodo EVO", "Workbook", "Fase Esamina", "14 fasi"):
        assert vietata not in html
    assert html.count("Partnership") == 1
    assert "non paghi due volte" in html and "si scala per intero" in html


def test_i_testi_del_calendario_hanno_gli_accenti_non_gli_apostrofi():
    cal = {"type": "content_plan_90d", "calendar": {
        "ritmo": "Questo e' un ciclo di 60 giorni, pensato per ripetersi.",
        "fasi": [{"fase": "Prova e desiderio", "obiettivo": "Prove e il tuo perche': fai desiderare la soluzione.",
                  "giorni": [{}]}]}}
    html = _html([cal])
    assert "Questo è un ciclo" in html and "tuo perché" in html
    assert "e' un ciclo" not in html and "perche'" not in html


def test_la_pagina_pronta_ma_non_online_usa_l_accento():
    html = _html([{"type": "showcase"}])
    assert "La tua pagina è pronta" in html and "e' pronta" not in html


def test_il_testo_del_cliente_e_escapato():
    html = _html([{**POS, "frase": "<script>alert(1)</script>"}])
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


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
    def __init__(self, docs=()):
        self.docs = [dict(d) for d in docs]

    async def find_one(self, q, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                return dict(d)
        return None

    def find(self, q, projection=None):
        return _Cursor([dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())])


class _Db:
    def __init__(self, deliverables=(), clienti=None):
        self.ciak_clients = _Coll(clienti if clienti is not None else [
            {"id": "c1", "name": "Linda Pavia", "access_level": "cliente_start"}])
        self.ciak_start_deliverables = _Coll(deliverables)
        self.partner_journey_steps = _Coll([{"partner_id": "c1", "step_id": "03-brand-kit", "data": BRAND}])


@pytest.mark.asyncio
async def test_genera_usa_solo_gli_approvati(monkeypatch):
    catturato = {}

    async def _render(html, etichetta="Ciak"):
        catturato["html"] = html
        return b"%PDF"

    monkeypatch.setattr(sl, "render_pdf", _render)
    db = _Db([
        {**POS, "partner_id": "c1", "approval_status": "approved"},
        {**SOCIAL, "partner_id": "c1", "approval_status": "pending_review"},
        {**VETRINA, "partner_id": "altro", "approval_status": "approved"},
    ])
    assert await sl.genera_libretto_start_pdf(db, "c1") == b"%PDF"
    html = catturato["html"]
    assert "Aiuto le neomamme" in html and "Orientamento per neomamme" not in html
    assert "linda.example.it" not in html and "1 su 5 materiali pronti" in html


@pytest.mark.asyncio
async def test_endpoint_riservato_ai_clienti_start(monkeypatch):
    async def _ok(partner_id, credentials):
        return object()
    monkeypatch.setattr(partner_journey, "require_partner_or_admin_for_partner", _ok)
    monkeypatch.setattr(partner_journey, "db", _Db(clienti=[{"id": "c9", "name": "X", "access_level": "lead"}]))
    with pytest.raises(HTTPException) as exc:
        await partner_journey.get_start_libretto_pdf("c9", credentials=None)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_endpoint_restituisce_il_pdf(monkeypatch):
    async def _ok(partner_id, credentials):
        return object()

    async def _pdf(db, client_id):
        return b"%PDF-libretto"
    monkeypatch.setattr(partner_journey, "require_partner_or_admin_for_partner", _ok)
    monkeypatch.setattr(partner_journey, "db", _Db())
    monkeypatch.setattr(sl, "genera_libretto_start_pdf", _pdf)
    res = await partner_journey.get_start_libretto_pdf("c1", credentials=None)
    assert res.body == b"%PDF-libretto" and res.media_type == "application/pdf"
