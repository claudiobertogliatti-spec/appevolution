"""Guardia: gli endpoint critici di scrittura su /api/partners/* hanno auth.

Il 16/9/2026 un audit ha trovato che il test-guardia storico
(`test_admin_endpoints_auth.py`) sorveglia SOLO i prefissi `/api/admin/*` e
`/api/partner-hub/*`. Endpoint distruttivi/finanziari su `/api/partners/*` erano
sfuggiti al lockdown ed erano raggiungibili SENZA token: `DELETE /partners/{id}`
cancellava partner + documenti + pagamenti a un anonimo, e i vari endpoint
pagamento permettevano di falsificare incassi.

Questo test rilegge staticamente `server.py` e fallisce se uno di questi handler
perde la sua guardia di auth. La UI admin li chiama gia' con il Bearer token
(adminFetch), quindi l'auth non rompe nulla: qui si impedisce solo che qualcuno
la tolga per distrazione.
"""
import ast
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parent.parent / "server.py"

# (metodo, path) che DEVONO avere una guardia di auth.
CRITICI = {
    ("patch", "/partners/{partner_id}"),
    ("delete", "/partners/{partner_id}"),
    ("post", "/partners/{partner_id}/payments"),
    ("patch", "/partners/{partner_id}/payments/{payment_id}"),
    ("post", "/partners/{partner_id}/segna-pagamento-partnership"),
}

GUARD_NAME = re.compile(r"^(require_|verify_|get_current_user)", re.I)


def _guards_in(func: ast.AST) -> set:
    """Nomi X di ogni `Depends(X)` che compare nell'handler (firma inclusa)."""
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


def test_endpoint_critici_partners_hanno_una_guardia():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    visti = {}
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            if (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.args
                and isinstance(dec.args[0], ast.Constant)
                and isinstance(dec.args[0].value, str)
            ):
                key = (dec.func.attr, dec.args[0].value)
                if key in CRITICI:
                    visti[key] = _guards_in(node)

    mancanti = []
    for key in CRITICI:
        guards = visti.get(key)
        if guards is None:
            mancanti.append(f"{key[0].upper()} {key[1]} — route non trovata")
        elif not any(GUARD_NAME.match(g) for g in guards):
            mancanti.append(f"{key[0].upper()} {key[1]} — senza guardia (Depends: {sorted(guards)})")

    assert not mancanti, "Endpoint /api/partners/* senza auth:\n" + "\n".join(mancanti)
