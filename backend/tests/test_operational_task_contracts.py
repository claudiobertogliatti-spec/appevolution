import pytest

from services.operational_tasks import (
    ExecutionPolicy,
    TaskCapability,
    TaskInputError,
    TaskKind,
    TaskRegistry,
    UnknownTaskTypeError,
    VerificationStatus,
    build_idempotency_key,
    compute_input_version,
    project_legacy_task,
    validate_task_input,
)

pytestmark = pytest.mark.unit


def _strict_input(payload):
    if set(payload) != {"partner_id", "revision"}:
        raise ValueError("campi non ammessi o mancanti")
    if not isinstance(payload["partner_id"], str) or not payload["partner_id"]:
        raise ValueError("partner_id non valido")
    if isinstance(payload["revision"], bool) or not isinstance(payload["revision"], int):
        raise TypeError("revision non valida")
    return payload


def _fake_executor(*_args, **_kwargs):
    return {"accepted": True}


def _fake_verifier(*_args, **_kwargs):
    return True


def _registry(kind=TaskKind.AI):
    registry = TaskRegistry()
    registry.register(TaskCapability(
        task_type="test.prepare_asset",
        input_version=1,
        kind=kind,
        executor=_fake_executor,
        verifier=_fake_verifier,
        policy=ExecutionPolicy(requires_approval=True),
        validate_input=_strict_input,
    ))
    return registry


def test_unknown_task_type_is_blocked_by_typed_error():
    with pytest.raises(UnknownTaskTypeError) as exc:
        validate_task_input("unknown.effect", {}, TaskRegistry())
    assert exc.value.code == "unknown_task_type"


def test_invalid_payload_is_rejected_and_valid_payload_is_read_only():
    registry = _registry()
    with pytest.raises(TaskInputError) as exc:
        validate_task_input("test.prepare_asset", {"partner_id": "p1"}, registry)
    assert exc.value.code == "invalid_task_input"
    validated = validate_task_input(
        "test.prepare_asset", {"partner_id": "p1", "revision": 2}, registry
    )
    assert dict(validated) == {"partner_id": "p1", "revision": 2}
    with pytest.raises(TypeError):
        validated["revision"] = 3


def test_nested_validated_payload_can_be_versioned_without_lossy_coercion():
    registry = TaskRegistry()
    registry.register(TaskCapability(
        task_type="test.nested",
        input_version=1,
        kind=TaskKind.AI,
        executor=_fake_executor,
        verifier=_fake_verifier,
        policy=ExecutionPolicy(requires_approval=False),
        validate_input=lambda payload: payload,
    ))
    validated = validate_task_input(
        "test.nested", {"options": {"channels": ["email", "web"]}}, registry
    )
    assert compute_input_version(validated) == compute_input_version(
        {"options": {"channels": ["email", "web"]}}
    )
    with pytest.raises(ValueError, match="chiavi.*stringhe"):
        compute_input_version({"nested": {1: "collision-prone"}})
    with pytest.raises(ValueError, match="tipo non supportato"):
        compute_input_version({"nested": {"bad": object()}})


def test_capability_requires_resolvable_callables_and_strict_policy():
    with pytest.raises(TypeError, match="callable"):
        TaskCapability(
            task_type="test.invalid",
            input_version=1,
            kind=TaskKind.AI,
            executor="missing.executor",
            verifier=_fake_verifier,
            policy=ExecutionPolicy(requires_approval=True),
            validate_input=_strict_input,
        )
    with pytest.raises(TypeError, match="booleani"):
        ExecutionPolicy(requires_approval=1)


def test_legacy_task_id_and_closed_status_remain_readable_without_reexecution():
    source = {
        "task_id": "task_old",
        "task_type": "pipeline_failed",
        "status": "resolved",
        "created_by_agent": "system",
        "assigned_to": "stefania",
        "context": {"opaque": "preserved"},
    }
    projected = project_legacy_task(source, _registry())
    assert projected.task_id == "task_old"
    assert projected.status == "resolved"
    assert projected.kind is TaskKind.SIGNAL
    assert projected.verification is VerificationStatus.UNKNOWN
    assert projected.eligible_for_ai is False
    assert projected.original["context"] == {"opaque": "preserved"}
    assert source["status"] == "resolved"


def test_closed_legacy_task_without_evidence_is_unknown_even_if_marked_pending():
    projected = project_legacy_task({
        "id": "closed-1",
        "task_type": "test.prepare_asset",
        "status": "completed",
        "verification": "pending",
        "agent": "gaia",
        "data": {},
    }, _registry())
    assert projected.verification is VerificationStatus.UNKNOWN


def test_antonella_collaborator_task_is_excluded_from_ai_worker():
    projected = project_legacy_task({
        "id": "human-1",
        "task_type": "test.prepare_asset",
        "status": "pending",
        "assigned_to": "Antonella",
        "agent": "stefania",
        "data": {"partner_id": "p1", "revision": 1},
    }, _registry())
    assert projected.kind is TaskKind.COLLABORATOR
    assert projected.eligible_for_ai is False


def test_human_markers_override_claimed_ai_kind_and_malformed_values_fail_closed():
    human = project_legacy_task({
        "id": "human-2", "task_type": "test.prepare_asset", "status": "pending",
        "kind": "ai", "entity_type": "collaborator", "approved_minutes": 30,
    }, _registry())
    malformed = project_legacy_task({
        "id": "bad-1", "task_type": ["test.prepare_asset"], "status": "pending",
        "kind": {"claimed": "ai"},
    }, _registry())
    assert human.kind is TaskKind.COLLABORATOR
    assert human.eligible_for_ai is False
    assert malformed.kind is TaskKind.AMBIGUOUS
    assert malformed.eligible_for_ai is False


def test_ambiguous_legacy_task_is_fail_closed():
    projected = project_legacy_task({
        "id": "ambiguous-1", "task_type": "test.prepare_asset", "status": "pending"
    }, _registry())
    assert projected.kind is TaskKind.AMBIGUOUS
    assert projected.eligible_for_ai is False


def test_idempotency_key_is_stable_for_content_version_and_changes_with_input():
    first = {"partner_id": "p1", "revision": 1}
    reordered = {"revision": 1, "partner_id": "p1"}
    v1 = compute_input_version(first)
    assert v1 == compute_input_version(reordered)
    key = build_idempotency_key("test.prepare_asset", {"id": "p1", "type": "partner"}, v1)
    assert key == build_idempotency_key(
        "test.prepare_asset", {"type": "partner", "id": "p1"}, compute_input_version(reordered)
    )
    v2 = compute_input_version({"partner_id": "p1", "revision": 2})
    assert key != build_idempotency_key("test.prepare_asset", {"id": "p1", "type": "partner"}, v2)
