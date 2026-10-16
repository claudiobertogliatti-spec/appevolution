"""Le domande di Ciak Start: le stesse 20 del percorso EVO (decisione di Claudio, 11/10/2026).

Il cliente Start risponde alle stesse 20 domande del partner, una alla volta; le
risposte finiscono nello step `04-posizionamento` della sua journey, SOTTO GLI STESSI
id che i generatori gia' leggono (`posizionamento_statement`, `start_content_cycle`,
`start_vetrina`): cosi' non cambia nessun generatore e chi sale a Partnership ritrova
queste risposte gia' dentro il suo posizionamento.

Storia: fino all'11/10/2026 erano solo otto (`DOMANDE_START_LEGACY_IDS`), scelte perche'
chi compra Start e' poco digitalizzato. Claudio ha deciso di allinearle a EVO (20
obbligatorie). Chi aveva gia' INVIATO le otto risposte non viene riaperto: se corregge
qualcosa, gli bastano le otto di prima (vedi `mancanti`).
"""
from __future__ import annotations

from typing import Any

# Gli id sono quelli storici del questionario partner (stesso ordine di
# `frontend/src/ciak/partner/operativo/questionari/posizionamentoQuestions.js`): NON rinominarli.
DOMANDE_START_IDS: tuple[str, ...] = (
    "nicchia",
    "momento_di_vita",
    "livello_consapevolezza",
    "paure_avatar",
    "desideri_avatar",
    "costo_del_no",
    "promessa",
    "trasformazione_90gg",
    "prezzo_e_formato",
    "metodo_nome",
    "metodo_step",
    "prova_sociale_concreta",
    "origin_story",
    "contrarian_view",
    "differenza_riconoscibile",
    "concorrenti_principali",
    "mercato_affollato",
    "obiezione_principale",
    "limite_onesto",
    "spazio_specialista",
)

# Le otto di prima: bastano a chi le aveva gia' inviate.
DOMANDE_START_LEGACY_IDS: tuple[str, ...] = (
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


def mancanti(risposte: dict[str, Any], gia_inviate: bool = False) -> list[str]:
    """Le domande senza una risposta utile (vuota o troppo corta).

    Con `gia_inviate` (il cliente aveva gia' completato) bastano le otto storiche.
    """
    richieste = DOMANDE_START_LEGACY_IDS if gia_inviate else DOMANDE_START_IDS
    return [
        chiave
        for chiave in richieste
        if len(str((risposte or {}).get(chiave) or "").strip()) < MIN_CARATTERI
    ]
