#!/usr/bin/env python3
"""
I tre file che danno a Luca una memoria che sopravvive alla notte.

Senza questi, ogni mattina Luca riparte da zero e la riga piu' importante del
suo prompt — "cosa hai gia' fatto dall'ultimo briefing" — e' impossibile.

E' l'UNICO modulo che tocca la cartella stato/. Solo stdlib.
"""
import csv
import json
import os
from pathlib import Path

COLONNE = (
    "data",
    "lead_oggi",
    "diagnosi_oggi",
    "ingressi_evo_mese",
    "partner_attivi",
    "partner_fermi",
    "partner_attesa_ok",
    "checkout_non_pagati",
    "meta_campagna_obiettivo",
    "meta_spesa_giorno",
    "meta_lead_giorno",
    "giorni_silenzio_social",
    "contatti_systeme",
    "sito_ok",
)


def cartella_stato():
    """Letta a ogni chiamata, non all'import: i test la spostano su una tmpdir."""
    default = Path(__file__).resolve().parent / "stato"
    cartella = Path(os.environ.get("LUCA_STATO_DIR") or default)
    cartella.mkdir(parents=True, exist_ok=True)
    return cartella


def _file_numeri():
    return cartella_stato() / "numeri.csv"


def _cella(valore):
    """None diventa stringa vuota, MAI zero: vuoto e' un punto cieco, zero e' una misura."""
    return "" if valore is None else str(valore)


def leggi_numeri():
    percorso = _file_numeri()
    if not percorso.exists():
        return []
    with percorso.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def scrivi_numeri(riga):
    """Upsert sulla data: due run nello stesso giorno aggiornano, non duplicano."""
    data = riga.get("data")
    if not data:
        raise ValueError("la riga dei numeri deve avere una 'data'")

    righe = [r for r in leggi_numeri() if r.get("data") != data]
    righe.append({colonna: _cella(riga.get(colonna)) for colonna in COLONNE})
    righe.sort(key=lambda r: r["data"])

    with _file_numeri().open("w", encoding="utf-8", newline="") as f:
        scrittore = csv.DictWriter(f, fieldnames=list(COLONNE))
        scrittore.writeheader()
        scrittore.writerows(righe)


def _numero(valore):
    if valore in (None, ""):
        return None
    try:
        return float(valore)
    except (TypeError, ValueError):
        return None


def confronta(oggi):
    """Confronta i numeri di oggi con l'ultima riga precedente.

    Nessun delta se una delle due celle e' vuota o non numerica: preferiamo un
    "non confrontabile" esplicito a un trend inventato.
    """
    precedenti = [r for r in leggi_numeri() if r.get("data") != oggi.get("data")]
    if not precedenti:
        return {"prima_misurazione": True}

    ieri = precedenti[-1]
    esito = {}
    for colonna in COLONNE:
        if colonna == "data":
            continue
        valore_oggi = oggi.get(colonna)
        valore_ieri = ieri.get(colonna)
        n_oggi, n_ieri = _numero(valore_oggi), _numero(valore_ieri)
        esito[colonna] = {
            "oggi": valore_oggi,
            "ieri": valore_ieri if valore_ieri != "" else None,
            "delta": None if n_oggi is None or n_ieri is None else n_oggi - n_ieri,
        }
    return esito
