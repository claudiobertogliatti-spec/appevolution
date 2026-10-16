"""
Unit test: genera_blueprint — costruisce il payload delle 13 sezioni per il
renderer, riusando la ricerca mercato. Anthropic e DB mockati (gira in CI).
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

import services.ciak_analisi as ca
from services.ciak_pdf_blueprint import _SEZIONI, render_blueprint_html

pytestmark = pytest.mark.unit


def _fake_structured():
    sez = {}
    for (k, *_r) in _SEZIONI:
        base = {"title": f"T-{k}", "accent": "acc"}
        if k in ("sintesi", "problema"):
            base.update(lead="L", body="B")
        elif k == "potenziale":
            base.update(lead="L", cards=[{"h": "C", "p": "p"}])
        elif k == "mercato":
            base.update(lead="L", trend=["t1", "t2"])
        elif k == "competitor":
            base.update(presidia=["a"], spazio=["b"])
        elif k == "pubblico":
            base.update(lead="L", segmenti=[{"segmento": "S", "chi": "c", "cerca": "x"}])
        elif k in ("forza", "limiti"):
            base.update(punti=["uno", "due"])
        elif k == "accademia":
            base.update(lead="L", moduli=[{"titolo": "M1", "contenuto": "c"}])
        elif k == "rischio":
            base.update(lead="L", callout="<b>c</b>")
        elif k == "manca":
            base.update(items=[{"h": "h", "p": "p"}])
        elif k == "roadmap":
            base.update(lead="L", steps=[{"titolo": "s", "desc": "d"}])
        elif k in ("prossimo", "cta"):
            continue  # 13 e 14 NON le scrive l'AI: le inietta genera_blueprint
        sez[k] = base
    return {"meta": {"progetto": "Progetto", "accent_progetto": "Test", "ambito": "Coaching"}, "sezioni": sez}


def _fake_db():
    db = MagicMock()
    db.diagnostic_sessions.find_one = AsyncMock(return_value={
        "session_token": "tok", "user_name": "Mario Rossi",
        "responses": {"q1_competenza": "coach", "q6_problema": "x", "q5_target": "y"},
    })
    return db


@pytest.mark.asyncio
async def test_genera_blueprint_costruisce_payload_13_sezioni(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(return_value={"settore": "coaching", "dimensione_trend": "cresce", "fascia_prezzo_mercato": "x"}))
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=_fake_structured()))

    payload = await ca.genera_blueprint("tok")

    assert set(payload["sezioni"].keys()) == {k for (k, *_r) in _SEZIONI}
    assert payload["meta"]["nome"] == "Mario Rossi"       # nome dalla sessione
    assert payload["meta"]["progetto"] == "Progetto"
    assert payload["meta"].get("data")                     # data riempita
    # il payload deve renderizzare senza errori (13 sezioni + CTA + cover + sommario)
    html = render_blueprint_html(payload)
    assert html.count('<section class="page') == 16
    # la CTA (sez. 14) è iniettata dal generatore, non dall'AND dell'AI
    assert "cta" in payload["sezioni"]
    assert payload["sezioni"]["cta"]["title"]


@pytest.mark.asyncio
async def test_genera_blueprint_degrada_se_research_fallisce(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(side_effect=RuntimeError("web down")))
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=_fake_structured()))
    payload = await ca.genera_blueprint("tok")  # non deve sollevare
    assert set(payload["sezioni"].keys()) == {k for (k, *_r) in _SEZIONI}


@pytest.mark.asyncio
async def test_genera_blueprint_solleva_se_sezione_mancante(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(return_value={}))
    bad = _fake_structured()
    del bad["sezioni"]["roadmap"]
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=bad))
    with pytest.raises(ca.CiakAnalisiError):
        await ca.genera_blueprint("tok")


def test_cta_partnership_ha_la_leva_numero_chiuso_non_il_bonus_48h():
    cta = ca._build_cta_section("partnership", "Mario")
    assert "numero chiuso" in cta["callout"]
    assert "48 ore" not in cta["callout"]
    assert "Partnership" in cta["accent"]


def test_cta_start_ha_la_leva_48h_non_il_numero_chiuso():
    cta = ca._build_cta_section("start", "Mario")
    assert "48 ore" in cta["callout"]
    assert "numero chiuso" not in cta["callout"]
    assert "Ciak Start" in cta["accent"]


@pytest.mark.parametrize("instradamento", [None, "", "nurture", "qualcosa_di_invalido", 42])
def test_cta_con_instradamento_non_partnership_ricade_su_start(instradamento):
    # regressione: qualunque instradamento diverso da "partnership" (incluso
    # mancante o palesemente invalido) deve ricadere sul default prudente Start,
    # senza sollevare — ma un valore non riconosciuto va comunque segnalato nei
    # log (vedi test successivo), non ignorato in silenzio.
    cta = ca._build_cta_section(instradamento, "Mario")
    assert "Ciak Start" in cta["accent"]


def test_cta_con_instradamento_sconosciuto_logga_un_warning(caplog):
    with caplog.at_level("WARNING"):
        ca._build_cta_section("valore_mai_visto", "Mario")
    assert any("instradamento inatteso" in r.message for r in caplog.records)


@pytest.mark.parametrize("instradamento", ["partnership", "start", "nurture", None])
def test_cta_con_instradamento_noto_non_logga_warning(instradamento, caplog):
    with caplog.at_level("WARNING"):
        ca._build_cta_section(instradamento, "Mario")
    assert not any("instradamento inatteso" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_genera_blueprint_inietta_la_13_strade_e_la_14_consiglio(monkeypatch):
    monkeypatch.setattr(ca, "db", _fake_db())
    monkeypatch.setattr(ca, "genera_research_brief", AsyncMock(return_value={}))
    fake = _fake_structured()
    assert "prossimo" not in fake["sezioni"] and "cta" not in fake["sezioni"]
    monkeypatch.setattr(ca, "_call_claude_structured", MagicMock(return_value=fake))
    payload = await ca.genera_blueprint("tok")
    assert len(payload["sezioni"]["prossimo"]["cards"]) == 3
    assert payload["sezioni"]["cta"]["eyebrow"] == "Il nostro consiglio"


def test_la_13_ha_tre_card_senza_prezzi_e_senza_trattino_lungo():
    s = ca._build_strade_section()
    assert [c["h"].split(":")[0] for c in s["cards"]] == ["Ciak Start", "Start Plus", "Partnership"]
    testo = " ".join([s["title"], s["accent"], s["lead"]] + [c["h"] + " " + c["p"] for c in s["cards"]]).lower()
    for vietato in ("€", "euro", "prezzo", "—", "dopo la call"):
        assert vietato not in testo


@pytest.mark.parametrize("instradamento", ["partnership", "start"])
def test_i_testi_fissi_della_14_non_hanno_genere_ne_trattino_lungo(instradamento):
    cta = ca._build_cta_section(instradamento, "Andrea")
    testo = " ".join(str(v) for v in cta.values()).lower()
    assert "pronto" not in testo and "pronta" not in testo
    assert "—" not in testo
    assert cta["eyebrow"] == "Il nostro consiglio"
    assert "il nostro consiglio" in cta["lead"].lower()


def test_la_regola_sul_genere_e_nei_prompt_e_la_13_non_la_scrive_piu_l_ai():
    assert "non dedurre mai" in ca._VINCOLI_STILE
    for prompt in (ca._PROMPT_BLUEPRINT, ca._PROMPT_RESEARCH, ca._PROMPT_DEFINITIVA,
                   ca._PROMPT_BOZZA, ca._PROMPT_SCRIPT_CALL):
        assert "Andrea e Luca sono nomi maschili" in prompt
    assert "13. prossimo" not in ca._PROMPT_BLUEPRINT
    assert "prossimo" not in ca._SEZIONI_BLUEPRINT
    assert "prossimo" not in ca._SCHEMA_BLUEPRINT["properties"]["sezioni"]["properties"]


def test_i_prompt_chiedono_3_fasi_evo_non_5():
    for prompt in (ca._PROMPT_BLUEPRINT, ca._PROMPT_DEFINITIVA):
        assert "Esamina, Valida, Ottimizza" in prompt
        assert "5 fasi" not in prompt.replace("Mai 5 fasi", "")
