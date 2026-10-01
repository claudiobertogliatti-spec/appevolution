"""Revisione del funnel (F-13): azioni del partner e del team sulle route vere."""
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.funnel_review as route

pytestmark = pytest.mark.unit

URL = "https://sabai-daniele-andolfi.vercel.app"


class FakeFunnel:
    """partner_funnel minimale: find_one + update_one con $set/$push/$setOnInsert su path puntati."""

    def __init__(self, doc=None):
        self.doc = dict(doc) if doc is not None else None

    async def find_one(self, query, projection=None):
        return None if self.doc is None else {k: v for k, v in self.doc.items()}

    async def update_one(self, key, update, upsert=False):
        if self.doc is None:
            if not upsert:
                return SimpleNamespace(matched_count=0)
            self.doc = dict(update.get("$setOnInsert") or {})
        for path, value in (update.get("$set") or {}).items():
            node = self.doc
            parts = path.split(".")
            for p in parts[:-1]:
                node = node.setdefault(p, {})
            node[parts[-1]] = value
        for path, value in (update.get("$push") or {}).items():
            node = self.doc
            parts = path.split(".")
            for p in parts[:-1]:
                node = node.setdefault(p, {})
            node.setdefault(parts[-1], []).append(value)
        return SimpleNamespace(matched_count=1)


class FakePartners:
    async def find_one(self, query, projection=None):
        return {"id": "p1", "name": "Daniele Andolfi", "email": "x@y.it",
                "dati_burocrazia": {"nome": "Daniele", "cognome": "Andolfi", "partita_iva": "01234567890"}}


@pytest.fixture
def env(monkeypatch):
    sent = []

    async def notify(text):
        sent.append(text)

    import routers.partner_journey as pj
    monkeypatch.setattr(pj, "notify_telegram", notify, raising=False)

    def make(doc, role="partner"):
        route.db = SimpleNamespace(partner_funnel=FakeFunnel(doc), partners=FakePartners())

        async def authorize(partner_id, credentials):
            return SimpleNamespace(role=role)

        monkeypatch.setattr(route, "_authorize", authorize)
        return route.db.partner_funnel

    make.sent = sent
    return make


RELEASED = {"partner_id": "p1", "preview_url": URL, "preview_version": 1, "preview_released": True}


@pytest.mark.asyncio
async def test_partner_sees_the_state_and_legal_data(env):
    env(RELEASED)
    out = await route.get_review("p1", object())
    assert out["released"] is True and len(out["pages"]) == 4
    assert out["legal"]["data"]["Partita IVA"] == "01234567890"


@pytest.mark.asyncio
async def test_approve_then_correction_flow_notifies_the_team(env):
    env(RELEASED)
    out = await route.approve("p1", route.ApproveBody(page_id="optin"), object())
    assert {p["id"]: p["state"] for p in out["pages"]}["optin"] == "approvata"

    out = await route.correction("p1", route.CorrectionBody(
        page_id="offerta", wrong="Il prezzo è 297", right="Il prezzo è 247"), object())
    assert {p["id"]: p["state"] for p in out["pages"]}["offerta"] == "in_modifica"
    assert out["corrections_open"] == 1
    assert env.sent and "Il prezzo è 247" in env.sent[0] and "Daniele Andolfi" in env.sent[0]


@pytest.mark.asyncio
async def test_invalid_input_is_a_clear_400_not_a_crash(env):
    env(RELEASED)
    with pytest.raises(HTTPException) as exc:
        await route.correction("p1", route.CorrectionBody(page_id="offerta", wrong="", right="ok ok"), object())
    assert exc.value.status_code == 400 and "Cosa è sbagliato" in exc.value.detail
    with pytest.raises(HTTPException) as exc:
        await route.approve("p1", route.ApproveBody(page_id="inesistente"), object())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_nothing_can_be_approved_before_the_team_releases_the_preview(env):
    env({"partner_id": "p1", "preview_url": URL, "preview_version": 1})
    with pytest.raises(HTTPException) as exc:
        await route.approve("p1", route.ApproveBody(page_id="optin"), object())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_a_partner_cannot_use_the_team_actions(env):
    env(RELEASED, role="partner")
    with pytest.raises(HTTPException) as exc:
        await route.admin_set("p1", route.AdminSetBody(team_ready=True), object())
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        await route.admin_new_version("p1", route.NewVersionBody(version=2, pages=["optin"]), object())
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_team_releases_marks_connections_and_publishes_a_new_version(env):
    funnel = env({"partner_id": "p1"}, role="admin")
    out = await route.admin_set("p1", route.AdminSetBody(
        preview_url=URL, preview_released=True, connections={"dominio": True}), object())
    assert out["released"] is True and {c["id"]: c["done"] for c in out["connections"]}["dominio"] is True
    await route.admin_set("p1", route.AdminSetBody(team_ready=True), object())
    assert funnel.doc["team_ready"] is True

    await route.approve("p1", route.ApproveBody(page_id="optin"), object())
    await route.correction("p1", route.CorrectionBody(page_id="offerta", wrong="dato A", right="dato B"), object())
    out = await route.admin_new_version("p1", route.NewVersionBody(version=2, pages=["offerta"]), object())
    states = {p["id"]: p["state"] for p in out["pages"]}
    assert out["version"] == 2 and states["optin"] == "approvata" and states["offerta"] == "da_controllare"


@pytest.mark.asyncio
async def test_team_cannot_release_a_non_vercel_preview(env):
    env({"partner_id": "p1"}, role="admin")
    with pytest.raises(HTTPException) as exc:
        await route.admin_set("p1", route.AdminSetBody(preview_url="https://evil.example"), object())
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_go_live_is_refused_until_everything_is_approved_then_notifies(env):
    env({**RELEASED, "team_ready": True, "documents_released": True})
    with pytest.raises(HTTPException) as exc:
        await route.golive("p1", object())
    assert exc.value.status_code == 400 and "Controlla le pagine" in exc.value.detail
    for page in ("optin", "masterclass", "offerta", "grazie", "dati_legali", "documenti_legali"):
        await route.approve("p1", route.ApproveBody(page_id=page), object())
    out = await route.golive("p1", object())
    assert out["golive"]["requested"] is True
    assert any("VIA LIBERA" in s for s in env.sent)


@pytest.mark.asyncio
async def test_documents_are_served_only_after_release_and_never_with_blanks(env):
    env(RELEASED)
    with pytest.raises(HTTPException) as exc:
        await route.get_documents("p1", object())
    assert exc.value.status_code == 400 and "non sono ancora pronti" in exc.value.detail

    funnel = env({**RELEASED, "documents_released": True, "documents_released_at": "2026-10-02T10:00:00+00:00"})
    route.db.partners = SimpleNamespace(find_one=lambda *a, **k: _coro({"id": "p1", "name": "Daniele Andolfi"}))
    with pytest.raises(HTTPException) as exc:  # manca il titolo del corso: errore chiaro, niente documenti con vuoti
        await route.get_documents("p1", object())
    assert exc.value.status_code == 400 and "Nome del corso" in exc.value.detail

    route.db.partners = SimpleNamespace(find_one=lambda *a, **k: _coro({"id": "p1", "name": "Daniele Andolfi", "corso_titolo": "Metodo Sabai"}))
    out = await route.get_documents("p1", object())
    assert [d["id"] for d in out["documents"]] == ["privacy", "cookie", "termini"]
    assert "02/10/2026" in out["documents"][0]["html"] and funnel.doc["documents_released"] is True


async def _coro(value):
    return value
