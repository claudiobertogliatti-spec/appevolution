"""Esito onesto discovery: riuscita / parziale / fallita + aggregazione parallela.

Test delle funzioni pure (nessun DB/rete): coprono il difetto storico del falso
success=True quando tutte le operazioni fallivano, e l'aggregazione dei risultati
delle query Places eseguite in parallelo.
"""
import pytest
from services.discovery_summary import summarize_run, aggregate_places_results

pytestmark = pytest.mark.unit  # test puro: gira in CI senza backend live


# ── summarize_run(total, failed, new_items) ──────────────────────────────────

def test_tutte_le_operazioni_in_errore_e_fallita_non_successo():
    r = summarize_run(10, 10, 0)
    assert r["status"] == "failed"
    assert r["success"] is False


def test_alcune_in_errore_e_parziale_ma_successo():
    r = summarize_run(10, 3, 5)
    assert r["status"] == "partial"
    assert r["success"] is True
    assert r["queries_failed"] == 3


def test_nessun_errore_e_ok():
    r = summarize_run(10, 0, 7)
    assert r["status"] == "ok"
    assert r["success"] is True


def test_ok_anche_con_zero_nuovi_non_e_fallita():
    r = summarize_run(5, 0, 0)
    assert r["status"] == "ok"
    assert r["success"] is True


def test_nessuna_operazione_e_vuota_non_successo():
    r = summarize_run(0, 0, 0)
    assert r["status"] == "empty"
    assert r["success"] is False


# ── aggregate_places_results(results) ────────────────────────────────────────

def test_aggrega_somma_solo_gli_esiti_ok_e_raccoglie_gli_errori():
    results = [
        {"ok": True, "imported": 3, "skipped": 1, "hot": 2},
        {"ok": False, "error": "dentista (Roma): timeout"},
        {"ok": True, "imported": 2, "skipped": 0, "hot": 1},
    ]
    imported, skipped, hot, errors = aggregate_places_results(results)
    assert (imported, skipped, hot) == (5, 1, 3)
    assert errors == ["dentista (Roma): timeout"]


def test_aggrega_tutti_errori_da_zero_e_lista_errori_piena():
    results = [{"ok": False, "error": "a"}, {"ok": False, "error": "b"}]
    imported, skipped, hot, errors = aggregate_places_results(results)
    assert (imported, skipped, hot) == (0, 0, 0)
    assert errors == ["a", "b"]
    # e l'esito complessivo è 'failed'
    assert summarize_run(len(results), len(errors), imported)["status"] == "failed"
