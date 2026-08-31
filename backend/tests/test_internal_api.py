"""
Test dell'URL interna condivisa (`backend/internal_api.py`).

Il 31/8/2026 sei punti del codice chiamavano `http://localhost:8001` mentre il
container espone la 8080: ogni job schedulato moriva con Connection refused, da
mesi, e il fallimento era solo una riga di log che nessuno leggeva.

Oltre a testare l'helper, qui si verifica che quei chiamanti non tornino a
scrivere la porta a mano: e' il modo in cui il difetto e' nato la prima volta.
"""

import importlib
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

import internal_api


@pytest.fixture(autouse=True)
def _ambiente_pulito(monkeypatch):
    monkeypatch.delenv("INTERNAL_API_BASE", raising=False)
    monkeypatch.delenv("PORT", raising=False)
    importlib.reload(internal_api)
    yield


def test_default_e_la_porta_del_container_non_la_8001():
    assert internal_api.internal_api_base() == "http://localhost:8080"
    assert "8001" not in internal_api.internal_api_base()


def test_usa_la_porta_iniettata_da_cloud_run(monkeypatch):
    monkeypatch.setenv("PORT", "9090")
    assert internal_api.internal_api_base() == "http://localhost:9090"


def test_internal_api_base_ha_la_precedenza(monkeypatch):
    monkeypatch.setenv("PORT", "9090")
    monkeypatch.setenv("INTERNAL_API_BASE", "http://api.interno:7000")
    assert internal_api.internal_api_base() == "http://api.interno:7000"


def test_niente_doppio_slash_ne_slash_finale(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_BASE", "http://api.interno:7000/")
    assert internal_api.internal_api_url("/api/notify/telegram") == (
        "http://api.interno:7000/api/notify/telegram"
    )
    assert internal_api.internal_api_url("api/notify/telegram") == (
        "http://api.interno:7000/api/notify/telegram"
    )


@pytest.mark.parametrize(
    "modulo",
    [
        "scheduler.py",
        "morning_briefing_task.py",
        "celery_tasks.py",
        "agent_task_system.py",
        "luca_briefing_task.py",
        "routers/stripe_webhook.py",
        "routers/flusso_analisi.py",
    ],
)
def test_nessun_chiamante_riscrive_la_porta_a_mano(modulo):
    """
    Controprova permanente: se qualcuno rimette `localhost:8001` in uno di
    questi file, il test fallisce invece di lasciare che i job muoiano in
    silenzio per altri mesi. I commenti che raccontano il bug sono ammessi.
    """
    percorso = Path(__file__).resolve().parents[1] / modulo
    codice = [
        r
        for r in percorso.read_text(encoding="utf-8").splitlines()
        if not r.lstrip().startswith("#")
    ]

    colpevoli = [r.strip() for r in codice if "localhost:8001" in r]
    assert not colpevoli, f"{modulo} chiama ancora la 8001: {colpevoli}"


@pytest.mark.parametrize(
    "modulo", ["routers/stripe_webhook.py", "routers/flusso_analisi.py"]
)
def test_nessun_default_backend_url_sulla_8001(modulo):
    """
    `BACKEND_URL` NON e' configurata su Cloud Run (verificato il 31/8): un
    `os.environ.get("BACKEND_URL", "http://localhost:8001")` cade sempre sul
    default sbagliato. Il default va preso da internal_api, non scritto a mano.
    """
    percorso = Path(__file__).resolve().parents[1] / modulo
    codice = [
        r
        for r in percorso.read_text(encoding="utf-8").splitlines()
        if not r.lstrip().startswith("#")
    ]

    colpevoli = [
        r.strip() for r in codice if "BACKEND_URL" in r and "localhost" in r
    ]
    assert not colpevoli, f"{modulo} ha un default BACKEND_URL locale: {colpevoli}"
