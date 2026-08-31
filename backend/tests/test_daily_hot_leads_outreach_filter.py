"""
Regressione del filtro di `daily_hot_leads_outreach` (backend/celery_tasks.py).

Il 31/8/2026 si e' scoperto che il job girava ogni mattina alle 9:00 restituendo
`success` con 0 lead processati, mentre in produzione c'erano 564 lead hot mai
contattati (`/api/discovery/leads/hot` -> `total_hot: 564, contacted: 0`).

Causa: il filtro richiedeva `outreach_status == "pending"`, ma i lead creati dal
discovery Google Places nascono con `status: "discovered"` e SENZA il campo
`outreach_status`. Nessun match, mai, in due mesi.

I documenti di questo test sono modellati sui lead reali letti dall'endpoint di
produzione (source `google_places`, `status: "discovered"`, niente `outreach_status`).
"""

import mongomock
import pytest

# Test puri (mongomock in memoria): niente backend live, girano sempre in CI.
pytestmark = pytest.mark.unit


# Filtro PRIMA del fix — tenuto qui come controprova: deve restare a zero.
FILTRO_VECCHIO = {
    "score_total": {"$gte": 80},
    "outreach_status": "pending",
    "$or": [
        {"email": {"$exists": True, "$nin": [None, ""]}},
        {"contact_email": {"$exists": True, "$nin": [None, ""]}},
    ],
}

# Filtro DOPO il fix — deve essere identico a quello in celery_tasks.py.
FILTRO_NUOVO = {
    "$and": [
        {"score_total": {"$gte": 80}},
        {
            "$or": [
                {"outreach_status": "pending"},
                {"outreach_status": {"$exists": False}},
                {"outreach_status": None},
            ]
        },
        {"valentina_task_id": {"$exists": False}},
        {
            "$or": [
                {"email": {"$exists": True, "$nin": [None, ""]}},
                {"contact_email": {"$exists": True, "$nin": [None, ""]}},
            ]
        },
    ]
}


def _lead_reale(idx, score=90, **extra):
    """Un lead com'e' fatto davvero in produzione: nessun `outreach_status`."""
    doc = {
        "id": f"lead{idx}",
        "source": "google_places",
        "display_name": f"Coach Numero {idx}",
        "email": f"info{idx}@studio.it",
        "business_phone": "335 786 7205",
        "score_total": score,
        "status": "discovered",
        "target_fit_level": "altissimo",
        "profession_category": "Coach / Formatori Aziendali",
    }
    doc.update(extra)
    return doc


@pytest.fixture
def collection():
    return mongomock.MongoClient().db.discovery_leads


def test_il_filtro_vecchio_non_agganciava_nessun_lead_reale(collection):
    """Controprova del bug: col vecchio filtro il job trovava zero lead."""
    collection.insert_many([_lead_reale(i) for i in range(10)])

    assert collection.count_documents({}) == 10
    assert collection.count_documents(FILTRO_VECCHIO) == 0


def test_il_filtro_nuovo_aggancia_i_lead_senza_outreach_status(collection):
    """Il fix: i lead reali (senza il campo) ora vengono presi."""
    collection.insert_many([_lead_reale(i) for i in range(10)])

    assert collection.count_documents(FILTRO_NUOVO) == 10


def test_il_filtro_nuovo_prende_anche_i_pending_espliciti(collection):
    """Chi ha davvero `outreach_status: pending` non deve essere perso dal fix."""
    collection.insert_many(
        [
            _lead_reale(1, outreach_status="pending"),
            _lead_reale(2, outreach_status=None),
            _lead_reale(3),
        ]
    )

    assert collection.count_documents(FILTRO_NUOVO) == 3


def test_esclude_chi_ha_gia_un_task_valentina_in_coda(collection):
    """
    Lo stato resta "pending" finche' l'invio non avviene davvero, quindi senza
    questa condizione il job ripescherebbe gli stessi lead ogni mattina.
    """
    collection.insert_many(
        [
            _lead_reale(1, valentina_task_id="valentina_auto_lead1_20260831"),
            _lead_reale(2),
        ]
    )

    trovati = list(collection.find(FILTRO_NUOVO))
    assert [d["id"] for d in trovati] == ["lead2"]


def test_esclude_score_basso_e_lead_senza_email(collection):
    """Il fix non deve allargare il perimetro oltre i lead hot contattabili."""
    collection.insert_many(
        [
            _lead_reale(1, score=79),
            _lead_reale(2, email=""),
            _lead_reale(3, email=None),
            _lead_reale(4),
        ]
    )

    trovati = list(collection.find(FILTRO_NUOVO))
    assert [d["id"] for d in trovati] == ["lead4"]


def test_gia_inviati_non_vengono_ripresi(collection):
    """Un lead con outreach gia' partito ("sent") esce dal perimetro."""
    collection.insert_many(
        [
            _lead_reale(1, outreach_status="sent"),
            _lead_reale(2, outreach_status="approved"),
            _lead_reale(3),
        ]
    )

    trovati = list(collection.find(FILTRO_NUOVO))
    assert [d["id"] for d in trovati] == ["lead3"]


def test_il_filtro_del_test_e_quello_del_codice():
    """
    Se qualcuno cambia il filtro in celery_tasks.py senza aggiornare il test,
    questo fallisce invece di certificare una query che non esiste piu'.
    """
    from pathlib import Path

    sorgente = Path(__file__).resolve().parents[1] / "celery_tasks.py"
    testo = sorgente.read_text(encoding="utf-8")

    inizio = testo.find("hot_leads = await db.discovery_leads.find(")
    assert inizio != -1, "query di daily_hot_leads_outreach non trovata"
    blocco = testo[inizio : inizio + 1200]

    assert '"valentina_task_id": {"$exists": False}' in blocco
    assert '{"outreach_status": {"$exists": False}}' in blocco
    # il filtro secco che causava il bug non deve tornare
    assert '"outreach_status": "pending",\n                    "$or"' not in blocco
