"""
Pipeline Start: in quale colonna sta ogni cliente e qual e' la prossima mossa.
Funzioni pure, nessun database.
"""
from datetime import datetime, timezone

import pytest

from services.start_pipeline import build_pipeline, riga_cliente

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 7, tzinfo=timezone.utc)
CLIENTE = {"id": "c1", "name": "Linda Pavia", "email": "l@x.it", "access_level": "cliente_start",
           "start_purchased_at": "2026-10-01T10:00:00+00:00"}
RISPOSTE_OK = {"step_id": "04-posizionamento", "data": {"answers_completed_at": "2026-10-02"}}
MARCHIO_OK = {"step_id": "03-brand-kit", "data": {"brand_completed_at": "2026-10-02"}}
TIPI = ["positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d", "partnership_readiness"]


def _docs(approvati=(), in_attesa=()):
    return ([{"type": t, "approval_status": "approved"} for t in approvati]
            + [{"type": t, "approval_status": "pending_review"} for t in in_attesa])


def test_senza_risposte_ne_marchio_aspetta_il_cliente():
    r = riga_cliente(CLIENTE, [], [], now=NOW)
    assert r["stage"] == "attesa_cliente"
    assert r["prossima_azione"] == "Aspetta le risposte e le scelte sul marchio del cliente"


def test_manca_solo_il_marchio_lo_dice():
    r = riga_cliente(CLIENTE, [RISPOSTE_OK], [], now=NOW)
    assert r["stage"] == "attesa_cliente" and "scelte sul marchio" in r["prossima_azione"]
    assert "risposte" not in r["prossima_azione"]


def test_input_completi_senza_bozze_da_preparare():
    r = riga_cliente(CLIENTE, [RISPOSTE_OK, MARCHIO_OK], [], now=NOW)
    assert r["stage"] == "da_preparare" and r["prossima_azione"] == "Prepara le bozze"
    assert all(m["stato"] == "da_fare" for m in r["materiali"])


def test_una_bozza_in_attesa_vince_su_tutto_anche_se_mancano_input():
    r = riga_cliente(CLIENTE, [], _docs(in_attesa=["positioning"]), now=NOW)
    assert r["stage"] == "da_approvare"
    assert r["prossima_azione"] == "Leggi e approva: Chi sei e cosa offri"


def test_tutto_approvato_e_completato():
    r = riga_cliente(CLIENTE, [RISPOSTE_OK, MARCHIO_OK], _docs(approvati=TIPI), now=NOW)
    assert r["stage"] == "completato" and r["approvati"] == 6


def test_approvato_solo_se_esiste_il_deliverable_approvato_non_per_lo_status_dello_step():
    step = {"step_id": "start-vetrina", "status": "done", "approval_status": "approved"}
    r = riga_cliente(CLIENTE, [RISPOSTE_OK, MARCHIO_OK, step], [], now=NOW)
    assert next(m for m in r["materiali"] if m["type"] == "showcase")["stato"] == "da_fare"
    assert r["approvati"] == 0


def test_errore_di_generazione_e_visibile_e_resta_da_preparare():
    step = {"step_id": "start-contenuti-90", "generation_status": "errore"}
    r = riga_cliente(CLIENTE, [RISPOSTE_OK, MARCHIO_OK, step], _docs(approvati=["positioning"]), now=NOW)
    assert r["stage"] == "da_preparare"
    assert r["prossima_azione"].startswith("Rilancia:") and "calendario" in r["prossima_azione"]


def test_generazione_in_corso_non_e_un_errore():
    step = {"step_id": "start-contenuti-90", "generation_status": "in_corso"}
    r = riga_cliente(CLIENTE, [RISPOSTE_OK, MARCHIO_OK, step], [], now=NOW)
    assert next(m for m in r["materiali"] if m["type"] == "content_plan_90d")["stato"] == "in_generazione"


def test_prossima_scadenza_e_la_tappa_piu_vicina_non_consegnata():
    r = riga_cliente(CLIENTE, [], [], now=NOW)
    # pagato il 1/10: la prima tappa e' l'8/10, cioe' fra 1 giorno
    assert r["prossima_scadenza"]["tappa"] == 1
    assert r["prossima_scadenza"]["data_promessa"] == "08/10/2026"
    assert r["prossima_scadenza"]["giorni"] == 1


def test_pipeline_colonne_in_ordine_e_solo_clienti_start():
    lead = {"id": "c9", "name": "Lead", "access_level": "lead"}
    altro = {**CLIENTE, "id": "c2", "name": "Anna", "start_purchased_at": "2026-09-01T10:00:00+00:00"}
    p = build_pipeline([CLIENTE, altro, lead], {"c1": [RISPOSTE_OK, MARCHIO_OK]}, {}, now=NOW)
    assert [c["id"] for c in p["colonne"]] == ["attesa_cliente", "da_preparare", "da_approvare", "completato"]
    assert p["totale"] == 2
    assert [c["nome"] for c in p["colonne"][0]["clienti"]] == ["Anna"]
    assert [c["nome"] for c in p["colonne"][1]["clienti"]] == ["Linda Pavia"]
