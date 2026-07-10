from models.partner_journey_step import JOURNEY_STEPS_DEFINITION, MACRO_PHASES_DEFINITION


def _step(step_id):
    return next(s for s in JOURNEY_STEPS_DEFINITION if s["step_id"] == step_id)


def test_valida_contains_definitive_evo_sequence():
    valida = next(mp for mp in MACRO_PHASES_DEFINITION if mp["id"] == "valida")

    assert valida["step_ids"] == [
        "05-script-masterclass",
        "06-outline-lezioni",
        "07-script-videolezioni",
        "08-registra-masterclass",
        "09-registra-lezioni",
        "10-sistema-vendita",
        "11-calendario-30gg",
        "12-prezzo-webinar",
        "13-lancio",
    ]


def test_valida_steps_name_the_non_negotiable_operational_blocks():
    labels = {s["step_id"]: s["label"] for s in JOURNEY_STEPS_DEFINITION}

    assert labels["07-script-videolezioni"] == "Script videolezioni"
    assert labels["10-sistema-vendita"] == "Subaccount, dominio, legal e funnel"
    assert labels["11-calendario-30gg"] == "Calendario lancio 30gg"


def test_valida_keeps_legacy_phase_projection_ordered():
    assert _step("05-script-masterclass")["fase_legacy"] == "F3"
    assert _step("07-script-videolezioni")["fase_legacy"] == "F3"
    assert _step("08-registra-masterclass")["fase_legacy"] == "F4"
    assert _step("10-sistema-vendita")["fase_legacy"] == "F5"
    assert _step("11-calendario-30gg")["fase_legacy"] == "F6"
