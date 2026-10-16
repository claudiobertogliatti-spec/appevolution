"""Collegamento del dominio del partner: validazione righe, confronto DNS, passo e controllo."""
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.funnel_review as route
import services.domain_check as dc
import services.funnel_review as fr

pytestmark = pytest.mark.unit

NOW = "2026-10-02T10:00:00+00:00"
URL = "https://sabai-daniele-andolfi.vercel.app"
RECORDS = [
    {"id": "funnel", "label": "Indirizzo del funnel", "purpose": "Dove si apre il tuo funnel",
     "type": "CNAME", "name": "corso.example.it", "value": "cname.vercel-dns.com"},
    {"id": "spf", "label": "Mittente delle email", "purpose": "Perché le email arrivino",
     "type": "txt", "name": "example.it", "value": "v=spf1 include:mail.example.net ~all"},
]


def test_records_are_validated_and_normalised():
    out = dc.validate_records(RECORDS)
    assert out[1]["type"] == "TXT" and out[0]["name"] == "corso.example.it"
    for bad in (
        [],
        "x",
        [{**RECORDS[0], "type": "MX"}],
        [{**RECORDS[0], "name": "non un host"}],
        [{**RECORDS[0], "value": ""}],
        [{**RECORDS[0], "value": "<script>"}],
        [RECORDS[0], RECORDS[0]],
        [{**RECORDS[0], "label": ""}],
        [{**RECORDS[0], "id": f"r{i}"} for i in range(9)],
    ):
        with pytest.raises(dc.DomainError):
            dc.validate_records(bad)


def test_compare_cname_txt_and_spf():
    cname = dc.validate_records([RECORDS[0]])[0]
    assert dc.compare(cname, ["cname.vercel-dns.com."])["status"] == dc.OK
    assert dc.compare(cname, ["altro.example.com."])["status"] == dc.WRONG
    assert dc.compare(cname, [])["status"] == dc.MISSING
    spf = dc.validate_records([RECORDS[1]])[0]
    assert dc.compare(spf, ['"v=spf1 include:mail.example.net ~all"'])["status"] == dc.OK
    assert dc.compare(spf, ['"v=spf1 include:altro.net include:mail.example.net ~all"'])["status"] == dc.WRONG
    dkim = {"id": "d", "type": "TXT", "name": "k._domainkey.example.it", "value": "abcdef", "label": "x", "purpose": ""}
    assert dc.compare(dkim, ['"abc" "def"'])["status"] == dc.OK  # righe lunghe spezzate dal DNS


def test_one_failing_lookup_does_not_block_the_others():
    def resolver(name, rtype):
        if rtype == "TXT":
            raise RuntimeError("timeout")
        return ["cname.vercel-dns.com."]
    res = dc.check_records(dc.validate_records(RECORDS), resolver)
    assert [r["status"] for r in res] == [dc.OK, dc.ERROR]


def test_domain_step_flow_from_not_ready_to_done():
    state = fr.review_state({})
    assert {s["id"]: s["state"] for s in state["steps"]}["dominio"] == "attesa"
    assert state["domain"]["configured"] is False

    rec = {}
    rec["domain"] = {"records": dc.validate_records(RECORDS), "verified": {}}
    state = fr.review_state(rec)
    assert {s["id"]: s["state"] for s in state["steps"]}["dominio"] == "da_fare"
    assert [r["verified"] for r in state["domain"]["records"]] == [False, False]

    results = dc.check_records(rec["domain"]["records"], lambda n, t: ["cname.vercel-dns.com."] if t == "CNAME" else [])
    upd = fr.domain_verified_update(rec, results, NOW)
    assert upd["$set"]["domain.verified.funnel"] is True and upd["$set"]["domain.verified.spf"] is False
    assert "connections.dominio" not in upd["$set"]  # basta una riga mancante per non dichiarare il collegamento

    results = dc.check_records(rec["domain"]["records"], lambda n, t: ["cname.vercel-dns.com."] if t == "CNAME" else ['"v=spf1 include:mail.example.net ~all"'])
    upd = fr.domain_verified_update(rec, results, NOW)
    assert upd["$set"]["connections.dominio"] is True
    rec["domain"]["verified"] = {"funnel": True, "spf": True}
    state = fr.review_state(rec)
    assert {s["id"]: s["state"] for s in state["steps"]}["dominio"] == "fatto"


def test_the_team_loads_the_dns_rows_with_admin_set():
    upd = fr.admin_set_update({}, {"domain_records": RECORDS}, NOW)
    assert upd["$set"]["domain.records"][0]["name"] == "corso.example.it" and upd["$set"]["domain.verified"] == {}
    with pytest.raises(fr.ReviewError):
        fr.admin_set_update({}, {"domain_records": [{"id": "x"}]}, NOW)


class FakeFunnel:
    def __init__(self, doc):
        self.doc = dict(doc)

    async def find_one(self, q, p=None):
        return dict(self.doc)

    async def update_one(self, key, update, upsert=False):
        for path, value in (update.get("$set") or {}).items():
            node = self.doc
            parts = path.split(".")
            for k in parts[:-1]:
                node = node.setdefault(k, {})
            node[parts[-1]] = value


class FakePartners:
    async def find_one(self, q, p=None):
        return {"id": "p1", "name": "Daniele Andolfi"}


@pytest.fixture
def env(monkeypatch):
    sent = []

    async def notify(text):
        sent.append(text)

    import routers.partner_journey as pj
    monkeypatch.setattr(pj, "notify_telegram", notify, raising=False)

    async def authorize(partner_id, credentials):
        return SimpleNamespace(role="partner")

    monkeypatch.setattr(route, "_authorize", authorize)
    funnel = FakeFunnel({"partner_id": "p1", "preview_url": URL, "preview_released": True,
                         "domain": {"records": dc.validate_records(RECORDS), "verified": {}}})
    route.db = SimpleNamespace(partner_funnel=funnel, partners=FakePartners())

    def resolver(answers):
        monkeypatch.setattr(dc, "default_resolver", lambda n, t: answers[t])
    resolver.sent, resolver.funnel = sent, funnel
    return resolver


@pytest.mark.asyncio
async def test_check_route_marks_what_is_visible_and_tells_the_team_when_all_done(env):
    env({"CNAME": ["cname.vercel-dns.com."], "TXT": []})
    out = await route.domain_check_route("p1", object())
    assert {r["id"]: r["status"] for r in out["results"]} == {"funnel": "ok", "spf": "assente"}
    assert out["domain"]["all_verified"] is False and not env.sent

    env({"CNAME": ["cname.vercel-dns.com."], "TXT": ['"v=spf1 include:mail.example.net ~all"']})
    out = await route.domain_check_route("p1", object())
    assert out["domain"]["all_verified"] is True
    assert {s["id"]: s["state"] for s in out["steps"]}["dominio"] == "fatto"
    assert len(env.sent) == 1 and "DOMINIO COLLEGATO" in env.sent[0]
    await route.domain_check_route("p1", object())
    assert len(env.sent) == 1  # nessun avviso ripetuto


@pytest.mark.asyncio
async def test_check_route_is_a_clear_400_until_the_team_prepares_the_rows(env):
    route.db.partner_funnel.doc.pop("domain")
    with pytest.raises(HTTPException) as exc:
        await route.domain_check_route("p1", object())
    assert exc.value.status_code == 400 and "non ha ancora preparato" in exc.value.detail


@pytest.mark.asyncio
async def test_help_request_tells_the_team_without_asking_for_passwords(env):
    out = await route.domain_help("p1", object())
    assert out["domain"]["help_requested"] is True
    assert "Mai chiedere password" in env.sent[0] and "Daniele Andolfi" in env.sent[0]
