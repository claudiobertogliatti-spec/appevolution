import pytest

from services.phase2_conformity import (
    PHASE2_POLICY_EVIDENCE,
    dependent_step_ids,
    evaluate_phase2_conformity,
)


pytestmark = pytest.mark.unit


@pytest.mark.parametrize(("step_id", "flag"), [
    ("05-script-masterclass", "masterclass_script_approved"),
    ("06-outline-lezioni", "course_outline_approved"),
    ("07-script-videolezioni", "lesson_scripts_approved"),
    ("08-registra-masterclass", "masterclass_current_version_approved"),
    ("09-registra-lezioni", "all_required_lessons_current_version_approved"),
    ("10-sistema-vendita", "sales_system_ready"),
    ("11-calendario-30gg", "launch_calendar_approved"),
    ("12-prezzo-webinar", "price_webinar_approved"),
    ("16-readiness-lancio", "launch_readiness_verified"),
    ("13-lancio", "launch_verified"),
    ("18-certificato-valida", "valida_certificate_archived"),
    ("19-workbook-finale", "final_workbook_archived"),
])
def test_every_phase2_step_requires_its_server_evidence(step_id, flag):
    assert not evaluate_phase2_conformity(step_id, {}).conformant

    result = evaluate_phase2_conformity(step_id, {flag: True})

    assert result.conformant
    assert result.evidence_key == flag


def test_done_status_alone_never_makes_a_governed_step_conformant():
    result = evaluate_phase2_conformity(
        "11-calendario-30gg", {"status": "done"}
    )

    assert result.conformant is False
    assert result.evidence_key == "launch_calendar_approved"
    assert result.details == {"launch_calendar_approved": False}


def test_conformity_details_expose_only_the_governing_boolean():
    result = evaluate_phase2_conformity(
        "13-lancio",
        {"launch_verified": True, "partner_email": "private@example.test"},
    )

    assert result.details == {"launch_verified": True}


def test_policy_cannot_be_mutated_at_runtime():
    step_id = "11-calendario-30gg"
    original_policy = PHASE2_POLICY_EVIDENCE[step_id]

    try:
        PHASE2_POLICY_EVIDENCE[step_id] = "client_claimed_done"
    except TypeError:
        pass
    else:
        PHASE2_POLICY_EVIDENCE[step_id] = original_policy
        pytest.fail("La policy Fase 2 deve essere immutabile")

    result = evaluate_phase2_conformity(step_id, {original_policy: True})

    assert result.conformant is True
    assert result.evidence_key == original_policy


def test_dependent_step_ids_follow_the_canonical_phase2_sequence():
    assert dependent_step_ids("12-prezzo-webinar") == (
        "16-readiness-lancio",
        "13-lancio",
        "18-certificato-valida",
        "19-workbook-finale",
    )
    assert dependent_step_ids("19-workbook-finale") == ()
    assert dependent_step_ids("04-posizionamento") == ()
