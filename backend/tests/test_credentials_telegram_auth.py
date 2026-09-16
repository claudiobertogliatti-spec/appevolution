"""Guardia: store-credentials ha auth admin e il webhook Telegram verifica il secret.

Audit 16/9/2026:
- POST /api/stefania/api/store-credentials salvava token Meta/LinkedIn di un
  partner arbitrario SENZA auth (nessun caller nel repo → admin-only).
- POST /api/telegram/webhook processava update Telegram senza verificare il
  secret token (X-Telegram-Bot-Api-Secret-Token).

Test statico (ermetico: legge server.py come testo, non lo importa — l'import di
server crea directory sotto /app e rompe la CI).
"""
import ast
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parent.parent / "server.py"
GUARD_NAME = re.compile(r"^(require_|verify_|get_current_user)", re.I)


def _handler(tree, method, path):
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            if (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.func.attr == method
                and dec.args
                and isinstance(dec.args[0], ast.Constant)
                and dec.args[0].value == path
            ):
                return node
    return None


def test_store_credentials_ha_guardia_admin():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    node = _handler(tree, "post", "/stefania/api/store-credentials")
    assert node is not None, "route store-credentials non trovata"
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
    assert any(GUARD_NAME.match(d) for d in deps), f"senza guardia (Depends: {sorted(deps)})"


def test_telegram_webhook_verifica_il_secret():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    node = _handler(tree, "post", "/telegram/webhook")
    assert node is not None, "route telegram/webhook non trovata"
    src = ast.get_source_segment(SERVER.read_text(encoding="utf-8"), node) or ""
    assert "TELEGRAM_WEBHOOK_SECRET" in src, "il webhook Telegram non legge il secret"
    assert "systeme_webhook_authorized" in src, "il webhook Telegram non verifica il secret"
