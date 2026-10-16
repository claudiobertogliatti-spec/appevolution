"""
Partner: compiti con scadenza (stile Trello) e avvisi di percorso (Valentina).

- Compiti: liste libere per partner (`ciak_partner_attivita`): cosa, entro quando (facoltativa),
  chi l'ha creato, quando e' stato fatto. Si chiudono, non si cancellano.
- Avvisi: SOLO lettura del percorso. Quando un partner completa un passo (partner_journey_steps),
  si segnala per qualche giorno e si propone il passo successivo del percorso. Questo modulo
  non modifica mai gli step ne' muove fasi: il motore del percorso resta com'e'.

Funzioni pure, testabili senza rete: `valida_compito`, `avvisi_percorso`.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

TESTO_MIN, TESTO_MAX = 3, 300
STATI_COMPLETATI = ("done", "completed", "approved")
STATI_CHIUSI = STATI_COMPLETATI + ("skipped",)
GIORNI_AVVISO = 7


def _parse(valore: Any) -> Optional[datetime]:
    if isinstance(valore, datetime):
        return valore if valore.tzinfo else valore.replace(tzinfo=timezone.utc)
    if not valore:
        return None
    try:
        dt = datetime.fromisoformat(str(valore).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def valida_compito(testo: Any, scadenza: Any, oggi: Optional[date] = None) -> tuple[str, Optional[str]]:
    """(testo, scadenza ISO | None). ValueError con messaggio leggibile se non va."""
    if not isinstance(testo, str):
        raise ValueError("Scrivi cosa c'è da fare.")
    testo = " ".join(testo.split())
    if not (TESTO_MIN <= len(testo) <= TESTO_MAX):
        raise ValueError(f"Il compito deve essere lungo tra {TESTO_MIN} e {TESTO_MAX} caratteri.")
    if scadenza in (None, ""):
        return testo, None
    try:
        d = date.fromisoformat(str(scadenza))
    except ValueError:
        raise ValueError("La data non è valida.")
    if d < (oggi or date.today()):
        raise ValueError("La data è già passata: scegli oggi o un giorno futuro.")
    return testo, d.isoformat()


def nuovo_compito(*, partner_id: str, testo: str, scadenza: Optional[str], autore: str,
                  now: Optional[datetime] = None) -> dict:
    return {
        "id": str(uuid.uuid4()), "partner_id": partner_id, "testo": testo, "scadenza": scadenza,
        "creato_da": autore, "creato_at": (now or datetime.now(timezone.utc)).isoformat(),
        "fatto_at": None, "fatto_da": None,
    }


def avvisi_percorso(*, steps: list[dict], definizione: list[dict], visti: set[tuple],
                    now: Optional[datetime] = None, giorni: int = GIORNI_AVVISO) -> list[dict]:
    """Avvisi per UN partner: un elemento per ogni passo completato negli ultimi `giorni`,
    non ancora segnato come visto. `prossimo` = primo passo del percorso (per numero) non
    chiuso; None se il percorso e' finito. Piu' recenti per primi."""
    now = now or datetime.now(timezone.utc)
    limite = now - timedelta(days=giorni)
    per_id = {d["step_id"]: d for d in definizione}
    chiusi = {s.get("step_id") for s in steps if s.get("status") in STATI_CHIUSI}
    prossimo = next(
        (d for d in sorted(definizione, key=lambda d: d["step_number"]) if d["step_id"] not in chiusi), None
    )
    out = []
    for s in steps:
        sid = s.get("step_id")
        if s.get("status") not in STATI_COMPLETATI or sid not in per_id or (s.get("partner_id"), sid) in visti:
            continue
        fatto = _parse(s.get("completed_at"))
        if fatto is None or fatto < limite:
            continue
        out.append({
            "partner_id": s.get("partner_id"), "step_id": sid, "step_label": per_id[sid]["label"],
            "completato_at": fatto.isoformat(),
            "prossimo": prossimo["label"] if prossimo and prossimo["step_id"] != sid else None,
        })
    return sorted(out, key=lambda a: a["completato_at"], reverse=True)
