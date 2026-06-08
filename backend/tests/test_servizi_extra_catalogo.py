"""
Test catalogo SERVIZI_CATALOGO esteso con i 10 nuovi servizi Evolution One.
Verifica che id/prezzo/tipo siano allineati allo spec
docs/superpowers/specs/2026-05-31-evolution-one-restructure-design.md
"""
import pytest
from routers.servizi_extra import SERVIZI_CATALOGO

pytestmark = pytest.mark.unit


EXPECTED_NEW_SERVIZI = {
    # id : (prezzo, tipo)
    "gestione-campagne": (348, "abbonamento_mensile"),
    "booster-checkout": (197, "una_tantum"),
    "upsell-post-acquisto": (297, "una_tantum"),
    "offerta-di-recupero": (197, "una_tantum"),
    "live-promo-3": (1490, "una_tantum"),
    "live-promo-6": (2490, "una_tantum"),
    "live-promo-12": (3990, "una_tantum"),
    "ebook-corso": (497, "una_tantum"),
    "audiobook": (697, "una_tantum"),
    "audiolezioni": (397, "una_tantum"),
}


def _catalog_by_id():
    return {s["id"]: s for s in SERVIZI_CATALOGO}


@pytest.mark.parametrize("servizio_id,expected", EXPECTED_NEW_SERVIZI.items())
def test_nuovo_servizio_presente_con_prezzo_e_tipo_corretti(servizio_id, expected):
    expected_prezzo, expected_tipo = expected
    by_id = _catalog_by_id()
    assert servizio_id in by_id, f"Servizio {servizio_id} mancante nel catalogo"
    s = by_id[servizio_id]
    assert s["prezzo"] == expected_prezzo, f"{servizio_id}: prezzo {s['prezzo']} != atteso {expected_prezzo}"
    assert s["tipo"] == expected_tipo, f"{servizio_id}: tipo {s['tipo']} != atteso {expected_tipo}"
    assert s["attivo"] is True, f"{servizio_id} non attivo"
    assert s["stripe_price_id"], f"{servizio_id} senza stripe_price_id"
    assert isinstance(s["features"], list) and len(s["features"]) >= 3, f"{servizio_id} senza features sufficienti"


def test_catalogo_totale_12_servizi():
    # 2 calendario + 10 nuovi
    assert len(SERVIZI_CATALOGO) == 12
