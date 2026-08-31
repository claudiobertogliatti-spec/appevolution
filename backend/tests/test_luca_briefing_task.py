"""
Test del briefing di Luca lato server (`backend/luca_briefing_task.py`).

Verifica le tre garanzie che rendono il briefing affidabile senza sorveglianza:
non parte a vuoto, non produce numeri parziali quando Ciak cade, e non inventa
un confronto con ieri quando ieri non esiste.
"""

import sys
import types
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import luca_briefing_task as task  # noqa: E402


REPORT_OK = {
    "report": {
        "acquisition": {"ingressi_mese": 0, "leads_today": 3, "diagnostics_today": 1},
        "delivery": {
            "partner_attivi": 10,
            "fermi": 6,
            "serve_ok": 0,
            "fermi_nomi": ["Marco Lamanna", "Daniele Andolfi"],
        },
    },
    "fonti": {"sito": {"dati": {"tutte_ok": True, "url": []}}},
}


@pytest.fixture
def cattura(monkeypatch):
    """Intercetta Telegram e Mongo: nessuna rete, nessun DB."""
    inviati = []

    async def _telegram(msg):
        inviati.append(msg)

    monkeypatch.setattr(task, "_send_telegram", _telegram)
    return inviati


def _mock_raccolta(monkeypatch, output=None, errore=None):
    finto = types.SimpleNamespace(raccogli=lambda base, key: (output, errore))
    monkeypatch.setattr(task, "_carica_raccolta", lambda: finto)


def test_senza_chiave_non_parte_e_lo_dichiara(monkeypatch, cattura):
    monkeypatch.delenv("LUCA_REPORT_KEY", raising=False)

    esito = task.luca_daily_briefing.run()

    assert esito["success"] is False
    assert "LUCA_REPORT_KEY" in esito["error"]
    assert len(cattura) == 1
    assert "LUCA_REPORT_KEY" in cattura[0]


def test_se_ciak_cade_non_produce_un_briefing_parziale(monkeypatch, cattura):
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=None, errore="/api/admin/luca/daily-report -> HTTP 503")

    esito = task.luca_daily_briefing.run()

    assert esito["success"] is False
    assert "503" in esito["error"]
    # il messaggio riporta l'errore e NON contiene numeri
    assert len(cattura) == 1
    assert "503" in cattura[0]
    assert "Ingressi EVO" not in cattura[0]


def test_prima_misurazione_non_inventa_un_confronto(monkeypatch, cattura):
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)
    # nessuno storico: _salva_stato restituisce None
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))

    esito = task.luca_daily_briefing.run()

    assert esito["success"] is True
    assert esito["confronto_disponibile"] is False
    messaggio = cattura[-1]
    assert "prima misurazione" in messaggio
    assert "vs ieri" not in messaggio


def test_con_lo_storico_calcola_il_delta(monkeypatch, cattura):
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)
    ieri = {"lead_oggi": 1, "partner_fermi": 8, "ingressi_evo_mese": 0}
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=ieri))

    esito = task.luca_daily_briefing.run()

    messaggio = cattura[-1]
    assert esito["confronto_disponibile"] is True
    assert "Lead oggi: 3 (+2 vs ieri)" in messaggio
    assert "Partner fermi: 6 (-2 vs ieri)" in messaggio


def test_il_sito_giu_apre_il_messaggio(monkeypatch, cattura):
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    rotto = {
        "report": REPORT_OK["report"],
        "fonti": {
            "sito": {
                "dati": {
                    "tutte_ok": False,
                    "url": [
                        {"url": "https://www.ciak.io", "status": 200},
                        {"url": "https://www.ciak.io/funnel", "status": 502},
                    ],
                }
            }
        },
    }
    _mock_raccolta(monkeypatch, output=rotto)
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))

    task.luca_daily_briefing.run()

    messaggio = cattura[-1]
    prima_riga_utile = [r for r in messaggio.splitlines() if r.strip()][1]
    assert "SITO GIU'" in prima_riga_utile
    assert "502" in prima_riga_utile


def test_un_campo_non_letto_non_diventa_zero(monkeypatch, cattura):
    """Un buco si dichiara 'non letto': zero direbbe che la misura e' stata fatta."""
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    parziale = {
        "report": {"acquisition": {"leads_today": 3}, "delivery": {}},
        "fonti": {"sito": {"dati": {"tutte_ok": True, "url": []}}},
    }
    _mock_raccolta(monkeypatch, output=parziale)
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))

    task.luca_daily_briefing.run()

    messaggio = cattura[-1]
    assert "Partner attivi: non letto" in messaggio
    assert "Partner attivi: 0" not in messaggio


def _esegui_senza_db(coro, storico):
    """
    `run_async` viene usato sia per Telegram sia per il salvataggio su Mongo.
    Qui si esegue la coroutine di Telegram (che il fixture ha gia' sostituito) e
    si restituisce lo storico finto al posto della scrittura su DB.
    """
    import asyncio

    if getattr(coro, "__qualname__", "").startswith("_salva_stato"):
        coro.close()
        return storico
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def test_il_briefing_riporta_il_funnel_e_indica_il_tappo(monkeypatch, cattura):
    """
    Il pezzo che mancava: senza il funnel il briefing parlava solo degli stadi
    dopo l'iscrizione e sembrava che non entrasse nessuno.
    """
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    con_funnel = {
        "report": REPORT_OK["report"],
        "fonti": {"sito": {"dati": {"tutte_ok": True, "url": []}}},
        "funnel": {
            "pre_acquisto": {
                "totale": 6,
                "stadi": [
                    {"id": "iscritto", "label": "Iscritto masterclass", "totale": 5,
                     "ultimi_30gg": 3, "fermi_oltre_14gg": 4, "piu_vecchio_giorni": 58,
                     "senza_data": 0},
                    {"id": "checkpoint", "label": "Checkpoint compilato", "totale": 1,
                     "ultimi_30gg": 0, "fermi_oltre_14gg": 1, "piu_vecchio_giorni": 80,
                     "senza_data": 0},
                    {"id": "diagnostica", "label": "8 Domande completate", "totale": 0,
                     "ultimi_30gg": 0, "fermi_oltre_14gg": 0, "piu_vecchio_giorni": None,
                     "senza_data": 0},
                ],
            }
        },
    }
    _mock_raccolta(monkeypatch, output=con_funnel)
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))

    task.luca_daily_briefing.run()
    messaggio = cattura[-1]

    assert "Iscritto masterclass: 5" in messaggio
    assert "4 fermi da oltre 14gg" in messaggio
    assert "il piu' vecchio da 58gg" in messaggio
    # lo stadio vuoto non si stampa: un elenco di zeri nasconde i numeri veri
    assert "8 Domande completate" not in messaggio
    # e il briefing DICE dove intervenire, non lascia il conto al lettore
    assert "il tappo e' *Iscritto masterclass*" in messaggio


def test_se_il_funnel_non_e_letto_lo_dichiara(monkeypatch, cattura):
    """Un punto cieco si dichiara: senza questa riga sembrerebbe un funnel vuoto."""
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)  # nessuna chiave "funnel"
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))

    task.luca_daily_briefing.run()

    assert "Funnel pre-acquisto: fonte non letta" in cattura[-1]
