"""Guardie di autorizzazione per le mutazioni amministrative sui documenti."""
import ast
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SERVER = Path(__file__).resolve().parent.parent / "server.py"
PROTECTED_HANDLERS = {
    "delete_onboarding_document",
    "verify_onboarding_document",
    "verify_document",
    "reject_document",
}


def _handlers():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    return {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name in PROTECTED_HANDLERS
    }


def test_document_mutations_require_admin_dependency():
    handlers = _handlers()
    assert set(handlers) == PROTECTED_HANDLERS

    missing = []
    for name, handler in handlers.items():
        defaults = [*handler.args.defaults, *handler.args.kw_defaults]
        has_admin_dependency = any(
            isinstance(default, ast.Call)
            and isinstance(default.func, ast.Name)
            and default.func.id == "Depends"
            and default.args
            and isinstance(default.args[0], ast.Name)
            and default.args[0].id == "verify_admin"
            for default in defaults
            if default is not None
        )
        if not has_admin_dependency:
            missing.append(name)

    assert not missing, f"Route documentali senza verify_admin: {', '.join(sorted(missing))}"


def test_verifier_identity_is_not_client_controlled():
    handler = _handlers()["verify_onboarding_document"]
    argument_names = {
        arg.arg for arg in [*handler.args.args, *handler.args.kwonlyargs]
    }
    assert "admin_email" not in argument_names
