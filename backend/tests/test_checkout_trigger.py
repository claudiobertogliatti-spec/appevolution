import pytest
from routers import checkout


@pytest.mark.asyncio
async def test_handle_checkout_triggers_delivery(monkeypatch):
    captured = {"tasks": []}

    diag = {"_id": 1, "session_token": "tok", "user_email": "c@x.it", "user_name": "Cliente",
            "state_history": [], "events": [], "current_state": "report_generated"}

    class Coll:
        async def find_one(self, *a, **k): return diag
        async def replace_one(self, *a, **k): return None
    class DB:
        diagnostic_sessions = Coll()
    checkout.db = DB()

    monkeypatch.setattr(checkout, "transition_to", lambda *a, **k: None)
    monkeypatch.setattr(checkout, "add_event", lambda *a, **k: None)

    import asyncio
    def fake_create_task(coro):
        captured["tasks"].append(coro)
        coro.close()
        return None
    monkeypatch.setattr(asyncio, "create_task", fake_create_task)
    monkeypatch.setattr("services.ciak_systeme.ciak_emit_event", lambda **k: _noop())

    async def fake_processa(session_token, email, nome):
        captured["delivery_args"] = (session_token, email, nome)
    monkeypatch.setattr("services.ciak_analisi_delivery.processa_acquisto", fake_processa)

    await checkout._handle_checkout_completed({
        "id": "cs_1", "amount_total": 6700,
        "metadata": {"tipo": "ciak_blueprint", "diagnostic_session_token": "tok"},
        "customer_email": "c@x.it",
    })
    # Must have scheduled at least 2 tasks: Systeme event + analisi delivery
    assert len(captured["tasks"]) >= 2, (
        f"Expected ≥2 create_task calls (Systeme + delivery), got {len(captured['tasks'])}"
    )


async def _noop(): return None
