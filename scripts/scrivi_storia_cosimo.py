# -*- coding: utf-8 -*-
"""
Scrive in Ciak le risposte de "La tua storia" di Cosimo Filieri (partner 13).

Due fonti, entrambe parole sue, entrambe copiate alla lettera (regole 6-7 di
memory/CIAK_MIGRATION_MEMORY.md — non si riscrivono e non si completano):
  1. risposte_cosimo.doc, mandato da lui il 04/08/2026   -> 11 risposte
  2. DOCUMENTO DI POSIZIONAMENTO (Drive, 46 domande sue) ->  4 risposte (S08 S18 S19 S20)

Le due proposte in `_proposte_da_confermare` NON vengono scritte: sono sue parole date
in risposta a un'altra domanda, e la ricollocazione la conferma un umano.
Restano quindi 4 domande da fare a lui in call: S09 S10 S17 S21.

Uso (PowerShell):
    $env:CIAK_ADMIN_TOKEN = "<jwt admin>"
    cd C:\\Users\\berto\\appevolution
    python scripts/scrivi_storia_cosimo.py

Backup pre/post e verifica sono automatici (regole 12 e 17).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.migrazione_partner import Partner  # noqa: E402

PARTNER_ID = "13"
STEP_ID = "la-tua-storia"
SORGENTE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "storage", "migration-backups", "COSIMO-storia-answers-2026-08-04.json",
)


def main():
    with open(SORGENTE, encoding="utf-8") as f:
        sorgente = json.load(f)
    answers = dict(sorgente["answers"])
    dal_posizionamento = sorgente["answers_da_posizionamento"]
    doppie = set(answers) & set(dal_posizionamento)
    if doppie:
        raise SystemExit(f"STOP: le due fonti si sovrappongono su {sorted(doppie)}. Decidere quale vale.")
    answers.update(dal_posizionamento)
    print(f"{len(sorgente['answers'])} risposte dal suo .doc + {len(dal_posizionamento)} dal posizionamento = {len(answers)}")

    p = Partner(PARTNER_ID)

    fd = p.full_data()
    if not fd.get("success"):
        raise SystemExit(f"full-data non ha risposto success: {fd}")
    nome = (fd.get("partner") or {}).get("name", "?")
    print(f"Partner {PARTNER_ID} = {nome}")
    if "Cosimo" not in nome:
        raise SystemExit("STOP: l'id 13 non e' Cosimo Filieri. Verificare prima di scrivere.")

    esistenti = (((fd.get("steps") or {}).get(STEP_ID) or {}).get("data") or {}).get("answers") or {}
    print(f"Risposte gia' presenti su '{STEP_ID}': {len(esistenti)} -> {sorted(esistenti)}")
    sovrascritte = sorted(k for k in answers if k in esistenti and esistenti[k] != answers[k])
    if sovrascritte:
        print(f"ATTENZIONE: queste chiavi hanno gia' un testo DIVERSO e verranno sostituite: {sovrascritte}")
        if input("Procedo comunque? [s/N] ").strip().lower() != "s":
            raise SystemExit("Annullato.")

    print("Backup pre-scrittura...")
    print("  " + "\n  ".join(p.backup("before-storia")))

    esito = p.scrivi_risposte(STEP_ID, answers)
    print(f"Scritte {len(answers)} risposte. answers_saved = {esito.get('answers_saved')}")

    print("Backup post-scrittura...")
    print("  " + "\n  ".join(p.backup("after-storia")))

    fd2 = p.full_data()
    dopo = (((fd2.get("steps") or {}).get(STEP_ID) or {}).get("data") or {}).get("answers") or {}
    mancanti = [k for k in [f"S{n:02d}" for n in range(1, 22)] if not (dopo.get(k) or "").strip()]
    print(f"\nVERIFICA — storia: {21 - len(mancanti)}/21")
    print(f"Ancora da raccogliere da Cosimo: {mancanti}")


if __name__ == "__main__":
    main()
