"""
Unit test del funnel gratuito dopo la pulizia del vecchio funnel €27 (29/9/2026).

  1. Stati storici (clicked_67/purchased_67) letti come "analisi pronta".
  2. Lista Lead: anagrafica e fonte per chi ha fatto solo il questionario
     (canale Mariangela, link diretto) — prima spariva dalla lista.
  3. Webhook Cal.com: una call annullata riporta il lead tra i recuperi e un
     BOOKING_CREATED non fa retrocedere una call già fatta.

Mongo è finto: gira in CI senza rete.
"""
import json

import pytest

import routers.booking as bk
import routers.ciak_admin as adm
from services.ciak_state_machine import normalize_state

pytestmark = pytest.mark.unit


# ─── 1. Stati storici ────────────────────────────────────────────────

@pytest.mark.parametrize("legacy", ["clicked_67", "purchased_67"])
def test_stati_vecchio_funnel_valgono_analisi_pronta(legacy):
    assert normalize_state(legacy) == "report_generated"


def test_stati_vivi_restano_invariati():
    for state in ("ciak_started", "ciak_completed", "report_generated", "call_booked", "call_done"):
        assert normalize_state(state) == state


# ─── 2. Lead solo-questionario ──────────────────────────────────────

def test_fonte_da_optin_se_presente():
    assert adm._lead_source({"source": "masterclass_landing"}, {"tracking": {"utm_source": "mariangela"}}) == "masterclass_landing"


def test_fonte_mariangela_senza_optin():
    assert adm._lead_source(None, {"tracking": {"utm_source": " Mariangela "}}) == "mariangela"


def test_fonte_questionario_diretto_senza_tracking():
    assert adm._lead_source(None, {}) == "questionario_diretto"


def test_anagrafica_ricavata_dal_questionario():
    lead = adm._synthetic_lead({
        "user_email": "Info@Doonati.com",
        "user_name": "Francesco Donati",
        "created_at": "2026-09-23T14:52:19+00:00",
        "tracking": {"utm_source": "mariangela", "utm_campaign": "linkedin"},
    })
    assert lead["email"] == "info@doonati.com"
    assert lead["nome"] == "Francesco Donati"
    assert lead["source"] == "mariangela"
    assert lead["utm"]["utm_campaign"] == "linkedin"
    assert lead["created_at"] == "2026-09-23T14:52:19+00:00"
    assert lead["solo_questionario"] is True


def test_filtro_email_ignora_maiuscole():
    cond = adm._email_ci("info@doonati.com")
    assert cond["$options"] == "i"
    assert cond["$regex"] == r"^info@doonati\.com$"


# ─── 3. Webhook Cal.com ─────────────────────────────────────────────

class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *a, **k):
        return self

    def __aiter__(self):
        self._it = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Sessions:
    def __init__(self, doc):
        self.doc = doc
        self.saved = None

    def find(self, *a, **k):
        return _Cursor([self.doc])

    async def replace_one(self, _q, doc):
        self.saved = doc


class _DB:
    def __init__(self, doc):
        self.diagnostic_sessions = _Sessions(doc)


class _Request:
    def __init__(self, body):
        self._raw = json.dumps(body).encode()
        self.headers = {}

    async def body(self):
        return self._raw


def _doc(state, report=True):
    return {
        "_id": "x",
        "user_email": "lead@ciak.it",
        "current_state": state,
        "state_history": [{"state": state, "timestamp": "2026-09-29T09:00:00+00:00"}],
        "crm_tags": [],
        "events": [],
        "report": {"report_markdown": "ok"} if report else None,
    }


async def _webhook(monkeypatch, doc, trigger):
    monkeypatch.delenv("CALCOM_WEBHOOK_SECRET", raising=False)
    fake = _DB(doc)
    monkeypatch.setattr(bk, "db", fake)
    monkeypatch.setattr("services.ciak_systeme.fire_and_forget", lambda coro: coro.close())
    body = {"triggerEvent": trigger, "payload": {"uid": "b1", "attendees": [{"email": "lead@ciak.it"}]}}
    await bk.calcom_webhook(_Request(body))
    return fake.diagnostic_sessions.saved


@pytest.mark.asyncio
async def test_call_annullata_torna_ad_analisi_pronta(monkeypatch):
    saved = await _webhook(monkeypatch, _doc("call_booked"), "BOOKING_CANCELLED")
    assert saved["current_state"] == "report_generated"
    assert "ciak_call_cancelled" in saved["crm_tags"]


@pytest.mark.asyncio
async def test_call_annullata_senza_report_torna_a_questionario(monkeypatch):
    saved = await _webhook(monkeypatch, _doc("call_booked", report=False), "BOOKING_CANCELLED")
    assert saved["current_state"] == "ciak_completed"


@pytest.mark.asyncio
async def test_prenotazione_non_fa_retrocedere_call_fatta(monkeypatch):
    saved = await _webhook(monkeypatch, _doc("call_done"), "BOOKING_CREATED")
    assert saved["current_state"] == "call_done"
