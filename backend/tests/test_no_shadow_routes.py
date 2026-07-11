"""Guardia anti shadow-route.

Nessun path deve essere definito sia in server.py (`@api_router`, prefix `/api`)
sia in un router modulare (`routers/*.py` col suo prefix). Le route di server.py
vengono registrate PRIMA dei router → vincono, rendendo la versione del router
codice morto e causando bug silenziosi (fix nel router che "non fanno effetto"
in produzione). Questo test fallisce se ricompare una collisione.
"""
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

BACKEND = Path(__file__).resolve().parent.parent
_PREFIX = re.compile(r'APIRouter\(\s*prefix\s*=\s*["\']([^"\']*)["\']')
_SERVER_DEC = re.compile(r'@api_router\.(get|post|put|patch|delete)\(\s*["\']([^"\']*)["\']')
_ROUTER_DEC = re.compile(r'@router\.(get|post|put|patch|delete)\(\s*["\']([^"\']*)["\']')


def _norm(p: str) -> str:
    return p[:-1] if p != "/" and p.endswith("/") else p


def _server_routes():
    txt = (BACKEND / "server.py").read_text(encoding="utf-8", errors="ignore")
    return {(m.upper(), _norm("/api" + path)) for m, path in _SERVER_DEC.findall(txt)}


def _router_routes():
    out = {}
    for f in sorted((BACKEND / "routers").glob("*.py")):
        txt = f.read_text(encoding="utf-8", errors="ignore")
        pm = _PREFIX.search(txt)
        prefix = pm.group(1) if pm else ""
        for m, path in _ROUTER_DEC.findall(txt):
            out.setdefault((m.upper(), _norm(prefix + path)), []).append(f.name)
    return out


def test_no_shadow_routes():
    server = _server_routes()
    routers = _router_routes()
    collisions = {k: routers[k] for k in server if k in routers}
    assert not collisions, (
        "Shadow route rilevata/e: path definiti sia in server.py sia in un router "
        "modulare (server.py vince perché registrato prima). Rimuovine una:\n"
        + "\n".join(f"  {m} {p} <- {','.join(fs)}" for (m, p), fs in sorted(collisions.items()))
    )
