"""Guardia: gli endpoint `/funnel/export*` richiedono un admin e non scrivono fuori cartella.

Il 6/10/2026 `POST /api/funnel/export` risultava senza alcuna autenticazione: chiunque poteva
scrivere un file HTML sul server con i dati del proprio body (anche il nome file veniva da lì),
elencare tutti gli export (`GET /funnel/exports`, con il percorso del server) e scaricarli o
aprirli come pagina (`.../download/<nome>`, `.../preview/<nome>`).
`test_admin_endpoints_auth.py` non li copriva: guarda solo `/api/admin/*` e `/api/partner-hub/*`.
"""
import ast
import asyncio
import importlib
import pathlib
import sys

import pytest

pytestmark = pytest.mark.unit

SERVER = pathlib.Path(__file__).resolve().parent.parent / "server.py"
METHODS = {"get", "post", "put", "patch", "delete"}


def _export_routes():
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    found = []
    for fn in ast.walk(tree):
        if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in fn.decorator_list:
            if (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.func.attr in METHODS
                and dec.args
                and isinstance(dec.args[0], ast.Constant)
                and str(dec.args[0].value).startswith("/funnel/export")
            ):
                found.append((dec.func.attr.upper(), dec.args[0].value, fn))
    return found


def _signature_depends(fn):
    names = set()
    defaults = [d for d in [*fn.args.defaults, *fn.args.kw_defaults] if d is not None]
    for d in defaults:
        for sub in ast.walk(d):
            if (
                isinstance(sub, ast.Call)
                and isinstance(sub.func, ast.Name)
                and sub.func.id == "Depends"
                and sub.args
                and isinstance(sub.args[0], ast.Name)
            ):
                names.add(sub.args[0].id)
    return names


def test_every_funnel_export_route_requires_an_admin():
    routes = _export_routes()
    assert routes, "nessuna route /funnel/export trovata: se le hai ritirate, aggiorna questo test"
    open_routes = [f"{m} {p}" for m, p, fn in routes if "require_admin_role" not in _signature_depends(fn)]
    assert open_routes == [], f"route /funnel/export senza guardia admin: {open_routes}"


@pytest.fixture
def export_module(monkeypatch, tmp_path):
    # il modulo crea /app/storage/... all'import: nei test non deve toccare il disco
    monkeypatch.setattr(pathlib.Path, "mkdir", lambda *a, **k: None)
    monkeypatch.delitem(sys.modules, "funnel_export_service", raising=False)
    mod = importlib.import_module("funnel_export_service")
    monkeypatch.setattr(mod, "EXPORTS_PATH", tmp_path)
    return mod


def test_export_file_name_never_comes_from_the_caller_as_is(export_module, tmp_path):
    assert export_module.safe_export_name("Mario Rossi") == "Mario_Rossi"
    assert export_module.safe_export_name("../../etc/passwd") == "etc_passwd"
    assert export_module.safe_export_name("") == "partner"
    assert len(export_module.safe_export_name("x" * 300)) <= 60

    result = export_module.FunnelExportService().generate_funnel_export(
        {"name": "../../evil/name"}, [], []
    )
    assert "/" not in result["filename"] and ".." not in result["filename"]
    assert (tmp_path / result["filename"]).is_file()
    assert [p.name for p in tmp_path.iterdir()] == [result["filename"]]


def test_only_html_files_inside_the_exports_folder_can_be_read(export_module, tmp_path):
    ok = export_module.resolve_export_path("funnel_export_Mario_20261006_120000.html")
    assert ok is not None and ok.parent == tmp_path.resolve()
    for bad in ("../x.html", "a/b.html", "..", "x.txt", "", None, "..\\x.html", "a..b.html"):
        assert export_module.resolve_export_path(bad) is None, bad
