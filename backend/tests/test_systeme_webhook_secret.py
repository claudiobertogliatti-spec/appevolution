"""
Il webhook Systeme accetta solo chi conosce il secret condiviso.

Il difetto (audit 16/9/2026): `POST /api/webhooks/systeme` accettava JSON
arbitrario senza alcuna verifica -- Systeme.io non firma i payload come Stripe.
Chiunque poteva POSTare `new_sale` e marcare un cliente come pagato. Ora c'e' un
token condiviso (`SYSTEME_WEBHOOK_SECRET`) passato via header o query.

Nota sul rollout: secret NON configurato = ammesso (per non spegnere l'onboarding
al primo deploy, prima che la env e l'URL Systeme siano impostati), con warning.
Secret configurato = imposto, confronto a tempo costante.
"""
import os

import pytest

pytestmark = pytest.mark.unit

os.environ.setdefault("MONGO_URL", "mongodb://systeme-webhook-test.invalid:27017")
os.environ.setdefault("DB_NAME", "ciak_ci")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-secret-32-characters-long!!")
os.environ.setdefault("APP_ENV", "test")

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import _systeme_webhook_autorizzato as autorizzato  # noqa: E402


def test_secret_configurato_richiede_il_token_giusto():
    assert autorizzato("segreto-vero", "segreto-vero") is True
    assert autorizzato("segreto-vero", "sbagliato") is False
    assert autorizzato("segreto-vero", "") is False
    assert autorizzato("segreto-vero", None) is False


def test_secret_non_configurato_ammette_ma_e_il_caso_di_rollout():
    """Env non ancora impostata: passa (il webhook resta vivo), il caller logga."""
    assert autorizzato("", "qualunque") is True
    assert autorizzato("", "") is True
