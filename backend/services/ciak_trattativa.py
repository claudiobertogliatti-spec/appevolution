"""
Trattative: «prossimo passo con data» e cronologia di un contatto.

Il prossimo passo e' UNO per persona (collection `ciak_prossimi_passi`, chiave email): cosa si fa,
entro quando, chi l'ha deciso. Quando cambia o si chiude, quello vecchio va in `storico`: la
cronologia lo mostra, nulla si perde.

La cronologia NON inventa: mette in ordine solo eventi che hanno una data vera in una fonte
esistente (questionario/stati, proposta, solleciti inviati, prossimi passi). Cio' che non e'
registrato (telefonate, WhatsApp, note a voce) non compare e l'interfaccia lo dice.

Funzioni pure, testabili senza rete: `valida_passo`, `stato_scadenza`, `costruisci_cronologia`.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Optional

TESTO_MIN, TESTO_MAX = 3, 300

# Tappe del percorso con data reale in state_history (stesse etichette della scheda lead).
ETICHETTE_STATO = {
    "ciak_completed": "Questionario compilato",
    "report_generated": "Report / Blueprint generato",
    "call_booked": "Call fissata",
    "call_done": "Call fatta",
}

# (campo della proposta, etichetta). Ogni evento compare solo se il campo ha una data.
EVENTI_PROPOSTA = [
    ("creato_at", "Proposta inviata"),
    ("visto_at", "Proposta aperta"),
    ("accettato_at", "Proposta accettata"),
    ("contratto_firmato_at", "Contratto firmato"),
    ("pagamento_completato_at", "Pagamento completato"),
]


def _parse_iso(valore: Any) -> Optional[datetime]:
    if not valore:
        return None
    try:
        dt = datetime.fromisoformat(str(valore).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _parse_data(valore: Any) -> Optional[date]:
    try:
        return date.fromisoformat(str(valore))
    except ValueError:
        return None


def valida_passo(testo: Any, scadenza: Any, oggi: Optional[date] = None) -> tuple[str, str]:
    """(testo, scadenza ISO) puliti; ValueError con un messaggio leggibile se non vanno."""
    if not isinstance(testo, str):
        raise ValueError("Scrivi cosa farai.")
    testo = " ".join(testo.split())
    if not (TESTO_MIN <= len(testo) <= TESTO_MAX):
        raise ValueError(f"Il passo deve essere lungo tra {TESTO_MIN} e {TESTO_MAX} caratteri.")
    d = _parse_data(scadenza)
    if d is None:
        raise ValueError("Scegli una data per il prossimo passo.")
    if d < (oggi or date.today()):
        raise ValueError("La data è già passata: scegli oggi o un giorno futuro.")
    return testo, d.isoformat()


def stato_scadenza(scadenza: Any, oggi: Optional[date] = None) -> Optional[str]:
    """'scaduto' | 'oggi' | 'futuro'; None se la data non si legge."""
    d = _parse_data(scadenza)
    if d is None:
        return None
    oggi = oggi or date.today()
    return "scaduto" if d < oggi else "oggi" if d == oggi else "futuro"


def costruisci_cronologia(
    *, diagnostics: list[dict], proposte: list[dict], solleciti: list[dict], passo: Optional[dict]
) -> list[dict]:
    """Eventi {at, tipo, titolo, dettaglio?} dal piu' recente al piu' vecchio."""
    eventi: list[dict] = []

    visti: set[tuple] = set()
    for diag in diagnostics or []:
        for h in diag.get("state_history") or []:
            titolo = ETICHETTE_STATO.get(h.get("state"))
            at = _parse_iso(h.get("timestamp"))
            if not titolo or at is None or (titolo, at) in visti:
                continue
            visti.add((titolo, at))
            eventi.append({"at": at, "tipo": "percorso", "titolo": titolo})

    for p in proposte or []:
        for campo, titolo in EVENTI_PROPOSTA:
            at = _parse_iso(p.get(campo))
            if at is not None:
                eventi.append({"at": at, "tipo": "proposta", "titolo": titolo})

    for s in solleciti or []:
        at = _parse_iso(s.get("sent_at"))
        if at is None:
            continue
        recupero = s.get("tipo") == "recupero"
        if s.get("ok"):
            eventi.append({
                "at": at, "tipo": "sollecito", "titolo": "Email di recupero inviata" if recupero else "Sollecito inviato",
                "dettaglio": s.get("subject"), "autore": s.get("sent_by"),
            })
        else:
            eventi.append({
                "at": at, "tipo": "sollecito", "titolo": "Email di recupero non partita" if recupero else "Sollecito non partito",
                "dettaglio": s.get("error"), "autore": s.get("sent_by"),
            })

    voci = list((passo or {}).get("storico") or [])
    if passo and passo.get("testo"):
        voci.append({
            "testo": passo["testo"], "scadenza": passo.get("scadenza"), "creato_at": passo.get("creato_at"),
            "creato_da": passo.get("creato_da"), "fatto_at": passo.get("fatto_at"),
        })
    for v in voci:
        creato = _parse_iso(v.get("creato_at"))
        if creato is not None:
            eventi.append({
                "at": creato, "tipo": "passo", "titolo": "Prossimo passo deciso",
                "dettaglio": f"{v.get('testo')} (entro il {v.get('scadenza')})", "autore": v.get("creato_da"),
            })
        fatto = _parse_iso(v.get("fatto_at"))
        if fatto is not None:
            eventi.append({
                "at": fatto, "tipo": "passo", "titolo": "Passo fatto",
                "dettaglio": v.get("testo"), "autore": v.get("fatto_da"),
            })

    eventi.sort(key=lambda e: e["at"], reverse=True)
    return [{**e, "at": e["at"].isoformat()} for e in eventi]
