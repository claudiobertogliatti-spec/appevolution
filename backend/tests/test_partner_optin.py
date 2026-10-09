"""Guardia: l'iscrizione pubblica dai funnel in bozza dei partner non e' un varco.

L'endpoint e' raggiungibile senza token (lo chiama una pagina statica). Questi test
fissano le regole che lo rendono sicuro: partner con flag spento = 404 indistinguibile da
"non esiste", consenso obbligatorio (anche prima del 404), campo trappola, deduplica atomica,
tetto orario per partner e per IP, storico limitato, nessuna email nell'avviso Telegram,
formule neutralizzate nell'export CSV.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routers import partner_journey, partner_optin
from routers.partner_optin import OptinRequest, partner_optin as handler
from services.proposta_chat import ChatRateLimiter

pytestmark = pytest.mark.unit


class FakeColl:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]
        self.updates = []

    @staticmethod
    def _match(doc, query):
        for k, v in query.items():
            if isinstance(v, dict) and "$exists" in v:
                if (k in doc) != v["$exists"]:
                    return False
            elif isinstance(v, dict) and "$gte" in v:
                if not (k in doc and doc[k] >= v["$gte"]):
                    return False
            elif doc.get(k) != v:
                return False
        return True

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if self._match(d, query):
                return {k: v for k, v in d.items() if k != "_id"}
        return None

    async def count_documents(self, query):
        return len([d for d in self.docs if self._match(d, query)])

    async def update_one(self, query, update, upsert=False):
        self.updates.append((query, update))
        for d in self.docs:
            if self._match(d, query):
                d.update(update.get("$set", {}))
                for k, v in update.get("$push", {}).items():
                    lst = d.setdefault(k, [])
                    lst.extend(v["$each"])
                    if "$slice" in v:
                        d[k] = lst[v["$slice"]:]
                return SimpleNamespace(upserted_id=None)
        if upsert:
            self.docs.append(dict(update.get("$setOnInsert", {})))
            return SimpleNamespace(upserted_id="nuovo")
        return SimpleNamespace(upserted_id=None)


class FakeDb:
    def __init__(self, partners, leads=None):
        self.partners = FakeColl(partners)
        self.partner_leads = FakeColl(leads)


ON = {"id": "23", "name": "Daniele Andolfi", "public_optin": {"enabled": True, "funnel_origin": "masterclass-bozza"}}


def fake_request(ip="1.2.3.4"):
    # come dietro i proxy: l'indirizzo di connessione e' sempre quello del proxy, il visitatore
    # vero sta in X-Forwarded-For
    return SimpleNamespace(headers={"x-forwarded-for": f"{ip}, 76.76.21.21"}, client=SimpleNamespace(host="10.0.0.1"))


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    monkeypatch.setattr(partner_optin, "_ip_limiter", ChatRateLimiter(
        max_messages=partner_optin.MAX_PER_IP, window_seconds=partner_optin.IP_WINDOW_SECONDS))


@pytest.fixture
def telegram(monkeypatch):
    sent = []

    async def fake_notify(message):
        sent.append(message)

    monkeypatch.setattr("routers.partner_journey.notify_telegram", fake_notify)
    return sent


def run(partner_id, ip="1.2.3.4", **body):
    base = {"nome": "Giulia Rossi", "email": "Giulia@Example.it", "consenso": True}
    base.update(body)

    async def go():
        out = await handler(partner_id, OptinRequest(**base), fake_request(ip))
        for _ in range(6):  # lascia partire l'avviso Telegram e la sincronizzazione Systeme
            await asyncio.sleep(0)
        return out

    return asyncio.run(go())


def use(monkeypatch, db):
    monkeypatch.setattr(partner_optin, "db", db)


def test_flag_off_or_unknown_partner_look_the_same(monkeypatch, telegram):
    use(monkeypatch, FakeDb([{"id": "7", "name": "Altro"}, {"id": "8", "public_optin": {"enabled": False}}]))
    for pid in ("7", "8", "999"):
        with pytest.raises(HTTPException) as e:
            run(pid)
        assert e.value.status_code == 404 and e.value.detail == "Non trovato"


def test_only_a_real_true_enables_the_funnel(monkeypatch, telegram):
    use(monkeypatch, FakeDb([{"id": "9", "public_optin": {"enabled": "false"}}]))
    with pytest.raises(HTTPException) as e:
        run("9")
    assert e.value.status_code == 404


def test_consent_is_required_before_anything_else(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    # stesso 422 per un partner acceso e per uno inesistente: non rivela quale funnel e' attivo
    for pid in ("23", "999"):
        with pytest.raises(HTTPException) as e:
            run(pid, consenso=False)
        assert e.value.status_code == 422
    assert db.partner_leads.docs == []


def test_bad_email_is_rejected():
    with pytest.raises(ValidationError):
        OptinRequest(nome="A", email="non-una-email", consenso=True)


def test_new_lead_is_saved_with_consent_and_without_raw_payload(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    assert run("23", telefono="+39 333 12a34", utm_source="instagram").ok is True
    (lead,) = db.partner_leads.docs
    assert lead["partner_id"] == "23" and lead["email"] == "giulia@example.it"
    assert lead["status"] == "new" and lead["source"] == partner_optin.SOURCE
    assert lead["funnel_origin"] == "masterclass-bozza" and lead["phone"] == "+39 333 1234"
    assert lead["consent"]["accepted"] is True and lead["consent"]["at"]
    assert lead["utm"] == {"utm_source": "instagram"}
    assert "raw_data" not in lead


def test_telegram_notice_never_carries_the_email(monkeypatch, telegram):
    use(monkeypatch, FakeDb([ON]))
    run("23")
    assert len(telegram) == 1
    assert "example.it" not in telegram[0] and "Daniele Andolfi" in telegram[0]


def test_honeypot_pretends_success_and_saves_nothing(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    assert run("23", website="http://spam.example").ok is True
    assert db.partner_leads.docs == [] and telegram == []


def test_same_email_twice_does_not_duplicate_or_renotify(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    run("23")
    run("23", email="giulia@example.it")
    assert len(db.partner_leads.docs) == 1 and len(telegram) == 1


def test_repeated_same_email_keeps_a_bounded_history(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    monkeypatch.setattr(partner_optin, "_ip_limiter", ChatRateLimiter(max_messages=10_000, window_seconds=600))
    for _ in range(partner_optin.MAX_INTERACTIONS + 15):
        run("23")
    (lead,) = db.partner_leads.docs
    assert len(lead["interactions"]) == partner_optin.MAX_INTERACTIONS


def test_existing_lead_without_consent_gets_the_consent_now(monkeypatch, telegram):
    senza = {"id": "x", "partner_id": "23", "email": "giulia@example.it", "name": "Giulia", "source": "systeme.io"}
    db = FakeDb([ON], [senza])
    use(monkeypatch, db)
    run("23")
    assert db.partner_leads.docs[0]["consent"]["accepted"] is True


def test_existing_consent_is_not_overwritten(monkeypatch, telegram):
    gia = {"id": "x", "partner_id": "23", "email": "giulia@example.it",
           "consent": {"accepted": True, "at": "2026-01-01T00:00:00+00:00"}}
    db = FakeDb([ON], [gia])
    use(monkeypatch, db)
    run("23")
    assert db.partner_leads.docs[0]["consent"]["at"] == "2026-01-01T00:00:00+00:00"


def test_per_ip_limit_also_stops_repeated_existing_emails(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    for _ in range(partner_optin.MAX_PER_IP):
        run("23")
    with pytest.raises(HTTPException) as e:
        run("23")
    assert e.value.status_code == 429
    assert run("23", ip="9.9.9.9", email="altro@example.it").ok is True  # un altro IP passa


def test_hourly_cap_blocks_abuse_and_only_counts_the_last_hour(monkeypatch, telegram):
    ora = datetime.now(timezone.utc)
    recenti = [{"partner_id": "23", "source": partner_optin.SOURCE, "created_at": ora.isoformat()}
               for _ in range(partner_optin.MAX_PER_HOUR)]
    db = FakeDb([ON], recenti)
    use(monkeypatch, db)
    with pytest.raises(HTTPException) as e:
        run("23", email="nuovo@example.it")
    assert e.value.status_code == 429
    assert len(db.partner_leads.docs) == partner_optin.MAX_PER_HOUR

    vecchi = [{"partner_id": "23", "source": partner_optin.SOURCE,
               "created_at": (ora - timedelta(hours=2)).isoformat()} for _ in range(partner_optin.MAX_PER_HOUR)]
    db2 = FakeDb([ON], vecchi)
    use(monkeypatch, db2)
    assert run("23", email="nuovo@example.it").ok is True


def test_csv_export_neutralizes_spreadsheet_formulas():
    assert partner_journey._csv_safe('=HYPERLINK("http://x","clic")').startswith("'=")
    for pericolosi in ("+1", "-2", "@cmd", "\tx", "\rx"):
        assert partner_journey._csv_safe(pericolosi).startswith("'")
    assert partner_journey._csv_safe("Giulia Rossi") == "Giulia Rossi"
    assert partner_journey._csv_safe(None) == ""


def test_visitors_behind_the_same_proxy_do_not_block_each_other(monkeypatch, telegram):
    db = FakeDb([ON])
    use(monkeypatch, db)
    for i in range(partner_optin.MAX_PER_IP + 5):  # IP diversi, stesso proxy di connessione
        assert run("23", ip=f"5.5.5.{i}", email=f"p{i}@example.it").ok is True
    assert len(db.partner_leads.docs) == partner_optin.MAX_PER_IP + 5


ON_SYNC = {"id": "23", "name": "Daniele Andolfi",
           "public_optin": {"enabled": True, "funnel_origin": "masterclass-bozza", "systeme_sync": True}}


@pytest.fixture
def systeme(monkeypatch):
    """Sostituisce la chiamata a Systeme: registra le chiamate e restituisce l'esito scelto."""
    calls = []
    state = {"result": {"ok": True, "contact_id": 99, "reason": "ok"}, "raise": False}

    async def fake_sync(api_key, email, full_name, tag, client=None):
        calls.append({"api_key": api_key, "email": email, "full_name": full_name, "tag": tag})
        if state["raise"]:
            raise RuntimeError("Systeme giu'")
        return state["result"]

    monkeypatch.setattr("services.partner_systeme.sync_contact", fake_sync)
    monkeypatch.setenv("SYSTEME_API_KEY_PARTNER_23", "chiave-segreta-di-prova")
    return SimpleNamespace(calls=calls, state=state)


def test_systeme_sync_is_off_unless_the_partner_turns_it_on(monkeypatch, telegram, systeme):
    use(monkeypatch, FakeDb([ON]))
    assert run("23").ok is True
    assert systeme.calls == []


def test_new_signup_is_mirrored_into_the_partners_systeme_and_outcome_is_recorded(monkeypatch, telegram, systeme):
    db = FakeDb([ON_SYNC])
    use(monkeypatch, db)
    assert run("23").ok is True
    (call,) = systeme.calls
    assert call["email"] == "giulia@example.it" and call["full_name"] == "Giulia Rossi"
    assert call["tag"] == "iscritto_masterclass"  # tag predefinito
    (lead,) = db.partner_leads.docs
    assert lead["systeme"]["ok"] is True and lead["systeme"]["contact_id"] == 99
    assert "chiave-segreta" not in repr(lead)  # la chiave non finisce mai nel database


def test_custom_tag_is_sanitized(monkeypatch, telegram, systeme):
    cfg = {**ON_SYNC["public_optin"], "systeme_tag": "Iscritti Masterclass!"}
    use(monkeypatch, FakeDb([{**ON_SYNC, "public_optin": cfg}]))
    run("23")
    assert systeme.calls[0]["tag"] == "iscritti_masterclass"


def test_missing_key_does_not_break_the_signup(monkeypatch, telegram, systeme):
    monkeypatch.delenv("SYSTEME_API_KEY_PARTNER_23")
    db = FakeDb([ON_SYNC])
    use(monkeypatch, db)
    assert run("23").ok is True
    assert systeme.calls == [] and len(db.partner_leads.docs) == 1


def test_systeme_failure_never_breaks_the_signup(monkeypatch, telegram, systeme):
    systeme.state["raise"] = True
    db = FakeDb([ON_SYNC])
    use(monkeypatch, db)
    assert run("23").ok is True
    assert len(db.partner_leads.docs) == 1 and len(telegram) == 1


def test_repeat_signup_retries_only_when_the_previous_sync_failed(monkeypatch, telegram, systeme):
    systeme.state["result"] = {"ok": False, "contact_id": None, "reason": "network_error"}
    db = FakeDb([ON_SYNC])
    use(monkeypatch, db)
    run("23")
    assert db.partner_leads.docs[0]["systeme"]["ok"] is False
    systeme.state["result"] = {"ok": True, "contact_id": 7, "reason": "ok"}
    run("23")  # stessa email: riprova e questa volta riesce
    assert len(systeme.calls) == 2 and db.partner_leads.docs[0]["systeme"]["ok"] is True
    run("23")  # gia' sincronizzato: nessuna nuova chiamata
    assert len(systeme.calls) == 2


def test_without_forwarded_header_it_falls_back_to_the_connection_address():
    req = SimpleNamespace(headers={}, client=SimpleNamespace(host="8.8.4.4"))
    assert partner_optin._client_ip(req) == "8.8.4.4"
