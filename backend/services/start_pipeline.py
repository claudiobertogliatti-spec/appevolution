"""Pipeline dei clienti Ciak Start: in che punto e' ognuno e cosa tocca a te.

Una riga per cliente, in una colonna sola. La colonna risponde a una domanda: "di
chi e' la prossima mossa?".

  attesa_cliente   mancano risposte o scelte sul marchio: non puoi fare niente
  da_preparare     gli input ci sono ma restano materiali da generare
  da_approvare     c'e' almeno una bozza che aspetta la tua approvazione
  completato       i 6 materiali sono approvati

La precedenza e' questa: una bozza da approvare vince su tutto, perche' e' l'unica
cosa che il cliente aspetta da te. Un materiale e' "approvato" solo se esiste il
deliverable con `approval_status: approved` (la stessa regola che decide cosa vede
il cliente), mai per un `status` dello step.

Le funzioni sono pure: ricevono documenti gia' caricati dal router, cosi' le
regole si provano senza database. Le date sono quelle delle tappe promesse
(`ciak_start_milestones`), non una formula nuova.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from services.ciak_start_milestones import STATO_CONSEGNATA, milestone_rows

STAGES: tuple[tuple[str, str], ...] = (
    ("attesa_cliente", "Aspetta il cliente"),
    ("da_preparare", "Da preparare"),
    ("da_approvare", "Da approvare"),
    ("completato", "Completato"),
)

# (tipo deliverable, step della journey, titolo in parole del cliente)
MATERIALI: tuple[tuple[str, str, str], ...] = (
    ("positioning", "04-posizionamento", "Chi sei e cosa offri"),
    ("brand_kit", "03-brand-kit", "Il tuo marchio"),
    ("social_profiles", "start-profili", "I profili social"),
    ("showcase", "start-vetrina", "La pagina web"),
    ("content_plan_90d", "start-contenuti-90", "Il calendario dei 60 giorni"),
    ("partnership_readiness", "start-readiness", "Il controllo finale"),
)

APPROVATO = "approvato"
DA_APPROVARE = "da_approvare"
IN_GENERAZIONE = "in_generazione"
ERRORE = "errore"
DA_FARE = "da_fare"


def _materiale(tipo: str, step_id: str, titolo: str, doc: Optional[dict], step: dict) -> dict:
    if doc:
        stato = APPROVATO if doc.get("approval_status") == "approved" else DA_APPROVARE
    elif step.get("generation_status") == "errore":
        stato = ERRORE
    elif step.get("generation_status") == "in_corso":
        stato = IN_GENERAZIONE
    else:
        stato = DA_FARE
    return {"type": tipo, "step_id": step_id, "titolo": titolo, "stato": stato}


def _prossima_scadenza(client: dict, steps: list[dict], now: datetime) -> Optional[dict]:
    """La tappa promessa piu' vicina non ancora consegnata, con i giorni che mancano."""
    aperte = [r for r in milestone_rows(client, steps, now=now) if r["stato"] != STATO_CONSEGNATA]
    if not aperte:
        return None
    prima = min(aperte, key=lambda r: r["data_promessa_iso"])
    return {
        "tappa": prima["tappa"],
        "titolo": prima["titolo"],
        "data_promessa": prima["data_promessa"],
        "giorni": prima["giorni"],
        "urgenza": prima["urgenza"],
    }


def riga_cliente(
    client: dict,
    steps: Iterable[dict],
    deliverables: Iterable[dict],
    *,
    now: Optional[datetime] = None,
) -> dict:
    adesso = now or datetime.now(timezone.utc)
    steps = [s for s in (steps or []) if isinstance(s, dict)]
    by_step = {s.get("step_id"): s for s in steps}
    docs = {d.get("type"): d for d in (deliverables or []) if isinstance(d, dict)}

    materiali = [
        _materiale(tipo, step_id, titolo, docs.get(tipo), by_step.get(step_id) or {})
        for tipo, step_id, titolo in MATERIALI
    ]
    risposte = bool(((by_step.get("04-posizionamento") or {}).get("data") or {}).get("answers_completed_at"))
    marchio = bool(((by_step.get("03-brand-kit") or {}).get("data") or {}).get("brand_completed_at"))
    mancano = [nome for nome, fatto in (("le risposte", risposte), ("le scelte sul marchio", marchio)) if not fatto]
    da_approvare = [m for m in materiali if m["stato"] == DA_APPROVARE]
    approvati = [m for m in materiali if m["stato"] == APPROVATO]

    if da_approvare:
        stage = "da_approvare"
        prossima = f"Leggi e approva: {da_approvare[0]['titolo']}"
    elif mancano:
        stage = "attesa_cliente"
        prossima = "Aspetta " + " e ".join(mancano) + " del cliente"
    elif len(approvati) == len(materiali):
        stage = "completato"
        prossima = "Tutto approvato"
    else:
        stage = "da_preparare"
        errori = [m for m in materiali if m["stato"] == ERRORE]
        prossima = (
            f"Rilancia: la generazione di {errori[0]['titolo']} e' fallita"
            if errori
            else "Prepara le bozze"
        )

    return {
        "client_id": client.get("id"),
        "nome": client.get("name"),
        "email": client.get("email"),
        "acquistato_il": client.get("start_purchased_at"),
        "stage": stage,
        "prossima_azione": prossima,
        "risposte_inviate": risposte,
        "marchio_inviato": marchio,
        "approvati": len(approvati),
        "totale": len(materiali),
        "materiali": materiali,
        "prossima_scadenza": _prossima_scadenza(client, steps, adesso),
    }


def build_pipeline(
    clients: Iterable[dict],
    steps_by_client: dict[str, list[dict]] | None = None,
    deliverables_by_client: dict[str, list[dict]] | None = None,
    *,
    now: Optional[datetime] = None,
) -> dict:
    """Colonne con i loro clienti. In ogni colonna, per primi i piu' urgenti."""
    from services.ciak_client_accounts import has_start_entitlement

    steps_by_client = steps_by_client or {}
    deliverables_by_client = deliverables_by_client or {}
    righe = [
        riga_cliente(c, steps_by_client.get(c.get("id")) or [], deliverables_by_client.get(c.get("id")) or [], now=now)
        for c in clients
        if has_start_entitlement(c)
    ]

    def ordine(r: dict):
        scad = r["prossima_scadenza"]
        return (scad["giorni"] if scad else 10**6, r["nome"] or r["email"] or "")

    colonne = [
        {"id": sid, "titolo": titolo, "clienti": sorted((r for r in righe if r["stage"] == sid), key=ordine)}
        for sid, titolo in STAGES
    ]
    return {"totale": len(righe), "colonne": colonne}
