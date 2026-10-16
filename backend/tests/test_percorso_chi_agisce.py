"""Chi deve muoversi: il passo corrente è sempre uno che tocca al partner.

Caso reale (Andolfi, 13/10/2026): cinque step aperti insieme — F-13 (funnel), F-16 (verifica
pre-lancio), F-17 (lancio), F-18 (certificato), F-19 (workbook). Tre di questi non hanno
nessuna schermata partner, eppure il percorso li mostrava come «Già avviato → Apri».
"""
import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
import routers.partner_journey as pj

pytestmark = pytest.mark.unit

AZIONE = {d["step_id"]: d["azione"] for d in JOURNEY_STEPS_DEFINITION}
# gli unici step senza voce in PartnerOperativo.STEP_COMPONENTS (verificato nel frontend)
SENZA_SCHERMATA = {"16-readiness-lancio", "18-certificato-valida", "19-workbook-finale"}


def test_every_step_declares_who_acts():
    assert len(AZIONE) == 20
    assert set(AZIONE.values()) == {"partner", "team"}


def test_the_steps_without_a_partner_screen_are_exactly_the_team_ones():
    assert {sid for sid, az in AZIONE.items() if az == "team"} == SENZA_SCHERMATA


def test_a_step_the_partner_can_open_is_never_marked_team():
    for sid in ("obiettivo", "09-registra-lezioni", "10-sistema-vendita", "13-lancio"):
        assert AZIONE[sid] == "partner", sid


def _s(step_id, status, azione="partner"):
    return {"step_id": step_id, "status": status, "azione": azione}


def test_andolfi_five_steps_open_the_current_one_is_his():
    """I dati veri di Andolfi: F-13 è suo, gli altri quattro aperti sono del team."""
    steps = [_s("05-script-masterclass", "done"), _s("09-registra-lezioni", "done"),
             _s("10-sistema-vendita", "in_progress"),
             _s("16-readiness-lancio", "in_progress", "team"),
             _s("13-lancio", "in_progress"),
             _s("18-certificato-valida", "in_progress", "team"),
             _s("19-workbook-finale", "in_progress", "team")]
    assert pj.passo_corrente(steps)["step_id"] == "10-sistema-vendita"


def test_when_only_team_steps_are_open_the_partner_is_not_sent_anywhere_new():
    steps = [_s("09-registra-lezioni", "done"),
             _s("16-readiness-lancio", "in_progress", "team"),
             _s("18-certificato-valida", "in_progress", "team")]
    assert pj.passo_corrente(steps)["azione"] == "team"


def test_a_step_left_behind_does_not_drag_the_view_back():
    """Regola del 30/07/2026: un passaggio aperto a metà strada non riporta all'inizio."""
    steps = [_s("la-tua-storia", "in_progress"), _s("obiettivo", "done"),
             _s("04-posizionamento", "pending")]
    assert pj.passo_corrente(steps)["step_id"] == "04-posizionamento"


def test_no_steps_and_all_done():
    assert pj.passo_corrente([]) is None
    assert pj.passo_corrente([_s("obiettivo", "done")])["step_id"] == "obiettivo"
