"""T20 — collaudo integrato: i quattro flussi si incastrano attraverso il motore.

Tutti ``unit``, con provider simulati. Prova che:
- tutte le capacità coesistono in un registry (nessuna collisione di task_type);
- ogni handoff punta a un task_type REALMENTE registrato nel reparto successivo
  (Acquisizione→Vendite→Delivery/Back office): niente consegne a un nome senza esecutore;
- ogni passo completa attraverso `execute_and_verify_registered` con prova;
- il coordinatore produce un briefing (report, non agente esecutivo) sulle code risultanti.
"""

from __future__ import annotations

import pytest

from services.operational_tasks import acquisition, back_office, collaborations, delivery, sales
from services.operational_tasks.completion import execute_and_verify_registered
from services.operational_tasks.coordinator import build_direction_briefing
from services.operational_tasks.registry import TaskRegistry

pytestmark = pytest.mark.unit


def _full_registry():
    r = TaskRegistry()
    for module in (acquisition, sales, delivery, back_office, collaborations):
        module.register(r)
    return r


async def _run(registry, task_type, payload):
    task = {"id": f"t-{task_type}", "task_type": task_type, "operational_contract": {"input_version": 1, "payload": payload}}
    outcome = await execute_and_verify_registered(task, registry)
    assert outcome.completed is True, f"{task_type} non completato: {outcome.result}"
    return outcome.result["artifact"]


def test_all_capabilities_coexist_without_collisions():
    reg = _full_registry()
    got = set(reg.capabilities)
    assert {
        "acquisition.qualify_contact",
        "sales.prepare_next_action",
        "delivery.generate_positioning",
        "delivery.case_study_evidence_check",
        "back_office.check_due_item",
        "collaboration.validate_rules",
    } <= got


async def test_full_chain_acquisition_to_departments():
    reg = _full_registry()

    # 1) Acquisizione: contatto caldo → handoff a Vendite
    acq = await _run(reg, "acquisition.qualify_contact", {"contact": {
        "email": "mario@studio.it", "source": "masterclass_landing", "tags": ["ciak_optin_masterclass"]}})
    assert acq["qualified"] is True
    handoff = acq["next_step"]
    assert handoff["to_department"] == "vendite"
    # l'handoff punta a un task_type REALMENTE registrato
    assert handoff["task_type"] in reg.capabilities
    identity = handoff["entity_ref"]["id"]

    # 2) Vendite: opportunità vinta → chiusura con handoff a Delivery + Back office
    sales_art = await _run(reg, "sales.prepare_next_action", {"opportunity": {
        "identity": identity, "blueprint_paid": True, "analysis_delivered": True,
        "call_done": True, "offer_decision": "partnership"}})
    assert sales_art["stage"] == "won"
    handoffs = {h["to_department"]: h for h in sales_art["next_step"]["handoffs"]}
    assert set(handoffs) == {"delivery", "back_office"}
    # entrambi gli handoff puntano a capacità registrate del reparto giusto
    assert handoffs["delivery"]["task_type"] in reg.capabilities
    assert handoffs["back_office"]["task_type"] in reg.capabilities

    # 3) Delivery: il task di posizionamento gira e produce un artefatto versionato
    deliv = await _run(reg, handoffs["delivery"]["task_type"], {"deliverable": {
        "partner_id": identity, "content_ref": "draft-1", "prerequisites": {"required": ["brand"], "present": ["brand"]}}})
    assert deliv["status"] == "ready_for_review" and deliv["version"]

    # 4) Back office: la scadenza collegata viene classificata
    bo = await _run(reg, handoffs["back_office"]["task_type"], {"due_item": {
        "partner_id": identity, "tipo": "rate_concordate", "rate_totali": 5, "rate_pagate": 0,
        "importo_rata": 240.0, "prossima_scadenza": "2026-10-15"}})
    assert bo["status"] in ("atteso", "sospeso")

    # 5) Coordinatore: briefing sulle code risultanti (report, non agente esecutivo)
    briefing = build_direction_briefing({
        "vendite": [{"id": "v1", "status": "completed", "evidence_refs": [sales_art["next_action_ref"]]}],
        "delivery": [{"id": "d1", "status": "awaiting_approval"}],
        "back_office": [{"id": "b1", "status": "blocked", "error_code": "importo_mancante",
                          "next_action": {"owner_id": "back_office"}}],
    })
    assert briefing["is_executive_agent"] is False
    assert briefing["reparti"]["vendite"]["verificati"] == 1
    assert briefing["reparti"]["delivery"]["decisioni_attese"] == 1
    assert briefing["reparti"]["back_office"]["bloccati"][0]["owner_id"] == "back_office"


async def test_chain_is_idempotent_on_rerun():
    reg = _full_registry()
    contact = {"contact": {"email": "x@y.it", "source": "manual", "tags": ["ciak_optin_masterclass"]}}
    a = await _run(reg, "acquisition.qualify_contact", contact)
    b = await _run(reg, "acquisition.qualify_contact", {"contact": dict(contact["contact"])})
    # stessa qualificazione → stesso handoff idempotente: nessun doppio ingresso in Vendite
    assert a["next_step"]["idempotency_key"] == b["next_step"]["idempotency_key"]
