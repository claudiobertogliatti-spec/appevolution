"""
Test di `backend/obiettivo.py` — l'obiettivo di cassa e le leve.

I numeri sono quelli veri dell'1/9/2026: target €10.000 entro il 30/9,
€375 incassati, e le leve del piano (Rosanna, Andrea, Arensi).
"""

import sys
from datetime import date
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import obiettivo as ob  # noqa: E402


PIANO = {
    "id": "10k-settembre",
    "titolo": "€10.000 entro il 30/9",
    "target": 10000.0,
    "inizio": "2026-08-01",
    "scadenza": "2026-09-30",
    "incassato": 375.0,
    "leve": [
        {"nome": "Rosanna Amato", "valore": 1850.0, "stato": "aperta",
         "ultimo_movimento": "2026-08-19", "dipende_da": "solo una call"},
        {"nome": "Andrea Fredi - preventivo web", "valore": 1700.0, "stato": "aperta",
         "ultimo_movimento": "2026-08-07", "dipende_da": "una consegna nostra"},
        {"nome": "Sarah Arensi", "valore": 194.0, "stato": "aperta",
         "ultimo_movimento": "2026-08-26", "dipende_da": "una consegna nostra"},
    ],
}

OGGI = date(2026, 9, 1)


def test_il_gap_e_quello_che_manca_davvero():
    s = ob.stato(PIANO, OGGI)

    assert s["gap"] == 9625.0
    assert s["giorni_rimasti"] == 29


def test_dice_a_che_ritmo_bisogna_andare():
    s = ob.stato(PIANO, OGGI)

    assert s["ritmo_necessario"] == round(9625.0 / 29, 2)


def test_la_proiezione_dice_dove_si_finisce_se_non_cambia_nulla():
    """
    E' il numero che fa cambiare strategia in tempo: se e' molto sotto il
    target, spingere di piu' sulle stesse cose non basta.
    """
    s = ob.stato(PIANO, OGGI)

    # 375 in 31 giorni -> ~12/giorno -> ~726 alla fine. Molto sotto 10.000.
    assert s["proiezione_al_ritmo_attuale"] is not None
    assert s["proiezione_al_ritmo_attuale"] < 1000


def test_senza_storia_non_proietta_invece_di_inventare():
    """Una proiezione su due giorni sarebbe un numero inventato."""
    appena_iniziato = {**PIANO, "inizio": "2026-08-31"}

    s = ob.stato(appena_iniziato, OGGI)

    assert s["proiezione_al_ritmo_attuale"] is None


def test_dice_se_le_leve_bastano_a_coprire_il_gap():
    """
    La domanda che decide se il piano regge. 1850+1700+194 = 3744 contro 9625:
    non bastano, e spingere su quelle non porta al target.
    """
    s = ob.stato(PIANO, OGGI)

    assert s["valore_leve_vive"] == 3744.0
    assert s["leve_coprono_il_gap"] is False
    assert s["scoperto"] == 5881.0


def test_le_leve_chiuse_o_perse_non_contano_piu():
    con_chiusa = {**PIANO, "leve": [
        {"nome": "Chiusa", "valore": 5000.0, "stato": "chiusa"},
        {"nome": "Persa", "valore": 5000.0, "stato": "persa"},
        {"nome": "Viva", "valore": 1000.0, "stato": "in_corso"},
    ]}

    s = ob.stato(con_chiusa, OGGI)

    assert s["valore_leve_vive"] == 1000.0
    assert [l["nome"] for l in s["leve_vive"]] == ["Viva"]


def test_una_leva_ferma_da_due_settimane_viene_segnalata():
    """Sotto e' normale respiro di una trattativa, sopra si sta raffreddando."""
    s = ob.stato(PIANO, OGGI)

    nomi = [l["nome"] for l in s["leve_ferme"]]
    assert "Andrea Fredi - preventivo web" in nomi   # fermo dal 7/8, 25 giorni
    assert "Sarah Arensi" not in nomi                # 6 giorni: ancora viva


def test_le_leve_ferme_sono_ordinate_per_valore():
    """Chi legge alle 7 del mattino deve vedere per prima quella che pesa di piu'."""
    fermissime = {**PIANO, "leve": [
        {"nome": "Piccola", "valore": 100.0, "stato": "aperta", "ultimo_movimento": "2026-01-01"},
        {"nome": "Grossa", "valore": 5000.0, "stato": "aperta", "ultimo_movimento": "2026-01-01"},
    ]}

    s = ob.stato(fermissime, OGGI)

    assert [l["nome"] for l in s["leve_ferme"]] == ["Grossa", "Piccola"]


def test_una_leva_senza_data_di_movimento_non_e_dichiarata_ferma():
    """Non sapere da quando e' ferma non e' lo stesso che saperla ferma."""
    senza_data = {**PIANO, "leve": [
        {"nome": "Sconosciuta", "valore": 900.0, "stato": "aperta"},
    ]}

    s = ob.stato(senza_data, OGGI)

    assert s["leve_ferme"] == []
    assert s["valore_leve_vive"] == 900.0


def test_obiettivo_gia_raggiunto_non_da_gap_negativo():
    superato = {**PIANO, "incassato": 12000.0}

    s = ob.stato(superato, OGGI)

    assert s["gap"] == 0
    assert s["scoperto"] == 0
