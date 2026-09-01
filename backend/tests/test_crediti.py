"""
Test di `backend/crediti.py` — crediti da recuperare e incassi previsti.

I dati usati qui sono i quattro accordi reali dell'1/9/2026, con gli importi e
le scadenze veri: Falcone, Depalma, Calafiore. Se la logica sbaglia su questi,
sbaglia sui numeri che Claudio guarda ogni mattina.
"""

import sys
from datetime import date
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import crediti  # noqa: E402


DEPALMA = {
    "id": "depalma",
    "nome": "Annamaria Depalma",
    "importo_totale": 1560.0,
    "stato": crediti.CREDITO_IN_PIANO,
    "rate": [
        {"numero": 1, "importo": 520.0, "scadenza": "2026-09-30", "stato": "attesa"},
        {"numero": 2, "importo": 520.0, "scadenza": "2026-10-31", "stato": "attesa"},
        {"numero": 3, "importo": 520.0, "scadenza": "2026-11-30", "stato": "attesa"},
    ],
}

FALCONE = {
    "id": "falcone",
    "nome": "Maria Giulia Falcone",
    "importo_totale": 1074.0,
    "stato": crediti.CREDITO_IN_PIANO,
    "rate": [
        {"numero": 1, "importo": 358.0, "scadenza": "2026-09-15", "stato": "attesa"},
        {"numero": 2, "importo": 179.0, "scadenza": "2026-10-15", "stato": "attesa"},
    ],
}


def test_una_rata_scaduta_non_resta_in_attesa():
    """
    Nessuno aggiorna un record il giorno in cui una rata scade. Se ci si fida
    del campo, una rata saltata resta "attesa" per sempre e non viene mai
    segnalata.
    """
    passata = {"importo": 520.0, "scadenza": "2026-08-31", "stato": "attesa"}

    assert crediti.stato_effettivo_rata(passata, date(2026, 9, 1)) == "da_verificare"


def test_una_rata_futura_resta_in_attesa():
    futura = {"importo": 520.0, "scadenza": "2026-09-30", "stato": "attesa"}

    assert crediti.stato_effettivo_rata(futura, date(2026, 9, 1)) == "attesa"


def test_uno_stato_confermato_a_mano_vince_sulla_data():
    """Se qualcuno ha guardato davvero, la sua parola vale piu' del calendario."""
    incassata = {"importo": 520.0, "scadenza": "2026-08-01", "stato": "incassata"}
    saltata = {"importo": 520.0, "scadenza": "2026-08-01", "stato": "saltata"}

    assert crediti.stato_effettivo_rata(incassata, date(2026, 9, 1)) == "incassata"
    assert crediti.stato_effettivo_rata(saltata, date(2026, 9, 1)) == "saltata"


def test_una_scadenza_illeggibile_non_fa_esplodere_il_briefing():
    assert crediti.stato_effettivo_rata({"scadenza": None}) == "attesa"
    assert crediti.stato_effettivo_rata({"scadenza": "non-una-data"}) == "attesa"


def test_le_rate_del_mese_sono_solo_quelle_del_mese():
    rate = crediti.rate_del_mese([DEPALMA, FALCONE], 2026, 9)

    assert [r["nome"] for r in rate] == ["Maria Giulia Falcone", "Annamaria Depalma"]
    assert [r["scadenza"] for r in rate] == ["2026-09-15", "2026-09-30"]


def test_settembre_vede_solo_la_prima_rata_di_depalma():
    """
    Il punto che era emerso guardando le date: delle tre rate da 520 solo la
    prima cade a settembre. Le altre sono cassa di ottobre e novembre.
    """
    r = crediti.riepilogo([DEPALMA], 2026, 9)

    assert r["rate_nel_mese"] == 1
    assert r["previsto_nel_mese"] == 520.0
    assert r["residuo_totale"] == 1560.0  # tutte e tre restano da incassare


def test_il_riepilogo_separa_previsto_e_gia_incassato():
    con_incasso = {
        **DEPALMA,
        "rate": [
            {"numero": 1, "importo": 520.0, "scadenza": "2026-09-30", "stato": "incassata"},
            {"numero": 2, "importo": 520.0, "scadenza": "2026-09-15", "stato": "attesa"},
        ],
    }

    r = crediti.riepilogo([con_incasso], 2026, 9)

    assert r["gia_incassato_nel_mese"] == 520.0
    assert r["previsto_nel_mese"] == 520.0
    assert r["residuo_totale"] == 520.0


def test_in_ritardo_elenca_solo_le_rate_scadute_senza_esito():
    """E' il numero su cui vale la pena fare una telefonata oggi."""
    misto = {
        "id": "x", "nome": "Tizio", "importo_totale": 300.0, "stato": "in_piano",
        "rate": [
            {"numero": 1, "importo": 100.0, "scadenza": "2020-01-01", "stato": "attesa"},
            {"numero": 2, "importo": 100.0, "scadenza": "2020-02-01", "stato": "incassata"},
            {"numero": 3, "importo": 100.0, "scadenza": "2099-01-01", "stato": "attesa"},
        ],
    }

    r = crediti.riepilogo([misto], 2026, 9)

    assert len(r["in_ritardo"]) == 1
    assert r["in_ritardo"][0]["numero"] == 1
    assert r["importo_in_ritardo"] == 100.0


def test_senza_crediti_non_inventa_numeri():
    r = crediti.riepilogo([], 2026, 9)

    assert r["previsto_nel_mese"] == 0
    assert r["in_ritardo"] == []
    assert r["crediti_aperti"] == 0


# ─── Rate legate a un evento, non a una data ────────────────────────────────
# Il contratto Calafiore: "prima rata alla firma, seconda a meta' percorso,
# saldo a lancio avvenuto". Nessuna delle ultime due ha una data.

CALAFIORE = {
    "id": "calafiore",
    "nome": "Luigi Calafiore",
    "importo_totale": 2790.0,
    "stato": crediti.CREDITO_APERTO,
    "rate": [
        {"numero": 1, "importo": 930.0, "scadenza": "2026-05-13", "stato": "incassata"},
        {"numero": 2, "importo": 930.0, "condizione": "a meta' percorso", "stato": "attesa"},
        {"numero": 3, "importo": 930.0, "condizione": "a lancio avvenuto", "stato": "attesa"},
    ],
}


def test_una_rata_senza_data_non_finisce_mai_in_ritardo():
    """
    Mettere una data inventata sarebbe peggio che non averla: il briefing la
    segnalerebbe come scaduta in un giorno che nessuno ha mai concordato.
    """
    r = crediti.riepilogo([CALAFIORE], 2026, 9)

    assert r["in_ritardo"] == []
    assert r["importo_in_ritardo"] == 0


def test_una_rata_senza_data_non_entra_nel_previsto_del_mese():
    r = crediti.riepilogo([CALAFIORE], 2026, 9)

    assert r["rate_nel_mese"] == 0
    assert r["previsto_nel_mese"] == 0


def test_ma_pesa_nel_residuo_perche_quei_soldi_sono_dovuti():
    r = crediti.riepilogo([CALAFIORE], 2026, 9)

    assert r["residuo_totale"] == 1860.0  # le due rate non incassate


def test_le_rate_a_condizione_sono_elencate_a_parte():
    """Altrimenti sparirebbero dal briefing pur essendo soldi da incassare."""
    r = crediti.riepilogo([CALAFIORE], 2026, 9)

    assert len(r["a_condizione"]) == 2
    assert {x["condizione"] for x in r["a_condizione"]} == {
        "a meta' percorso", "a lancio avvenuto"
    }
    assert all(x["importo"] == 930.0 for x in r["a_condizione"])


def test_una_rata_a_condizione_gia_incassata_non_compare():
    saldata = {**CALAFIORE, "rate": [
        {"numero": 2, "importo": 930.0, "condizione": "a meta' percorso", "stato": "incassata"},
    ]}

    r = crediti.riepilogo([saldata], 2026, 9)

    assert r["a_condizione"] == []
    assert r["residuo_totale"] == 0
