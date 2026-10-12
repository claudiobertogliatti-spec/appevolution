"""Andrea: bozze di testo e SEO. AI finta, nessuna rete."""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_contenuti as ct

pytestmark = pytest.mark.unit


def test_richiesta_valida_e_non():
    assert ct.valida_richiesta("post_linkedin", "  Racconta il lancio del nuovo percorso  ")[1].startswith("Racconta")
    for t, b in [("boh", "brief abbastanza lungo"), ("email", "corto"), ("email", None), ("email", "x" * 1501)]:
        with pytest.raises(ValueError):
            ct.valida_richiesta(t, b)


def test_prompt_vieta_di_inventare_e_include_memoria():
    system, user = ct.prompt("email", "Invita a prenotare la call", "MEMORIA-X")
    assert "ANDREA" in system and "Non inventare" in system and "MEMORIA-X" in system
    assert "Invita a prenotare la call" in user


def test_seo_conta_le_lunghezze_da_solo():
    raw = '```json\n{"title": "' + "T" * 70 + '", "meta": "Meta breve", "h1": "Titolo", "parole_chiave": ["a", "b", "", 3]}\n```'
    seo = ct.parse_seo(raw)
    assert seo["title_len"] == 70 and seo["title_ok"] is False and seo["meta_ok"] is True
    assert seo["parole_chiave"] == ["a", "b"]


@pytest.mark.parametrize("raw", ["", "niente", '{"title": "x"}', '{"title": "", "meta": "m", "h1": "h"}'])
def test_seo_non_valida(raw):
    assert ct.parse_seo(raw) is None


@pytest.fixture
def ai(monkeypatch):
    from services import ciak_memoria
    async def vuota(): return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    def imposta(risposta):
        async def _f(system, user, max_tokens=500): return risposta
        monkeypatch.setattr(ciak_admin, "_chiedi_llm", _f)
    return imposta


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)
def chiedi(tipo="post_linkedin", brief="Racconta il nuovo percorso EVO in modo semplice"):
    return run(ciak_admin.contenuto_bozza(ciak_admin.ContenutoBozzaIn(tipo=tipo, brief=brief), ADMIN))


def test_endpoint_testo(ai):
    ai("Ecco il post.")
    assert chiedi() == {"tipo": "post_linkedin", "testo": "Ecco il post."}


def test_endpoint_seo(ai):
    ai('{"title": "Titolo", "meta": "Descrizione", "h1": "H1", "parole_chiave": ["evo"]}')
    assert chiedi("seo_pagina")["seo"]["title_ok"] is True


def test_ai_assente_503_e_formato_seo_rotto_502(ai):
    ai(None)
    with pytest.raises(HTTPException) as e: chiedi()
    assert e.value.status_code == 503
    ai("non json")
    with pytest.raises(HTTPException) as e: chiedi("seo_pagina")
    assert e.value.status_code == 502


def test_tipo_o_brief_non_validi_422(ai):
    ai("x")
    with pytest.raises(HTTPException) as e: chiedi("boh")
    assert e.value.status_code == 422
