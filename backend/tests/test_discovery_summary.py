"""Esito onesto della ricerca discovery: riuscita / parziale / fallita.

Test della funzione pura (nessun DB): copre il difetto storico del falso
success=True quando tutte le query andavano in errore.
"""
import pytest
from services.discovery_summary import summarize_places_run

pytestmark = pytest.mark.unit  # test puro: gira in CI senza backend live


def test_tutte_le_query_in_errore_e_fallita_non_successo():
    r = summarize_places_run(queries_total=10, queries_failed=10, new_leads=0)
    assert r["status"] == "failed"
    assert r["success"] is False


def test_alcune_in_errore_e_parziale_ma_successo():
    r = summarize_places_run(queries_total=10, queries_failed=3, new_leads=5)
    assert r["status"] == "partial"
    assert r["success"] is True
    assert r["queries_failed"] == 3


def test_nessun_errore_e_ok():
    r = summarize_places_run(queries_total=10, queries_failed=0, new_leads=7)
    assert r["status"] == "ok"
    assert r["success"] is True


def test_ok_anche_con_zero_nuovi_lead_non_e_fallita():
    # Ricerca riuscita che non trova nuovi lead NON è un fallimento.
    r = summarize_places_run(queries_total=5, queries_failed=0, new_leads=0)
    assert r["status"] == "ok"
    assert r["success"] is True


def test_nessuna_query_non_e_fallita():
    r = summarize_places_run(queries_total=0, queries_failed=0, new_leads=0)
    assert r["status"] == "ok"
    assert r["success"] is True
