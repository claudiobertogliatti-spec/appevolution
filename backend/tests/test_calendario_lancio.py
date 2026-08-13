"""Regressioni locali per l'alias legacy del calendario lancio."""
from __future__ import annotations

from copy import deepcopy

import pytest

from test_editorial_calendar_api import (
    _f14_step,
    _headers,
    _make_workbook_eligible,
    _submit,
    _with_ready_review_resources,
    admin_token,
    client,
    fake_db,
    partner_token,
)

pytestmark = pytest.mark.unit


def test_legacy_generate_endpoint_delegates_to_canonical_version(
    client, partner_token, fake_db
):
    response = client.post(
        "/api/partner-journey/lancio/genera-calendario",
        headers=_headers(partner_token),
        json={
            "partner_id": "p1",
            "start_date": "2026-09-01",
            "live_date": "2026-09-28",
        },
    )

    assert response.status_code == 201
    assert response.json()["version"] == 1
    assert response.headers["Deprecation"] == "true"
    assert response.headers["Sunset"] == "Thu, 31 Dec 2026 23:59:59 GMT"
    assert len(fake_db.partner_launch_calendar_versions.docs) == 1
    assert fake_db.partner_lancio.docs == []


def test_local_e2e_auth_version_edit_submit_review_f14_workbook_and_immutability(
    client, partner_token, admin_token, fake_db
):
    payload = {
        "partner_id": "p1",
        "start_date": "2026-09-01",
        "live_date": "2026-09-28",
    }

    assert client.post(
        "/api/partner-journey/lancio/genera-calendario", json=payload
    ).status_code == 401

    version_one_response = client.post(
        "/api/partner-journey/lancio/genera-calendario",
        headers=_headers(partner_token),
        json=payload,
    )
    assert version_one_response.status_code == 201
    version_one = version_one_response.json()

    edited_one = deepcopy(version_one["calendar"])
    edited_one["days"][0]["theme"] = "Tema della versione uno"
    version_one = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": version_one["checksum"], "calendar": edited_one},
    ).json()
    version_one = _with_ready_review_resources(client, partner_token, version_one)
    submitted_one = _submit(client, partner_token, version_one)
    assert submitted_one.status_code == 200
    assert submitted_one.json()["status"] == "pending_review"

    partner_approval = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(partner_token),
        json={"decision": "approve", "note": "Tentativo partner"},
    )
    assert partner_approval.status_code == 403

    rejected_one = client.post(
        "/api/partner/calendar/p1/versions/1/review",
        headers=_headers(admin_token),
        json={"decision": "reject", "note": "Rendi piu specifico il primo tema"},
    )
    assert rejected_one.status_code == 200
    immutable_one = deepcopy(rejected_one.json())

    version_two_response = client.post(
        "/api/partner-journey/lancio/genera-calendario",
        headers=_headers(partner_token),
        json=payload,
    )
    assert version_two_response.status_code == 201
    version_two = version_two_response.json()
    assert version_two["version"] == 2

    edited_two = deepcopy(version_two["calendar"])
    edited_two["days"][0]["theme"] = "Tema corretto della versione due"
    version_two = client.put(
        "/api/partner/calendar/p1/versions/2/draft",
        headers=_headers(partner_token),
        json={"expected_checksum": version_two["checksum"], "calendar": edited_two},
    ).json()
    version_two = _with_ready_review_resources(client, partner_token, version_two)
    assert _submit(client, partner_token, version_two).status_code == 200

    approved_two = client.post(
        "/api/partner/calendar/p1/versions/2/review",
        headers=_headers(admin_token),
        json={"decision": "approve", "note": "Versione verificata"},
    )
    assert approved_two.status_code == 200
    assert approved_two.json()["status"] == "approved"
    assert _f14_step(fake_db)["status"] == "done"

    fake_db.partner_journey_steps.docs[:] = [
        step
        for step in fake_db.partner_journey_steps.docs
        if not step.get("_test_scaffold")
    ]
    _make_workbook_eligible(fake_db)
    workbook = client.get(
        "/api/partner-rewards/p1/project-book",
        headers=_headers(partner_token),
    )
    assert workbook.status_code == 200
    archived_workbook = fake_db.partner_document_versions.docs[-1]
    assert archived_workbook["provenance"]["calendar_version"] == 2
    assert archived_workbook["provenance"]["calendar_checksum"] == approved_two.json()["checksum"]
    rendered_payload = fake_db.rendered_workbook_payloads[-1]
    rendered_calendar = next(
        section["body"]
        for section in rendered_payload["sections"]
        if section["title"] == "Calendario di Lancio"
    )
    assert "Tema corretto della versione due" in rendered_calendar
    assert "Tema della versione uno" not in rendered_calendar
    assert "BOZZA INVENTATA DOPO APPROVAZIONE" not in rendered_calendar

    rejected_update = client.put(
        "/api/partner/calendar/p1/versions/1/draft",
        headers=_headers(partner_token),
        json={
            "expected_checksum": immutable_one["checksum"],
            "calendar": immutable_one["calendar"],
        },
    )
    assert rejected_update.status_code == 409
    stored_one = client.get(
        "/api/partner/calendar/p1/versions/1",
        headers=_headers(admin_token),
    )
    assert stored_one.status_code == 200
    assert stored_one.json() == immutable_one
    assert [document["version"] for document in fake_db.versions] == [1, 2]
    assert fake_db.partner_lancio.docs == []
