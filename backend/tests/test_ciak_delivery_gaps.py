"""Regole della diagnostica "consegne mancate".

Ogni riga di questo file corrisponde a un modo, verificato nel codice, in cui
un cliente puo' pagare e non ricevere quello per cui ha pagato senza che
nessuno se ne accorga:

  - `finalizzazione_partnership.<effetto> = "failed"` viene persistito da
    proposta.py ma non lo legge NESSUNA schermata (grep esaustivo su backend/
    e frontend/src: zero lettori);
  - `bozza_errore` viene scritto da ciak_analisi_delivery.py quando l'invio
    dell'analisi fallisce, e non lo legge nessuno: nell'admin il cliente
    risulta solo "non ancora consegnata", indistinguibile da "in corso";
  - `ciak_client_access_recovery` raccoglie i magic link Blueprint falliti e
    resta una coda che nessuno svuota;
  - `ciak_orphan_purchases` compare in /transactions come riga contabile, non
    come cosa da fare.

Le funzioni sono pure: prendono documenti, restituiscono voci. Cosi' le regole
si possono provare senza un Mongo finto e senza rete.
"""
from datetime import datetime, timedelta, timezone

import pytest

from services.ciak_delivery_gaps import (
    SEVERITY_CRITICAL,
    SEVERITY_HIGH,
    SEVERITY_MEDIUM,
    analysis_gap,
    access_recovery_gap,
    build_gap_report,
    partnership_gap,
)

pytestmark = pytest.mark.unit


def _hours_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=n)).isoformat()


# ── Partnership ────────────────────────────────────────────────────────────

def test_partnership_effect_failed_is_reported():
    gap = partnership_gap({
        "token": "tok-1",
        "prospect_email": "mario@example.com",
        "prospect_nome": "Mario Bianchi",
        "pagamento_completato": True,
        "pagamento_completato_at": _hours_ago(2),
        "finalizzazione_partnership": {"account": "failed", "account_error": "RuntimeError"},
    })

    assert gap is not None
    assert gap["severity"] == SEVERITY_CRITICAL
    assert "account" in gap["effetti_falliti"]
    assert gap["retriable"] is True


def test_partnership_stuck_running_is_reported():
    """Un claim rimasto "running" significa processo morto a meta'."""
    gap = partnership_gap({
        "token": "tok-2",
        "prospect_email": "x@example.com",
        "pagamento_completato": True,
        "pagamento_completato_at": _hours_ago(3),
        "finalizzazione_partnership": {"account": "done", "journey": "running"},
    })

    assert gap is not None
    assert "journey" in gap["effetti_incompleti"]


def test_partnership_paid_without_any_finalization_is_reported():
    """Incassato e nessun effetto avviato: il caso peggiore."""
    gap = partnership_gap({
        "token": "tok-3",
        "prospect_email": "y@example.com",
        "pagamento_completato": True,
        "pagamento_completato_at": _hours_ago(1),
    })

    assert gap is not None
    assert gap["severity"] == SEVERITY_CRITICAL


def test_completed_partnership_is_not_a_gap():
    gap = partnership_gap({
        "token": "tok-4",
        "prospect_email": "z@example.com",
        "pagamento_completato": True,
        "pagamento_completato_at": _hours_ago(5),
        "finalizzazione_partnership": {
            "account": "done", "journey": "done", "tags": "done",
            "notification": "done", "complete": True,
        },
    })

    assert gap is None


def test_unpaid_proposal_is_not_a_gap():
    """Una proposta non pagata non e' una consegna mancata: e' una trattativa."""
    assert partnership_gap({"token": "t", "stato": "vista"}) is None


# ── Analisi Blueprint ──────────────────────────────────────────────────────

def test_analysis_send_error_is_reported():
    gap = analysis_gap(
        {"session_token": "s1", "email": "a@example.com", "bozza_errore": "SMTP non configurato"},
        purchased_at=_hours_ago(6),
    )

    assert gap is not None
    assert gap["severity"] == SEVERITY_HIGH
    assert "SMTP" in gap["errore"]


def test_analysis_never_sent_after_grace_is_reported():
    """Nessun errore ma nessun invio: il create_task puo' essere morto."""
    gap = analysis_gap(
        {"session_token": "s2", "email": "b@example.com"},
        purchased_at=_hours_ago(48),
    )

    assert gap is not None
    assert gap["severity"] == SEVERITY_MEDIUM


def test_analysis_still_within_grace_is_not_reported():
    """Subito dopo l'acquisto la generazione e' legittimamente in corso."""
    assert analysis_gap(
        {"session_token": "s3", "email": "c@example.com"},
        purchased_at=_hours_ago(1),
    ) is None


def test_delivered_analysis_is_not_a_gap():
    assert analysis_gap(
        {"session_token": "s4", "email": "d@example.com", "bozza_inviata_at": _hours_ago(2)},
        purchased_at=_hours_ago(4),
    ) is None


def test_start_access_recovery_is_499_eur_and_retriable_without_token():
    gap = access_recovery_gap(
        {
            "id": "recovery-start-1",
            "tier": "start",
            "client_id": "client-1",
            "email": "start@example.com",
            "checkout_session_id": "cs_start_secret",
            "status": "pending",
            "error": "SMTP down",
            "created_at": _hours_ago(2),
        }
    )

    assert gap["tipo"] == "accesso_start"
    assert gap["importo_eur"] == 499
    assert gap["retriable"] is True
    assert gap["recovery_id"] == "recovery-start-1"
    assert "cs_start_secret" not in repr(gap)


# ── Report complessivo ─────────────────────────────────────────────────────

def test_report_sorts_critical_first_and_counts():
    report = build_gap_report(
        proposte=[
            {"token": "p1", "prospect_email": "p1@example.com", "pagamento_completato": True,
             "pagamento_completato_at": _hours_ago(2)},
        ],
        analisi=[
            ({"session_token": "s1", "email": "s1@example.com", "bozza_errore": "boom"}, _hours_ago(6)),
        ],
        access_recovery=[
            {"id": "r1", "email": "r1@example.com", "status": "pending",
             "created_at": _hours_ago(3), "error": "Systeme down"},
        ],
        orphan_purchases=[
            {"stripe_session_id": "cs_1", "customer_email": "", "amount_total": 2700,
             "created_at": _hours_ago(9)},
        ],
    )

    assert report["totale"] == 4
    assert report["items"][0]["severity"] == SEVERITY_CRITICAL
    severities = [i["severity"] for i in report["items"]]
    assert severities == sorted(severities, key=lambda s: {SEVERITY_CRITICAL: 0, SEVERITY_HIGH: 1, SEVERITY_MEDIUM: 2}[s])
    assert report["per_tipo"]["partnership_finalizzazione"] == 1
    assert report["per_tipo"]["analisi_non_consegnata"] == 1


def test_empty_report_is_explicitly_clean():
    report = build_gap_report(proposte=[], analisi=[], access_recovery=[], orphan_purchases=[])

    assert report["totale"] == 0
    assert report["items"] == []


def test_report_never_leaks_tokens():
    """Nessun magic link o token di accesso nelle risposte admin.

    Il 31/7 il resend restituiva `access_url`, cioe' un token che fa entrare
    COME il cliente: rimosso su decisione di Claudio. Una lista diagnostica non
    deve reintrodurlo da un'altra porta.
    """
    report = build_gap_report(
        proposte=[{
            "token": "tok-segreto-123", "prospect_email": "e@example.com",
            "pagamento_completato": True, "pagamento_completato_at": _hours_ago(2),
        }],
        analisi=[], access_recovery=[], orphan_purchases=[],
    )

    blob = repr(report)
    assert "tok-segreto-123" not in blob
    for forbidden in ("access_url", "magic", "setup_token", "last_magic_login_url"):
        assert forbidden not in blob
