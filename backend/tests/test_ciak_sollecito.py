"""Sollecito trattative: bozza di Marco, approvazione, registro. Nessuna rete, nessun invio vero."""
import asyncio
import re
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_sollecito as s

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)


def iso(giorni_fa):
    return (NOW - timedelta(days=giorni_fa)).isoformat()


# ── logica pura ─────────────────────────────────────────────────────────────

def test_giorni_da_e_date_illeggibili():
    assert s.giorni_da(iso(7), NOW) == 7
    assert s.giorni_da(None, NOW) is None
    assert s.giorni_da("non-una-data", NOW) is None


def test_contesto_none_se_non_conosciamo_la_persona():
    assert s.build_contesto("x@x.it", None, None) is None


def test_fatti_non_dicono_visto_se_non_visto():
    ctx = s.build_contesto("a@x.it", {"stato": "inviata", "creato_at": iso(6), "prospect_nome": "Anna Rossi"}, None, NOW)
    fatti = " ".join(s._fatti(ctx))
    assert "6 giorni fa" in fatti
    assert "Non risulta che la persona abbia aperto" in fatti
    assert "ha aperto la proposta" not in fatti.replace("Non risulta che la persona abbia aperto", "")


def test_fatti_con_proposta_vista():
    ctx = s.build_contesto("a@x.it", {"stato": "vista", "creato_at": iso(8), "visto_at": iso(5)}, None, NOW)
    fatti = " ".join(s._fatti(ctx))
    assert "ha aperto la proposta 5 giorni fa" in fatti


def test_prompt_vieta_di_inventare_e_include_memoria():
    ctx = s.build_contesto("a@x.it", {"stato": "inviata", "creato_at": iso(6), "prospect_nome": "Anna"}, None, NOW)
    system, user = s.prompt_bozza(ctx, "MEMORIA-CIAK-X")
    assert "Non inventare" in system and "MEMORIA-CIAK-X" in system
    assert "Anna" in user


def test_parse_bozza_valida_e_con_recinto_markdown():
    raw = '```json\n{"subject": "Come va?", "body": "Ciao Anna, volevo sapere come stai andando.\\n\\nClaudio"}\n```'
    assert s.parse_bozza(raw)["subject"] == "Come va?"


@pytest.mark.parametrize("raw", ["", "niente json", '{"subject": "ok"}', '{"subject": "x", "body": "troppo corto"}', '{"subject": 1, "body": 2}'])
def test_parse_bozza_scarta_il_non_valido(raw):
    assert s.parse_bozza(raw) is None


def test_bozza_base_non_inventa_fatti():
    b = s.bozza_base({"nome": "Anna Rossi"})
    assert b["body"].startswith("Ciao Anna,")
    assert not re.search(r"\d", b["body"])  # niente prezzi, date o numeri


def test_html_escapa_e_fa_paragrafi():
    html = s.testo_in_html("Ciao <b>Anna</b>\nriga due\n\nSecondo & ultimo")
    assert "&lt;b&gt;" in html and "<b>" not in html
    assert html.count("<p>") == 2 and "<br>" in html


def test_duplicato_recente_solo_entro_24_ore_e_solo_ok():
    righe = [
        {"email": "a@x.it", "ok": True, "sent_at": (NOW - timedelta(hours=3)).isoformat()},
        {"email": "b@x.it", "ok": False, "sent_at": (NOW - timedelta(hours=1)).isoformat()},
        {"email": "c@x.it", "ok": True, "sent_at": (NOW - timedelta(hours=30)).isoformat()},
    ]
    assert s.duplicato_recente(righe, "A@x.it", NOW) is not None
    assert s.duplicato_recente(righe, "b@x.it", NOW) is None
    assert s.duplicato_recente(righe, "c@x.it", NOW) is None


def test_ultimi_per_email_tiene_il_piu_recente_e_ignora_i_falliti():
    righe = [
        {"email": "a@x.it", "ok": True, "sent_at": iso(5), "subject": "vecchio"},
        {"email": "a@x.it", "ok": True, "sent_at": iso(2), "subject": "nuovo"},
        {"email": "b@x.it", "ok": False, "sent_at": iso(1)},
        {"email": "c@x.it", "ok": True, "sent_at": iso(40)},
    ]
    r = s.ultimi_per_email(righe, 14, NOW)
    assert [x["email"] for x in r] == ["a@x.it"] and r[0]["subject"] == "nuovo"


# ── endpoint (db finto) ─────────────────────────────────────────────────────

def _match(doc, q):
    for k, v in q.items():
        if isinstance(v, dict) and "$regex" in v:
            if not re.search(v["$regex"], str(doc.get(k, "")), re.I if "i" in v.get("$options", "") else 0):
                return False
        elif doc.get(k) != v:
            return False
    return True


class _Cur:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, k, v=None):
        if isinstance(k, list):
            k, v = k[0]
        self.docs = sorted(self.docs, key=lambda d: d.get(k) or "", reverse=v < 0)
        return self

    async def to_list(self, n):
        return [dict(d) for d in self.docs[:n]]


class _Coll:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, q, projection=None, sort=None):
        c = _Cur([d for d in self.docs if _match(d, q)])
        if sort:
            c.sort(sort)
        return dict(c.docs[0]) if c.docs else None

    def find(self, q, projection=None):
        return _Cur([d for d in self.docs if _match(d, q)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))


@pytest.fixture
def fake(monkeypatch):
    dbf = SimpleNamespace(
        proposte=_Coll([{"prospect_email": "anna@x.it", "prospect_nome": "Anna Rossi", "stato": "inviata", "creato_at": iso(6)}]),
        diagnostic_sessions=_Coll([]),
        ciak_solleciti=_Coll([]),
    )
    monkeypatch.setattr(ciak_admin, "db", dbf)
    from services import ciak_memoria
    async def _vuota():
        return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", _vuota)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("EMERGENT_LLM_KEY", raising=False)
    return dbf


ADMIN = SimpleNamespace(email="claudio@x.it")


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_bozza_senza_ai_cade_sulla_base_e_lo_dichiara(fake):
    r = run(ciak_admin.sollecito_bozza(ciak_admin.SollecitoBozzaRequest(email="Anna@x.it"), ADMIN))
    assert r["da_ai"] is False and r["bozza"]["body"].startswith("Ciao Anna,")
    assert any("6 giorni fa" in f for f in r["fatti"])
    assert fake.ciak_solleciti.docs == []  # la bozza non scrive nulla


def test_bozza_persona_sconosciuta_404(fake):
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.sollecito_bozza(ciak_admin.SollecitoBozzaRequest(email="boh@x.it"), ADMIN))
    assert e.value.status_code == 404


def test_bozza_gia_pagato_409(fake):
    fake.proposte.docs[0]["pagamento_completato"] = True
    with pytest.raises(HTTPException) as e:
        run(ciak_admin.sollecito_bozza(ciak_admin.SollecitoBozzaRequest(email="anna@x.it"), ADMIN))
    assert e.value.status_code == 409


def _invia(**kw):
    base = dict(email="anna@x.it", subject="Come va?", body="Ciao Anna, volevo sapere come stai.\n\nClaudio", approvato=True)
    base.update(kw)
    return run(ciak_admin.sollecito_invia(ciak_admin.SollecitoInviaRequest(**base), ADMIN))


def test_invia_senza_approvazione_non_parte(fake, monkeypatch):
    chiamate = []
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: chiamate.append(a) or (True, None))
    with pytest.raises(HTTPException) as e:
        _invia(approvato=False)
    assert e.value.status_code == 422 and chiamate == [] and fake.ciak_solleciti.docs == []


def test_invia_ok_registra_e_non_tocca_il_lead(fake, monkeypatch):
    chiamate = []
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda to, sub, html: chiamate.append((to, sub, html)) or (True, None))
    r = _invia()
    assert r["success"] is True
    assert chiamate[0][0] == "anna@x.it" and "<p>" in chiamate[0][2]
    riga = fake.ciak_solleciti.docs[0]
    assert riga["ok"] is True and riga["sent_by"] == "claudio@x.it" and riga["email"] == "anna@x.it"


def test_invio_fallito_viene_registrato_e_segnalato(fake, monkeypatch):
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: (False, "SMTP non configurato"))
    with pytest.raises(HTTPException) as e:
        _invia()
    assert e.value.status_code == 502
    assert fake.ciak_solleciti.docs[0]["ok"] is False


def test_secondo_invio_entro_24_ore_bloccato(fake, monkeypatch):
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: (True, None))
    _invia()
    with pytest.raises(HTTPException) as e:
        _invia()
    assert e.value.status_code == 409 and len(fake.ciak_solleciti.docs) == 1


def test_oggetto_su_piu_righe_rifiutato(fake):
    with pytest.raises(HTTPException) as e:
        _invia(subject="Ciao\nBcc: altro@x.it")
    assert e.value.status_code == 422


def test_recenti_elenca_solo_gli_ok(fake, monkeypatch):
    monkeypatch.setattr("services.lead_outreach.send_lead_email", lambda *a: (True, None))
    _invia()
    r = run(ciak_admin.solleciti_recenti(giorni=14, admin=ADMIN))
    assert [x["email"] for x in r["items"]] == ["anna@x.it"]
