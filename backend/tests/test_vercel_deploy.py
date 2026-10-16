"""Pubblicazione della bozza funnel su Vercel: servizio e route admin (nessuna rete reale)."""
import os
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_database")

import routers.funnel_review as route
from services import vercel_deploy as vd
from services import funnel_review as fr
from tests.test_funnel_review_api import FakeFunnel

pytestmark = pytest.mark.unit

FILES = {"guarda.html": "g", "grazie.html": "z", "index.html": "<h1>ok</h1>", "vendita.html": "<h1>v</h1>", "privacy.html": "p", "cookie.html": "c", "termini.html": "t"}


def test_project_name_is_a_safe_slug():
    n = vd.project_name("p_1/Ä", "Daniele Andolfi àè")
    assert n.startswith("ciak-funnel-") and len(n) <= 52
    assert all(c.isalnum() or c == "-" for c in n) and n == n.lower()


def test_sales_page_becomes_offerta_and_missing_pages_are_reported():
    names = [f["file"] for f in vd.prepare_files(FILES)]
    assert "offerta.html" in names and "vendita.html" not in names
    assert vd.missing_pages(FILES, fr.PAGES) == []


def test_preview_address_only_vercel_app():
    assert vd.preview_address({"alias": ["x.vercel.app"], "url": "x-abc.vercel.app"}, "x") == "https://x.vercel.app"
    assert vd.preview_address({"alias": ["evil.com"], "url": "evil.com"}, "x") == "https://x.vercel.app"


@pytest.mark.asyncio
async def test_deploy_requires_token(monkeypatch):
    monkeypatch.delenv("VERCEL_TOKEN", raising=False)
    with pytest.raises(vd.DeployError, match="VERCEL_TOKEN"):
        await vd.deploy(FILES, "n")


@pytest.mark.asyncio
async def test_deploy_sends_files_and_never_leaks_token(monkeypatch):
    monkeypatch.setenv("VERCEL_TOKEN", "secret-tok")
    monkeypatch.setenv("VERCEL_TEAM_ID", "team_1")
    seen = {}

    def handler(req):
        seen["auth"] = req.headers["authorization"]
        seen["qs"] = dict(req.url.params)
        seen["body"] = req.content.decode()
        return httpx.Response(200, json={"id": "dpl_1", "url": "n-abc.vercel.app", "alias": ["n.vercel.app"], "readyState": "QUEUED"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
        res = await vd.deploy(FILES, "n", client=c)
    assert res["url"] == "https://n.vercel.app" and res["deployment_id"] == "dpl_1"
    assert seen["auth"] == "Bearer secret-tok" and seen["qs"]["teamId"] == "team_1"
    assert '"offerta.html"' in seen["body"] and '"production"' in seen["body"]

    def refuse(req):
        return httpx.Response(403, json={"error": {"message": "forbidden"}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(refuse)) as c:
        with pytest.raises(vd.DeployError) as e:
            await vd.deploy(FILES, "n", client=c)
    assert "secret-tok" not in str(e.value) and "403" in str(e.value)


class Partners:
    async def find_one(self, q, p=None):
        return {"id": "p1", "name": "Daniele Andolfi", "public_optin": {"enabled": True}}


@pytest.fixture
def env(monkeypatch):
    def make(doc, role="admin"):
        route.db = SimpleNamespace(partner_funnel=FakeFunnel(doc), partners=Partners())

        async def authorize(pid, cred):
            return SimpleNamespace(role=role)

        async def build(db, pid):
            return dict(FILES)

        async def fake_deploy(files, name, client=None):
            return {"url": "https://n.vercel.app", "deployment_id": "dpl_9", "state": "QUEUED"}

        monkeypatch.setattr(route, "_authorize", authorize)
        import funnel_factory
        monkeypatch.setattr(funnel_factory, "build_funnel_for_partner", build)
        monkeypatch.setattr(vd, "deploy", fake_deploy)
        return route.db.partner_funnel
    return make


@pytest.mark.asyncio
async def test_publish_first_time_sets_url_and_does_not_release(env):
    f = env(None)
    out = await route.admin_publish_draft("p1", False, None)
    assert out["url"] == "https://n.vercel.app" and out["released"] is False
    assert out["pagine_senza_file"] == []
    assert out["iscrizioni_attive"] is True and out["sync_systeme"] is False
    assert f.doc["preview_url"] == "https://n.vercel.app" and not f.doc.get("preview_released")


@pytest.mark.asyncio
async def test_republish_bumps_version_and_keeps_release_state(env):
    f = env({"partner_id": "p1", "preview_url": "https://old.vercel.app", "preview_version": 1, "preview_released": True,
             "review": {"pages": {}}})
    await route.admin_publish_draft("p1", False, None)
    assert f.doc["preview_version"] == 2 and f.doc["preview_url"] == "https://n.vercel.app"
    assert f.doc["preview_released"] is True


@pytest.mark.asyncio
async def test_partner_cannot_publish(env):
    env(None, role="partner")
    with pytest.raises(HTTPException) as e:
        await route.admin_publish_draft("p1", False, None)
    assert e.value.status_code == 403


APPROVATO = {"partner_id": "p1", "preview_url": "https://old.vercel.app", "preview_version": 1,
             "preview_released": True,
             "review": {"pages": {p["id"]: {"state": "approvata", "approved_version": 1} for p in fr.PAGES}}}


@pytest.mark.asyncio
async def test_publish_refuses_to_wipe_a_partner_who_already_approved(env):
    """Il caso Daniele: 4 pagine approvate. Ripubblicare le azzererebbe → 409, niente scritto."""
    f = env(dict(APPROVATO))
    with pytest.raises(HTTPException) as e:
        await route.admin_publish_draft("p1", False, None)
    assert e.value.status_code == 409 and "prova=true" in e.value.detail
    assert f.doc["preview_url"] == "https://old.vercel.app" and f.doc["preview_version"] == 1
    assert all(v["state"] == "approvata" for v in f.doc["review"]["pages"].values())


@pytest.mark.asyncio
async def test_prova_publishes_to_a_separate_project_and_writes_nothing(env, monkeypatch):
    f = env(dict(APPROVATO))
    seen = {}

    async def spy(files, name, client=None):
        seen["name"] = name
        return {"url": "https://n-prova.vercel.app", "deployment_id": "dpl_p", "state": "QUEUED"}

    monkeypatch.setattr(vd, "deploy", spy)
    before = dict(f.doc)
    out = await route.admin_publish_draft("p1", True, None)
    assert out["prova"] is True and out["url"] == "https://n-prova.vercel.app"
    assert seen["name"].endswith("-prova")
    assert f.doc == before


def test_missing_pages_still_reported_when_a_file_is_absent():
    partial = {k: v for k, v in FILES.items() if k != "grazie.html"}
    assert vd.missing_pages(partial, fr.PAGES) == ["grazie"]
