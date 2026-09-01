#!/usr/bin/env python3
"""
Scarica i dati del briefing mattutino di Luca (AD) senza browser e senza login.

Perche' esiste: il briefing delle 7:45 girava dentro una tab Chrome loggata su
ciak.io/admin, leggendo il JWT dal localStorage. Quel canale e' interattivo: se
il browser non e' connesso o il token e' scaduto (dura 24h) il briefing salta.
Il 30/7/2026 e' saltato esattamente cosi'.

Dal 14/8/2026 non legge piu' solo dentro Ciak: aggiunge il sito pubblico, e le
fonti che vivono dietro un tool MCP (Meta, Systeme, social) le legge Luca
stesso, guidato da SKILL.md, con buste della stessa forma. Un report che guarda
solo dentro casa non e' un report.

Uso:
    python scripts/briefing_luca.py            # legge LUCA_REPORT_KEY dall'ambiente
    python scripts/briefing_luca.py --base-url http://localhost:8001

Stampa su stdout un unico JSON {"report": ..., "acq": ..., "fonti": ...}.
Le chiavi "report" e "acq" restano al primo livello per non rompere SKILL.md.
Esce con codice != 0 se cade Ciak: meglio fallire in modo evidente che produrre
un briefing a meta'. Solo stdlib.
"""
import argparse
import json
import os
import sys

import sensori

DEFAULT_BASE_URL = "https://www.ciak.io"
ENDPOINTS = {
    "report": "/api/admin/luca/daily-report",
    "acq": "/api/admin/ciak/acquisizione-command-center",
}


def raccogli(base_url, key, leggi_ciak_fn=None, leggi_sito_fn=None):
    """Legge le fonti Python e restituisce (output, errore).

    Pavimento: se cade una delle due fonti Ciak si aborta tutto. Le altre fonti
    degradano dichiarandosi, perche' dichiarare un punto cieco non e' un
    briefing parziale: inventare un numero lo sarebbe.
    """
    leggi_ciak_fn = leggi_ciak_fn or sensori.leggi_ciak
    leggi_sito_fn = leggi_sito_fn or sensori.leggi_sito

    fonti = {}
    for nome, path in ENDPOINTS.items():
        fonti[nome] = leggi_ciak_fn(base_url, key, path, nome)
        if not fonti[nome]["ok"]:
            return None, f"{path} -> {fonti[nome]['errore']}"

    # Funnel pre-acquisto in forma aggregata. NON e' pavimento: se cade, il
    # briefing esce lo stesso dichiarando il punto cieco, invece di saltare.
    #
    # Aggiunto il 31/8/2026: fino a quel giorno Luca leggeva solo i due endpoint
    # sopra, che mostrano gli stadi DOPO l'iscrizione. Riportava "zero lead"
    # mentre in pipeline c'erano sei opt-in di luglio e agosto, e ragionava sul
    # gradino sbagliato. Senza il primo stadio non si vede dove si ferma la gente.
    fonti["funnel"] = leggi_ciak_fn(
        base_url, key, "/api/admin/ciak/funnel-metrics", "funnel"
    )

    # Crediti e incassi previsti. Fonte che DEGRADA come il funnel: se cade, il
    # briefing esce lo stesso dichiarando il punto cieco.
    #
    # Aggiunta l'1/9/2026: gli accordi di rientro vivevano in lettere Word sul
    # desktop, quindi una rata che salta si scopriva quando non arrivava. Con
    # questa fonte la scadenza viene a cercare Claudio la mattina in cui cade.
    fonti["crediti"] = leggi_ciak_fn(
        base_url, key, "/api/admin/ciak/crediti/riepilogo", "crediti"
    )

    fonti["sito"] = leggi_sito_fn()

    output = {nome: fonti[nome]["dati"] for nome in ENDPOINTS}
    output["funnel"] = fonti["funnel"]["dati"]
    output["crediti"] = fonti["crediti"]["dati"]
    output["fonti"] = fonti
    return output, None


def main():
    parser = argparse.ArgumentParser(description="Dati del briefing mattutino di Luca")
    parser.add_argument(
        "--base-url", default=os.environ.get("CIAK_BASE_URL", DEFAULT_BASE_URL)
    )
    args = parser.parse_args()

    key = os.environ.get("LUCA_REPORT_KEY", "")
    if not key:
        print(
            "LUCA_REPORT_KEY non e' impostata su questa macchina: senza chiave non si "
            "leggono i dati del briefing.",
            file=sys.stderr,
        )
        return 2

    output, errore = raccogli(args.base_url, key)
    if errore:
        print(errore, file=sys.stderr)
        return 1

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
