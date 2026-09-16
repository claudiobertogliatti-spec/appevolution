"""Guardia: gli endpoint che fabbricano un pagamento hanno auth.

Audit 16/9/2026: due endpoint scrivevano incassi SENZA autenticazione, fuori dai
prefissi sorvegliati dai test storici:
- POST /api/flusso-analisi/conferma-bonifico/{user_id}  (crea un pagamento €2.990
  `completato:True` dal nulla → a valle attivava la partnership)
- POST /api/sales/record  (inserisce una vendita/pagamento per email+importo)

Questo test rilegge staticamente i due file e fallisce se uno dei due handler
perde la guardia di auth.
"""
import ast
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parent.parent
GUARD_NAME = re.compile(r"^(require_|verify_|get_current_user)", re.I)


def _guards_in(func: ast.AST) -> set:
    found = set()
    for node in ast.walk(func):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "Depends"
            and node.args
        ):
            arg = node.args[0]
            if isinstance(arg, ast.Name):
                found.add(arg.id)
            elif isinstance(arg, ast.Attribute):
                found.add(arg.attr)
    return found


def _handler_guards(file_path: Path, method: str, path: str):
    """Ritorna i guard di un handler decorato con .<method>("<path>"), o None."""
    tree = ast.parse(file_path.read_text(encoding="utf-8"))
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
                return _guards_in(node)
    return None


def test_conferma_bonifico_ha_una_guardia():
    guards = _handler_guards(
        BACKEND / "routers" / "flusso_analisi.py", "post", "/conferma-bonifico/{user_id}"
    )
    assert guards is not None, "route conferma-bonifico non trovata"
    assert any(GUARD_NAME.match(g) for g in guards), f"senza guardia (Depends: {sorted(guards)})"


def test_sales_record_ha_una_guardia():
    guards = _handler_guards(BACKEND / "server.py", "post", "/sales/record")
    assert guards is not None, "route /sales/record non trovata"
    assert any(GUARD_NAME.match(g) for g in guards), f"senza guardia (Depends: {sorted(guards)})"
