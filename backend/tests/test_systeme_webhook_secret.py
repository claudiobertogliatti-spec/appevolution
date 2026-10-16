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
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

# Import da security_config (ermetico): importare `server` in CI fallisce perche'
# vari moduli creano directory sotto /app a import-time.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from security_config import systeme_webhook_authorized as autorizzato  # noqa: E402


def test_secret_configurato_richiede_il_token_giusto():
    assert autorizzato("segreto-vero", "segreto-vero") is True
    assert autorizzato("segreto-vero", "sbagliato") is False
    assert autorizzato("segreto-vero", "") is False
    assert autorizzato("segreto-vero", None) is False


def test_secret_non_configurato_ammette_ma_e_il_caso_di_rollout():
    """Env non ancora impostata: passa (il webhook resta vivo), il caller logga."""
    assert autorizzato("", "qualunque") is True
    assert autorizzato("", "") is True
