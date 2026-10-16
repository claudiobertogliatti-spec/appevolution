"""T07 — prove, deduplicazione e riconciliazione degli effetti esterni.

Tutti ``unit``. Coprono gli scenari del piano: timeout dopo successo remoto,
callback ripetuta, pubblicazione parziale, riferimento artefatto non accessibile.
"""

from __future__ import annotations

import pytest

from services.operational_tasks.evidence import (
    EffectLedger,
    EffectOutcome,
    EffectRecord,
    all_effects_verified,
    build_idempotency_key,
    channels_needing_reconciliation,
    channels_to_retry,
    classify_effect_outcome,
)

pytestmark = pytest.mark.unit


# ─────────────────────────── classificazione dell'esito ───────────────────────────

def test_produced_requires_provider_ok_and_evidence():
    assert classify_effect_outcome(sent=True, provider_ok=True, evidence_ref="https://ig/p/1") is EffectOutcome.PRODUCED


def test_failed_only_when_never_sent():
    # errore di configurazione/connessione prima dell'invio: sicuro reinviare
    assert classify_effect_outcome(sent=False, provider_ok=False, evidence_ref=None) is EffectOutcome.FAILED


def test_timeout_after_send_is_unknown_not_failed():
    # inviato ma nessuna prova (timeout sulla rilettura del permalink): NON reinviare
    assert classify_effect_outcome(sent=True, provider_ok=False, evidence_ref=None) is EffectOutcome.UNKNOWN


def test_ok_without_evidence_is_unknown():
    # il provider dice ok ma non abbiamo riletto una prova: non è dimostrato
    assert classify_effect_outcome(sent=True, provider_ok=True, evidence_ref="  ") is EffectOutcome.UNKNOWN


# ─────────────────────────── quali canali ripetere ───────────────────────────

def _rec(channel, outcome, ref=None):
    return EffectRecord(channel=channel, idempotency_key=f"k:{channel}", outcome=outcome, evidence_ref=ref)


def test_retry_only_surely_failed_channels():
    records = [
        _rec("instagram", EffectOutcome.PRODUCED, "https://ig/p/1"),
        _rec("facebook", EffectOutcome.FAILED),
        _rec("linkedin", EffectOutcome.UNKNOWN),
    ]
    # solo facebook (FAILED). instagram è uscito; linkedin è ambiguo → riconciliare, non reinviare
    assert channels_to_retry(records) == ["facebook"]
    assert channels_needing_reconciliation(records) == ["linkedin"]


def test_partial_publication_keeps_produced_and_retries_failed_only():
    # giro 1: IG uscito (permalink), FB fallito prima dell'invio → giro 2 rifà solo FB
    giro1 = [
        _rec("instagram", EffectOutcome.PRODUCED, "https://ig/p/1"),
        _rec("facebook", EffectOutcome.FAILED),
    ]
    assert channels_to_retry(giro1) == ["facebook"]
    assert all_effects_verified(giro1, ["instagram", "facebook"]) is False


def test_unknown_channel_is_never_retried_so_no_duplicate():
    # il caso del doppione: FB timeout DOPO l'invio → UNKNOWN, non deve rientrare nel retry
    records = [_rec("facebook", EffectOutcome.UNKNOWN)]
    assert channels_to_retry(records) == []


# ─────────────────────────── completamento con prova ───────────────────────────

def test_all_effects_verified_true_only_when_all_produced_with_evidence():
    records = [
        _rec("instagram", EffectOutcome.PRODUCED, "https://ig/p/1"),
        _rec("facebook", EffectOutcome.PRODUCED, "https://fb/p/2"),
    ]
    assert all_effects_verified(records, ["instagram", "facebook"]) is True


def test_artifact_ref_not_accessible_is_not_verified():
    # il provider ha risposto ma la prova è vuota/non accessibile → non completo
    records = [_rec("instagram", EffectOutcome.PRODUCED, "")]
    assert all_effects_verified(records, ["instagram"]) is False


def test_missing_channel_is_not_verified():
    records = [_rec("instagram", EffectOutcome.PRODUCED, "https://ig/p/1")]
    assert all_effects_verified(records, ["instagram", "facebook"]) is False


# ─────────────────────────── ledger: intento + dedup ───────────────────────────

def test_ledger_records_intent_before_effect_and_dedups_repeats():
    ledger = EffectLedger()
    key = build_idempotency_key("social.publish", {"post_id": "p1"}, "v-abc")
    assert ledger.record_intent(key, "instagram") is True
    # callback/tentativo duplicato con la stessa chiave: NON rifare l'effetto
    assert ledger.record_intent(key, "instagram") is False


def test_ledger_resolve_sets_outcome_and_evidence():
    ledger = EffectLedger()
    key = build_idempotency_key("social.publish", {"post_id": "p1"}, "v-abc")
    ledger.record_intent(key, "instagram", operation_id="ig-op-1")
    rec = ledger.resolve(key, EffectOutcome.PRODUCED, evidence_ref="https://ig/p/1")
    assert rec.outcome is EffectOutcome.PRODUCED
    assert rec.evidence_ref == "https://ig/p/1"
    assert rec.operation_id == "ig-op-1"  # conservato dall'intento
    assert ledger.get(key).outcome is EffectOutcome.PRODUCED


def test_ledger_resolve_unknown_key_raises():
    ledger = EffectLedger()
    with pytest.raises(KeyError):
        ledger.resolve("mai-registrata", EffectOutcome.PRODUCED)


def test_idempotency_key_is_stable_for_same_inputs():
    a = build_idempotency_key("social.publish", {"post_id": "p1"}, "v-abc")
    b = build_idempotency_key("social.publish", {"post_id": "p1"}, "v-abc")
    c = build_idempotency_key("social.publish", {"post_id": "p2"}, "v-abc")
    assert a == b and a != c
