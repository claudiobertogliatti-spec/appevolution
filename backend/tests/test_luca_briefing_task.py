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

    if getattr(coro, "__qualname__", "").startswith("_leggi_meta"):
        # Meta non configurata: e' il caso di default nei test che non la riguardano.
        coro.close()
        return {"fonte": "meta", "ok": False, "dati": {}, "errore": "non configurata nei test"}
    if getattr(coro, "__qualname__", "").startswith("_salva_stato"):
        coro.close()
        # `_salva_stato` restituisce (ieri, ultimi_7_giorni): il secondo serve
        # all'autodiagnosi, che guarda piu' giorni di fila.
        return (storico, [storico] if storico else [])
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


# ─── Autodiagnosi: cosa Luca nota su se stesso ───────────────────────────────
# Mandato di Claudio del 31/8: "misura e propone". Non corregge ne' se stesso ne'
# il sistema — quindi questi test verificano che RILEVI, non che agisca.


def test_una_fonte_giu_da_due_giorni_viene_rilevata():
    oggi = {"fonti_ko": ["funnel"], "ingressi_evo_mese": 0}
    storico = [{"fonti_ko": ["funnel"], "ingressi_evo_mese": 0}]

    rilievi = task._autodiagnosi(oggi, storico)

    assert any("funnel" in r and "2 giorni" in r for r in rilievi)


def test_una_fonte_giu_solo_oggi_non_allarma():
    """Un intoppo di un giorno non e' un guasto: segnalarlo ogni volta lo rende rumore."""
    rilievi = task._autodiagnosi({"fonti_ko": ["funnel"]}, [{"fonti_ko": []}])

    assert not any("funnel" in r for r in rilievi)


def test_un_campo_mai_letto_viene_dichiarato():
    oggi = {"lead_oggi": None, "ingressi_evo_mese": 3, "partner_attivi": 10}
    storico = [{"lead_oggi": None, "ingressi_evo_mese": 3, "partner_attivi": 10}]

    rilievi = task._autodiagnosi(oggi, storico)

    assert any("lead_oggi" in r and "nessuno" in r for r in rilievi)
    assert not any("partner_attivi" in r for r in rilievi)


def test_lo_stesso_tappo_per_tre_giorni_diventa_un_rilievo():
    """Ripetere la stessa diagnosi non la risolve: dopo 3 giorni va detto."""
    oggi = {"tappo": "Iscritto masterclass"}
    storico = [{"tappo": "Iscritto masterclass"}, {"tappo": "Iscritto masterclass"}]

    rilievi = task._autodiagnosi(oggi, storico)

    assert any("Iscritto masterclass" in r and "3 giorni" in r for r in rilievi)


def test_un_tappo_che_cambia_non_e_un_rilievo():
    oggi = {"tappo": "Checkpoint compilato"}
    storico = [{"tappo": "Iscritto masterclass"}, {"tappo": "Iscritto masterclass"}]

    assert not any("tappo" in r for r in task._autodiagnosi(oggi, storico))


def test_i_rilievi_finiscono_nel_messaggio_come_proposta(monkeypatch, cattura):
    """Luca li PROPONE: il messaggio deve dire che la decisione resta a Claudio."""
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)
    ieri = {"fonti_ko": ["funnel"], "tappo": None}
    monkeypatch.setattr(
        task, "run_async", lambda coro: _esegui_senza_db(coro, storico=ieri)
    )
    monkeypatch.setattr(task, "_autodiagnosi", lambda o, s: ["la fonte *funnel* non risponde da 2 giorni"])

    task.luca_daily_briefing.run()
    messaggio = cattura[-1]

    assert "Da sistemare nel briefing stesso" in messaggio
    assert "non risponde da 2 giorni" in messaggio
    assert "Li propongo, non li tocco" in messaggio


def test_senza_rilievi_non_si_stampa_la_sezione(monkeypatch, cattura):
    """Una sezione vuota ogni mattina insegna a saltarla."""
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)
    monkeypatch.setattr(task, "run_async", lambda coro: _esegui_senza_db(coro, storico=None))
    monkeypatch.setattr(task, "_autodiagnosi", lambda o, s: [])

    task.luca_daily_briefing.run()

    assert "Da sistemare nel briefing stesso" not in cattura[-1]


# ─── Meta ────────────────────────────────────────────────────────────────────


def test_meta_senza_token_si_dichiara_e_non_blocca(monkeypatch):
    """Il briefing deve uscire lo stesso: Meta non e' pavimento."""
    monkeypatch.delenv("META_ADS_TOKEN", raising=False)
    monkeypatch.delenv("META_AD_ACCOUNT_ID", raising=False)

    import asyncio

    busta = asyncio.new_event_loop().run_until_complete(task._leggi_meta())

    assert busta["ok"] is False
    assert "META_ADS_TOKEN" in busta["errore"]
    assert busta["dati"] == {}


def test_obiettivo_non_lead_diventa_un_rilievo():
    """
    E' il caso reale del 31/8: campagna su OUTCOME_TRAFFIC da 41 giorni, e
    nessuno se n'era accorto.
    """
    oggi = {"meta_obiettivo": "OUTCOME_TRAFFIC"}
    storico = [{"meta_obiettivo": "OUTCOME_TRAFFIC"}, {"meta_obiettivo": "OUTCOME_TRAFFIC"}]

    rilievi = task._autodiagnosi(oggi, storico)

    assert any("OUTCOME_TRAFFIC" in r and "3 giorni" in r for r in rilievi)
    assert any("si comprano clic, non iscritti" in r for r in rilievi)


def test_obiettivo_lead_non_e_un_rilievo():
    for obiettivo in ("OUTCOME_LEADS", "LEAD_GENERATION"):
        rilievi = task._autodiagnosi({"meta_obiettivo": obiettivo}, [])
        assert not any("obiettivo" in r or "campagna Meta" in r for r in rilievi), obiettivo


def test_meta_letta_finisce_nel_messaggio(monkeypatch, cattura):
    monkeypatch.setenv("LUCA_REPORT_KEY", "chiave-finta")
    _mock_raccolta(monkeypatch, output=REPORT_OK)

    dati_meta = {
        "fonte": "meta", "ok": True, "errore": None,
        "dati": {
            "campagne_attive": [{"nome": "Traffico Ciak.io", "obiettivo": "OUTCOME_TRAFFIC"}],
            "spesa_30gg": "61.43", "ctr": "5.38", "cpc": "0.03", "clic": "2209",
        },
    }

    def _run(coro):
        nome = getattr(coro, "__qualname__", "")
        if nome.startswith("_leggi_meta"):
            coro.close()
            return dati_meta
        return _esegui_senza_db(coro, storico=None)

    monkeypatch.setattr(task, "run_async", _run)

    task.luca_daily_briefing.run()
    messaggio = cattura[-1]

    assert "spesa 30gg €61.43" in messaggio
    assert "CTR 5.38%" in messaggio
    assert "Traffico Ciak.io: obiettivo *OUTCOME_TRAFFIC*" in messaggio
    # e il rilievo scatta senza che nessuno debba accorgersene a mano
    assert "si comprano clic, non iscritti" in messaggio


# ─── Quando cambiare l'obiettivo campagna ────────────────────────────────────
# Due situazioni opposte che il conteggio nudo confonde: obiettivo sbagliato con
# zero conversioni (prima si sistema a monte) e obiettivo sbagliato mentre i
# lead arrivano (ora si cambia).


def test_conta_azioni_somma_solo_i_tipi_richiesti():
    azioni = [
        {"action_type": "lead", "value": "3"},
        {"action_type": "link_click", "value": "1604"},
        {"action_type": "onsite_conversion.lead_grouped", "value": "2"},
    ]
    assert task._conta_azioni(azioni, ("lead", "onsite_conversion.lead_grouped")) == 5
    assert task._conta_azioni(None, ("lead",)) == 0
    assert task._conta_azioni([{"action_type": "lead", "value": "non-un-numero"}], ("lead",)) == 0


def test_con_zero_lead_dice_di_NON_cambiare_obiettivo():
    """
    E' il caso del 31/8: cambiare obiettivo con zero conversioni in ingresso fa
    ottimizzare l'algoritmo su qualcosa che non riceve mai.
    """
    oggi = {"meta_obiettivo": "OUTCOME_TRAFFIC", "meta_lead_30gg": 0}

    rilievi = task._autodiagnosi(oggi, [])

    testo = " ".join(rilievi)
    assert "Non cambiare obiettivo" in testo
    assert "si comprano clic, non iscritti" in testo


def test_quando_i_lead_arrivano_dice_di_cambiare(monkeypatch):
    oggi = {"meta_obiettivo": "OUTCOME_TRAFFIC", "meta_lead_30gg": 12}

    rilievi = task._autodiagnosi(oggi, [])

    testo = " ".join(rilievi)
    assert "ora ha senso passarla a un obiettivo lead" in testo.lower().replace("**", "")
    assert "12 lead" in testo
    assert "Non cambiare obiettivo" not in testo


def test_sotto_soglia_non_consiglia_ancora_il_cambio():
    """Pochi lead dicono che la conversione arriva, non che l'algoritmo puo' impararla."""
    sotto = task.SOGLIA_LEAD_PER_CAMBIO_OBIETTIVO - 1
    rilievi = task._autodiagnosi(
        {"meta_obiettivo": "OUTCOME_TRAFFIC", "meta_lead_30gg": sotto}, []
    )

    assert "Non cambiare obiettivo" in " ".join(rilievi)
