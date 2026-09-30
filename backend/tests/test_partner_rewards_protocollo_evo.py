import pytest

# Import del modulo vero (pytest.ini mette backend/ nel path). Prima il test caricava
# il file da "backend/routers/..." (path valido solo dalla radice del repo, non da
# backend/ come in CI) e iniettava un finto `fastapi` in sys.modules per tutta la
# sessione, rischiando di rompere gli altri test.
from routers import partner_rewards

pytestmark = pytest.mark.unit


def test_rewards_use_the_three_evo_phases():
    labels = {phase: meta["label"] for phase, meta in partner_rewards.PHASE_META.items()}

    assert labels == {
        "esamina": "Esamina",
        "valida": "Valida",
        "ottimizza": "Ottimizza",
    }


ATTESA = "Questa sezione si completerà nella prossima fase del percorso."


def test_project_book_sections_enrich_across_the_full_path():
    # Forma dei dati attuale: le risposte dei wizard stanno in `data.answers`; masterclass,
    # corso e calendario arrivano dalle loro collection (chiavi del contesto).
    ctx = {
        "partner": {"name": "Partner Test", "business_name": "Metodo Test"},
        "steps_by_id": {
            "la-tua-storia": {"status": "done", "data": {"answers": {"S01": "Storia professionale chiara."}}},
            "04-posizionamento": {"data": {"answers": {
                "nicchia": "Consulenti",
                "costo_del_no": "Clienti persi ogni mese.",
                "promessa": "Risultato concreto.",
                "metodo_nome": "Metodo Test",
            }}},
            "03-brand-kit": {"data": {"tone_of_voice": "Diretto e semplice.", "colors": ["#0F172A", "#FACC15"]}},
            "07-script-videolezioni": {"data": {"script_videolezioni": "Script lezione 1"}},
            "10-sistema-vendita": {"data": {"note_sistema_vendita": "Dominio, legal e funnel pronti."}},
        },
        "masterclass": {"titolo": "Masterclass Test", "script": "Script masterclass"},
        "videocorso": {"course_data": {"titolo_corso": "Corso Test", "moduli": [
            {"numero": 1, "titolo": "Modulo 1", "lezioni": [{}, {}]},
            {"numero": 2, "titolo": "Modulo 2", "lezioni": [{}]},
        ]}},
        "launch_calendar": {"summary": "30 giorni di lancio"},
    }

    sections = partner_rewards._project_sections(ctx)
    by_title = {s["title"]: s for s in sections}

    # Le 13 sezioni del Workbook Strategico, nell'ordine del template approvato.
    assert [s["title"] for s in sections] == [
        "Executive Summary & Identità",
        "Target & ICP",
        "Problema che risolvi",
        "Promessa",
        "Posizionamento Strategico",
        "Brand Kit",
        "Struttura Masterclass",
        "Struttura Corso",
        "Offerta & Pricing",
        "Sistema di Vendita",
        "Calendario di Lancio",
        "Webinar & Live",
        "Obiettivi Post-Lancio",
    ]

    # Ogni step compilato arricchisce la sua sezione (niente segnaposto).
    attese = {
        "Executive Summary & Identità": "Storia professionale chiara.",
        "Target & ICP": "Consulenti",
        "Problema che risolvi": "Clienti persi ogni mese.",
        "Promessa": "Risultato concreto.",
        "Posizionamento Strategico": "Metodo: Metodo Test",
        "Brand Kit": "Tono di voce: Diretto e semplice.",
        "Struttura Masterclass": "Masterclass Test",
        "Struttura Corso": "Struttura: 2 moduli, 3 lezioni.",
        "Sistema di Vendita": "Dominio, legal e funnel pronti.",
        "Calendario di Lancio": "30 giorni di lancio",
    }
    for titolo, testo in attese.items():
        assert testo in by_title[titolo]["body"], titolo
        assert by_title[titolo]["body"] != ATTESA, titolo
    assert "Palette: #0F172A · #FACC15" in by_title["Brand Kit"]["body"]

    # Gli script non stanno nel corpo ma nei box "Script & Output AI".
    assert by_title["Struttura Corso"]["boxes"][0]["titolo"] == "SCRIPT VIDEOLEZIONI PRONTO ALL'USO"
    assert "Script lezione 1" in by_title["Struttura Corso"]["boxes"][0]["testo"]
    assert "Script masterclass" in by_title["Struttura Masterclass"]["boxes"][0]["testo"]

    # Senza dati dell'ottimizzazione la sezione resta dichiaratamente in attesa.
    assert by_title["Obiettivi Post-Lancio"]["body"] == ATTESA
