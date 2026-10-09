"""Guardia: la sincronizzazione delle iscrizioni verso il Systeme del partner.

Si prova con un trasporto httpx finto (nessuna rete): il contatto si trova o si crea, il tag si
trova o si crea, e ogni errore diventa un esito `ok: False` senza mai sollevare ne' perdere il
resto. La chiave del partner viene solo dall'ambiente.
"""
import asyncio
import json

import httpx
import pytest

from services import partner_systeme as ps

pytestmark = pytest.mark.unit

KEY = "chiave-di-prova"


def fake_systeme(contacts=None, tags=None, fail=None):
    """Systeme finto. `fail` = {(metodo, percorso): codice} per forzare un errore."""
    state = {"contacts": dict(contacts or {}), "tags": dict(tags or {}), "applied": [], "created": [], "seen_keys": set()}
    fail = fail or {}

    def handler(request: httpx.Request) -> httpx.Response:
        state["seen_keys"].add(request.headers.get("x-api-key"))
        path = request.url.path.replace("/api", "", 1)
        code = fail.get((request.method, path))
        if code:
            return httpx.Response(code, json={"error": "boom"})
        if request.method == "GET" and path == "/contacts":
            email = request.url.params.get("email")
            return httpx.Response(200, json={"items": [{"id": i, "email": e} for e, i in state["contacts"].items() if e == email]})
        if request.method == "POST" and path == "/contacts":
            body = json.loads(request.content)
            new_id = 1000 + len(state["contacts"])
            state["contacts"][body["email"]] = new_id
            state["created"].append(body)
            return httpx.Response(201, json={"id": new_id})
        if request.method == "GET" and path == "/tags":
            q = request.url.params.get("query")
            return httpx.Response(200, json={"items": [{"id": i, "name": n} for n, i in state["tags"].items() if n == q]})
        if request.method == "POST" and path == "/tags":
            body = json.loads(request.content)
            new_id = 500 + len(state["tags"])
            state["tags"][body["name"]] = new_id
            return httpx.Response(201, json={"id": new_id})
        if request.method == "POST" and path.startswith("/contacts/") and path.endswith("/tags"):
            state["applied"].append((int(path.split("/")[2]), json.loads(request.content)["tagId"]))
            return httpx.Response(204)
        return httpx.Response(404)

    return state, httpx.AsyncClient(transport=httpx.MockTransport(handler))


def run(coro):
    return asyncio.run(coro)


def sync(client, email="Giulia@Example.it", name="Giulia Rossi", tag="iscritto_masterclass"):
    async def go():
        async with client:
            return await ps.sync_contact(KEY, email, name, tag, client=client)
    return run(go())


def test_new_contact_and_new_tag_are_created_then_applied():
    state, client = fake_systeme()
    out = sync(client)
    assert out["ok"] is True and out["reason"] == "ok"
    (created,) = state["created"]
    assert created["email"] == "giulia@example.it"
    assert {"slug": "first_name", "value": "Giulia"} in created["fields"]
    assert {"slug": "surname", "value": "Rossi"} in created["fields"]
    assert state["applied"] == [(out["contact_id"], state["tags"]["iscritto_masterclass"])]
    assert state["seen_keys"] == {KEY}  # la chiave viaggia solo nell'intestazione


def test_existing_contact_and_tag_are_reused_not_duplicated():
    state, client = fake_systeme(contacts={"giulia@example.it": 41}, tags={"iscritto_masterclass": 7})
    out = sync(client)
    assert out == {"ok": True, "contact_id": 41, "reason": "ok"}
    assert state["created"] == [] and state["applied"] == [(41, 7)]


def test_tag_that_exists_but_search_misses_is_recovered_after_422():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path.replace("/api", "", 1)
        if request.method == "GET" and path == "/contacts":
            return httpx.Response(200, json={"items": [{"id": 5, "email": "giulia@example.it"}]})
        if request.method == "GET" and path == "/tags":
            calls["n"] += 1  # la prima ricerca non lo vede, la seconda si'
            items = [] if calls["n"] == 1 else [{"id": 9, "name": "iscritto_masterclass"}]
            return httpx.Response(200, json={"items": items})
        if request.method == "POST" and path == "/tags":
            return httpx.Response(422, json={"error": "esiste"})
        if request.method == "POST" and path == "/contacts/5/tags":
            return httpx.Response(204)
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    assert sync(client)["ok"] is True


@pytest.mark.parametrize("fail,reason", [
    ({("POST", "/contacts"): 500}, "create_contact_500"),
    ({("POST", "/contacts/1000/tags"): 403}, "apply_tag_403"),
    ({("POST", "/tags"): 500}, "tag_unavailable"),
])
def test_http_errors_become_an_outcome_never_an_exception(fail, reason):
    _, client = fake_systeme(fail=fail)
    out = sync(client)
    assert out["ok"] is False and out["reason"] == reason


def test_network_error_does_not_raise():
    def handler(request):
        raise httpx.ConnectError("giu'")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    assert sync(client) == {"ok": False, "contact_id": None, "reason": "network_error"}


def test_no_key_or_no_email_does_nothing():
    assert run(ps.sync_contact("", "a@b.it", "A", "t"))["ok"] is False
    assert run(ps.sync_contact(KEY, "", "A", "t"))["ok"] is False


def test_key_comes_only_from_the_environment_and_ids_are_sanitized(monkeypatch):
    monkeypatch.setenv("SYSTEME_API_KEY_PARTNER_23", "  abc  ")
    assert ps.api_key_for("23") == "abc"
    assert ps.api_key_for("99") == ""
    assert ps.api_key_for("../23") == "abc"  # il percorso viene ripulito: resta solo "23"
    assert ps.api_key_for("") == ""


def test_tag_is_always_safe_and_never_empty():
    assert ps.clean_tag("Iscritti Masterclass!") == "iscritti_masterclass"
    assert ps.clean_tag("   ") == ps.DEFAULT_TAG
    assert ps.clean_tag(None) == ps.DEFAULT_TAG
    assert len(ps.clean_tag("a" * 100)) == 40


def test_name_is_split_into_first_and_surname():
    assert ps.split_name("Giulia Rossi") == ("Giulia", "Rossi")
    assert ps.split_name("Maria Anna De Luca") == ("Maria", "Anna De Luca")
    assert ps.split_name("Giulia") == ("Giulia", "")
    assert ps.split_name("") == ("", "")
