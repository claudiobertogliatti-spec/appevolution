"""Legacy Partnership routes must never bypass the proposal contract."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from routers import partnership, flusso_analisi

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
@pytest.mark.parametrize("module,handler,arg", [
    (partnership, "create_partnership_checkout", SimpleNamespace(user_id="audit")),
    (flusso_analisi, "create_payment_session", "audit"),
])
async def test_retired_checkout_never_reads_db_or_creates_stripe_session(monkeypatch, module, handler, arg):
    monkeypatch.setattr(module, "db", None)
    monkeypatch.setenv("STRIPE_API_KEY", "sk_live_fixture")
    monkeypatch.setenv("CIAK_PAID_OFFERS_LEGAL_APPROVED", "true")
    monkeypatch.setenv("CIAK_PAID_OFFERS_FISCAL_APPROVED", "true")
    with pytest.raises(HTTPException) as err:
        await getattr(module, handler)(arg)
    assert err.value.status_code == 410
    assert err.value.detail["code"] == "PARTNERSHIP_PROPOSAL_REQUIRED"
