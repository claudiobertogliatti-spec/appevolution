"""Le domande di Ciak Start: poche, in parole di tutti i giorni.

Il cliente Start risponde a otto domande; le risposte finiscono nello step
`04-posizionamento` della sua journey, SOTTO GLI STESSI id che i generatori gia'
leggono (`posizionamento_statement`, `start_content_cycle`, `start_vetrina`):
cosi' non cambia nessun generatore e il partner che sale a Partnership ritrova
queste risposte gia' dentro il suo posizionamento.

Perche' otto e non venti: il questionario del partner ha 20 domande lunghe con
termini da addetti ai lavori. Chi compra Start e' poco digitalizzato; questi sono
solo gli id che servono davvero ai generatori della consegna Start.
"""
from __future__ import annotations

from typing import Any

# Gli id sono quelli storici del questionario partner: NON rinominarli.
DOMANDE_START_IDS: tuple[str, ...] = (
    "nicchia",
    "momento_di_vita",
    "promessa",
    "trasformazione_90gg",
    "metodo_nome",
    "differenza_riconoscibile",
    "mercato_affollato",
    "prezzo_e_formato",
)

MIN_CARATTERI = 8
MAX_CARATTERI = 2000
STEP_ID = "04-posizionamento"


def pulisci_risposte(raw: Any) -> dict[str, str]:
    """Tiene solo le domande Start, come testo (senza spazi ai bordi) e con un tetto di lunghezza."""
    if not isinstance(raw, dict):
        return {}
    pulite: dict[str, str] = {}
    for chiave in DOMANDE_START_IDS:
        valore = raw.get(chiave)
        if valore is None:
            continue
        pulite[chiave] = str(valore).strip()[:MAX_CARATTERI]
    return pulite


def mancanti(risposte: dict[str, Any]) -> list[str]:
    """Le domande senza una risposta utile (vuota o troppo corta)."""
    return [
        chiave
        for chiave in DOMANDE_START_IDS
        if len(str((risposte or {}).get(chiave) or "").strip()) < MIN_CARATTERI
    ]
