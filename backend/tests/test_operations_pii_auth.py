"""Regressione: gli endpoint che esponevano PII senza token ora richiedono auth.

Verifica ermetica via AST (nessun import di server/router, CI-safe):
- router /api/operations/* costruito con dependencies=[Depends(require_operations_or_admin)]
- GET /api/partner/documents/status chiama require_partner_or_admin_for_partner
- GET /api/partner/{id}/onboarding chiama require_partner_or_admin_for_partner
"""
import ast
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

ROUTERS = Path(__file__).resolve().parent.parent / "routers"


def _tree(name: str) -> ast.Module:
    return ast.parse((ROUTERS / name).read_text(encoding="utf-8"))


def _router_dependencies(tree: ast.Module) -> list[str]:
    """Nomi passati a dependencies=[Depends(<name>)] nella chiamata APIRouter(...)."""
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "APIRouter"
        ):
            for kw in node.keywords:
                if kw.arg == "dependencies" and isinstance(kw.value, ast.List):
                    names = []
                    for elt in kw.value.elts:
                        if (
                            isinstance(elt, ast.Call)
                            and isinstance(elt.func, ast.Name)
                            and elt.func.id == "Depends"
                            and elt.args
                            and isinstance(elt.args[0], ast.Name)
                        ):
                            names.append(elt.args[0].id)
                    if names:
                        return names
    return []


def _handler(tree: ast.Module, name: str):
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    return None


def _calls_names(node) -> set[str]:
    out = set()
    for n in ast.walk(node):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
            out.add(n.func.id)
    return out


def test_operations_router_is_guarded():
    deps = _router_dependencies(_tree("operations.py"))
    assert "require_operations_or_admin" in deps, (
        "Il router /api/operations/* deve avere dependencies=[Depends(require_operations_or_admin)]"
    )


def test_documents_status_requires_partner_or_admin():
    handler = _handler(_tree("partner_documents.py"), "get_documents_status")
    assert handler is not None, "get_documents_status non trovato"
    assert "require_partner_or_admin_for_partner" in _calls_names(handler)


def test_get_onboarding_requires_partner_or_admin():
    handler = _handler(_tree("onboarding.py"), "get_onboarding")
    assert handler is not None, "get_onboarding non trovato"
    assert "require_partner_or_admin_for_partner" in _calls_names(handler)
