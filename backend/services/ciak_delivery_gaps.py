"""Diagnostica delle consegne mancate: pagato ma non consegnato.

Il sistema persiste gia' gli indizi di ogni fallimento, ma nessuno li legge:

  proposte.finalizzazione_partnership.<effetto> = "failed"   -> 0 lettori
  ciak_analisi.bozza_errore                                  -> 0 lettori
  ciak_client_access_recovery (status pending)               -> coda mai svuotata
  ciak_orphan_purchases                                      -> solo riga contabile

Questo modulo trasforma quegli indizi in un elenco di cose da fare, ordinato per
gravita'. Le funzioni sono pure: prendono documenti, restituiscono voci. Le
query stanno nel router, cosi' le regole restano provabili senza database.

REGOLA: nessun token, magic link o URL di accesso esce da qui. Il 31/7 il
resend restituiva `access_url` — un token che fa entrare COME il cliente — ed e'
stato rimosso su decisione di Claudio. Una lista diagnostica non lo reintroduce.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Optional

SEVERITY_CRITICAL = "critica"
SEVERITY_HIGH = "alta"
SEVERITY_MEDIUM = "media"

_SEVERITY_ORDER = {SEVERITY_CRITICAL: 0, SEVERITY_HIGH: 1, SEVERITY_MEDIUM: 2}

# Gli effetti della finalizzazione Partnership, nell'ordine in cui girano.
PARTNERSHIP_EFFECTS = ("account", "journey", "tags", "notification")

# Entro questa finestra un'analisi non ancora inviata e' semplicemente in corso.
ANALYSIS_GRACE_HOURS = 4


def _parse(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _hours_since(value: Any) -> Optional[float]:
    parsed = _parse(value)
    if parsed is None:
        return None
    return (datetime.now(timezone.utc) - parsed).total_seconds() / 3600


def _masked(token: Any) -> str:
    """Riferimento tracciabile nei log senza esporre il token utilizzabile."""
    text = str(token or "")
    return f"{text[:4]}…" if text else "—"


def partnership_gap(proposta: dict) -> Optional[dict]:
    """Partnership incassata ma non finalizzata del tutto.

    `pagamento_completato` da solo non prova che l'onboarding sia riuscito:
    viene scritto PRIMA degli effetti. Un partner puo' avere pagato 2.790 EUR e
    non avere account, journey o email.
    """
    if not proposta.get("pagamento_completato"):
        return None

    state = dict(proposta.get("finalizzazione_partnership") or {})
    if state.get("complete") is True:
        return None

    falliti = [e for e in PARTNERSHIP_EFFECTS if state.get(e) == "failed"]
    incompleti = [e for e in PARTNERSHIP_EFFECTS if state.get(e) not in ("done", "failed")]
    if not falliti and not incompleti:
        return None

    errori = {e: state.get(f"{e}_error") for e in falliti if state.get(f"{e}_error")}
    return {
        "tipo": "partnership_finalizzazione",
        "severity": SEVERITY_CRITICAL,
        "titolo": "Partnership pagata, onboarding incompleto",
        "email": proposta.get("prospect_email"),
        "nome": proposta.get("prospect_nome"),
        "importo_eur": 2790,
        "pagato_da_ore": _hours_since(proposta.get("pagamento_completato_at")),
        "effetti_falliti": falliti,
        "effetti_incompleti": incompleti,
        "errori": errori,
        "riferimento": _masked(proposta.get("token")),
        "retriable": True,
        "azione": "Rilancia la finalizzazione: riprende solo gli effetti non riusciti.",
    }


def analysis_gap(analisi: dict, purchased_at: Any) -> Optional[dict]:
    """Blueprint pagato ma analisi mai arrivata al cliente."""
    if analisi.get("bozza_inviata_at"):
        return None

    errore = analisi.get("bozza_errore")
    ore = _hours_since(purchased_at)

    if errore:
        return {
            "tipo": "analisi_non_consegnata",
            "severity": SEVERITY_HIGH,
            "titolo": "Analisi Blueprint non consegnata (invio fallito)",
            "email": analisi.get("email"),
            "nome": analisi.get("nome"),
            "importo_eur": 27,
            "pagato_da_ore": ore,
            "errore": str(errore),
            "riferimento": _masked(analisi.get("session_token")),
            "retriable": False,
            "azione": "Verifica SMTP, poi rigenera e reinvia dalla scheda cliente.",
        }

    if ore is not None and ore >= ANALYSIS_GRACE_HOURS:
        return {
            "tipo": "analisi_non_consegnata",
            "severity": SEVERITY_MEDIUM,
            "titolo": "Analisi Blueprint mai inviata, senza errore registrato",
            "email": analisi.get("email"),
            "nome": analisi.get("nome"),
            "importo_eur": 27,
            "pagato_da_ore": ore,
            "errore": None,
            "riferimento": _masked(analisi.get("session_token")),
            "retriable": False,
            "azione": (
                "Il task in background puo' essere morto durante un deploy: "
                "rigenera l'analisi dalla scheda cliente."
            ),
        }
    return None


def access_recovery_gap(entry: dict) -> Optional[dict]:
    """Accesso Blueprint/Start mai consegnato (coda di recovery)."""
    if entry.get("status") != "pending":
        return None
    is_start = entry.get("tier") == "start"
    return {
        "tipo": "accesso_start" if is_start else "accesso_blueprint",
        "severity": SEVERITY_HIGH,
        "titolo": "Cliente Ciak Start senza email di accesso" if is_start else "Cliente Blueprint senza link di accesso",
        "email": entry.get("email"),
        "nome": None,
        "importo_eur": 499 if is_start else 27,
        "pagato_da_ore": _hours_since(entry.get("created_at")),
        "errore": entry.get("error"),
        "riferimento": _masked(entry.get("checkout_session_id")),
        "recovery_id": entry.get("id") if is_start else None,
        "retriable": is_start,
        "azione": (
            "Riprova l'email Start: verra' generato un nuovo link monouso."
            if is_start else "Rigenera l'accesso dalla scheda cliente e verifica Systeme."
        ),
    }


def orphan_purchase_gap(purchase: dict) -> Optional[dict]:
    """Pagamento Stripe senza cliente collegato."""
    return {
        "tipo": "acquisto_orfano",
        "severity": SEVERITY_MEDIUM,
        "titolo": "Pagamento senza cliente collegato",
        "email": purchase.get("customer_email") or None,
        "nome": None,
        "importo_eur": round((purchase.get("amount_total") or 0) / 100, 2),
        "pagato_da_ore": _hours_since(purchase.get("created_at")),
        "errore": None,
        "riferimento": _masked(purchase.get("stripe_session_id")),
        "retriable": False,
        "azione": "Collega manualmente l'acquisto a un cliente dalla scheda transazioni.",
    }


def build_gap_report(
    *,
    proposte: Iterable[dict],
    analisi: Iterable[tuple],
    access_recovery: Iterable[dict],
    orphan_purchases: Iterable[dict],
) -> dict:
    """Elenco unico delle consegne mancate, il piu' grave in cima."""
    items: list[dict] = []

    for proposta in proposte:
        gap = partnership_gap(proposta)
        if gap:
            items.append(gap)

    for doc, purchased_at in analisi:
        gap = analysis_gap(doc, purchased_at)
        if gap:
            items.append(gap)

    for entry in access_recovery:
        gap = access_recovery_gap(entry)
        if gap:
            items.append(gap)

    for purchase in orphan_purchases:
        gap = orphan_purchase_gap(purchase)
        if gap:
            items.append(gap)

    items.sort(
        key=lambda i: (_SEVERITY_ORDER[i["severity"]], -(i.get("pagato_da_ore") or 0))
    )

    per_tipo: dict[str, int] = {}
    for item in items:
        per_tipo[item["tipo"]] = per_tipo.get(item["tipo"], 0) + 1

    return {
        "totale": len(items),
        "per_tipo": per_tipo,
        "importo_a_rischio_eur": sum(i.get("importo_eur") or 0 for i in items),
        "items": items,
        "generato_at": datetime.now(timezone.utc).isoformat(),
    }
