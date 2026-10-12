"""Prossimo passo con data + cronologia del contatto. Nessuna rete."""
import asyncio
import re
from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_trattativa as tr

pytestmark = pytest.mark.unit

OGGI = date(2026, 10, 12)


def test_passo_valido_pulisce_gli_spazi():
    assert tr.valida_passo("  Chiamo   Anna  ", "2026-10-15", OGGI) == ("Chiamo Anna", "2026-10-15")


@pytest.mark.parametrize("testo,scad", [("", "2026-10-15"), ("ab", "2026-10-15"), ("x" * 301, "2026-10-15"),
                                         ("Chiamo Anna", ""), ("Chiamo Anna", "boh"), ("Chiamo Anna", "2026-10-11"), (None, "2026-10-15")])
def test_passo_non_valido(testo, scad):
    with pytest.raises(ValueError):
        tr.valida_passo(testo, scad, OGGI)


def test_oggi_e_ammesso():
    assert tr.valida_passo("Chiamo Anna", "2026-10-12", OGGI)[1] == "2026-10-12"


def test_stato_scadenza():
    assert tr.stato_scadenza("2026-10-11", OGGI) == "scaduto"
    assert tr.stato_scadenza("2026-10-12", OGGI) == "oggi"
    assert tr.stato_scadenza("2026-10-13", OGGI) == "futuro"
    assert tr.stato_scadenza("boh", OGGI) is None


def test_cronologia_solo_eventi_con_data_vera_e_ordinata():
    ev = tr.costruisci_cronologia(
        diagnostics=[{"state_history": [
            {"state": "ciak_completed", "timestamp": "2026-10-01T09:00:00+00:00"},
            {"state": "stato_sconosciuto", "timestamp": "2026-10-02T09:00:00+00:00"},
            {"state": "call_done", "timestamp": None},
        ]}],
        proposte=[{"creato_at": "2026-10-05T10:00:00+00:00", "visto_at": "2026-10-06T10:00:00+00:00", "accettato_at": None}],
        solleciti=[{"ok": True, "sent_at": "2026-10-09T10:00:00+00:00", "subject": "Come va?", "sent_by": "c@x.it"},
                   {"ok": False, "sent_at": "2026-10-10T10:00:00+00:00", "error": "SMTP non configurato"}],
        passo=None,
    )
    titoli = [e["titolo"] for e in ev]
    assert titoli == ["Sollecito non partito", "Sollecito inviato", "Proposta aperta", "Proposta inviata", "Questionario compilato"]
    assert "Passo" not in " ".join(titoli) and "Call fatta" not in titoli


def test_cronologia_include_passo_corrente_e_storico():
    ev = tr.costruisci_cronologia(
        diagnostics=[], proposte=[], solleciti=[],
        passo={"testo": "Richiamo Anna", "scadenza": "2026-10-20", "creato_at": "2026-10-12T08:00:00+00:00", "creato_da": "c@x.it",
               "storico": [{"testo": "Mando il contratto", "scadenza": "2026-10-10", "creato_at": "2026-10-08T08:00:00+00:00",
                            "fatto_at": "2026-10-09T08:00:00+00:00", "fatto_da": "c@x.it"}]},
    )
    assert [e["titolo"] for e in ev] == ["Prossimo passo deciso", "Passo fatto", "Prossimo passo deciso"]
    assert "entro il 2026-10-20" in ev[0]["dettaglio"]


# ── endpoint con db finto ──
def _match(doc, q):
    for k, v in q.items():
        if isinstance(v, dict) and "$regex" in v:
            if not re.search(v["$regex"], str(doc.get(k, "")), re.I):
                return False
        elif isinstance(v, dict) and "$nin" in v:
            if doc.get(k) in v["$nin"]:
                return False
        elif doc.get(k) != v:
            return False
    return True


class _Cur:
    def __init__(self, d): self.d = d
    async def to_list(self, n): return [dict(x) for x in self.d[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None, sort=None):
        return next((dict(d) for d in self.docs if _match(d, q)), None)
    def find(self, q, projection=None):
        out = [{k: v for k, v in d.items() if not (projection and projection.get(k) == 0)} for d in self.docs if _match(d, q)]
        return _Cur(out)
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if _match(d, q):
                d.update(upd["$set"]); return
        if upsert:
            self.docs.append(dict(upd["$set"]))


@pytest.fixture
def fake(monkeypatch):
    d = SimpleNamespace(
        ciak_leads=_Coll(), diagnostic_sessions=_Coll([{"user_email": "anna@x.it", "state_history": [{"state": "ciak_completed", "timestamp": "2026-10-01T09:00:00+00:00"}]}]),
        proposte=_Coll(), ciak_solleciti=_Coll(), ciak_prossimi_passi=_Coll(),
    )
    monkeypatch.setattr(ciak_admin, "db", d)
    return d


ADMIN = SimpleNamespace(email="claudio@x.it")
def run(c): return asyncio.new_event_loop().run_until_complete(c)
def domani(): return (date.today() + timedelta(days=1)).isoformat()
def imposta(email="anna@x.it", testo="Richiamo Anna", scad=None):
    return run(ciak_admin.imposta_prossimo_passo(ciak_admin.ProssimoPassoIn(email=email, testo=testo, scadenza=scad or domani()), ADMIN))


def test_imposta_e_legge(fake):
    assert imposta()["success"]
    r = run(ciak_admin.prossimi_passi(ADMIN))
    assert r["items"][0]["email"] == "anna@x.it" and r["items"][0]["stato_scadenza"] == "futuro"


def test_sostituire_manda_il_vecchio_nello_storico(fake):
    imposta(testo="Primo passo")
    imposta(testo="Secondo passo")
    doc = fake.ciak_prossimi_passi.docs[0]
    assert doc["testo"] == "Secondo passo" and [s["testo"] for s in doc["storico"]] == ["Primo passo"]


def test_data_passata_rifiutata(fake):
    with pytest.raises(HTTPException) as e:
        imposta(scad="2020-01-01")
    assert e.value.status_code == 422


def test_persona_sconosciuta_404(fake):
    with pytest.raises(HTTPException) as e:
        imposta(email="boh@x.it")
    assert e.value.status_code == 404


def test_fatto_chiude_e_resta_in_cronologia(fake):
    imposta()
    run(ciak_admin.prossimo_passo_fatto(ciak_admin.ProssimoPassoFatto(email="anna@x.it"), ADMIN))
    assert run(ciak_admin.prossimi_passi(ADMIN))["items"] == []
    cr = run(ciak_admin.cronologia_contatto(email="anna@x.it", admin=ADMIN))
    assert "Passo fatto" in [e["titolo"] for e in cr["eventi"]] and cr["passo"] is None


def test_fatto_senza_passo_aperto_404(fake):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.prossimo_passo_fatto(ciak_admin.ProssimoPassoFatto(email="anna@x.it"), ADMIN))
    assert e.value.status_code == 404


def test_cronologia_vuota_404(fake):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.cronologia_contatto(email="boh@x.it", admin=ADMIN))
    assert e.value.status_code == 404
