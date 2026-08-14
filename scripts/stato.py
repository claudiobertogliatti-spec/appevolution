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
import uuid
from datetime import datetime, timezone
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
    """Upsert sulla data: due run nello stesso giorno aggiornano, non duplicano.

    Scrittura ATOMICA (file temporaneo + os.replace). Questo CSV e' tutta la memoria
    storica di Luca: aprire il file finale in "w" lo troncherebbe subito, e
    un'interruzione a meta' (disco pieno, kill, crash) lascerebbe la sola intestazione
    — distruggendo esattamente la cosa che questo modulo esiste per conservare.
    """
    data = riga.get("data")
    if not data:
        raise ValueError("la riga dei numeri deve avere una 'data'")

    righe = [r for r in leggi_numeri() if r.get("data") != data]
    righe.append({colonna: _cella(riga.get(colonna)) for colonna in COLONNE})
    righe.sort(key=lambda r: r["data"])

    percorso = _file_numeri()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    with temporaneo.open("w", encoding="utf-8", newline="") as f:
        scrittore = csv.DictWriter(f, fieldnames=list(COLONNE))
        scrittore.writeheader()
        scrittore.writerows(righe)
    os.replace(temporaneo, percorso)


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


def _file_coda():
    return cartella_stato() / "coda.json"


def _file_registro():
    return cartella_stato() / "registro.md"


def _adesso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def leggi_coda():
    percorso = _file_coda()
    if not percorso.exists():
        return []
    return json.loads(percorso.read_text(encoding="utf-8") or "[]")


def _scrivi_coda(azioni):
    """Scrittura ATOMICA, per lo stesso motivo di scrivi_numeri() — e qui pesa di piu'.

    `coda.json` viene RISCRITTO PER INTERO a ogni apertura o chiusura di azione: non e'
    un append. E un JSON troncato non e' leggibile a meta' come un CSV — fa fallire
    json.loads() alla lettura successiva e si perde TUTTA la coda, non qualche riga.
    """
    percorso = _file_coda()
    temporaneo = percorso.with_name(percorso.name + ".tmp")
    temporaneo.write_text(
        json.dumps(azioni, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporaneo, percorso)


def apri_azione(cosa, chi, entro):
    """Un'azione ha SEMPRE un solo responsabile: principio 10, reso non violabile.

    ⚠️ `chi` deve essere un nome proprio di persona o di agente. Il controllo rifiuta
    qualunque stringa contenente una virgola o " e ", quindi un nome di reparto composto
    ("Marketing e Social") verrebbe respinto anche se e' un proprietario solo.
    """
    if "," in chi or " e " in f" {chi} ":
        raise ValueError(
            f"'{chi}' sono piu' persone: un'azione ha un solo responsabile, "
            "altrimenti non ce l'ha nessuno"
        )
    azione = {
        "id": uuid.uuid4().hex[:8],
        "cosa": cosa,
        "chi": chi,
        "entro": entro,
        "stato": "aperta",
        "aperta_il": _adesso(),
        "chiusa_il": None,
        "esito": None,
    }
    azioni = leggi_coda()
    azioni.append(azione)
    _scrivi_coda(azioni)
    return azione


def chiudi_azione(id_azione, esito):
    azioni = leggi_coda()
    for azione in azioni:
        if azione["id"] == id_azione:
            azione.update(stato="chiusa", esito=esito, chiusa_il=_adesso())
            _scrivi_coda(azioni)
            return azione
    raise KeyError(f"azione '{id_azione}' non trovata in coda")


def registra(cosa, perche, risultato):
    """Il registro degli errori di Dalio: append-only, non si riscrive il passato."""
    percorso = _file_registro()
    if not percorso.exists():
        percorso.write_text("# Registro di Luca\n\n", encoding="utf-8")
    with percorso.open("a", encoding="utf-8") as f:
        f.write(f"- **{_adesso()}** · {cosa} · _perche':_ {perche} · _risultato:_ {risultato}\n")


def leggi_registro():
    percorso = _file_registro()
    return percorso.read_text(encoding="utf-8") if percorso.exists() else ""
