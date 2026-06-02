"""Motore "Marco" — ritmo + accountability della fase Ottimizza.

Il pezzo a leva piu alta del post-lancio: il killer #1 di un'accademia e l'abbandono
al mese 2-3. Marco non aggiunge lavoro: riduce tutto a UNA prossima azione e tiene il
ritmo con un nudge quando il partner si ferma.

Logica PURA e deterministica (nessuna AI, nessun I/O): date l'ottimizzazione salvata
(azioni + timestamp) e i KPI funnel, calcola:
  - prossima_azione        la singola cosa da fare ora (UNA, non una lista)
  - giorni_da_ultima_azione giorni dall'ultima azione completata (o dall'attivazione)
  - nudge_level            ok | warn | alert  (soglie 7 / 14 giorni)
  - pubblica_con_costanza  False solo quando il ritmo si e' chiaramente fermato
  - iscritti_webinar       passthrough se tracciato, altrimenti None

Gli stessi segnali alimentano: il nudge in-app (MarcoNudge), il motore Accelera
(recommendAccelera) e l'alert al team (should_alert_team). Tenendola pura e' riusabile
sia nell'endpoint sia in uno sweep schedulato.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

WARN_GIORNI = 7
ALERT_GIORNI = 14

_DONE = {"completed", "done", "fatto"}

# Azione di default guidata dai KPI quando non c'e una azione "aperta" esplicita.
# Ordine = imbuto: prima far entrare traffico, poi convertire, poi consolidare.
def _azione_da_kpi(kpi: dict) -> str:
    visite = _num(kpi.get("visite"))
    contatti = _num(kpi.get("contatti"))
    vendite = _num(kpi.get("vendite"))
    if visite == 0 and contatti == 0 and vendite == 0:
        return "Pubblica il primo contenuto del tuo calendario e mandalo alla tua lista."
    if visite > 0 and contatti == 0:
        return "Arrivano visite ma nessun contatto: rivedi la headline della pagina e l'invito."
    if contatti > 0 and vendite == 0:
        return "Hai contatti ma nessuna vendita: prepara e annuncia il prossimo webinar live."
    return "Raccogli una testimonianza da uno studente: la prossima vendita parte da lì."


def _num(v: Any) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _parse_dt(v: Any) -> datetime | None:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None


def _prossima_azione(ottimizzazione: dict | None, kpi: dict) -> str:
    azioni = (ottimizzazione or {}).get("azioni") or []
    for a in azioni:
        if str((a or {}).get("status", "")).lower() not in _DONE:
            label = str((a or {}).get("label", "")).strip()
            if label:
                return label
    return _azione_da_kpi(kpi)


def compute_ritmo(
    ottimizzazione: dict | None,
    kpi: dict | None = None,
    *,
    riferimento_attivazione: Any = None,
    now: datetime | None = None,
) -> dict:
    """Calcola i segnali di ritmo del partner. Mai solleva, mai None-crash."""
    kpi = kpi or {}
    now = now or datetime.now(timezone.utc)
    o = ottimizzazione or {}

    base = _parse_dt(o.get("ultima_azione_completata_at")) or _parse_dt(riferimento_attivazione)
    giorni = (now - base).days if base else None

    if giorni is None:
        nudge = "ok"
    elif giorni >= ALERT_GIORNI:
        nudge = "alert"
    elif giorni >= WARN_GIORNI:
        nudge = "warn"
    else:
        nudge = "ok"

    # Pubblica con costanza: lo diciamo "fermo" (False) solo se il ritmo e' chiaramente
    # saltato. In dubbio None: il recommender non spinge i contenuti DFY senza segnale.
    pubblica_con_costanza = False if (giorni is not None and giorni >= ALERT_GIORNI) else None

    iscritti = o.get("iscritti_webinar")
    iscritti_webinar = int(iscritti) if isinstance(iscritti, (int, float)) else None

    return {
        "prossima_azione": _prossima_azione(o, kpi),
        "giorni_da_ultima_azione": giorni,
        "nudge_level": nudge,
        "pubblica_con_costanza": pubblica_con_costanza,
        "iscritti_webinar": iscritti_webinar,
    }


def should_alert_team(ritmo: dict) -> bool:
    """True quando il team dovrebbe ricevere lo stesso segnale (outreach umano anti-abbandono)."""
    return ritmo.get("nudge_level") == "alert"
