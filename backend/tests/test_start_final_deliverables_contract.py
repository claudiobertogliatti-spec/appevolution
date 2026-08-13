from pathlib import Path

import pytest


pytestmark = pytest.mark.unit


ROOT = Path(__file__).resolve().parents[2]


def test_admin_router_exposes_generation_and_approval_endpoints():
    source = (ROOT / "backend" / "routers" / "ciak_admin.py").read_text(encoding="utf-8")
    assert '@router.post("/start/{client_id}/calendario-90/genera")' in source
    assert '@router.post("/start/{client_id}/readiness/genera")' in source
    assert '@router.post("/start/{client_id}/deliverable/approva")' in source
    client_source = (ROOT / "backend" / "routers" / "ciak_clients.py").read_text(encoding="utf-8")
    assert '@router.get("/start/deliverables")' in client_source


def test_generation_never_auto_approves_outputs():
    source = (ROOT / "backend" / "routers" / "ciak_admin.py").read_text(encoding="utf-8")
    assert '"approval_status": "pending_review"' in source
    assert '"status": "in_progress"' in source


def test_admin_ui_exposes_explicit_generate_and_approve_actions():
    source = (ROOT / "frontend" / "src" / "ciak" / "admin" / "pages" / "ConsegneStart.jsx").read_text(encoding="utf-8")
    assert "Genera calendario 90 giorni" in source
    assert "Approva calendario" in source
    assert "Genera verifica readiness" in source
