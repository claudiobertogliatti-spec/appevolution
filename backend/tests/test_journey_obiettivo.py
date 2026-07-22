from models.partner_journey_step import (
    JOURNEY_STEPS_DEFINITION,
    MACRO_PHASES_DEFINITION,
)


def _by_id():
    return {d["step_id"]: d for d in JOURNEY_STEPS_DEFINITION}


def test_step_obiettivo_esiste_in_esamina():
    steps = _by_id()
    assert "obiettivo" in steps
    assert steps["obiettivo"]["macro_phase"] == "esamina"
    assert steps["obiettivo"]["label"] == "Il tuo obiettivo"


def test_obiettivo_e_ordinato_tra_storia_e_posizionamento():
    steps = _by_id()
    assert steps["la-tua-storia"]["step_number"] < steps["obiettivo"]["step_number"]
    assert steps["obiettivo"]["step_number"] < steps["04-posizionamento"]["step_number"]


def test_obiettivo_precede_posizionamento_nella_fase_esamina():
    esamina = next(mp for mp in MACRO_PHASES_DEFINITION if mp["id"] == "esamina")
    ids = esamina["step_ids"]
    assert "obiettivo" in ids
    assert ids.index("obiettivo") < ids.index("04-posizionamento")
