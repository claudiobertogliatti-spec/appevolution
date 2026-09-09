import pytest
from routers.insider_helpers import enrich_proposta_for_insider

pytestmark = pytest.mark.unit


def test_enrich_aggiunge_analisi_e_scoring():
    p = {"token": "t"}
    sess = {"analisi": {"testo": "x"}, "scoring": {"stato": 3}}
    out = enrich_proposta_for_insider(p, sess)
    assert out["analisi"] == {"testo": "x"}
    assert out["scoring_stato"] == 3


def test_enrich_sess_none_mette_none():
    out = enrich_proposta_for_insider({"token": "t"}, None)
    assert out["analisi"] is None
    assert out["scoring_stato"] is None


def test_enrich_accetta_chiave_analysis_inglese():
    out = enrich_proposta_for_insider({}, {"analysis": {"a": 1}})
    assert out["analisi"] == {"a": 1}
