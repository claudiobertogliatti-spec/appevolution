"""Le letture di partner-documents espongono strategia e stato di tutti i partner: solo admin."""
import ast
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parent.parent / "server.py"
PROTECTED_HANDLERS = {"get_partner_documents", "get_all_partner_documents_summary"}


def _handlers():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    return {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name in PROTECTED_HANDLERS
    }


def test_partner_documents_reads_require_admin_dependency():
    handlers = _handlers()
    assert set(handlers) == PROTECTED_HANDLERS

    missing = []
    for name, handler in handlers.items():
        defaults = [*handler.args.defaults, *handler.args.kw_defaults]
        guarded = any(
            isinstance(d, ast.Call)
            and isinstance(d.func, ast.Name)
            and d.func.id == "Depends"
            and d.args
            and isinstance(d.args[0], ast.Name)
            and d.args[0].id == "require_admin_role"
            for d in defaults
            if d is not None
        )
        if not guarded:
            missing.append(name)

    assert not missing, f"partner-documents senza require_admin_role: {', '.join(sorted(missing))}"
