import ast
from pathlib import Path

import pytest


pytestmark = pytest.mark.unit


SOURCE_PATH = Path(__file__).parents[1] / "routers" / "partner_rewards.py"
TREE = ast.parse(SOURCE_PATH.read_text(encoding="utf-8"))


def _function(name):
    return next(
        node for node in TREE.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name
    )


def _calls(node, function_name):
    return [
        call for call in ast.walk(node)
        if isinstance(call, ast.Call)
        and isinstance(call.func, ast.Name)
        and call.func.id == function_name
    ]


def test_every_partner_rewards_endpoint_declares_credentials_and_guard():
    endpoints = (
        "get_rewards_state",
        "download_certificate",
        "download_bonus",
        "download_project_book",
    )

    for name in endpoints:
        endpoint = _function(name)
        argument_names = [arg.arg for arg in endpoint.args.args]
        assert "credentials" in argument_names, name
        guards = _calls(endpoint, "_require_partner_access")
        assert len(guards) == 1, name


def test_rewards_guard_runs_before_context_load():
    for name in ("get_rewards_state", "download_certificate", "download_bonus", "download_project_book"):
        endpoint = _function(name)
        guard_line = _calls(endpoint, "_require_partner_access")[0].lineno
        loads = _calls(endpoint, "_load_context")
        if loads:
            assert guard_line < loads[0].lineno, name


def test_partner_rewards_uses_optional_bearer_security():
    assignments = {
        target.id: node.value
        for node in TREE.body
        if isinstance(node, ast.Assign)
        for target in node.targets
        if isinstance(target, ast.Name)
    }
    security = assignments.get("security")
    assert isinstance(security, ast.Call)
    assert isinstance(security.func, ast.Name) and security.func.id == "HTTPBearer"
    keywords = {kw.arg: kw.value for kw in security.keywords}
    assert isinstance(keywords.get("auto_error"), ast.Constant)
    assert keywords["auto_error"].value is False
