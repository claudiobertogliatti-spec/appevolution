"""Chat di Carlo, Marco e Valentina: contesto dai dati veri, nessuna azione, storico per agente."""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_agenti_chat as ag

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)
def iso(g): return (NOW - timedelta(days=g)).isoformat()


# ── contesti (puri) ──────────────────────────────────────────────────────────

def test_carlo_elenca_e_dice_quando_non_c_e_nessuno():
    c = ag.contesto_carlo([{"nome": "Anna", "motivo_label": "Report senza call", "giorni": 7}])
    assert "1 in totale" in c and "Anna" in c and "7 giorni" in c
    assert "Nessuna persona" in ag.contesto_carlo([])


def test_marco_esclude_pagati_e_firmati_e_non_inventa_aperture():
    proposte = [
        {"prospect_nome": "Luca", "stato": "inviata", "creato_at": iso(6)},
        {"prospect_nome": "Pagato", "stato": "inviata", "creato_at": iso(9), "pagamento_completato": True},
        {"prospect_nome": "Firmato", "stato": "contratto_firmato", "creato_at": iso(9)},
        {"prospect_nome": "Visto", "stato": "vista", "creato_at": iso(8), "visto_at": iso(5)},
    ]
    c = ag.contesto_marco(proposte, [{"nome": "Luca", "testo": "Chiamare", "scadenza": "2026-10-14"}], NOW)
    assert "non ancora pagate o firmate: 2" in c
    assert "Pagato" not in c and "Firmato" not in c
    assert "Luca: stato inviata, inviata 6 giorni fa, non risulta aperta" in c
    assert "Visto: stato vista, inviata 8 giorni fa, aperta 5 giorni fa" in c
    assert "Chiamare (entro il 2026-10-14)" in c


def test_valentina_usa_le_etichette_reali_e_il_vuoto():
    c = ag.contesto_valentina(
        [{"partner_nome": "Dario", "step_label": "Brand kit", "prossimo": "Masterclass"}],
        [{"partner_nome": "Eva", "testo": "Mandare i testi", "scadenza": "2026-10-20", "stato_scadenza": "futuro"}])
    assert "Dario" in c and "Brand kit" in c and "Masterclass" in c and "Mandare i testi" in c
    assert "Nessun avviso" in ag.contesto_valentina([], []) and "Nessun compito" in ag.contesto_valentina([], [])


def test_prompt_vieta_azioni_e_invenzioni_e_porta_il_contesto():
    for a in ag.AGENTI:
        s = ag.prompt_sistema(a, "CTX-X", "MEMORIA-X")
        assert "Non inventare" in s and "non hai strumenti" in s and "CTX-X" in s and "MEMORIA-X" in s
        assert ag.AGENTI[a]["nome"] in s


# ── endpoint ─────────────────────────────────────────────────────────────────

class _Cur:
    def __init__(self, docs): self.docs = docs
    def sort(self, *a, **k): return self
    async def to_list(self, n): return [dict(d) for d in self.docs[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None): return next((dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)
    def find(self, q=None, projection=None): return _Cur(self.docs)
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"]); return
        if upsert: self.docs.append(dict(upd["$set"]))


ADMIN = SimpleNamespace(email="claudio@x.it", user_id="u1")
def run(c): return asyncio.new_event_loop().run_until_complete(c)


def finta(risposta, visto=None):
    async def _f(system, user, max_tokens=500, messages=None):
        if visto is not None: visto.append((system, messages))
        return risposta
    return _f


@pytest.fixture
def fake(monkeypatch):
    d = SimpleNamespace(ciak_agenti_chat=_Coll(), proposte=_Coll([{"prospect_nome": "Luca", "stato": "inviata", "creato_at": iso(6)}]))
    monkeypatch.setattr(ciak_admin, "db", d)
    from services import ciak_memoria
    async def vuota(): return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    async def cand(only_email=None): return [{"nome": "Anna", "motivo_label": "Report senza call", "giorni": 7}]
    monkeypatch.setattr(ciak_admin, "_candidati_recupero", cand)
    async def passi(a): return {"items": []}
    monkeypatch.setattr(ciak_admin, "prossimi_passi", passi)
    async def avvisi(a): return {"items": [{"partner_nome": "Dario", "step_label": "Brand kit", "prossimo": None}]}
    monkeypatch.setattr(ciak_admin, "avvisi_percorso", avvisi)
    async def compiti(p, a): return {"items": []}
    monkeypatch.setattr(ciak_admin, "partner_attivita", compiti)
    return d


def scrivi(agente, m="A che punto siamo?"):
    return run(ciak_admin.agente_chat(agente, ciak_admin.AndreaChatIn(message=m), ADMIN))


@pytest.mark.parametrize("agente,atteso", [("carlo", "Anna"), ("marco", "Luca"), ("valentina", "Brand kit")])
def test_ogni_agente_riceve_il_contesto_del_suo_reparto(fake, monkeypatch, agente, atteso):
    visto = []
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("ok", visto))
    assert scrivi(agente) == {"reply": "ok"}
    assert atteso in visto[0][0]


def test_lo_storico_e_separato_per_agente(fake, monkeypatch):
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("ok"))
    scrivi("carlo", "ciao carlo")
    assert len(run(ciak_admin.agente_history("carlo", ADMIN))["messages"]) == 2
    assert run(ciak_admin.agente_history("marco", ADMIN))["messages"] == []
    run(ciak_admin.agente_history_clear("carlo", ADMIN))
    assert run(ciak_admin.agente_history("carlo", ADMIN))["messages"] == []


def test_ai_assente_503_senza_storico_finto(fake, monkeypatch):
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta(None))
    with pytest.raises(HTTPException) as e: scrivi("marco")
    assert e.value.status_code == 503 and "Marco" in e.value.detail
    assert run(ciak_admin.agente_history("marco", ADMIN))["messages"] == []


def test_agente_sconosciuto_404_e_messaggio_vuoto_422(fake, monkeypatch):
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("ok"))
    with pytest.raises(HTTPException) as e: scrivi("andrea2")
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e: scrivi("carlo", "  ")
    assert e.value.status_code == 422


def test_contesto_marco_dal_db_vero_finto(fake, monkeypatch):
    c = run(ciak_admin._contesto_agente("marco"))
    assert "Luca: stato inviata" in c
