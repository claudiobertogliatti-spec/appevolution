"""Analisi competitor: input validato, cifre calcolate dal codice, nessuna analisi inventata."""
import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_competitor as cp

pytestmark = pytest.mark.unit
TESTO = "Smetti di fare corsi che nessuno finisce. Ecco perche' i tuoi clienti mollano a meta' e cosa fare."
BASE = dict(piattaforma="Instagram", competitor="Rossi", link="", testo=TESTO, views="10.000", likes="500", commenti="50")


def test_valida_input_e_cifre_con_separatori():
    d = cp.valida_input(**BASE)
    assert d["views"] == 10000 and d["likes"] == 500
    assert cp.metriche(d)["tasso_interazione_pct"] == 5.5


@pytest.mark.parametrize("kw", [{"piattaforma": "Boh"}, {"testo": "corto"}, {"link": "ftp://x"}, {"views": "tanti"}, {"likes": "-3"}])
def test_input_non_valido(kw):
    with pytest.raises(ValueError):
        cp.valida_input(**{**BASE, **kw})


def test_tasso_none_senza_visualizzazioni():
    d = cp.valida_input(**{**BASE, "views": None})
    assert cp.metriche(d)["tasso_interazione_pct"] is None


def test_prompt_vieta_di_inventare_copiare_e_di_descrivere_il_video():
    s, u = cp.prompt(cp.valida_input(**BASE), "MEM-X")
    assert "Non hai visto il video" in s and "IPOTESI" in s and "ORIGINALE" in s and "MEM-X" in s
    assert "views: 10000" in u and TESTO in u


OK = {"gancio": "Apre con un divieto", "struttura": ["problema", "causa", "soluzione"],
      "perche_ha_funzionato": ["ipotesi"], "da_non_copiare": "il suo caso", "adattamento": "Lo racconti dal tuo percorso",
      "brief_reel": "Un reel sul perche' i clienti mollano i corsi, per chi vende formazione."}


def test_parse_valida_e_scarta():
    assert cp.parse_analisi("```json\n" + json.dumps(OK) + "\n```")["gancio"] == "Apre con un divieto"
    assert cp.parse_analisi("") is None and cp.parse_analisi("no") is None
    assert cp.parse_analisi(json.dumps({**OK, "brief_reel": "x"})) is None
    assert cp.parse_analisi(json.dumps({**OK, "struttura": []})) is None


class _Coll:
    def __init__(self): self.docs = []
    async def insert_one(self, d): self.docs.append(dict(d))


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)


@pytest.fixture
def fake(monkeypatch):
    d = SimpleNamespace(ciak_competitor_analisi=_Coll())
    monkeypatch.setattr(ciak_admin, "db", d)
    from services import ciak_memoria
    async def vuota(): return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    return d


def analizza(**kw): return run(ciak_admin.competitor_analisi(ciak_admin.CompetitorAnalisiIn(**{**BASE, **kw}), ADMIN))


def test_endpoint_ok_salva_e_porta_le_cifre_calcolate(fake, monkeypatch):
    async def llm(*a, **k): return json.dumps(OK)
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", llm)
    out = analizza()
    assert out["brief_reel"] == OK["brief_reel"] and out["metriche"]["tasso_interazione_pct"] == 5.5
    assert len(fake.ciak_competitor_analisi.docs) == 1


def test_ai_assente_503_e_formato_illeggibile_502_senza_salvare(fake, monkeypatch):
    for risposta, codice in [(None, 503), ("non e' json", 502)]:
        async def llm(*a, _r=risposta, **k): return _r
        monkeypatch.setattr(ciak_admin, "_chiedi_llm", llm)
        with pytest.raises(HTTPException) as e: analizza()
        assert e.value.status_code == codice
    assert fake.ciak_competitor_analisi.docs == []


def test_input_non_valido_422(fake):
    with pytest.raises(HTTPException) as e: analizza(testo="corto")
    assert e.value.status_code == 422
