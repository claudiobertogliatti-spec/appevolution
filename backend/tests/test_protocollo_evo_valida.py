import pytest

from models.partner_journey_step import JOURNEY_STEPS_DEFINITION, MACRO_PHASES_DEFINITION
from services.journey_completion import evaluate_step_completion


pytestmark = pytest.mark.unit


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
        "16-readiness-lancio",
        "13-lancio",
        "18-certificato-valida",
        "19-workbook-finale",
    ]


def test_journey_has_exactly_twenty_canonical_codes():
    assert len(JOURNEY_STEPS_DEFINITION) == 20
    assert [step["code"] for step in JOURNEY_STEPS_DEFINITION] == [
        f"F-{number}" for number in range(1, 21)
    ]
    assert len({step["step_id"] for step in JOURNEY_STEPS_DEFINITION}) == 20


def test_only_three_macro_phases_cover_the_approved_ranges():
    assert [phase["id"] for phase in MACRO_PHASES_DEFINITION] == [
        "esamina", "valida", "ottimizza"
    ]
    steps_by_id = {step["step_id"]: step for step in JOURNEY_STEPS_DEFINITION}
    codes_by_phase = {
        phase["id"]: [steps_by_id[step_id]["code"] for step_id in phase["step_ids"]]
        for phase in MACRO_PHASES_DEFINITION
    }
    assert codes_by_phase["esamina"] == [f"F-{number}" for number in range(1, 8)]
    assert codes_by_phase["valida"] == [f"F-{number}" for number in range(8, 20)]
    assert codes_by_phase["ottimizza"] == ["F-20"]


def test_every_step_exposes_operational_metadata():
    for step in JOURNEY_STEPS_DEFINITION:
        assert step["owner"]
        assert step["completion_policy"]
        assert isinstance(step["material_categories"], list)


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


def test_launch_calendar_policy_is_governed():
    failed = evaluate_step_completion(
        "11-calendario-30gg", {"launch_calendar_approved": False}
    )

    assert failed.ok is False
    assert failed.code == "launch_calendar_not_approved"

    passed = evaluate_step_completion(
        "11-calendario-30gg", {"launch_calendar_approved": True}
    )

    assert passed.ok is True
