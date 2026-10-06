"""
Ciak Start: le bozze si preparano da sole quando arrivano gli input.
Regole sotto test: mai approvare, mai sovrascrivere, mai sollevare, ogni materiale
parte solo con i suoi input, avviso al team. Generatori mockati; DB fittizio.
"""
import pytest
from fastapi import BackgroundTasks, HTTPException

from routers import ciak_admin, ciak_clients
from services import start_autogenerazione as auto

pytestmark = pytest.mark.unit


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _Coll:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return dict(d)
        return None

    def find(self, query, projection=None):
        return _Cursor([dict(d) for d in self.docs if all(d.get(k) == v for k, v in query.items())])


class _Db:
    def __init__(self, steps, deliverables=()):
        self.partner_journey_steps = _Coll(steps)
        self.ciak_start_deliverables = _Coll(deliverables)


RISPOSTE_OK = {"partner_id": "c1", "step_id": "04-posizionamento", "data": {"answers_completed_at": "2026-10-02"}}
MARCHIO_OK = {"partner_id": "c1", "step_id": "03-brand-kit", "data": {"brand_completed_at": "2026-10-06"}}


class _Registro(list):
    """Lista delle chiamate ai generatori, con gli avvisi al team in `.avvisi`."""

    avvisi: list


@pytest.fixture
def chiamate(monkeypatch):
    registro = _Registro()

    def _fake(nome):
        async def _f(client_id, *args, admin=None, **kw):
            registro.append((nome, admin))
            return {"success": True}
        return _f

    for nome in ("posizionamento", "marchio", "profili", "vetrina"):
        monkeypatch.setattr(ciak_admin, f"genera_{nome}_start", _fake(nome))

    async def _cal(client_id, tasks, admin=None):
        registro.append(("calendario", admin))
        return {"success": True, "generating": True}
    monkeypatch.setattr(ciak_admin, "genera_calendario_start", _cal)

    avvisi = []

    async def _notify(pid, msg, **kw):
        avvisi.append((pid, msg, kw))
        return True
    from routers import partner_journey
    monkeypatch.setattr(partner_journey, "_notify_admin_partner_activity", _notify)
    registro.avvisi = avvisi
    return registro


@pytest.mark.asyncio
async def test_con_tutti_gli_input_prepara_tutto_e_avvisa(monkeypatch, chiamate):
    monkeypatch.setattr(ciak_admin, "db", _Db([RISPOSTE_OK, MARCHIO_OK]))
    esito = await auto.prepara_bozze("c1")
    assert esito["generati"] == ["positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d"]
    assert [n for n, _ in chiamate] == ["posizionamento", "marchio", "profili", "vetrina", "calendario"]
    assert all(a is auto.SISTEMA for _, a in chiamate)
    (pid, msg, kw), = chiamate.avvisi
    assert pid == "c1" and kw["requires_approval"] is True
    assert "posizionamento" in msg and "marchio" in msg


@pytest.mark.asyncio
async def test_solo_risposte_genera_solo_il_posizionamento(monkeypatch, chiamate):
    """Profili e vetrina usano il brand kit: senza marchio non si generano a vuoto."""
    monkeypatch.setattr(ciak_admin, "db", _Db([RISPOSTE_OK]))
    esito = await auto.prepara_bozze("c1")
    assert esito["generati"] == ["positioning"]


@pytest.mark.asyncio
async def test_senza_input_non_genera_ne_avvisa(monkeypatch, chiamate):
    monkeypatch.setattr(ciak_admin, "db", _Db([]))
    esito = await auto.prepara_bozze("c1")
    assert esito["generati"] == [] and chiamate == [] and chiamate.avvisi == []


@pytest.mark.asyncio
async def test_non_sovrascrive_cio_che_esiste_gia(monkeypatch, chiamate):
    esistenti = [
        {"partner_id": "c1", "type": "positioning", "approval_status": "approved"},
        {"partner_id": "c1", "type": "brand_kit", "approval_status": "pending_review"},
    ]
    monkeypatch.setattr(ciak_admin, "db", _Db([RISPOSTE_OK, MARCHIO_OK], esistenti))
    esito = await auto.prepara_bozze("c1")
    assert "positioning" not in esito["generati"] and "brand_kit" not in esito["generati"]
    assert esito["generati"] == ["social_profiles", "showcase", "content_plan_90d"]


@pytest.mark.asyncio
async def test_un_errore_non_ferma_gli_altri_materiali(monkeypatch, chiamate):
    async def _rotto(client_id, admin=None):
        raise HTTPException(409, "Posizionamento incompleto")
    monkeypatch.setattr(ciak_admin, "genera_posizionamento_start", _rotto)
    monkeypatch.setattr(ciak_admin, "db", _Db([RISPOSTE_OK, MARCHIO_OK]))
    esito = await auto.prepara_bozze("c1")
    assert "positioning" in esito["errori"] and "Posizionamento incompleto" in esito["errori"]["positioning"]
    assert "brand_kit" in esito["generati"]


@pytest.mark.asyncio
async def test_non_solleva_mai_se_il_db_non_risponde(monkeypatch, chiamate):
    class _DbRotto:
        class partner_journey_steps:
            @staticmethod
            async def find_one(*a, **k):
                raise RuntimeError("db giu")
    monkeypatch.setattr(ciak_admin, "db", _DbRotto())
    esito = await auto.prepara_bozze("c1")
    assert esito["generati"] == []


def test_il_salvataggio_completato_del_cliente_accoda_la_preparazione():
    tasks = BackgroundTasks()
    ciak_clients._prepara_bozze_in_background(tasks, "c1")
    assert len(tasks.tasks) == 1
    assert tasks.tasks[0].func is auto.prepara_bozze and tasks.tasks[0].args == ("c1",)


@pytest.mark.asyncio
async def test_endpoint_admin_prepara_accoda_senza_bloccare(monkeypatch):
    class _Clienti:
        async def find_one(self, q, p=None):
            return {"id": "c1", "access_level": "cliente_start"}
    db = type("D", (), {"ciak_clients": _Clienti()})()
    monkeypatch.setattr(ciak_admin, "db", db)
    tasks = BackgroundTasks()
    res = await ciak_admin.prepara_bozze_start("c1", tasks, _admin=object())
    assert res == {"success": True, "generating": True}
    assert tasks.tasks[0].func is auto.prepara_bozze


def test_le_due_rotte_di_salvataggio_ricevono_il_background_task():
    """FastAPI inietta BackgroundTasks per annotazione: se qualcuno lo toglie, la
    generazione automatica sparisce in silenzio."""
    import inspect
    for fn in (ciak_clients.salva_start_risposte, ciak_clients.salva_start_marchio):
        assert "background_tasks" in inspect.signature(fn).parameters
