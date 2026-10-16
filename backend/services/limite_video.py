"""Quanti video il partner può avere in lavorazione contemporaneamente.

Perché esiste: ogni lezione caricata diventa lavoro di montaggio e poi di controllo umano
(la coda di Antonella, con un tetto di ore a settimana). Un partner che carica dieci lezioni
in un giorno non va più veloce: riempie la coda e rende impossibile programmare la settimana.
Quindi si caricano al massimo tre video per volta e si aspetta il via libera del team.

Il posto si libera da solo quando Antonella verifica la lezione. Il team può anche dare un via
libera esplicito (`via_libera_at`), che vale per il giro successivo di tre.

Modulo PURO: nessun accesso a rete o database.
"""
from typing import Any, Dict, Iterable, Optional, Tuple

MAX_IN_LAVORAZIONE = 3

# Una lezione occupa un posto finché il suo montaggio non è stato verificato.
# `verificata` = esito di Antonella sulla versione corrente (services/coda_antonella).
STATI_IN_LAVORAZIONE = ("queued", "processing", "ready_for_review", "ready_for_review_gcs", "editing")


def _versione(lesson: Dict[str, Any]) -> int:
    try:
        return max(0, int(lesson.get("output_version") or 0))
    except (TypeError, ValueError):
        return 0


def _occupa_posto(lesson: Dict[str, Any], esito: Optional[dict]) -> bool:
    """True se questa lezione sta ancora impegnando la coda."""
    if not isinstance(lesson, dict):
        return False
    if esito and esito.get("esito") == "verificata":
        return False  # controllata: il posto è libero, anche se il video resta lì
    if lesson.get("video_raw_url") or lesson.get("video_file"):
        return True
    return str(lesson.get("pipeline_status") or lesson.get("status") or "") in STATI_IN_LAVORAZIONE


def in_lavorazione(lessons: Optional[dict], esiti: Optional[Dict[str, dict]] = None,
                   chiave=None, partner_id: str = "") -> list:
    """Id delle lezioni che occupano un posto, in ordine stabile."""
    esiti = esiti or {}
    fuori = []
    for lid, les in sorted((lessons or {}).items()):
        e = esiti.get(chiave(partner_id, str(lid), _versione(les))) if chiave else None
        if _occupa_posto(les, e):
            fuori.append(str(lid))
    return fuori


def puo_caricare(n_in_lavorazione: int, massimo: int = MAX_IN_LAVORAZIONE) -> Tuple[bool, str]:
    """(si può caricare?, messaggio per il partner). Il messaggio non incolpa mai il partner."""
    if n_in_lavorazione < massimo:
        restanti = massimo - n_in_lavorazione
        return True, (f"Puoi caricare ancora {restanti} video."
                      if restanti > 1 else "Puoi caricare ancora un video.")
    return False, (
        f"Hai {n_in_lavorazione} video in lavorazione: è il massimo. "
        "Li stiamo montando e controllando uno per uno. "
        "Ti avvisiamo appena puoi caricare i prossimi — di solito nel giro di pochi giorni."
    )


def stato_upload(lessons: Optional[dict], esiti: Optional[Dict[str, dict]] = None,
                 chiave=None, partner_id: str = "", massimo: int = MAX_IN_LAVORAZIONE) -> dict:
    """Riassunto pronto per l'interfaccia del partner e per la risposta dell'endpoint."""
    aperte = in_lavorazione(lessons, esiti, chiave, partner_id)
    ok, messaggio = puo_caricare(len(aperte), massimo)
    return {
        "puo_caricare": ok,
        "in_lavorazione": len(aperte),
        "massimo": massimo,
        "lezioni_in_lavorazione": aperte,
        "messaggio": messaggio,
    }
