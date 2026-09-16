"""
attiva-partnership accetta solo la chiave interna o un admin.

Audit 16/9/2026: `POST /api/flusso-analisi/attiva-partnership/{user_id}` era senza
auth. E' chiamato dal backend stesso (verify_payment, stripe_webhook via
internal_api_url) SENZA header, quindi non si puo' pretendere un JWT admin: la via
normale e' una chiave interna condivisa (`INTERNAL_API_KEY`), l'admin il fallback.

Rollout-safe come il webhook Systeme: chiave non configurata = passa (per non
rompere l'attivazione post-pagamento al deploy) con warning; configurata = imposta.
"""
import ast
import re
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

# Import da security_config (ermetico): importare flusso_analisi/server in CI
# fallisce perche' moduli a valle creano directory sotto /app a import-time.
from security_config import internal_or_admin_authorized as _attiva_auth_ok  # noqa: E402


def test_chiave_interna_configurata_e_imposta():
    assert _attiva_auth_ok("k", "k", False) is True       # chiave giusta
    assert _attiva_auth_ok("k", "x", False) is False       # chiave errata, non admin
    assert _attiva_auth_ok("k", "", False) is False        # nessuna chiave, non admin
    assert _attiva_auth_ok("k", "x", True) is True         # admin (fallback)


def test_chiave_non_configurata_passa_ma_e_rollout():
    assert _attiva_auth_ok("", "qualunque", False) is True
    assert _attiva_auth_ok("", "", False) is True


def test_endpoint_attiva_partnership_ha_una_guardia():
    """Guardia statica: l'handler deve avere un Depends di auth."""
    tree = ast.parse((BACKEND / "routers" / "flusso_analisi.py").read_text(encoding="utf-8"))
    guard_re = re.compile(r"^(require_|_require_|verify_)", re.I)
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            if (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.func.attr == "post"
                and dec.args
                and isinstance(dec.args[0], ast.Constant)
                and dec.args[0].value == "/attiva-partnership/{user_id}"
            ):
                deps = set()
                for sub in ast.walk(node):
                    if (
                        isinstance(sub, ast.Call)
                        and isinstance(sub.func, ast.Name)
                        and sub.func.id == "Depends"
                        and sub.args
                        and isinstance(sub.args[0], ast.Name)
                    ):
                        deps.add(sub.args[0].id)
                assert any(guard_re.match(d) for d in deps), f"senza guardia (Depends: {sorted(deps)})"
                return
    pytest.fail("route attiva-partnership non trovata")
