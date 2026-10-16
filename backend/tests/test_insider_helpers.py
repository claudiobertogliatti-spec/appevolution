import pytest
from routers.insider_helpers import enrich_proposta_for_insider, build_contract_acceptance

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


def test_consenso_checkbox_senza_firma():
    cd = build_contract_acceptance(
        {"clausole_vessatorie_approved": True, "consenso_checkbox": True}, "1.2.3.4", "2026-09-09T00:00:00+00:00")
    assert cd["metodo"] == "checkbox"
    assert cd["signature_base64"] == ""
    assert cd["ip_address"] == "1.2.3.4"
    assert cd["clausole_vessatorie_approved"] is True


def test_firma_disegnata_e_metodo_signature():
    cd = build_contract_acceptance(
        {"clausole_vessatorie_approved": True, "signature_base64": "data:img"}, "1.1.1.1", "2026-09-09T00:00:00+00:00")
    assert cd["metodo"] == "signature"


def test_ne_firma_ne_consenso_solleva():
    with pytest.raises(ValueError):
        build_contract_acceptance({"clausole_vessatorie_approved": True}, "1.1.1.1", "2026-09-09T00:00:00+00:00")


def test_clausole_non_approvate_solleva():
    with pytest.raises(ValueError):
        build_contract_acceptance({"consenso_checkbox": True}, "1.1.1.1", "2026-09-09T00:00:00+00:00")


def test_dichiarazione_imprenditoriale_e_piva_registrate_quando_presenti():
    cd = build_contract_acceptance(
        {
            "clausole_vessatorie_approved": True,
            "consenso_checkbox": True,
            "dichiarazione_imprenditoriale": True,
            "piva": "IT123",
        },
        "1.2.3.4",
        "2026-09-09T00:00:00+00:00",
    )
    assert cd["dichiarazione_imprenditoriale"] is True
    assert cd["piva"] == "IT123"


def test_dichiarazione_imprenditoriale_e_piva_opzionali_non_sollevano():
    # La Proposta.jsx legacy non manda questi campi: devono restare opzionali.
    cd = build_contract_acceptance(
        {"clausole_vessatorie_approved": True, "consenso_checkbox": True},
        "1.2.3.4",
        "2026-09-09T00:00:00+00:00",
    )
    assert cd["dichiarazione_imprenditoriale"] is False
    assert cd["piva"] == ""


@pytest.mark.parametrize("value", ["false", "true", 1, 0, [], {}, None])
def test_declaration_requires_a_real_boolean_when_supplied(value):
    with pytest.raises(ValueError):
        build_contract_acceptance(
            {"clausole_vessatorie_approved": True, "consenso_checkbox": True,
             "dichiarazione_imprenditoriale": value}, "audit", "now")


@pytest.mark.parametrize("value", [123, {}, []])
def test_piva_rejects_non_text_values(value):
    with pytest.raises(ValueError):
        build_contract_acceptance(
            {"clausole_vessatorie_approved": True, "consenso_checkbox": True,
             "piva": value}, "audit", "now")
