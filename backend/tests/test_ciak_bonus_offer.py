"""
Unit test: finestra bonus 48h (guida videocorso in omaggio con Ciak Start).
`_offer_payload` guida il countdown REALE della sales page: attivo solo se la
scadenza e' nel futuro e il cliente non ha gia' acquistato. Nessun DB.
"""
from datetime import datetime, timedelta, timezone

import pytest

from routers import ciak_clients as cc

pytestmark = pytest.mark.unit


def _iso(dt):
    return dt.isoformat()


def test_bonus_attivo_se_futuro_e_non_cliente():
    future = _iso(datetime.now(timezone.utc) + timedelta(hours=10))
    out = cc._offer_payload({"bonus_expires_at": future}, already_active=False)
    assert out["bonus_guida_attiva"] is True
    assert out["bonus_expires_at"] == future
    assert out["guida_valore_cents"] == 4900


def test_bonus_scaduto_se_passato():
    past = _iso(datetime.now(timezone.utc) - timedelta(minutes=1))
    out = cc._offer_payload({"bonus_expires_at": past}, already_active=False)
    assert out["bonus_guida_attiva"] is False
    # la scadenza resta esposta (la UI mostra "offerta chiusa"), ma il bonus e' off
    assert out["bonus_expires_at"] == past


def test_bonus_off_se_gia_cliente_attivo():
    future = _iso(datetime.now(timezone.utc) + timedelta(hours=10))
    out = cc._offer_payload({"bonus_expires_at": future}, already_active=True)
    assert out["bonus_guida_attiva"] is False


def test_bonus_off_senza_scadenza():
    out = cc._offer_payload({}, already_active=False)
    assert out["bonus_guida_attiva"] is False
    assert out["bonus_expires_at"] is None


def test_bonus_gestisce_suffisso_z_e_naive():
    # timestamp con 'Z' e senza tzinfo non devono rompere il confronto
    future_z = (datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = cc._offer_payload({"bonus_expires_at": future_z}, already_active=False)
    assert out["bonus_guida_attiva"] is True
