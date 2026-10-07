"""Lead in gestione: il percorso di chi non ha ancora comprato.

Quattro fasi, nell'ordine in cui accadono:

  questionario   ha completato il questionario (anche con l'analisi gia' pronta)
  call_fissata   ha una call prenotata
  call_fatta     la call e' stata fatta
  trattativa     ha una proposta in corso

Il Blueprint e' GRATUITO: chi riceve il Blueprint resta un lead in gestione. Un
lead esce da qui in un solo caso: ACQUISTA. Compra Ciak Start (entitlement Start)
oppure la Partnership (contratto pagato, partner attivo): da quel momento compare
in Clienti / Partner e non qui. Chi e' solo iscritto, senza questionario, non e'
ancora "in gestione": resta in Acquisizione › Lead in arrivo.

Le funzioni sono pure: ricevono i dati gia' costruiti dalle pipeline esistenti
(`_build_prospect_entries`, `pipeline_blueprint`) cosi' le regole si provano senza
database e gli stadi non divergono da quelli delle pagine di oggi.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional

FASI: tuple[tuple[str, str, str], ...] = (
    ("questionario", "Questionario", "Ha completato il questionario"),
    ("call_fissata", "Call fissata", "Ha una call prenotata"),
    ("call_fatta", "Call fatta", "Call fatta, ha il Blueprint gratuito"),
    ("trattativa", "Trattativa", "Ha una proposta in corso"),
)

# stadio della pipeline esistente -> fase di questa pagina
_DA_PROSPECT = {"diagnostica": "questionario", "report": "questionario"}
_DA_BLUEPRINT = {
    "call_prenotata": "call_fissata",
    "call_fatta": "call_fatta",
    "in_trattativa": "trattativa",
}
_ORDINE = {fase: i for i, (fase, _, _) in enumerate(FASI)}


def _giorni(iso: Any, now: datetime) -> Optional[int]:
    if not iso:
        return None
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return max(0, (now - t).days)


def _riga(entry: dict, fase: str, now: datetime) -> dict:
    da = entry.get("stage_since") or entry.get("updated_at")
    return {
        "email": entry.get("email"),
        "nome": entry.get("nome"),
        "fase": fase,
        "da": da,
        "giorni": _giorni(da, now),
        "call_starts_at": entry.get("call_starts_at"),
        "owner": entry.get("owner"),
        "phone": entry.get("phone"),
        "session_token": entry.get("session_token"),
    }


def build_lead_board(
    prospect_entries: dict[str, dict],
    blueprint_columns: Iterable[dict],
    buyer_emails: set[str],
    *,
    now: Optional[datetime] = None,
) -> dict:
    adesso = now or datetime.now(timezone.utc)
    compratori = {(e or "").strip().lower() for e in buyer_emails if e}
    per_email: dict[str, dict] = {}
    usciti: set[str] = set()

    def metti(entry: dict, fase: str) -> None:
        email = (entry.get("email") or "").strip().lower()
        if not email:
            return
        if email in compratori:
            usciti.add(email)
            return
        riga = _riga({**entry, "email": email}, fase, adesso)
        attuale = per_email.get(email)
        # se compare in due pipeline vale la fase piu' avanzata
        if attuale is None or _ORDINE[fase] > _ORDINE[attuale["fase"]]:
            per_email[email] = riga

    for entry in (prospect_entries or {}).values():
        fase = _DA_PROSPECT.get(entry.get("stage"))
        if fase:
            metti(entry, fase)
    for colonna in blueprint_columns or []:
        fase = _DA_BLUEPRINT.get(colonna.get("id"))
        if fase:
            for entry in colonna.get("items") or []:
                metti(entry, fase)
        elif colonna.get("id") == "contratto_pagato":
            # ha pagato la Partnership: e' un partner, non un lead
            for entry in colonna.get("items") or []:
                email = (entry.get("email") or "").strip().lower()
                if email:
                    usciti.add(email)
                    per_email.pop(email, None)

    # chi ha pagato e' uscito anche se era gia' stato messo in una fase
    for email in list(per_email):
        if email in compratori:
            usciti.add(email)
            del per_email[email]

    def attesa(r: dict):
        # prima chi aspetta da piu' tempo; senza data in fondo
        return (r["giorni"] is None, -(r["giorni"] or 0), r["nome"] or r["email"] or "")

    colonne = [
        {
            "id": fase,
            "titolo": titolo,
            "nota": nota,
            "lead": sorted((r for r in per_email.values() if r["fase"] == fase), key=attesa),
        }
        for fase, titolo, nota in FASI
    ]
    return {"totale": len(per_email), "usciti": len(usciti), "colonne": colonne}
