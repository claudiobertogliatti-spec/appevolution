"""Chat con Andrea: contesto vero, nessuna risposta finta, storico per utente. AI finta."""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers import ciak_admin
from services import ciak_andrea_chat as ac

pytestmark = pytest.mark.unit

PARTNERS = [
    {"name": "Dario", "niche": "Coaching", "revenue": 1200, "stato": "attivo"},
    {"name": "Eva", "revenue": 5000},                    # stato assente = attivo
    {"name": "Ugo", "revenue": 9000, "stato": "ex"},     # non attivo
    {"name": "Zero", "revenue": 0, "stato": "attivo"},
    {"name": "Testo", "revenue": "boh", "stato": "attivo"},
]


def test_contesto_solo_attivi_con_revenue_dal_maggiore():
    c = ac.contesto_casi(PARTNERS)
    assert c.index("Eva") < c.index("Dario") and "Ugo" not in c and "Zero" not in c and "Testo" not in c
    assert "ambito: Coaching" in c and "non verificato" in c


def test_contesto_senza_candidati_lo_dice():
    assert "non ci sono casi studio documentabili" in ac.contesto_casi([{"name": "X", "revenue": 0}])


def test_prompt_vieta_azioni_e_invenzioni():
    p = ac.prompt_sistema("CTX", "MEMORIA-X")
    assert "ANDREA" in p and "Non inventare" in p and "non pubblichi" in p and "consenso" in p and "CTX" in p and "MEMORIA-X" in p


def test_messaggi_per_llm_taglia_e_aggiunge_il_nuovo():
    storico = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(30)]
    m = ac.messaggi_per_llm(storico, "ultimo")
    assert len(m) == ac.STORICO_AL_MODELLO + 1 and m[-1] == {"role": "user", "content": "ultimo"}


def test_valida_messaggio():
    assert ac.valida_messaggio("  ciao ") == "ciao"
    for v in ["", "   ", None, "x" * 3001]:
        with pytest.raises(ValueError):
            ac.valida_messaggio(v)


class _Cur:
    def __init__(self, d): self.d = d
    async def to_list(self, n): return [dict(x) for x in self.d[:n]]


class _Coll:
    def __init__(self, docs=None): self.docs = list(docs or [])
    async def find_one(self, q, projection=None): return next((dict(d) for d in self.docs if all(d.get(k) == v for k, v in q.items())), None)
    def find(self, q, projection=None): return _Cur(self.docs)
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if all(d.get(k) == v for k, v in q.items()):
                d.update(upd["$set"]); return
        if upsert: self.docs.append(dict(upd["$set"]))


@pytest.fixture
def fake(monkeypatch):
    d = SimpleNamespace(partners=_Coll(PARTNERS), ciak_agenti_chat=_Coll())
    monkeypatch.setattr(ciak_admin, "db", d)
    from services import ciak_memoria
    async def vuota(): return ""
    monkeypatch.setattr(ciak_memoria, "render_active_block", vuota)
    return d


ADMIN = SimpleNamespace(email="claudio@x.it", user_id="u1")
def run(c): return asyncio.new_event_loop().run_until_complete(c)
def scrivi(m="Che caso studio uso?"): return run(ciak_admin.andrea_chat(ciak_admin.AndreaChatIn(message=m), ADMIN))


def finta(risposta, visto=None):
    async def _f(system, user, max_tokens=500, messages=None):
        if visto is not None: visto.append((system, messages))
        return risposta
    return _f


def test_risponde_con_il_contesto_vero_e_salva_lo_storico(fake, monkeypatch):
    visto = []
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("Usa Eva.", visto))
    assert scrivi() == {"reply": "Usa Eva."}
    assert "Eva" in visto[0][0] and visto[0][1][-1]["content"] == "Che caso studio uso?"
    msgs = run(ciak_admin.andrea_history(ADMIN))["messages"]
    assert [m["role"] for m in msgs] == ["user", "assistant"]


def test_la_seconda_domanda_porta_lo_storico(fake, monkeypatch):
    visto = []
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("ok", visto))
    scrivi("prima"); scrivi("seconda")
    assert [m["content"] for m in visto[1][1]] == ["prima", "ok", "seconda"]


def test_ai_assente_503_e_nessuno_storico_finto(fake, monkeypatch):
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta(None))
    with pytest.raises(HTTPException) as e: scrivi()
    assert e.value.status_code == 503
    assert run(ciak_admin.andrea_history(ADMIN))["messages"] == []


def test_messaggio_vuoto_422_e_cancella_cronologia(fake, monkeypatch):
    monkeypatch.setattr(ciak_admin, "_chiedi_llm", finta("ok"))
    with pytest.raises(HTTPException) as e: scrivi("  ")
    assert e.value.status_code == 422
    scrivi("ciao")
    run(ciak_admin.andrea_history_clear(ADMIN))
    assert run(ciak_admin.andrea_history(ADMIN))["messages"] == []
