import pytest
from services import ciak_analisi

pytestmark = pytest.mark.unit


async def _async(v):
    return v


def test_module_exposes_api():
    assert hasattr(ciak_analisi, "CiakAnalisiError")
    assert hasattr(ciak_analisi, "genera_e_salva")
    assert hasattr(ciak_analisi, "set_db")
    assert len(ciak_analisi._PROMPT_RESEARCH) > 200
    assert len(ciak_analisi._PROMPT_DEFINITIVA) > 200
    assert len(ciak_analisi._PROMPT_BOZZA) > 100
    assert len(ciak_analisi._PROMPT_SCRIPT_CALL) > 100


@pytest.mark.asyncio
async def test_genera_research_brief(monkeypatch):
    from services import ciak_analisi
    monkeypatch.setattr(ciak_analisi, "_web_search_text", lambda s, u, max_tokens=None: "ricerca grezza shiatsu")
    monkeypatch.setattr(ciak_analisi, "_call_claude_structured",
                        lambda s, u, schema, tool_name, max_tokens=None: {"settore": "shiatsu", "fascia_prezzo_mercato": "€500-€1200", "dimensione_trend": "x"})
    brief = await ciak_analisi.genera_research_brief({"q1_competenza": "shiatsu", "q6_problema": "dolore", "q5_target": "No"})
    assert brief["settore"] == "shiatsu"


@pytest.mark.asyncio
async def test_genera_definitiva_struttura(monkeypatch):
    from services import ciak_analisi
    fake = {
        "titolo": "Analisi — Mario",
        "capitoli": {"punto_di_partenza": "a", "dove_sei_adesso": "b", "il_tuo_mercato": "c",
                     "la_tua_accademia": "d", "la_roadmap": "e", "prossimo_passo": "f"},
        "accademia": {"nome_percorso": "X", "promessa": "Y", "moduli": [], "pricing_suggerito": "€997"},
        "roadmap": [{"fase": "F1", "durata": "2sett", "attivita": "z"}],
    }
    monkeypatch.setattr(ciak_analisi, "_call_claude_structured", lambda *a, **k: fake)
    res = await ciak_analisi.genera_analisi_definitiva({"q1_competenza": "shiatsu"}, {"settore": "shiatsu"})
    assert set(res["capitoli"].keys()) == {"punto_di_partenza", "dove_sei_adesso", "il_tuo_mercato", "la_tua_accademia", "la_roadmap", "prossimo_passo"}
    assert res["accademia"]["pricing_suggerito"] == "€997"


@pytest.mark.asyncio
async def test_bozza_e_script(monkeypatch):
    from services import ciak_analisi
    monkeypatch.setattr(ciak_analisi, "_call_claude_structured", lambda *a, **k: {"ok": True})
    definitiva = {"capitoli": {}, "accademia": {}, "roadmap": []}
    bozza = await ciak_analisi.genera_bozza(definitiva)
    script = await ciak_analisi.genera_script_call({"q1_competenza": "x"}, definitiva, stato=3)
    assert bozza == {"ok": True}
    assert script == {"ok": True}


@pytest.mark.asyncio
async def test_genera_e_salva_idempotente(monkeypatch):
    from services import ciak_analisi
    from tests._fake_mongo import FakeDb

    db = FakeDb(diagnostic_sessions=[{
        "session_token": "tok1", "user_email": "a@b.it",
        "responses": {"q1_competenza": "shiatsu", "q5_target": "No", "q6_problema": "dolore"},
        "scoring": {"stato_finale": 3},
    }])
    ciak_analisi.set_db(db)
    monkeypatch.setattr(ciak_analisi, "genera_research_brief", lambda r: _async({"settore": "shiatsu"}))
    monkeypatch.setattr(ciak_analisi, "genera_analisi_definitiva", lambda r, b: _async({"capitoli": {}}))
    monkeypatch.setattr(ciak_analisi, "genera_bozza", lambda d: _async({"intro": "x"}))
    monkeypatch.setattr(ciak_analisi, "genera_script_call", lambda r, d, stato: _async({"agganci": []}))

    res1 = await ciak_analisi.genera_e_salva("tok1")
    assert res1["stato"] == "da_validare"
    assert db.ciak_analisi.docs[0]["analisi_definitiva"] == {"capitoli": {}}
    # idempotenza: seconda chiamata non rigenera
    res2 = await ciak_analisi.genera_e_salva("tok1")
    assert res2["already_exists"] is True


@pytest.mark.asyncio
async def test_genera_e_salva_non_cancella_l_esito_della_consegna(monkeypatch):
    """La consegna Blueprint scrive bozza_inviata_at/pdf_url su ciak_analisi PRIMA
    che l'analisi a 6 capitoli venga generata: la generazione non deve cancellarli
    né scambiare quel documento per un'analisi già fatta."""
    from services import ciak_analisi
    from tests._fake_mongo import FakeDb

    db = FakeDb(
        diagnostic_sessions=[{"session_token": "tok2", "user_email": "a@b.it",
                              "responses": {}, "scoring": {"stato_finale": 3}}],
        ciak_analisi=[{"session_token": "tok2", "bozza_inviata_at": "2026-09-29T11:00:00+00:00",
                       "bozza": {"pdf_url": "https://cdn/bp.pdf"}}],
    )
    ciak_analisi.set_db(db)
    monkeypatch.setattr(ciak_analisi, "genera_research_brief", lambda r: _async({"settore": "x"}))
    monkeypatch.setattr(ciak_analisi, "genera_analisi_definitiva", lambda r, b: _async({"capitoli": {"a": 1}}))
    monkeypatch.setattr(ciak_analisi, "genera_bozza", lambda d: _async({"intro": "x"}))
    monkeypatch.setattr(ciak_analisi, "genera_script_call", lambda r, d, stato: _async({"agganci": []}))

    res = await ciak_analisi.genera_e_salva("tok2")
    assert res["already_exists"] is False
    doc = db.ciak_analisi.docs[0]
    assert doc["bozza_inviata_at"] == "2026-09-29T11:00:00+00:00"
    assert doc["bozza"]["pdf_url"] == "https://cdn/bp.pdf"
    assert doc["analisi_definitiva"] == {"capitoli": {"a": 1}}


def test_router_exists():
    from routers import ciak_analisi_admin
    assert hasattr(ciak_analisi_admin, "router")
    assert hasattr(ciak_analisi_admin, "set_db")
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/genera/{session_token}" in paths
    assert "/api/admin/ciak/analisi/{session_token}" in paths


@pytest.mark.asyncio
async def test_resolve_prompt_store_then_fallback(monkeypatch):
    from services import ciak_analisi

    async def fake_get_active_content(key):
        return "PROMPT_OVERRIDE" if key == "bozza" else None

    import services.ciak_analisi_prompt_store as store
    monkeypatch.setattr(store, "get_active_content", fake_get_active_content)

    assert await ciak_analisi._resolve_prompt("bozza") == "PROMPT_OVERRIDE"
    assert await ciak_analisi._resolve_prompt("definitiva") == ciak_analisi._PROMPT_DEFINITIVA


def test_router_prompt_paths():
    from routers import ciak_analisi_admin
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/prompt/{key}" in paths
    assert "/api/admin/ciak/analisi/prompt/{key}/{version_id}/activate" in paths


def test_router_admin_validation_paths():
    from routers import ciak_analisi_admin
    paths = {r.path for r in ciak_analisi_admin.router.routes}
    assert "/api/admin/ciak/analisi/coda" in paths
    assert "/api/admin/ciak/analisi/{session_token}/valida-invia" in paths
    methods = {(r.path, m) for r in ciak_analisi_admin.router.routes for m in getattr(r, "methods", [])}
    assert ("/api/admin/ciak/analisi/{session_token}", "PUT") in methods
