"""
Report della settimana (Luca). Solo numeri contati da dati veri, mai stimati.

Ogni voce e' un conteggio di righe con una data nell'intervallo, confrontato con i 7 giorni
precedenti. Luca non commenta e non interpreta: se serve un commento lo chiedi nella chat.
Una voce che non si riesce a contare viene segnalata come non disponibile, non come zero.

Funzioni pure: `finestre`, `variazione`, `costruisci`.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

# (chiave, etichetta, collection, campo data, filtro extra)
VOCI = [
    ("contatti", "Nuovi contatti", "ciak_leads", "created_at", {}),
    ("questionari", "Questionari avviati", "diagnostic_sessions", "created_at", {}),
    ("proposte", "Proposte inviate", "proposte", "creato_at", {}),
    ("accettate", "Proposte accettate", "proposte", "accettato_at", {}),
    ("pagamenti", "Pagamenti completati", "proposte", "pagamento_completato_at", {}),
    ("solleciti", "Email di sollecito e recupero inviate", "ciak_solleciti", "sent_at", {"ok": True}),
    ("post", "Post social pubblicati", "ciak_social_queue", "published_at", {"status": "published"}),
    ("reel", "Reel generati", "ciak_reel", "creato_at", {"stato": {"$ne": "fallito"}}),
]


def finestre(now: Optional[datetime] = None) -> dict:
    """Ultimi 7 giorni e i 7 precedenti, come stringhe ISO (le date nel db sono ISO)."""
    now = now or datetime.now(timezone.utc)
    a, b, c = now, now - timedelta(days=7), now - timedelta(days=14)
    return {"attuale": (b.isoformat(), a.isoformat()), "precedente": (c.isoformat(), b.isoformat())}


def variazione(attuale: Optional[int], precedente: Optional[int]) -> Optional[int]:
    """Differenza assoluta; None se uno dei due non e' disponibile."""
    if attuale is None or precedente is None:
        return None
    return attuale - precedente


def costruisci(conteggi: dict) -> list[dict]:
    """conteggi: {chiave: (attuale, precedente)} con None se non contabile."""
    righe = []
    for chiave, etichetta, *_ in VOCI:
        att, prec = conteggi.get(chiave, (None, None))
        righe.append({"chiave": chiave, "etichetta": etichetta, "attuale": att,
                      "precedente": prec, "variazione": variazione(att, prec)})
    return righe
