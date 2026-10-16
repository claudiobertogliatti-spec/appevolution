import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

import integrated_services
from services.operational_tasks import ExecutionPolicy, TaskCapability, TaskKind, TaskRegistry


pytestmark = pytest.mark.unit


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = {item["id"]: dict(item) for item in (documents or [])}

    async def update_one(self, query, update, **_kwargs):
        document = self.documents.setdefault(query["id"], {"id": query["id"]})
        for key, value in update.get("$set", {}).items():
            target = document
            parts = key.split(".")
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = value
        for key in update.get("$unset", {}):
            target = document
            parts = key.split(".")
            for part in parts[:-1]:
                target = target.get(part, {})
            target.pop(parts[-1], None)


class FakeDB:
    def __init__(self, tasks):
        self.agent_tasks = FakeCollection(tasks)
        self.systeme_contacts = FakeCollection()


@pytest.fixture
def executor(monkeypatch):
    fake_db = FakeDB([])
    monkeypatch.setattr(integrated_services, "db", fake_db)
    instance = integrated_services.BackgroundJobExecutor()
    return instance, fake_db


@pytest.mark.asyncio
async def test_manual_andrea_is_blocked_with_real_operator(executor):
    instance, fake_db = executor
    task = {"id": "andrea-1", "agent": "ANDREA", "task_type": "edit_video", "data": {}, "direction": "video_editor_1", "status": "pending"}
    fake_db.agent_tasks.documents[task["id"]] = dict(task)

    result = await instance.execute_task(task)

    saved = fake_db.agent_tasks.documents[task["id"]]
    assert result["success"] is False
    assert saved["status"] == "blocked"
    assert saved["error_code"] == "manual_operator_required"
    assert saved["next_action"]["owner_id"] == "video_editor_1"
    assert "completed_at" not in saved


@pytest.mark.asyncio
async def test_title_is_not_an_artifact_and_regeneration_follows_same_rule(executor):
    instance, fake_db = executor
    task = {"id": "unknown-1", "agent": "MARTA", "task_type": "write_document", "title": "Piano pronto", "data": {}, "status": "pending"}
    fake_db.agent_tasks.documents[task["id"]] = dict(task)

    first = await instance.generate_for_approval(task)
    assert first["success"] is False
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "blocked"

    task["status"] = "rejected"
    task["approval"] = {"feedback": "Rivedi", "revision_count": 1}
    second = await instance.regenerate_with_feedback(task)
    assert second["success"] is False
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "blocked"


@pytest.mark.asyncio
async def test_gaia_provider_failure_never_completes_and_is_preserved(executor, monkeypatch):
    instance, fake_db = executor
    task = {"id": "gaia-1", "agent": "GAIA", "task_type": "send_welcome", "data": {}, "status": "pending"}
    fake_db.agent_tasks.documents[task["id"]] = dict(task)

    async def provider_failure(_task):
        return {"success": False, "error": "provider rejected"}

    monkeypatch.setattr(instance, "_execute_gaia_task", provider_failure)
    result = await instance.execute_task(task)

    saved = fake_db.agent_tasks.documents[task["id"]]
    assert result["success"] is False
    assert result["provider_result"] == {"success": False, "error": "provider rejected"}
    assert saved["status"] == "blocked"
    assert saved["result"]["provider_result"]["error"] == "provider rejected"
    assert "completed_at" not in saved


@pytest.mark.asyncio
@pytest.mark.parametrize("agent", ["LUCA", "MARTA", "ATLAS"])
async def test_other_approved_agents_do_not_complete_without_artifact(executor, agent):
    instance, fake_db = executor
    task = {"id": agent.lower(), "agent": agent, "task_type": "generic", "data": {}, "status": "approved"}
    fake_db.agent_tasks.documents[task["id"]] = dict(task)

    result = await instance.execute_approved_task(task)

    assert result["success"] is False
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "blocked"
    assert "completed_at" not in fake_db.agent_tasks.documents[task["id"]]


@pytest.mark.asyncio
async def test_document_capability_completes_only_after_code_injected_readback(monkeypatch):
    calls = []

    async def produce(payload):
        calls.append(("produce", dict(payload)))
        return {"artifact_id": "doc-7"}

    async def readback(execution_result, payload):
        calls.append(("verify", execution_result["artifact_id"], dict(payload)))
        return {"verified": True, "evidence_refs": ["documents/doc-7"]}

    registry = TaskRegistry()
    registry.register(TaskCapability(
        task_type="document.generate",
        input_version=1,
        kind=TaskKind.AI,
        executor=produce,
        verifier=readback,
        policy=ExecutionPolicy(requires_approval=False, external_effects=False),
        validate_input=lambda payload: payload,
    ))
    task = {
        "id": "doc-1", "agent": "STEFANIA", "task_type": "document.generate",
        "status": "pending", "requires_approval": False,
        "operational_contract": {"input_version": 1, "payload": {"partner_id": "p1"}},
    }
    fake_db = FakeDB([task])
    monkeypatch.setattr(integrated_services, "db", fake_db)
    instance = integrated_services.BackgroundJobExecutor(task_registry=registry)

    result = await instance.execute_task(task)

    assert result["success"] is True
    assert result["artifact"] == {"artifact_id": "doc-7"}
    assert result["verification"]["evidence_refs"] == ["documents/doc-7"]
    assert len(result["verification"]["input_checksum"]) == 64
    assert result["verification"]["checked_at"].endswith("+00:00")
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "completed"
    assert calls == [("produce", {"partner_id": "p1"}), ("verify", "doc-7", {"partner_id": "p1"})]


@pytest.mark.asyncio
async def test_document_approval_does_not_complete_distinct_publication(executor):
    instance, fake_db = executor
    task = {"id": "publish-1", "agent": "STEFANIA", "task_type": "document.publish", "data": {}, "result": {"artifact_id": "doc-7"}, "status": "approved"}
    fake_db.agent_tasks.documents[task["id"]] = dict(task)

    result = await instance.execute_approved_task(task)

    assert result["success"] is False
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "blocked"


@pytest.mark.asyncio
async def test_external_effect_capability_is_not_enabled_by_registry_injection(monkeypatch):
    executed = False

    async def external(_payload):
        nonlocal executed
        executed = True
        return {"accepted": True}

    registry = TaskRegistry()
    registry.register(TaskCapability(
        task_type="external.publish", input_version=1, kind=TaskKind.AI,
        executor=external, verifier=lambda *_args: True,
        policy=ExecutionPolicy(requires_approval=False, external_effects=True),
        validate_input=lambda payload: payload,
    ))
    task = {"id": "external-1", "agent": "GAIA", "task_type": "external.publish", "status": "pending", "operational_contract": {"input_version": 1, "payload": {}}}
    fake_db = FakeDB([task])
    monkeypatch.setattr(integrated_services, "db", fake_db)
    instance = integrated_services.BackgroundJobExecutor(task_registry=registry)

    result = await instance.execute_task(task)

    assert result["success"] is False
    assert result["error_code"] == "external_effect_not_enabled"
    assert executed is False
    assert fake_db.agent_tasks.documents[task["id"]]["status"] == "blocked"


@pytest.mark.asyncio
async def test_malformed_or_human_task_is_skipped_without_write(executor):
    instance, fake_db = executor
    malformed = {"agent": "GAIA", "task_type": "add_tag", "data": {}}
    human = {"id": "human-1", "agent": "ANDREA", "task_type": "edit_video", "data": {}, "assigned_to": "Antonella", "status": "pending"}
    fake_db.agent_tasks.documents[human["id"]] = dict(human)

    assert (await instance.execute_task(malformed))["error_code"] == "ineligible_task"
    assert (await instance.execute_task(human))["error_code"] == "ineligible_task"
    assert fake_db.agent_tasks.documents[human["id"]] == human


@pytest.mark.asyncio
async def test_terminal_task_is_not_reopened_and_stale_completed_at_is_removed(executor):
    instance, fake_db = executor
    terminal = {"id": "done-1", "agent": "ANDREA", "task_type": "edit_video", "data": {}, "status": "completed", "completed_at": "old"}
    stale = {"id": "stale-1", "agent": "ANDREA", "task_type": "edit_video", "data": {}, "status": "pending", "completed_at": "old", "direction": "video"}
    fake_db.agent_tasks.documents[terminal["id"]] = dict(terminal)
    fake_db.agent_tasks.documents[stale["id"]] = dict(stale)

    assert (await instance.execute_task(terminal))["error_code"] == "ineligible_task"
    await instance.execute_task(stale)

    assert fake_db.agent_tasks.documents[terminal["id"]] == terminal
    assert fake_db.agent_tasks.documents[stale["id"]]["status"] == "blocked"
    assert "completed_at" not in fake_db.agent_tasks.documents[stale["id"]]


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_field,bad_value", [("status", {"bad": True}), ("task_type", ["edit_video"]), ("id", None)])
async def test_malformed_identity_fields_are_skipped_without_write(executor, bad_field, bad_value):
    instance, _fake_db = executor
    task = {"id": "bad", "agent": "ANDREA", "task_type": "edit_video", "data": {}, "status": "pending"}
    task[bad_field] = bad_value
    assert (await instance.execute_task(task))["error_code"] == "ineligible_task"
