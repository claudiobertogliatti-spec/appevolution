"""Le tre tappe datate che Ciak Start promette per iscritto al cliente.

Alla consegna dell'accesso il sistema manda un'email che promette tre tappe con
date precise, calcolate a 7/14/21 giorni da `start_purchased_at`
(`services/ciak_start_delivery.py`). Quelle date partono da sole a ogni pagamento
e finora non le ricordava nessuno: nessuna coda, nessun promemoria, nessuna
schermata. Con l'Edizione Settembre — 8 posti, partenza unica — sono 24 consegne
datate in 21 giorni tenute a memoria.

⛔ **Le date qui dentro sono le stesse dell'email, non una formula equivalente.**
`delivery_datetimes` e' la sorgente unica: `ciak_start_delivery._delivery_dates`
la importa da qui e si limita a formattarla. Se il pannello ricalcolasse per conto
suo, prima o poi mostrerebbe una data diversa da quella che il cliente ha ricevuto
per iscritto — e in quel caso la versione giusta e' sempre quella nell'email.

Le funzioni sono pure: prendono documenti, restituiscono righe. Le query stanno nel
router, cosi' le regole restano provabili senza database.
"""
from __future__ import annotations

import copy
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable, Optional

from services.ciak_client_accounts import default_start_progress, has_start_entitlement

# Gli offset dell'email. Non si toccano senza cambiare il testo gia' spedito.
MILESTONE_OFFSET_DAYS = (7, 14, 21)

# Claudio approva ogni deliverable prima che il cliente lo veda (decisione del
# 13/8/2026). La scadenza interna e' quindi 48 ore prima di quella promessa: e'
# il momento in cui il lavoro deve essere sulla sua scrivania, non consegnato.
INTERNAL_REVIEW_HOURS = 48

# Gli stati di una tappa sono solo quelli che un endpoint scrive davvero. Uno
# stato finto ("in lavorazione", "in revisione") e' peggio di uno stato mancante:
# racconta un avanzamento che nessuno ha registrato.
STATO_DA_FARE = "da_fare"
STATO_DA_APPROVARE = "da_approvare"
STATO_CONSEGNATA = "consegnata"
STATI_TAPPA = (STATO_DA_FARE, STATO_DA_APPROVARE, STATO_CONSEGNATA)

# Come lo stato di tappa si scrive sul singolo step del percorso.
STEP_STATUS_READY = "ready"
STEP_STATUS_DONE = "done"

URGENZA_SCADUTA = "scaduta"
URGENZA_IMMINENTE = "imminente"
URGENZA_IN_CORSO = "in_corso"
URGENZA_CHIUSA = "chiusa"

# Una tappa e' "imminente" quando mancano al massimo 48 ore alla data promessa.
# Con l'approvazione di Claudio in mezzo, quel momento coincide esattamente con
# la scadenza interna gia' arrivata: imminente = avrebbe gia' dovuto essere sulla
# sua scrivania.
IMMINENT_DAYS = INTERNAL_REVIEW_HOURS // 24

# Le tre tappe, con le parole dell'email. `default_start_progress` ha 7 step:
# i primi 6 stanno a due a due nelle tre tappe promesse. Il settimo (revisione
# finale e readiness partnership) NON ha una data promessa nell'email e non
# diventa una quarta tappa: inventargliene una sarebbe una promessa che il
# cliente non ha mai ricevuto.
MILESTONES: tuple[dict[str, Any], ...] = (
    {
        "tappa": 1,
        "titolo": "Posizionamento e brand",
        "contenuto": "Direzione di posizionamento e basi del brand",
        "step_ids": ("start_1", "start_2"),
    },
    {
        "tappa": 2,
        "titolo": "Profili social e sito vetrina",
        "contenuto": "Sistemazione dei profili social e sito vetrina semplice",
        "step_ids": ("start_3", "start_4"),
    },
    {
        "tappa": 3,
        "titolo": "Strategia contenuti e calendario 90 giorni",
        "contenuto": "Strategia contenuti e calendario editoriale a 90 giorni",
        "step_ids": ("start_5", "start_6"),
    },
)

STEP_SENZA_DATA_PROMESSA = "start_7"


# ─── Le date: sorgente unica, condivisa con l'email ────────────────────────


def delivery_datetimes(paid_at: Any) -> list[datetime]:
    """Le tre scadenze promesse, a partire dalla data di pagamento.

    Sorgente unica: `ciak_start_delivery._delivery_dates` formatta questo.
    """
    try:
        base = datetime.fromisoformat(str(paid_at).replace("Z", "+00:00"))
    except (TypeError, ValueError, AttributeError):
        base = datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return [base + timedelta(days=days) for days in MILESTONE_OFFSET_DAYS]


def format_delivery_dates(paid_at: Any) -> list[str]:
    """Le tre date come le legge il cliente nell'email: `gg/mm/aaaa`."""
    return [moment.strftime("%d/%m/%Y") for moment in delivery_datetimes(paid_at)]


# ─── L'avanzamento: UNA funzione sola ──────────────────────────────────────
#
# ⛔ `start_progress` e' un campo IN DISMISSIONE. Si legge e si scrive SOLO nelle
#    due funzioni qui sotto (`_stato_tappe` e `apply_milestone_status`).
#    Il Blocco 1 sposta lo stato degli step su `partner_journey_steps` (journey
#    unica con `tier`): quando atterra si cambiano queste due funzioni, e nient'altro.


def _steps_by_id(client: dict) -> dict[str, dict]:
    return {
        step.get("id"): step
        for step in (client.get("start_progress") or [])
        if isinstance(step, dict) and step.get("id")
    }


def _stato_tappe(client: dict) -> dict[int, dict[str, Any]]:
    """Stato di avanzamento delle 3 tappe, letto dal percorso del cliente.

    Oggi: `ciak_clients.start_progress`.
    Domani (Blocco 1): `partner_journey_steps`, journey unica con `tier`.
    """
    steps = _steps_by_id(client)
    stato: dict[int, dict[str, Any]] = {}

    for milestone in MILESTONES:
        presenti = [steps[sid] for sid in milestone["step_ids"] if sid in steps]
        completa = len(presenti) == len(milestone["step_ids"])

        if completa and all(s.get("status") == STEP_STATUS_DONE for s in presenti):
            corrente = STATO_CONSEGNATA
        elif any(s.get("status") == STEP_STATUS_READY for s in presenti):
            corrente = STATO_DA_APPROVARE
        else:
            corrente = STATO_DA_FARE

        stato[milestone["tappa"]] = {
            "stato": corrente,
            "step_ids": list(milestone["step_ids"]),
            "consegnata_at": next(
                (s.get("delivered_at") for s in presenti if s.get("delivered_at")), None
            ),
            "consegnata_da": next(
                (s.get("delivered_by") for s in presenti if s.get("delivered_by")), None
            ),
            "riferimento": next(
                (s.get("reference") for s in presenti if s.get("reference")), None
            ),
            "nota": next((s.get("note") for s in presenti if s.get("note")), None),
            "pronta_at": next((s.get("ready_at") for s in presenti if s.get("ready_at")), None),
        }
    return stato


def apply_milestone_status(
    client: dict,
    *,
    tappa: int,
    stato: str,
    attore: Optional[str],
    riferimento: Optional[str] = None,
    nota: Optional[str] = None,
    now: Optional[datetime] = None,
) -> list[dict]:
    """Segna una tappa come pronta da approvare o come consegnata.

    Restituisce il nuovo `start_progress` da persistere: non muta l'originale e
    non tocca gli step delle altre tappe. In particolare non sblocca la tappa
    successiva — la progressione degli step e' materia del Blocco 1, non di un
    pannello di scadenze.
    """
    milestone = next((m for m in MILESTONES if m["tappa"] == tappa), None)
    if milestone is None:
        raise ValueError(f"Tappa inesistente: {tappa}. Le tappe promesse sono 1, 2 e 3.")
    if stato not in (STATO_DA_APPROVARE, STATO_CONSEGNATA):
        raise ValueError(
            f"Stato non scrivibile: {stato!r}. Ammessi: {STATO_DA_APPROVARE!r}, {STATO_CONSEGNATA!r}."
        )

    progress = copy.deepcopy(client.get("start_progress") or [])
    if not progress:
        # Un cliente Start attivato prima che il percorso esistesse non deve far
        # fallire la marcatura: si ricostruisce il percorso di default.
        progress = default_start_progress()

    momento = (now or datetime.now(timezone.utc)).isoformat()
    for step in progress:
        if not isinstance(step, dict) or step.get("id") not in milestone["step_ids"]:
            continue
        if stato == STATO_CONSEGNATA:
            step.update({
                "status": STEP_STATUS_DONE,
                "delivered_at": momento,
                "delivered_by": attore,
                "reference": riferimento or None,
                "note": nota or None,
            })
        else:
            step.update({
                "status": STEP_STATUS_READY,
                "ready_at": momento,
                "ready_by": attore,
                "delivered_at": None,
                "note": nota or step.get("note") or None,
            })
    return progress


# ─── Le righe del pannello ─────────────────────────────────────────────────


def _giorni(scadenza: datetime, oggi: date) -> int:
    """Giorni di calendario alla scadenza. L'email promette un giorno, non un
    istante: contarli sull'orologio farebbe scattare il ritardo a meta' giornata."""
    return (scadenza.date() - oggi).days


def _urgenza(stato: str, giorni: int) -> str:
    if stato == STATO_CONSEGNATA:
        return URGENZA_CHIUSA
    if giorni < 0:
        return URGENZA_SCADUTA
    if giorni <= IMMINENT_DAYS:
        return URGENZA_IMMINENTE
    return URGENZA_IN_CORSO


def _ordine(row: dict) -> tuple[int, int]:
    # Le consegnate in fondo; fra le aperte, la piu' in ritardo per prima.
    return (1 if row["stato"] == STATO_CONSEGNATA else 0, row["giorni"])


def milestone_rows(client: dict, *, now: Optional[datetime] = None) -> list[dict]:
    """Le 3 righe di un cliente Start, ordinate per urgenza."""
    adesso = now or datetime.now(timezone.utc)
    oggi = adesso.date()
    scadenze = delivery_datetimes(client.get("start_purchased_at"))
    stato_tappe = _stato_tappe(client)

    rows = []
    for milestone, scadenza in zip(MILESTONES, scadenze):
        avanzamento = stato_tappe[milestone["tappa"]]
        stato = avanzamento["stato"]
        giorni = _giorni(scadenza, oggi)
        interna = scadenza - timedelta(hours=INTERNAL_REVIEW_HOURS)
        rows.append({
            "client_id": client.get("id"),
            "email": client.get("email"),
            "nome": client.get("name"),
            "tappa": milestone["tappa"],
            "titolo": milestone["titolo"],
            "contenuto": milestone["contenuto"],
            "step_ids": list(milestone["step_ids"]),
            "data_promessa": scadenza.strftime("%d/%m/%Y"),
            "data_promessa_iso": scadenza.isoformat(),
            "scadenza_interna": interna.strftime("%d/%m/%Y"),
            "scadenza_interna_iso": interna.isoformat(),
            "giorni": giorni,
            "giorni_ritardo": max(0, -giorni),
            "giorni_interni": _giorni(interna, oggi),
            "stato": stato,
            "urgenza": _urgenza(stato, giorni),
            "consegnata_at": avanzamento["consegnata_at"],
            "consegnata_da": avanzamento["consegnata_da"],
            "riferimento": avanzamento["riferimento"],
            "nota": avanzamento["nota"],
            "pronta_at": avanzamento["pronta_at"],
        })

    return sorted(rows, key=_ordine)


def build_report(clients: Iterable[dict], *, now: Optional[datetime] = None) -> dict:
    """Il pannello: una riga per tappa per cliente, ordinato per urgenza.

    In cima gli unici due numeri che contano — quante tappe sono scadute e quante
    scadono entro 48 ore.
    """
    adesso = now or datetime.now(timezone.utc)
    items: list[dict] = []
    clienti = 0

    for client in clients:
        if not has_start_entitlement(client):
            continue
        clienti += 1
        items.extend(milestone_rows(client, now=adesso))

    items.sort(key=_ordine)
    return {
        "totale_clienti": clienti,
        "totale_tappe": len(items),
        "scadute": sum(1 for row in items if row["urgenza"] == URGENZA_SCADUTA),
        "entro_48_ore": sum(1 for row in items if row["urgenza"] == URGENZA_IMMINENTE),
        "consegnate": sum(1 for row in items if row["stato"] == STATO_CONSEGNATA),
        "items": items,
        "generato_at": adesso.isoformat(),
    }
