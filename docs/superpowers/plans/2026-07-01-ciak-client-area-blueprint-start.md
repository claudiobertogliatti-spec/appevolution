# Ciak Client Area Blueprint Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Area Cliente Ciak for Blueprint and Ciak Start customers, with one account, magic login, Start activation, guaranteed 499 euro upgrade credit, and a clean path to the full Partnership.

**Architecture:** Keep `diagnostic_sessions` as the Blueprint source and `ciak_analisi` as the analysis/call-artifact source. Add a focused client service/router for account/access state, magic links, Start progress, and pricing decisions, then add a separate React client shell under `/cliente/*`. Preserve legacy technical state names such as `purchased_67` while showing Blueprint 27 euro copy.

**Tech Stack:** FastAPI, Motor/MongoDB, Pydantic, Stripe checkout via existing project payment pattern, React 19, react-router-dom 7, Tailwind utility classes, lucide-react.

## Global Constraints

- Blueprint price is 27 euro.
- Ciak Start price is 499 euro.
- Partnership price is 2,790 euro.
- Start-to-Partnership upgrade price is 2,291 euro.
- Ciak Start customers are clients, not partners.
- The 499 euro Start credit is always guaranteed.
- Use one account across `cliente_blueprint`, `cliente_start`, and `partner`.
- Do not email passwords in clear text.
- Do not expose Claudio's internal call script to the client.
- Do not rename historical technical states such as `purchased_67` without a full migration audit.
- Partner area stays unavailable until Partnership activation.
- Keep visible copy in Italian, simple, reassuring, and professional.

---

## File Structure

Backend:

- Create `backend/services/ciak_client_accounts.py`: client account state, access levels, offer routing, magic login token creation/verification, Start progress defaults, pricing helpers.
- Create `backend/routers/ciak_clients.py`: public and authenticated client endpoints under `/api/ciak/client`.
- Modify `backend/routers/stripe_webhook.py`: after Blueprint payment, create client access and send magic login link.
- Modify `backend/routers/booking.py`: continue call state updates and sync client record when booking/call events arrive.
- Modify `backend/server.py`: register the new client router and inject `db`.
- Add `backend/tests/test_ciak_client_accounts.py`: service-level tests for access, routing, credit, and magic links.
- Add `backend/tests/test_ciak_clients_router.py`: API tests for dashboard payload and guarded access.

Frontend:

- Create `frontend/src/ciak/client/api.js`: client auth storage and fetch helpers.
- Create `frontend/src/ciak/client/CiakClientApp.jsx`: login/setup shell and protected client routes.
- Create `frontend/src/ciak/client/ClientLayout.jsx`: top bar, mobile-friendly layout, navigation.
- Create `frontend/src/ciak/client/pages/ClientHome.jsx`: next action dashboard.
- Create `frontend/src/ciak/client/pages/BlueprintPage.jsx`: score, analysis, roadmap, call status.
- Create `frontend/src/ciak/client/pages/StartPage.jsx`: Start proposal/active checklist and deliverables.
- Create `frontend/src/ciak/client/pages/PartnershipEducationPage.jsx`: short educational path and pricing/credit block.
- Modify `frontend/src/ciak/CiakApp.jsx`: mount `/cliente/*` before catch-all.
- Add focused component tests if the repo has an established frontend test harness; otherwise use build plus browser QA.

Docs:

- Modify `docs/ciak-evolution-operating-memory.md`: record Area Cliente, access levels, Start credit, and routing.

---

### Task 1: Client Account Service

**Files:**
- Create: `backend/services/ciak_client_accounts.py`
- Test: `backend/tests/test_ciak_client_accounts.py`

**Interfaces:**
- Consumes: Mongo collections `diagnostic_sessions`, `ciak_analisi`, `ciak_clients`
- Produces:
  - `offer_for_score(score: int | float | None) -> str`
  - `partnership_price_for_client(client: dict) -> dict`
  - `default_start_progress() -> list[dict]`
  - `ensure_client_for_blueprint(db, session: dict) -> dict`
  - `create_magic_login_token(db, client_id: str, email: str) -> dict`
  - `verify_magic_login_token(db, token: str) -> dict`

- [ ] **Step 1: Write service tests for routing and credit**

Create `backend/tests/test_ciak_client_accounts.py` with:

```python
import pytest

from services.ciak_client_accounts import (
    default_start_progress,
    offer_for_score,
    partnership_price_for_client,
)


def test_offer_for_score_routes_below_50_to_start():
    assert offer_for_score(49) == "ciak_start"
    assert offer_for_score(0) == "ciak_start"


def test_offer_for_score_routes_50_and_above_to_partnership():
    assert offer_for_score(50) == "partnership"
    assert offer_for_score(87) == "partnership"


def test_partnership_price_applies_guaranteed_start_credit():
    client = {"access_level": "cliente_start", "start_credit_amount": 49900}
    price = partnership_price_for_client(client)
    assert price == {
        "full_amount_cents": 279000,
        "credit_amount_cents": 49900,
        "due_amount_cents": 229100,
        "currency": "eur",
    }


def test_partnership_price_without_start_is_full_price():
    price = partnership_price_for_client({"access_level": "cliente_blueprint"})
    assert price["due_amount_cents"] == 279000
    assert price["credit_amount_cents"] == 0


def test_default_start_progress_has_expected_services():
    labels = [item["label"] for item in default_start_progress()]
    assert labels == [
        "Direzione di posizionamento",
        "Basi del brand",
        "Sistemazione profili social",
        "Sito vetrina semplice",
        "Strategia contenuti",
        "Calendario contenuti",
        "Revisione finale e readiness partnership",
    ]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -m pytest backend/tests/test_ciak_client_accounts.py -q`

Expected: FAIL with `ModuleNotFoundError: No module named 'services.ciak_client_accounts'`.

- [ ] **Step 3: Implement constants and pure helpers**

Create `backend/services/ciak_client_accounts.py`:

```python
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4


BLUEPRINT_AMOUNT_CENTS = 2700
START_AMOUNT_CENTS = 49900
PARTNERSHIP_AMOUNT_CENTS = 279000
ACCESS_BLUEPRINT = "cliente_blueprint"
ACCESS_START = "cliente_start"
ACCESS_PARTNER = "partner"
OFFER_START = "ciak_start"
OFFER_PARTNERSHIP = "partnership"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def offer_for_score(score: int | float | None) -> str:
    try:
        value = float(score)
    except (TypeError, ValueError):
        value = 0
    return OFFER_START if value < 50 else OFFER_PARTNERSHIP


def partnership_price_for_client(client: dict[str, Any]) -> dict[str, Any]:
    has_start_credit = (
        client.get("access_level") == ACCESS_START
        or client.get("start_purchased_at")
        or client.get("start_credit_amount")
    )
    credit = START_AMOUNT_CENTS if has_start_credit else 0
    credit = int(client.get("start_credit_amount") or credit)
    credit = max(0, min(credit, PARTNERSHIP_AMOUNT_CENTS))
    return {
        "full_amount_cents": PARTNERSHIP_AMOUNT_CENTS,
        "credit_amount_cents": credit,
        "due_amount_cents": PARTNERSHIP_AMOUNT_CENTS - credit,
        "currency": "eur",
    }


def default_start_progress() -> list[dict[str, Any]]:
    labels = [
        "Direzione di posizionamento",
        "Basi del brand",
        "Sistemazione profili social",
        "Sito vetrina semplice",
        "Strategia contenuti",
        "Calendario contenuti",
        "Revisione finale e readiness partnership",
    ]
    return [
        {"id": f"start_{idx + 1}", "label": label, "status": "locked" if idx else "todo"}
        for idx, label in enumerate(labels)
    ]
```

- [ ] **Step 4: Add async account and token helpers**

Append to `backend/services/ciak_client_accounts.py`:

```python
def _score_from_session(session: dict[str, Any]) -> int:
    scoring = session.get("scoring") or {}
    for key in ("score_percentuale", "score_numerico", "score_total"):
        if scoring.get(key) is not None:
            try:
                raw = float(scoring[key])
                return int(raw if raw > 13 else round(raw / 13 * 100))
            except (TypeError, ValueError):
                pass
    return 0


async def ensure_client_for_blueprint(db, session: dict[str, Any]) -> dict[str, Any]:
    email = (session.get("user_email") or "").strip().lower()
    if not email:
        raise ValueError("sessione senza email")
    score = _score_from_session(session)
    existing = await db.ciak_clients.find_one({"email": email})
    base_update = {
        "email": email,
        "name": session.get("user_name"),
        "session_token": session.get("session_token"),
        "diagnostic_session_token": session.get("session_token"),
        "blueprint_score": score,
        "recommended_offer": offer_for_score(score),
        "blueprint_amount_cents": BLUEPRINT_AMOUNT_CENTS,
        "updated_at": _now_iso(),
    }
    if existing:
        await db.ciak_clients.update_one({"id": existing["id"]}, {"$set": base_update})
        updated = await db.ciak_clients.find_one({"id": existing["id"]}, {"_id": 0})
        return updated
    doc = {
        "id": str(uuid4()),
        **base_update,
        "access_level": ACCESS_BLUEPRINT,
        "created_at": _now_iso(),
        "start_credit_amount": 0,
        "start_progress": [],
        "events": [{"event": "client_created_from_blueprint", "timestamp": _now_iso()}],
    }
    await db.ciak_clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def create_magic_login_token(db, client_id: str, email: str) -> dict[str, str]:
    token = secrets.token_urlsafe(32)
    doc = {
        "id": str(uuid4()),
        "client_id": client_id,
        "email": email.strip().lower(),
        "token_hash": _token_hash(token),
        "used_at": None,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
        "created_at": _now_iso(),
    }
    await db.ciak_client_login_tokens.insert_one(doc)
    return {"token": token, "expires_at": doc["expires_at"]}


async def verify_magic_login_token(db, token: str) -> dict[str, Any]:
    doc = await db.ciak_client_login_tokens.find_one({"token_hash": _token_hash(token)})
    if not doc or doc.get("used_at"):
        raise ValueError("token non valido")
    expires_at = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise ValueError("token scaduto")
    await db.ciak_client_login_tokens.update_one(
        {"id": doc["id"]},
        {"$set": {"used_at": _now_iso()}},
    )
    client = await db.ciak_clients.find_one({"id": doc["client_id"]}, {"_id": 0})
    if not client:
        raise ValueError("cliente non trovato")
    return client
```

- [ ] **Step 5: Run service tests**

Run: `py -m pytest backend/tests/test_ciak_client_accounts.py -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/services/ciak_client_accounts.py backend/tests/test_ciak_client_accounts.py
git commit -m "feat: add ciak client account service"
```

---

### Task 2: Client API Router And Auth Token

**Files:**
- Create: `backend/routers/ciak_clients.py`
- Modify: `backend/server.py`
- Test: `backend/tests/test_ciak_clients_router.py`

**Interfaces:**
- Consumes:
  - `verify_magic_login_token(db, token: str) -> dict`
  - `partnership_price_for_client(client: dict) -> dict`
- Produces:
  - `POST /api/ciak/client/auth/magic-login`
  - `GET /api/ciak/client/me`
  - `GET /api/ciak/client/dashboard`

- [ ] **Step 1: Write router tests for login and dashboard shape**

Create `backend/tests/test_ciak_clients_router.py` with:

```python
import pytest

from routers import ciak_clients


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return {k: v for k, v in doc.items() if k != "_id"}
        return None

    async def update_one(self, query, update, upsert=False):
        return type("Result", (), {"matched_count": 1, "modified_count": 1})()

    async def insert_one(self, doc):
        self.docs.append(doc)
        return type("Result", (), {"inserted_id": doc.get("id")})()


class FakeDb:
    def __init__(self):
        self.ciak_clients = FakeCollection([{
            "id": "client-1",
            "email": "a@example.com",
            "access_level": "cliente_start",
            "session_token": "token-1",
            "blueprint_score": 42,
            "recommended_offer": "ciak_start",
            "start_credit_amount": 49900,
        }])
        self.ciak_analisi = FakeCollection([{
            "session_token": "token-1",
            "stato": "inviata",
            "analisi_definitiva": {"titolo": "Analisi", "roadmap": []},
        }])
        self.diagnostic_sessions = FakeCollection([{
            "session_token": "token-1",
            "current_state": "call_done",
        }])


@pytest.mark.asyncio
async def test_dashboard_payload_contains_credit_and_analysis(monkeypatch):
    ciak_clients.set_db(FakeDb())
    client = await ciak_clients._dashboard_for_client({
        "id": "client-1",
        "email": "a@example.com",
        "access_level": "cliente_start",
        "session_token": "token-1",
        "blueprint_score": 42,
        "recommended_offer": "ciak_start",
        "start_credit_amount": 49900,
    })
    assert client["client"]["access_level"] == "cliente_start"
    assert client["pricing"]["partnership"]["due_amount_cents"] == 229100
    assert client["analysis"]["status"] == "inviata"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `py -m pytest backend/tests/test_ciak_clients_router.py -q`

Expected: FAIL with import error for `routers.ciak_clients`.

- [ ] **Step 3: Implement router auth and dashboard**

Create `backend/routers/ciak_clients.py`:

```python
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from pydantic import BaseModel

from services.ciak_client_accounts import partnership_price_for_client, verify_magic_login_token


router = APIRouter(prefix="/api/ciak/client", tags=["ciak-client"])
security = HTTPBearer(auto_error=False)
db = None


CLIENT_JWT_SECRET = "ciak-client-local-secret"
CLIENT_JWT_ALG = "HS256"


def set_db(database) -> None:
    global db
    db = database


class MagicLoginRequest(BaseModel):
    token: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _create_client_jwt(client: dict[str, Any]) -> str:
    import os
    secret = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY") or CLIENT_JWT_SECRET
    payload = {
        "sub": client["id"],
        "email": client["email"],
        "role": "ciak_client",
        "access_level": client.get("access_level", "cliente_blueprint"),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, secret, algorithm=CLIENT_JWT_ALG)


async def require_client(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict[str, Any]:
    if db is None:
        raise HTTPException(503, "Database non configurato")
    if not credentials:
        raise HTTPException(401, "Token non fornito")
    import os
    secret = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY") or CLIENT_JWT_SECRET
    try:
        data = jwt.decode(credentials.credentials, secret, algorithms=[CLIENT_JWT_ALG])
    except Exception:
        raise HTTPException(401, "Token non valido")
    if data.get("role") != "ciak_client":
        raise HTTPException(403, "Accesso cliente richiesto")
    client = await db.ciak_clients.find_one({"id": data.get("sub")}, {"_id": 0})
    if not client:
        raise HTTPException(404, "Cliente non trovato")
    return client


@router.post("/auth/magic-login")
async def magic_login(body: MagicLoginRequest):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    try:
        client = await verify_magic_login_token(db, body.token)
    except ValueError as exc:
        raise HTTPException(401, str(exc))
    return {"token": _create_client_jwt(client), "client": client}


@router.get("/me")
async def me(client=Depends(require_client)):
    return {"client": client}


async def _dashboard_for_client(client: dict[str, Any]) -> dict[str, Any]:
    token = client.get("session_token") or client.get("diagnostic_session_token")
    analysis = await db.ciak_analisi.find_one({"session_token": token}, {"_id": 0}) if token else None
    session = await db.diagnostic_sessions.find_one({"session_token": token}, {"_id": 0}) if token else None
    return {
        "client": client,
        "diagnostic": {
            "state": (session or {}).get("current_state"),
            "score": client.get("blueprint_score"),
            "recommended_offer": client.get("recommended_offer"),
            "offer_decision": client.get("offer_decision"),
        },
        "analysis": {
            "status": (analysis or {}).get("stato") or "non_generata",
            "title": ((analysis or {}).get("analisi_definitiva") or {}).get("titolo"),
            "roadmap": ((analysis or {}).get("analisi_definitiva") or {}).get("roadmap", []),
        },
        "start": {
            "progress": client.get("start_progress") or [],
            "credit_amount_cents": client.get("start_credit_amount") or 0,
        },
        "pricing": {"partnership": partnership_price_for_client(client)},
        "generated_at": _now_iso(),
    }


@router.get("/dashboard")
async def dashboard(client=Depends(require_client)):
    return await _dashboard_for_client(client)
```

- [ ] **Step 4: Register router in server**

Modify `backend/server.py` near other Ciak routers:

```python
from routers.ciak_clients import router as ciak_clients_router, set_db as set_ciak_clients_db
set_ciak_clients_db(db)
app.include_router(ciak_clients_router)
```

- [ ] **Step 5: Run router tests**

Run: `py -m pytest backend/tests/test_ciak_clients_router.py -q`

Expected: PASS.

- [ ] **Step 6: Compile backend**

Run: `py -m py_compile backend/routers/ciak_clients.py backend/services/ciak_client_accounts.py backend/server.py`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/ciak_clients.py backend/server.py backend/tests/test_ciak_clients_router.py
git commit -m "feat: add ciak client api"
```

---

### Task 3: Blueprint Payment Creates Client Access

**Files:**
- Modify: `backend/routers/stripe_webhook.py`
- Modify: `backend/services/ciak_analisi.py`
- Test: `backend/tests/test_ciak_client_accounts.py`

**Interfaces:**
- Consumes: `ensure_client_for_blueprint(db, session)`
- Produces: client creation after Blueprint payment and call deck outline in `ciak_analisi`

- [ ] **Step 1: Add test for `ensure_client_for_blueprint`**

Append to `backend/tests/test_ciak_client_accounts.py`:

```python
class MemoryCollection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc.copy()
        return None

    async def insert_one(self, doc):
        self.docs.append(doc.copy())

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update.get("$set", {}))
                return


class MemoryDb:
    def __init__(self):
        self.ciak_clients = MemoryCollection()


@pytest.mark.asyncio
async def test_ensure_client_for_blueprint_creates_access_from_session():
    from services.ciak_client_accounts import ensure_client_for_blueprint
    db = MemoryDb()
    client = await ensure_client_for_blueprint(db, {
        "session_token": "session-1",
        "user_email": "USER@EXAMPLE.COM",
        "user_name": "User Demo",
        "scoring": {"score_percentuale": 48},
    })
    assert client["email"] == "user@example.com"
    assert client["access_level"] == "cliente_blueprint"
    assert client["recommended_offer"] == "ciak_start"
```

- [ ] **Step 2: Run test**

Run: `py -m pytest backend/tests/test_ciak_client_accounts.py -q`

Expected: PASS after Task 1 helpers exist.

- [ ] **Step 3: Add call slide/deck outline generation to analysis service**

Modify `backend/services/ciak_analisi.py`:

Add schema:

```python
_SCHEMA_CALL_DECK = {
    "type": "object",
    "properties": {
        "slides": {"type": "array", "items": {"type": "object", "properties": {
            "titolo": {"type": "string"},
            "punti": {"type": "array", "items": {"type": "string"}},
            "nota_claudio": {"type": "string"},
        }}},
    },
    "required": ["slides"],
}
```

Add function:

```python
async def genera_call_deck(analisi_definitiva: dict, script_call: dict) -> dict:
    prompt = (
        "Sei il sales enablement assistant di Claudio. Crea una scaletta slide "
        "per una videocall consulenziale Ciak. Non scrivere copy aggressivo. "
        "Ogni slide deve aiutare Claudio a spiegare diagnosi, roadmap e prossimo passo."
    )
    user_message = (
        "ANALISI:\n"
        f"{json.dumps(analisi_definitiva, ensure_ascii=False)}\n\n"
        "SCRIPT CALL:\n"
        f"{json.dumps(script_call, ensure_ascii=False)}"
    )
    return _call_claude_structured(prompt, user_message, _SCHEMA_CALL_DECK, "call_deck", max_tokens=3000)
```

Inside `genera_e_salva`, after `script = await genera_script_call(...)`, add:

```python
    call_deck = await genera_call_deck(definitiva, script)
```

And include in `doc`:

```python
        "call_deck": call_deck,
```

- [ ] **Step 4: Hook client creation in Blueprint payment webhook**

In `backend/routers/stripe_webhook.py`, add this helper near `process_analisi_payment`:

```python
async def _find_latest_diagnostic_for_user(db, user: dict) -> dict | None:
    email = (user.get("email") or "").strip().lower()
    if not email:
        return None
    docs = await db.diagnostic_sessions.find(
        {"user_email": email},
        {"_id": 0},
    ).sort("created_at", -1).limit(1).to_list(length=1)
    return docs[0] if docs else None
```

Then inside `process_analisi_payment`, immediately after the `payments.update_one(...)` block and before the Systeme.io sync, add:

```python
    try:
        from services.ciak_client_accounts import (
            create_magic_login_token,
            ensure_client_for_blueprint,
        )
        diagnostic = await _find_latest_diagnostic_for_user(db, user)
        if diagnostic:
            client = await ensure_client_for_blueprint(db, diagnostic)
            login = await create_magic_login_token(db, client["id"], client["email"])
            base_url = os.environ.get("CIAK_BASE_URL", os.environ.get("FRONTEND_URL", "https://ciak.io"))
            magic_link = f"{base_url}/cliente/accesso?token={login['token']}"
            await db.ciak_clients.update_one(
                {"id": client["id"]},
                {"$set": {"last_magic_link_created_at": datetime.now(timezone.utc).isoformat()}},
            )
            logger.info("[CIAK_CLIENT] Magic login created for %s: %s", client["email"], magic_link)
        else:
            logger.warning("[CIAK_CLIENT] no diagnostic session found for paid user %s", user_id)
    except Exception as e:
        logger.error("[CIAK_CLIENT] client access creation failed for %s: %s", user_id, e)
```

- [ ] **Step 5: Compile touched backend**

Run: `py -m py_compile backend/routers/stripe_webhook.py backend/services/ciak_analisi.py backend/services/ciak_client_accounts.py`

Expected: exit 0.

- [ ] **Step 6: Run focused tests**

Run: `py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_analisi.py -q`

Expected: PASS. If `test_ciak_analisi.py` uses mocked structured outputs, update the mock to include `call_deck` with `{"slides": []}`.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/stripe_webhook.py backend/services/ciak_analisi.py backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_analisi.py
git commit -m "feat: create ciak client access after blueprint"
```

---

### Task 4: Start Offer, Payment, And Guaranteed Credit

**Files:**
- Modify: `backend/services/ciak_client_accounts.py`
- Modify: `backend/routers/ciak_clients.py`
- Test: `backend/tests/test_ciak_client_accounts.py`

**Interfaces:**
- Produces:
  - `POST /api/ciak/client/admin/offer-decision`
  - `POST /api/ciak/client/start/checkout`
  - `POST /api/ciak/client/start/activate`
  - `POST /api/ciak/client/partnership/checkout`

- [ ] **Step 1: Add service tests for Start activation**

Append to `backend/tests/test_ciak_client_accounts.py`:

```python
def test_start_credit_amount_constant_is_499_euro():
    from services.ciak_client_accounts import START_AMOUNT_CENTS
    assert START_AMOUNT_CENTS == 49900
```

- [ ] **Step 2: Add admin and checkout models**

In `backend/routers/ciak_clients.py`, add:

```python
class OfferDecisionRequest(BaseModel):
    client_id: str
    offer_decision: str
    admin_email: str | None = None


class ClientIdRequest(BaseModel):
    client_id: str
```

- [ ] **Step 3: Add admin offer decision endpoint**

In `backend/routers/ciak_clients.py`, add:

```python
@router.post("/admin/offer-decision")
async def offer_decision(body: OfferDecisionRequest):
    if body.offer_decision not in ("ciak_start", "partnership"):
        raise HTTPException(400, "offerta non valida")
    res = await db.ciak_clients.update_one(
        {"id": body.client_id},
        {"$set": {
            "offer_decision": body.offer_decision,
            "offer_decided_by": body.admin_email or "admin",
            "offer_decided_at": _now_iso(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Cliente non trovato")
    return {"success": True}
```

- [ ] **Step 4: Add Start activation endpoint**

In `backend/routers/ciak_clients.py`, add:

```python
from services.ciak_client_accounts import ACCESS_START, START_AMOUNT_CENTS, default_start_progress


@router.post("/start/activate")
async def activate_start(body: ClientIdRequest):
    res = await db.ciak_clients.update_one(
        {"id": body.client_id},
        {"$set": {
            "access_level": ACCESS_START,
            "start_purchased_at": _now_iso(),
            "start_credit_amount": START_AMOUNT_CENTS,
            "start_progress": default_start_progress(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Cliente non trovato")
    return {"success": True, "start_credit_amount": START_AMOUNT_CENTS}
```

- [ ] **Step 5: Add checkout endpoint stubs using existing Stripe pattern**

In `backend/routers/ciak_clients.py`, add endpoints that create Stripe sessions. Use `STRIPE_API_KEY`, `FRONTEND_URL`, and `emergentintegrations.payments.stripe.checkout` exactly like `backend/routers/partnership.py`.

Start checkout shape:

```python
@router.post("/start/checkout")
async def start_checkout(client=Depends(require_client)):
    # amount: 499.00, metadata tipo=ciak_start, client_id, email
```

Partnership upgrade checkout shape:

```python
@router.post("/partnership/checkout")
async def partnership_checkout(client=Depends(require_client)):
    # amount: partnership_price_for_client(client)["due_amount_cents"] / 100
    # metadata includes full_amount_cents, credit_amount_cents, due_amount_cents
```

Return:

```python
{
    "success": True,
    "checkout_url": session.url,
    "amount_cents": amount_cents,
    "credit_amount_cents": credit_amount_cents,
}
```

- [ ] **Step 6: Run tests and compile**

Run:

```bash
py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py -q
py -m py_compile backend/routers/ciak_clients.py backend/services/ciak_client_accounts.py
```

Expected: all pass, compile exit 0.

- [ ] **Step 7: Commit**

```bash
git add backend/services/ciak_client_accounts.py backend/routers/ciak_clients.py backend/tests/test_ciak_client_accounts.py
git commit -m "feat: add ciak start activation and credit"
```

---

### Task 5: Client Area Frontend Shell

**Files:**
- Create: `frontend/src/ciak/client/api.js`
- Create: `frontend/src/ciak/client/CiakClientApp.jsx`
- Create: `frontend/src/ciak/client/ClientLayout.jsx`
- Modify: `frontend/src/ciak/CiakApp.jsx`

**Interfaces:**
- Consumes:
  - `POST /api/ciak/client/auth/magic-login`
  - `GET /api/ciak/client/dashboard`
- Produces:
  - `/cliente/accesso?token=...`
  - `/cliente`
  - `/cliente/blueprint`
  - `/cliente/start`
  - `/cliente/partnership`

- [ ] **Step 1: Create API helper**

Create `frontend/src/ciak/client/api.js`:

```javascript
const TOKEN_KEY = "ciak_client_token";
const CLIENT_KEY = "ciak_client_user";

export function getClientToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getClientUser() {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_KEY) || "null");
  } catch {
    return null;
  }
}

export function setClientSession(token, client) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export function clearClientSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

export async function magicLogin(token) {
  const res = await fetch("/api/ciak/client/auth/magic-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Link non valido o scaduto");
  const data = await res.json();
  setClientSession(data.token, data.client);
  return data.client;
}

export async function clientGet(path) {
  const res = await fetch(`/api/ciak/client${path}`, {
    headers: { Authorization: `Bearer ${getClientToken()}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearClientSession();
    throw new Error("AUTH_EXPIRED");
  }
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Create layout**

Create `frontend/src/ciak/client/ClientLayout.jsx`:

```javascript
import { NavLink } from "react-router-dom";
import { BookOpen, Home, LogOut, PlayCircle, Sparkles } from "lucide-react";
import { clearClientSession } from "./api";

const nav = [
  { to: "/cliente", end: true, label: "Home", icon: Home },
  { to: "/cliente/blueprint", label: "Blueprint", icon: BookOpen },
  { to: "/cliente/start", label: "Ciak Start", icon: Sparkles },
  { to: "/cliente/partnership", label: "Partnership", icon: PlayCircle },
];

function navClass({ isActive }) {
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
    isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50"
  }`;
}

export function ClientLayout({ client, children }) {
  const logout = () => {
    clearClientSession();
    window.location.href = "/cliente";
  };
  return (
    <div className="min-h-screen bg-gray-50 font-[Poppins,system-ui,sans-serif]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <img src="/ciak/logo.webp" alt="Ciak.io" className="h-8 w-auto" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">Il tuo percorso Ciak</p>
            <p className="truncate text-sm font-semibold text-slate-900">{client?.name || client?.email || "Cliente Ciak"}</p>
          </div>
          <button onClick={logout} aria-label="Esci" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create client app with magic login route**

Create `frontend/src/ciak/client/CiakClientApp.jsx`:

```javascript
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";
import { clientGet, getClientToken, getClientUser, magicLogin } from "./api";
import { ClientHome } from "./pages/ClientHome";
import { BlueprintPage } from "./pages/BlueprintPage";
import { StartPage } from "./pages/StartPage";
import { PartnershipEducationPage } from "./pages/PartnershipEducationPage";

function AccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Link mancante");
      return;
    }
    magicLogin(token)
      .then(() => navigate("/cliente", { replace: true }))
      .catch((e) => setError(e.message));
  }, [params, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center">
      <div>
        <img src="/ciak/logo.webp" alt="Ciak.io" className="mx-auto mb-6 h-10" />
        <h1 className="text-2xl font-semibold text-slate-900">Accesso al percorso Ciak</h1>
        <p className="mt-2 text-sm text-slate-500">{error || "Sto preparando la tua area..."}</p>
      </div>
    </div>
  );
}

function ProtectedClient() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    clientGet("/dashboard").then(setDashboard).catch((e) => setError(e.message));
  }, []);
  if (!getClientToken()) return <Navigate to="/cliente/accesso" replace />;
  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!dashboard) return <div className="p-8 text-slate-400">Caricamento percorso...</div>;
  return (
    <ClientLayout client={dashboard.client || getClientUser()}>
      <Routes>
        <Route index element={<ClientHome dashboard={dashboard} />} />
        <Route path="blueprint" element={<BlueprintPage dashboard={dashboard} />} />
        <Route path="start" element={<StartPage dashboard={dashboard} />} />
        <Route path="partnership" element={<PartnershipEducationPage dashboard={dashboard} />} />
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </ClientLayout>
  );
}

export default function CiakClientApp() {
  return (
    <Routes>
      <Route path="accesso" element={<AccessPage />} />
      <Route path="*" element={<ProtectedClient />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Mount route**

Modify `frontend/src/ciak/CiakApp.jsx`:

```javascript
import CiakClientApp from "./client/CiakClientApp";
```

Add before `/partner/*`:

```javascript
<Route path="/cliente/*" element={<CiakClientApp />} />
```

- [ ] **Step 5: Run build**

Run: `npm run build` from `frontend`.

Expected: build exits 0. Existing ESLint dependency warnings may remain.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/ciak/client frontend/src/ciak/CiakApp.jsx
git commit -m "feat: add ciak client area shell"
```

---

### Task 6: Client Area Pages

**Files:**
- Create: `frontend/src/ciak/client/pages/ClientHome.jsx`
- Create: `frontend/src/ciak/client/pages/BlueprintPage.jsx`
- Create: `frontend/src/ciak/client/pages/StartPage.jsx`
- Create: `frontend/src/ciak/client/pages/PartnershipEducationPage.jsx`

**Interfaces:**
- Consumes: dashboard payload from `GET /api/ciak/client/dashboard`
- Produces: user-facing Blueprint, Start, and Partnership education states

- [ ] **Step 1: Create shared formatting inside page files**

Use this helper where prices are displayed:

```javascript
function euro(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}
```

- [ ] **Step 2: Create home page**

Create `frontend/src/ciak/client/pages/ClientHome.jsx`:

```javascript
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function nextAction(dashboard) {
  const access = dashboard.client?.access_level;
  const diagnostic = dashboard.diagnostic || {};
  if (access === "cliente_start") return { title: "Continua Ciak Start", body: "Seguiamo le fondazioni: brand, posizionamento, social e contenuti.", to: "/cliente/start" };
  if (diagnostic.state === "call_booked") return { title: "Call prenotata", body: "Troverai qui analisi e roadmap prima della sessione con Claudio.", to: "/cliente/blueprint" };
  if (diagnostic.state === "call_done") return { title: "Prossimo passo disponibile", body: "Guarda il percorso consigliato dopo la call.", to: diagnostic.recommended_offer === "ciak_start" ? "/cliente/start" : "/cliente/partnership" };
  return { title: "Prenota la sessione strategica", body: "Il Blueprint serve a preparare una call concreta, non una vendita al buio.", to: "/cliente/blueprint" };
}

export function ClientHome({ dashboard }) {
  const action = nextAction(dashboard);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-yellow-200 bg-white p-6 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Il tuo percorso Ciak</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{action.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{action.body}</p>
        <Link to={action.to} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          Continua <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" /><p className="font-semibold text-slate-900">Blueprint</p><p className="mt-1 text-sm text-slate-500">Diagnosi, score e roadmap.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><CalendarDays className="mb-3 h-5 w-5 text-blue-600" /><p className="font-semibold text-slate-900">Sessione</p><p className="mt-1 text-sm text-slate-500">Una call per decidere il passo giusto.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><ArrowRight className="mb-3 h-5 w-5 text-yellow-600" /><p className="font-semibold text-slate-900">Crescita</p><p className="mt-1 text-sm text-slate-500">Start o Partnership, in base alla readiness.</p></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Blueprint page**

Create `frontend/src/ciak/client/pages/BlueprintPage.jsx`:

```javascript
export function BlueprintPage({ dashboard }) {
  const score = dashboard.diagnostic?.score ?? 0;
  const analysis = dashboard.analysis || {};
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Ciak Blueprint</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">La tua diagnosi iniziale</h1>
        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">Punteggio readiness</p>
          <p className="mt-1 text-4xl font-semibold text-slate-900">{score}/100</p>
          <p className="mt-2 text-sm text-slate-600">
            {score < 50 ? "Il passo consigliato è Ciak Start: sistemiamo le fondazioni prima della partnership." : "Il passo consigliato è la Partnership completa."}
          </p>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">{analysis.title || "Analisi in preparazione"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {analysis.status === "inviata" ? "La tua analisi è disponibile. La roadmap qui sotto guida la sessione strategica." : "Stiamo preparando analisi e roadmap per la sessione strategica."}
        </p>
        <div className="mt-5 space-y-3">
          {(analysis.roadmap || []).map((item, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{item.fase}</p>
              <p className="mt-1 text-sm text-slate-500">{item.attivita}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create Start page**

Create `frontend/src/ciak/client/pages/StartPage.jsx`:

```javascript
function euro(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

export function StartPage({ dashboard }) {
  const active = dashboard.client?.access_level === "cliente_start";
  const progress = dashboard.start?.progress || [];
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-yellow-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{active ? "Fondazioni in corso" : "Il passo giusto per preparare il terreno"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Ciak Start sistema social, brand base, primo posizionamento, sito vetrina, calendario e strategia contenuti.
        </p>
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
          I {euro(49900)} di Ciak Start sono sempre riconosciuti come credito se passi alla Partnership.
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Servizi inclusi</h2>
        <div className="mt-4 space-y-2">
          {(progress.length ? progress : [
            "Direzione di posizionamento",
            "Basi del brand",
            "Sistemazione profili social",
            "Sito vetrina semplice",
            "Strategia contenuti",
            "Calendario contenuti",
            "Revisione finale e readiness partnership",
          ].map((label) => ({ label, status: "locked" }))).map((item) => (
            <div key={item.id || item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="text-xs font-semibold uppercase text-slate-400">{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Create Partnership education page**

Create `frontend/src/ciak/client/pages/PartnershipEducationPage.jsx`:

```javascript
function euro(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

const lessons = [
  "Cosa succede dentro la Partnership",
  "Cosa costruisce Evolution",
  "Cosa deve fornire il partner",
  "Perché lavoriamo nel tuo Systeme.io",
  "Perché esiste il 10% per 12 mesi",
];

export function PartnershipEducationPage({ dashboard }) {
  const price = dashboard.pricing?.partnership || {};
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Verso la Partnership</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Capisci prima cosa succede dopo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Questa sezione ti prepara alla partnership completa: cosa costruiamo, cosa validi tu e perché il sistema resta tuo.
        </p>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {lessons.map((lesson, idx) => (
          <div key={lesson} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-yellow-600">Lezione {idx + 1}</p>
            <p className="mt-1 font-semibold text-slate-900">{lesson}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Credito Start garantito</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Partnership completa</span><strong>{euro(price.full_amount_cents)}</strong></div>
          <div className="flex justify-between"><span>Credito Ciak Start</span><strong>-{euro(price.credit_amount_cents)}</strong></div>
          <div className="flex justify-between border-t border-yellow-200 pt-3 text-base"><span>Totale upgrade</span><strong>{euro(price.due_amount_cents)}</strong></div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Run build**

Run: `npm run build` from `frontend`.

Expected: build exits 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/ciak/client/pages
git commit -m "feat: add ciak client area pages"
```

---

### Task 7: Admin Client Pipeline Hooks

**Files:**
- Modify: `backend/routers/ciak_admin.py`
- Create: `frontend/src/ciak/admin/pages/ClientiCiak.jsx`
- Modify: `frontend/src/ciak/admin/CiakAdminApp.jsx`

**Interfaces:**
- Produces:
  - `GET /api/admin/ciak/clienti-ciak`
  - Admin route `/admin/clienti-ciak`

- [ ] **Step 1: Add backend endpoint**

In `backend/routers/ciak_admin.py`, add:

```python
@router.get("/clienti-ciak")
async def clienti_ciak(limit: int = 100, admin=Depends(require_ciak_admin)):
    cur = db.ciak_clients.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit)
    items = await cur.to_list(limit)
    return {"items": items, "count": len(items)}
```

Use the existing admin dependency name in `ciak_admin.py`; if the file uses a different dependency function, match the local pattern.

- [ ] **Step 2: Create admin page**

Create `frontend/src/ciak/admin/pages/ClientiCiak.jsx`:

```javascript
import { useEffect, useState } from "react";
import { apiGet } from "../api";

export function ClientiCiak({ onAuthExpired }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    apiGet("/clienti-ciak")
      .then((data) => setItems(data.items || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);
  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!items) return <div className="p-8 text-slate-400">Caricamento clienti Ciak...</div>;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Clienti Ciak</h1>
      <p className="mt-1 text-sm text-slate-500">Blueprint, Start e upgrade verso Partnership.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((item) => (
          <div key={item.id} className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
            <div><p className="font-semibold text-slate-900">{item.name || item.email}</p><p className="text-xs text-slate-500">{item.email}</p></div>
            <div className="text-sm text-slate-600">Score: {item.blueprint_score ?? "-"}</div>
            <div className="text-sm text-slate-600">Accesso: {item.access_level}</div>
            <div className="text-sm font-semibold text-blue-700">{item.offer_decision || item.recommended_offer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Register admin route**

Modify `frontend/src/ciak/admin/CiakAdminApp.jsx`:

```javascript
import { ClientiCiak } from "./pages/ClientiCiak";
```

Add route:

```javascript
<Route path="clienti-ciak" element={<ClientiCiak onAuthExpired={handleLogout} />} />
```

Add a sidebar/nav entry near acquisition or back office with label `Clienti Ciak`.

- [ ] **Step 4: Run checks**

Run:

```bash
py -m py_compile backend/routers/ciak_admin.py
npm run build
```

Expected: backend compile exit 0, frontend build exit 0.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/ciak_admin.py frontend/src/ciak/admin/pages/ClientiCiak.jsx frontend/src/ciak/admin/CiakAdminApp.jsx
git commit -m "feat: add ciak client admin pipeline"
```

---

### Task 8: Copy, Compatibility, And Verification

**Files:**
- Modify: `docs/ciak-evolution-operating-memory.md`
- Modify as needed: touched backend/frontend files from prior tasks

**Interfaces:**
- Produces: verified build, backend compile, browser QA evidence

- [ ] **Step 1: Update operating memory**

Add under `## Offerta` in `docs/ciak-evolution-operating-memory.md`:

```markdown
- Area Cliente Ciak: percorso separato dalla Partner Area per utenti Blueprint e Ciak Start.
- Accessi: cliente_blueprint, cliente_start, partner.
- Ciak Start resta cliente, non partner.
- Credito Start garantito: chi acquista Start a 499 euro paga 2.291 euro se passa alla Partnership completa.
```

- [ ] **Step 2: Search visible legacy price copy**

Run:

```bash
rg "€67|67 euro|pagamento_67|clicked_67|purchased_67|ciak_bought_67" frontend/src backend/routers backend/services
```

Expected: remaining `clicked_67`, `purchased_67`, and `ciak_bought_67` occurrences are technical state names only. Visible frontend copy must say Blueprint 27 euro.

- [ ] **Step 3: Compile backend**

Run:

```bash
py -m compileall -q backend
```

Expected: exit 0.

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py backend/tests/test_ciak_analisi.py -q
```

Expected: PASS.

- [ ] **Step 5: Build frontend**

Run from `frontend`:

```bash
npm run build
```

Expected: exit 0. Existing dependency-array warnings may remain if unrelated.

- [ ] **Step 6: Browser QA**

Start or reuse dev server on port 3000. Use Playwright/Chrome or the available browser tool to inspect:

- `/cliente/accesso` without token shows a graceful error.
- `/cliente` with mocked `ciak_client_token` and intercepted `/api/ciak/client/dashboard` renders Home.
- `/cliente/blueprint` renders score and roadmap.
- `/cliente/start` renders included services and guaranteed credit.
- `/cliente/partnership` renders 2,790 euro, -499 euro, 2,291 euro for Start customers.
- `/partner` remains unavailable unless partner auth exists.
- Mobile width 390 has no horizontal overflow.

- [ ] **Step 7: Review git diff**

Run:

```bash
git diff --stat
git status --short --branch
```

Expected: only files from this plan changed.

- [ ] **Step 8: Commit**

```bash
git add docs/ciak-evolution-operating-memory.md
git commit -m "docs: record ciak client start flow"
```

If verification required code fixes, include those files and use a focused message such as:

```bash
git commit -m "fix: polish ciak client area verification"
```
