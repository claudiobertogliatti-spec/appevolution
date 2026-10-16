"""Recupero 1 a 1 (Carlo): candidati veri, bozza, invio approvato. Nessuna rete."""
import asyncio
import re
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_recupero as rc
from services import ciak_trattativa as tr

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)
iso = lambda g: (NOW - timedelta(days=g)).isoformat()


def sess(email, stato, g, nome="Anna Rossi", extra_hist=None):
    hist = [{"state": stato, "timestamp": iso(g)}] + (extra_hist or [])
    return {"user_email": email, "user_name": nome, "current_state": stato, "state_history": hist, "created_at": iso(g + 1)}


def test_motivi_e_soglie():
    r = rc.candidati([
        sess("a@x.it", "report_generated", 6), sess("b@x.it", "ciak_started", 10),
        sess("c@x.it", "report_generated", 3),        # troppo recente
        sess("d@x.it", "report_generated", 90),       # troppo freddo
        sess("e@x.it", "call_booked", 8),             # ha avanzato
        sess("f@x.it", "ciak_completed", 8),          # stato non gestito
    ], set(), NOW)
    assert [(c["email"], c["motivo"]) for c in r] == [("a@x.it", "report_senza_call"), ("b@x.it", "questionario_fermo")]


def test_stato_storico_vale_come_report():
    r = rc.candidati([sess("a@x.it", "clicked_67", 7)], set(), NOW)
    assert r and r[0]["motivo"] == "report_senza_call"


def test_esclusi_test_e_ultima_sessione_vince():
    vecchia = sess("a@x.it", "report_generated", 20)
    nuova = {**sess("a@x.it", "call_booked", 2), "created_at": iso(1)}
    assert rc.candidati([vecchia, nuova], set(), NOW) == []
    assert rc.candidati([sess("a+ciaktest@x.it", "report_generated", 9), sess("b@x.it", "report_generated", 9)], {"b@x.it"}, NOW) == []


def test_senza_data_vera_non_si_propone():
    s = {"user_email": "a@x.it", "current_state": "report_generated", "state_history": [], "created_at": None}
    assert rc.candidati([s], set(), NOW) == []


def test_ordine_report_prima_poi_i_piu_freschi():
    r = rc.candidati([sess("q@x.it", "ciak_started", 6), sess("r1@x.it", "report_generated", 30), sess("r2@x.it", "report_generated", 6)], set(), NOW)
    assert [c["email"] for c in r] == ["r2@x.it", "r1@x.it", "q@x.it"]


def test_fatti_e_prompt_senza_invenzioni():
    c = rc.candidati([sess("a@x.it", "report_generated", 6)], set(), NOW)[0]
    f = " ".join(rc.fatti(c))
    assert "6 giorni fa" in f and "letto" not in f and "aperto" not in f
    system, user = rc.prompt_bozza(c, "MEM")
    assert "CARLO" in system and "Non inventare" in system and "MEM" in system and "Anna Rossi" in user
    assert not re.search(r"\d", rc.bozza_base(c)["body"])


def test_cronologia_distingue_il_recupero():
    ev = tr.costruisci_cronologia(diagnostics=[], proposte=[], passo=None, solleciti=[
        {"ok": True, "sent_at": iso(1), "tipo": "recupero", "subject": "x"}, {"ok": True, "sent_at": iso(2), "subject": "y"}])
    assert [e["titolo"] for e in ev] == ["Email di recupero inviata", "Sollecito inviato"]


# ── endpoint ──
def _match(doc, q):
    for k, v in q.items():
        if isinstance(v, dict) and "$in" in v:
            if doc.get(k) not in v["$in"]: return False
        elif isinstance(v, dict) and "$regex" in v:
            if not re.search(v["$regex"], str(doc.get(k, "")), re.I): return False
        elif doc.get(k) != v: return False
    return True


class _Cur:
    def __init__(self, d): self.d = d
    async def to_list(self, n): return [dict(x) for x in self.d[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None, sort=None): return next((dict(d) for d in self.docs if _match(d, q)), None)
    def find(self, q, projection=None): return _Cur([d for d in self.docs if _match(d, q)])
    async def insert_one(self, doc): self.docs.append(dict(doc))


@pytest.fixture
def fake(monkeypatch):
    ora = datetime.now(timezone.utc)
    g = lambda n: (ora - timedelta(days=n)).isoformat()
    d = SimpleNamespace(
        diagnostic_sessions=_Coll([
            {"user_email": "anna@x.it", "user_name": "Anna Rossi", "current_state": "report_generated", "created_at": g(10),
             "state_history": [{"state": "report_generated", "timestamp": g(9)}]},
            {"user_email": "bruno@x.it", "user_name": "Bruno", "current_state": "report_generated", "created_at": g(10),
             "state_history": [{"state": "report_generated", "timestamp": g(9)}]},
            {"user_email": "bruno@x.it", "user_name": "Bruno", "current_state": "call_booked", "created_at": g(2), "state_history": []},
        ]),
        proposte=_Coll(), ciak_clients=_Coll(), partners=_Coll(), lista_fredda=_Coll(), ciak_solleciti=_Coll(),
    )
    monkeypatch.setattr(ciak_admin, "db", d)
    from services import ciak_memoria
    async def vuota(): return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    async def senza_ai(*a, **k): return None
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", senza_ai)
    return d


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)
def req(**kw):
    base = dict(email="anna@x.it", subject="Hai visto il report?", body="Ciao Anna, volevo sapere se hai guardato il report.\n\nClaudio", approvato=True)
    base.update(kw); return ciak_admin.SollecitoInviaRequest(**base)


def test_elenco_esclude_chi_ha_avanzato(fake):
    r = run(ciak_admin.recupero_elenco(ADMIN))
    assert [c["email"] for c in r["items"]] == ["anna@x.it"]  # bruno ha una call fissata


def test_esclusi_proposta_cliente_disiscritto_e_contattati_da_poco(fake):
    fake.proposte.docs.append({"prospect_email": "Anna@x.it"})
    assert run(ciak_admin.recupero_elenco(ADMIN))["items"] == []
    fake.proposte.docs.clear()
    fake.ciak_solleciti.docs.append({"email": "anna@x.it", "ok": True, "sent_at": datetime.now(timezone.utc).isoformat()})
    assert run(ciak_admin.recupero_elenco(ADMIN))["items"] == []
    fake.ciak_solleciti.docs.clear()
    fake.lista_fredda.docs.append({"email": "anna@x.it", "stato": "disiscritto"})
    assert run(ciak_admin.recupero_elenco(ADMIN))["items"] == []


def test_bozza_senza_ai_e_base_dichiarata_e_non_invia(fake):
    r = run(ciak_admin.recupero_bozza(ciak_admin.SollecitoBozzaRequest(email="Anna@x.it"), ADMIN))
    assert r["da_ai"] is False and "report" in r["bozza"]["subject"].lower() and fake.ciak_solleciti.docs == []


def test_bozza_e_invio_per_chi_non_e_candidato_409(fake):
    for fn in (lambda: run(ciak_admin.recupero_bozza(ciak_admin.SollecitoBozzaRequest(email="bruno@x.it"), ADMIN)),
               lambda: run(ciak_admin.recupero_invia(req(email="bruno@x.it"), ADMIN))):
        with pytest.raises(HTTPException) as e: fn()
        assert e.value.status_code == 409


def test_invio_approvato_registra_con_tipo_e_blocca_il_doppio(fake, monkeypatch):
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: (True, None))
    assert run(ciak_admin.recupero_invia(req(), ADMIN))["success"]
    assert fake.ciak_solleciti.docs[0]["tipo"] == "recupero" and fake.ciak_solleciti.docs[0]["ok"] is True
    # ora e' contattata da poco: non e' piu' candidata
    with pytest.raises(HTTPException) as e: run(ciak_admin.recupero_invia(req(), ADMIN))
    assert e.value.status_code == 409


def test_senza_approvazione_non_parte(fake, monkeypatch):
    chiamate = []
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: chiamate.append(a) or (True, None))
    with pytest.raises(HTTPException) as e: run(ciak_admin.recupero_invia(req(approvato=False), ADMIN))
    assert e.value.status_code == 422 and chiamate == []
