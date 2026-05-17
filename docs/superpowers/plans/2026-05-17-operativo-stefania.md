# Operativo Stefania Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare Stefania da chat reattiva a concierge proattiva che guida il partner attraverso 13 step concreti del journey Partnership Evolution PRO, in un'unica schermata "Operativo".

**Architecture:** Backend FastAPI estende il router esistente `partner_journey.py` con 5 endpoint nuovi su una nuova collection MongoDB `partner_journey_steps`. Stefania estende `_build_context()` per leggere stato journey live e il system prompt include una nuova sezione "MODALITÀ CONCIERGE JOURNEY". Frontend React aggiunge sotto `frontend/src/ciak/partner/operativo/` un container `PartnerOperativo.jsx` che monta dinamicamente uno tra 13 componenti step + 2 speciali (celebrazione + operativo continuo), con `StefaniaVoiceNarrante` orizzontale in cima e `StefaniaDrawer` apribile da destra. Tutti gli step seguono lo stesso contratto (`step`, `onSaveDraft`, `onComplete`).

**Tech Stack:** Python 3.11 / FastAPI / Motor (Mongo async), pytest + requests (test integrazione HTTP esistenti), React 18 + Vite, Tailwind, Cloudinary per upload file, Poppins font, palette Ciak (slate-900 / yellow-400 / gray-200 / slate-50).

**Riferimento spec:** `docs/superpowers/specs/2026-05-17-operativo-stefania-design.md`

---

## File Structure

### Backend — nuovi file
- `backend/models/partner_journey_step.py` — Pydantic model + enum status
- `backend/services/journey_seed.py` — seed 13 step iniziali per nuovo partner
- `backend/services/journey_notifications.py` — Telegram + email handoff step 9→10
- `backend/scripts/seed_partner_journey_v1.py` — migrazione one-shot 26 partner esistenti
- `backend/tests/test_partner_journey_operativo.py` — pytest suite per nuovi endpoint

### Backend — file modificati
- `backend/routers/partner_journey.py` — append 5 endpoint sotto `/api/partner-journey/operativo/*`
- `backend/routers/stefania_chat.py` — estendi `_build_context()` con query live journey
- `backend/stefania_ai_onboarding.py` — append sezione "MODALITÀ CONCIERGE JOURNEY" al system prompt
- `backend/server.py` — registra collection map per `partner_journey_steps`

### Frontend — nuovi file
- `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx` — container + router dinamico step
- `frontend/src/ciak/partner/operativo/ProgressBar.jsx` — 13 dots + label step corrente
- `frontend/src/ciak/partner/operativo/StefaniaVoiceNarrante.jsx` — banda orizzontale + CTA "Chiedi →"
- `frontend/src/ciak/partner/operativo/StefaniaDrawer.jsx` — drawer chat che si apre da destra
- `frontend/src/ciak/partner/operativo/hooks/useJourneyState.js` — fetch + autosave
- `frontend/src/ciak/partner/operativo/hooks/useStefaniaBriefing.js` — trigger briefing al cambio step
- `frontend/src/ciak/partner/operativo/steps/StepBase.jsx` — componente wrapper comune (layout step)
- `frontend/src/ciak/partner/operativo/steps/Step01Contratto.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step02DiscoveryVideo.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step03BrandKit.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step05ScriptMasterclass.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step06OutlineLezioni.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step09FunnelAsset.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step10FunnelTeamWork.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step11Calendario.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step12PrezzoWebinar.jsx`
- `frontend/src/ciak/partner/operativo/steps/Step13Lancio.jsx`
- `frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx`
- `frontend/src/ciak/partner/operativo/steps/OperativoContinuo.jsx`

### Frontend — file modificati
- `frontend/src/ciak/partner/CiakPartnerApp.jsx` — route `/partner/operativo` come default + hamburger "Strumenti avanzati"

---

## Phase 1 — Backend foundation (data + endpoint + migration)

### Task 1: Pydantic model + enum status

**Files:**
- Create: `backend/models/partner_journey_step.py`

- [ ] **Step 1: Crea il modello Pydantic + enum**

```python
# backend/models/partner_journey_step.py
"""
Pydantic model per gli step del journey partner (sub-progetto A Operativo Stefania).
Vedi spec: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class JourneyStepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class PartnerJourneyStep(BaseModel):
    partner_id: str
    step_id: str  # slug stabile: "01-contratto", "02-discovery-video", ...
    step_number: int  # 1..13
    fase_legacy: str  # "F1".."F7"
    status: JourneyStepStatus = JourneyStepStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: dict[str, Any] = Field(default_factory=dict)
    stefania_briefing_shown: bool = False
    stefania_proactive_sent_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Definizione canonica dei 13 step. Usata da seed_partner_journey e dalle UI.
JOURNEY_STEPS_DEFINITION: list[dict[str, Any]] = [
    {"step_id": "01-contratto",          "step_number": 1,  "fase_legacy": "F1", "label": "Contratto + distinta"},
    {"step_id": "02-discovery-video",    "step_number": 2,  "fase_legacy": "F1", "label": "Discovery video"},
    {"step_id": "03-brand-kit",          "step_number": 3,  "fase_legacy": "F2", "label": "Brand kit"},
    {"step_id": "04-posizionamento",     "step_number": 4,  "fase_legacy": "F2", "label": "Posizionamento"},
    {"step_id": "05-script-masterclass", "step_number": 5,  "fase_legacy": "F3", "label": "Script masterclass"},
    {"step_id": "06-outline-lezioni",    "step_number": 6,  "fase_legacy": "F3", "label": "Outline lezioni"},
    {"step_id": "07-registra-masterclass","step_number": 7, "fase_legacy": "F4", "label": "Registra masterclass"},
    {"step_id": "08-registra-lezioni",   "step_number": 8,  "fase_legacy": "F4", "label": "Registra lezioni"},
    {"step_id": "09-funnel-asset",       "step_number": 9,  "fase_legacy": "F5", "label": "Funnel asset"},
    {"step_id": "10-funnel-team-work",   "step_number": 10, "fase_legacy": "F5", "label": "Team costruisce funnel"},
    {"step_id": "11-calendario-30gg",    "step_number": 11, "fase_legacy": "F6", "label": "Calendario 30gg"},
    {"step_id": "12-prezzo-webinar",     "step_number": 12, "fase_legacy": "F6", "label": "Prezzo + webinar"},
    {"step_id": "13-lancio",             "step_number": 13, "fase_legacy": "F7", "label": "Lancio"},
]
```

- [ ] **Step 2: Verifica import**

Run: `cd backend && python -c "from models.partner_journey_step import PartnerJourneyStep, JourneyStepStatus, JOURNEY_STEPS_DEFINITION; print(len(JOURNEY_STEPS_DEFINITION))"`
Expected: `13`

- [ ] **Step 3: Commit**

```bash
git add backend/models/partner_journey_step.py
git commit -m "feat(journey): add PartnerJourneyStep model + 13-step definition"
```

---

### Task 2: Seed service (helper per creare i 13 record alla prima visita)

**Files:**
- Create: `backend/services/journey_seed.py`

- [ ] **Step 1: Crea il servizio seed**

```python
# backend/services/journey_seed.py
"""
Servizio per seedare i 13 step iniziali per un partner che entra
per la prima volta nell'Operativo Stefania.

Idempotente: re-run non duplica record (check su partner_id + step_id).
"""
from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.partner_journey_step import (
    JOURNEY_STEPS_DEFINITION,
    JourneyStepStatus,
)


async def seed_partner_journey(
    db: AsyncIOMotorDatabase,
    partner_id: str,
    start_step_number: int = 1,
) -> int:
    """Seeda i 13 step per un partner. Marca come done gli step < start_step_number
    e in_progress lo step start_step_number. Ritorna count step creati."""
    existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
    if existing >= len(JOURNEY_STEPS_DEFINITION):
        return 0

    now = datetime.utcnow()
    created = 0
    for definition in JOURNEY_STEPS_DEFINITION:
        # Skip se già esistente
        already = await db.partner_journey_steps.find_one(
            {"partner_id": partner_id, "step_id": definition["step_id"]}
        )
        if already:
            continue

        if definition["step_number"] < start_step_number:
            status = JourneyStepStatus.DONE
            started_at = now
            completed_at = now
        elif definition["step_number"] == start_step_number:
            status = JourneyStepStatus.IN_PROGRESS
            started_at = now
            completed_at = None
        else:
            status = JourneyStepStatus.PENDING
            started_at = None
            completed_at = None

        await db.partner_journey_steps.insert_one({
            "partner_id": partner_id,
            "step_id": definition["step_id"],
            "step_number": definition["step_number"],
            "fase_legacy": definition["fase_legacy"],
            "status": status.value,
            "started_at": started_at,
            "completed_at": completed_at,
            "data": {},
            "stefania_briefing_shown": False,
            "stefania_proactive_sent_at": None,
            "updated_at": now,
        })
        created += 1

    # Aggiorna anche partners.journey_current_step
    current_step_id = next(
        (d["step_id"] for d in JOURNEY_STEPS_DEFINITION if d["step_number"] == start_step_number),
        None,
    )
    if current_step_id:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": current_step_id}},
        )

    return created
```

- [ ] **Step 2: Verifica import sintattica**

Run: `cd backend && python -c "from services.journey_seed import seed_partner_journey; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/services/journey_seed.py
git commit -m "feat(journey): add seed service for partner journey steps"
```

---

### Task 3: GET /state — endpoint che ritorna stato journey + current step

**Files:**
- Modify: `backend/routers/partner_journey.py` (append in fondo)
- Test: `backend/tests/test_partner_journey_operativo.py`

- [ ] **Step 1: Scrivi il test (TDD)**

```python
# backend/tests/test_partner_journey_operativo.py
"""
Test suite per Operativo Stefania endpoints (sub-progetto A).
Vedi spec: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
TEST_PARTNER_ID = "1"  # Marco Ferretti, esiste nel DB


class TestOperativoState:
    """Test GET /api/partner-journey/operativo/state/{partner_id}"""

    def test_state_seeds_steps_on_first_call(self):
        """Prima chiamata per un partner senza step -> seed automatico 13 step."""
        # Usa un partner_id fresco per evitare collisione con test precedenti
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        r = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert len(data["steps"]) == 13
        # Step 1 in_progress, resto pending
        in_progress = [s for s in data["steps"] if s["status"] == "in_progress"]
        assert len(in_progress) == 1
        assert in_progress[0]["step_number"] == 1
        # Current step ritornato
        assert data["current_step"]["step_id"] == "01-contratto"

    def test_state_existing_partner(self):
        """Partner esistente -> stato letto da DB, no re-seed."""
        r = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{TEST_PARTNER_ID}")
        assert r.status_code == 200
        data = r.json()
        assert "steps" in data
        assert "current_step" in data
        assert len(data["steps"]) == 13
```

- [ ] **Step 2: Verifica che il test fallisce (endpoint non esiste ancora)**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoState::test_state_seeds_steps_on_first_call -v`
Expected: FAIL — status 404 (route inesistente).

- [ ] **Step 3: Implementa l'endpoint**

Append in `backend/routers/partner_journey.py` (alla fine del file, dopo l'ultimo endpoint esistente):

```python
# ─────────────────────────────────────────────────
# OPERATIVO STEFANIA — Sub-progetto A
# Vedi: docs/superpowers/specs/2026-05-17-operativo-stefania-design.md
# ─────────────────────────────────────────────────
from services.journey_seed import seed_partner_journey
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION


@router.get("/operativo/state/{partner_id}")
async def get_operativo_state(partner_id: str):
    """Ritorna stato completo journey del partner.
    Se è la prima visita (no step in DB), seeda automaticamente i 13 step
    con step 1 in_progress.
    """
    existing = await db.partner_journey_steps.count_documents({"partner_id": partner_id})
    if existing == 0:
        await seed_partner_journey(db, partner_id, start_step_number=1)

    steps_cursor = db.partner_journey_steps.find(
        {"partner_id": partner_id},
        {"_id": 0},
    ).sort("step_number", 1)
    steps = await steps_cursor.to_list(length=20)

    # Arricchisci ogni step con la label da JOURNEY_STEPS_DEFINITION
    label_by_step_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
    for s in steps:
        s["label"] = label_by_step_id.get(s["step_id"], s["step_id"])

    current_step = next((s for s in steps if s["status"] == "in_progress"), None)
    if not current_step:
        # Tutti done -> partner ha completato il journey
        current_step = steps[-1] if steps else None

    return {
        "success": True,
        "partner_id": partner_id,
        "steps": steps,
        "current_step": current_step,
        "total_steps": len(steps),
        "completed_count": sum(1 for s in steps if s["status"] == "done"),
    }
```

- [ ] **Step 4: Verifica che il test passa**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoState -v`
Expected: PASS entrambi i test.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/partner_journey.py backend/tests/test_partner_journey_operativo.py
git commit -m "feat(journey): GET /operativo/state endpoint with auto-seed on first call"
```

---

### Task 4: POST /complete — marca step done + avanza al prossimo

**Files:**
- Modify: `backend/routers/partner_journey.py`
- Modify: `backend/tests/test_partner_journey_operativo.py`

- [ ] **Step 1: Scrivi i test**

Append in `backend/tests/test_partner_journey_operativo.py`:

```python
class TestOperativoComplete:
    """Test POST /api/partner-journey/operativo/complete/{partner_id}/{step_id}"""

    def test_complete_advances_to_next_step(self):
        """Completa step 1 -> step 2 diventa in_progress."""
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        # Seed via GET /state
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        # Completa step 1
        r = requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/complete/{fresh_pid}/01-contratto",
            json={"data": {"contract_url": "https://test.com/c.pdf", "receipt_url": "https://test.com/r.pdf"}},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["next_step"]["step_id"] == "02-discovery-video"
        assert body["next_step"]["status"] == "in_progress"

        # Verifica stato dopo
        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        step1 = next(s for s in state["steps"] if s["step_id"] == "01-contratto")
        step2 = next(s for s in state["steps"] if s["step_id"] == "02-discovery-video")
        assert step1["status"] == "done"
        assert step1["data"]["contract_url"] == "https://test.com/c.pdf"
        assert step2["status"] == "in_progress"

    def test_complete_last_step_marks_journey_complete(self):
        """Completa step 13 -> journey_current_step = 'completato'."""
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        # Avanza in serie da 1 a 13
        from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
        for d in JOURNEY_STEPS_DEFINITION:
            requests.post(
                f"{BASE_URL}/api/partner-journey/operativo/complete/{fresh_pid}/{d['step_id']}",
                json={"data": {}},
            )

        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        assert state["completed_count"] == 13
        assert all(s["status"] == "done" for s in state["steps"])
```

- [ ] **Step 2: Verifica i test falliscono**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoComplete -v`
Expected: FAIL (route 404).

- [ ] **Step 3: Implementa l'endpoint**

Append in `backend/routers/partner_journey.py`:

```python
from pydantic import BaseModel as _BaseModel  # alias per evitare collisioni
from datetime import datetime as _datetime


class _OperativoCompleteBody(_BaseModel):
    data: dict = {}


@router.post("/operativo/complete/{partner_id}/{step_id}")
async def complete_operativo_step(partner_id: str, step_id: str, body: _OperativoCompleteBody):
    """Marca lo step done + avanza il prossimo a in_progress.
    Merge del payload `data` con quello esistente (autosave drafts non si perdono).
    """
    now = _datetime.utcnow()

    current = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}
    )
    if not current:
        raise HTTPException(404, f"Step {step_id} non trovato per partner {partner_id}")

    merged_data = {**current.get("data", {}), **(body.data or {})}

    await db.partner_journey_steps.update_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"$set": {
            "status": "done",
            "completed_at": now,
            "data": merged_data,
            "updated_at": now,
        }},
    )

    # Trova il prossimo step pending e marcalo in_progress
    next_step = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "status": "pending"},
        sort=[("step_number", 1)],
    )

    if next_step:
        await db.partner_journey_steps.update_one(
            {"_id": next_step["_id"]},
            {"$set": {
                "status": "in_progress",
                "started_at": now,
                "updated_at": now,
            }},
        )
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": next_step["step_id"]}},
        )
        next_step["status"] = "in_progress"
        next_step.pop("_id", None)
    else:
        # Tutti completati
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"journey_current_step": "completato"}},
        )

    return {
        "success": True,
        "completed_step": step_id,
        "next_step": next_step,
    }
```

- [ ] **Step 4: Verifica i test passano**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoComplete -v`
Expected: PASS entrambi.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/partner_journey.py backend/tests/test_partner_journey_operativo.py
git commit -m "feat(journey): POST /operativo/complete advances to next step"
```

---

### Task 5: POST /save-draft — autosave dei dati parziali dello step in_progress

**Files:**
- Modify: `backend/routers/partner_journey.py`
- Modify: `backend/tests/test_partner_journey_operativo.py`

- [ ] **Step 1: Scrivi il test**

Append in `backend/tests/test_partner_journey_operativo.py`:

```python
class TestOperativoSaveDraft:
    def test_save_draft_merges_data(self):
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        # Salva bozza step 1
        r = requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/save-draft/{fresh_pid}/01-contratto",
            json={"data": {"contract_url": "https://test.com/c.pdf"}},
        )
        assert r.status_code == 200, r.text

        # Salva una seconda bozza con altro campo -> merge
        requests.post(
            f"{BASE_URL}/api/partner-journey/operativo/save-draft/{fresh_pid}/01-contratto",
            json={"data": {"receipt_url": "https://test.com/r.pdf"}},
        )

        state = requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}").json()
        step1 = next(s for s in state["steps"] if s["step_id"] == "01-contratto")
        assert step1["status"] == "in_progress"  # NON done
        assert step1["data"]["contract_url"] == "https://test.com/c.pdf"
        assert step1["data"]["receipt_url"] == "https://test.com/r.pdf"
```

- [ ] **Step 2: Verifica che fallisce**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoSaveDraft -v`
Expected: FAIL (404).

- [ ] **Step 3: Implementa**

Append in `backend/routers/partner_journey.py`:

```python
@router.post("/operativo/save-draft/{partner_id}/{step_id}")
async def save_draft_operativo_step(partner_id: str, step_id: str, body: _OperativoCompleteBody):
    """Salva bozza dati step in_progress. Merge col data esistente.
    NON cambia lo status (rimane in_progress)."""
    now = _datetime.utcnow()
    current = await db.partner_journey_steps.find_one(
        {"partner_id": partner_id, "step_id": step_id}
    )
    if not current:
        raise HTTPException(404, f"Step {step_id} non trovato per partner {partner_id}")

    merged_data = {**current.get("data", {}), **(body.data or {})}

    await db.partner_journey_steps.update_one(
        {"partner_id": partner_id, "step_id": step_id},
        {"$set": {"data": merged_data, "updated_at": now}},
    )
    return {"success": True, "saved_keys": list(body.data.keys())}
```

- [ ] **Step 4: Verifica passa**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoSaveDraft -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/partner_journey.py backend/tests/test_partner_journey_operativo.py
git commit -m "feat(journey): POST /operativo/save-draft for autosave"
```

---

### Task 6: GET /stefania-context — ritorna contesto strutturato per Stefania

**Files:**
- Modify: `backend/routers/partner_journey.py`
- Modify: `backend/tests/test_partner_journey_operativo.py`

- [ ] **Step 1: Scrivi il test**

Append in `backend/tests/test_partner_journey_operativo.py`:

```python
class TestOperativoStefaniaContext:
    def test_returns_current_step_context(self):
        fresh_pid = f"test-{uuid.uuid4().hex[:8]}"
        requests.get(f"{BASE_URL}/api/partner-journey/operativo/state/{fresh_pid}")

        r = requests.get(f"{BASE_URL}/api/partner-journey/operativo/stefania-context/{fresh_pid}")
        assert r.status_code == 200, r.text
        ctx = r.json()
        assert ctx["success"] is True
        assert ctx["current_step"]["step_id"] == "01-contratto"
        assert ctx["current_step"]["step_number"] == 1
        assert ctx["current_step"]["label"] == "Contratto + distinta"
        assert ctx["total_steps"] == 13
        assert ctx["completed_count"] == 0
        assert ctx["stefania_mode"] in ("briefing", "affiancamento", "proattiva")
```

- [ ] **Step 2: Verifica fallisce**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoStefaniaContext -v`
Expected: FAIL.

- [ ] **Step 3: Implementa**

Append in `backend/routers/partner_journey.py`:

```python
@router.get("/operativo/stefania-context/{partner_id}")
async def get_stefania_context(partner_id: str):
    """Ritorna contesto strutturato per Stefania su questo partner.
    Usato sia dal frontend (per mostrare il briefing) sia dal backend
    in _build_context() del router stefania_chat."""
    steps_cursor = db.partner_journey_steps.find(
        {"partner_id": partner_id},
        {"_id": 0},
    ).sort("step_number", 1)
    steps = await steps_cursor.to_list(length=20)

    if not steps:
        return {
            "success": True,
            "current_step": None,
            "total_steps": 0,
            "completed_count": 0,
            "stefania_mode": "briefing",
        }

    label_by_step_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
    for s in steps:
        s["label"] = label_by_step_id.get(s["step_id"], s["step_id"])

    current = next((s for s in steps if s["status"] == "in_progress"), None)

    # Determina la modalità: briefing se appena aperto, proattiva se inattivo >3gg,
    # affiancamento di default. (Versione semplice: ulteriori euristiche v2.)
    stefania_mode = "briefing"
    if current:
        if not current.get("stefania_briefing_shown"):
            stefania_mode = "briefing"
        elif current.get("started_at"):
            from datetime import timezone, timedelta
            started = current["started_at"]
            if isinstance(started, str):
                started = _datetime.fromisoformat(started.replace("Z", "+00:00"))
            now_utc = _datetime.now(timezone.utc) if started.tzinfo else _datetime.utcnow()
            if (now_utc - started) > timedelta(days=3):
                stefania_mode = "proattiva"
            else:
                stefania_mode = "affiancamento"
        else:
            stefania_mode = "affiancamento"

    return {
        "success": True,
        "current_step": current,
        "total_steps": len(steps),
        "completed_count": sum(1 for s in steps if s["status"] == "done"),
        "stefania_mode": stefania_mode,
    }
```

- [ ] **Step 4: Verifica passa**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py::TestOperativoStefaniaContext -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/partner_journey.py backend/tests/test_partner_journey_operativo.py
git commit -m "feat(journey): GET /operativo/stefania-context with mode detection"
```

---

### Task 7: Script di migrazione 26 partner esistenti

**Files:**
- Create: `backend/scripts/seed_partner_journey_v1.py`

- [ ] **Step 1: Crea lo script**

```python
# backend/scripts/seed_partner_journey_v1.py
"""
Migrazione one-shot: seedare partner_journey_steps per i 26 partner attivi
mappando da partners.phase (F1-F7+) al numero di step iniziale.

Idempotente: re-run safe (skip se già seedato).

Run:
    cd backend
    python -m scripts.seed_partner_journey_v1
"""
import asyncio
import os
import sys
from pathlib import Path

# Permetti import dal parent dir quando lanciato come modulo
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from services.journey_seed import seed_partner_journey


# Mapping conservativo phase -> step number iniziale per partner non lanciati
PHASE_TO_START_STEP = {
    "F1": 2,   # ha pagato, in onboarding
    "F2": 4,   # posizionamento done
    "F3": 6,   # masterclass scriptata
    "F4": 8,   # registrazioni done
}


async def main():
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DB_NAME", "evolution_pro")
    if not mongo_url:
        print("ERROR: MONGO_URL or MONGODB_URI not set", file=sys.stderr)
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    partners = await db.partners.find({"active": True}).to_list(length=200)
    print(f"Found {len(partners)} active partners")

    seeded_count = 0
    skipped_count = 0
    for p in partners:
        partner_id = p.get("id")
        phase = p.get("phase", "F1")

        # F5+ = già lanciato -> tutti done. Imposta start_step = 14 (oltre l'ultimo).
        if phase and phase >= "F5":
            start_step = 14
        else:
            start_step = PHASE_TO_START_STEP.get(phase, 1)

        created = await seed_partner_journey(db, partner_id, start_step_number=start_step)
        if created > 0:
            seeded_count += 1
            print(f"  + {partner_id} ({p.get('name', 'no-name')}): {created} step seedati, start={start_step} (phase={phase})")
        else:
            skipped_count += 1

        # Per partner F5+ aggiorna anche journey_current_step
        if phase and phase >= "F5":
            await db.partners.update_one(
                {"id": partner_id},
                {"$set": {"journey_current_step": "completato"}},
            )

    print(f"\nDone. Seedati: {seeded_count}, skip (già esistenti): {skipped_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Verifica sintassi**

Run: `cd backend && python -c "import scripts.seed_partner_journey_v1 as m; print('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/seed_partner_journey_v1.py
git commit -m "feat(journey): migration script for 26 existing partners"
```

> **NOTA:** lo script NON va eseguito in questa task — sarà eseguito in Phase 5 Task 22 dopo che frontend è pronto.

---

## Phase 2 — Stefania integration

### Task 8: Estendi `_build_context()` di Stefania con journey state live

**Files:**
- Modify: `backend/routers/stefania_chat.py` (sezione `_build_context`)

- [ ] **Step 1: Leggi `_build_context` esistente per identificare punto di append**

Run: `cd backend && grep -n "_build_context\|partner_phase\|partner_niche" routers/stefania_chat.py | head -10`
Annota la riga dove viene costruito il dict context (es. riga ~150-200).

- [ ] **Step 2: Aggiungi import e query journey**

Trova in `backend/routers/stefania_chat.py` la riga sopra la definizione di `_build_context` e aggiungi:

```python
from models.partner_journey_step import JOURNEY_STEPS_DEFINITION
```

Trova la fine di `_build_context()` (subito prima del `return ctx` o `return {...}`) e aggiungi:

```python
    # === OPERATIVO STEFANIA — contesto journey live (sub-progetto A) ===
    journey_steps = await db.partner_journey_steps.find(
        {"partner_id": partner_id}
    ).sort("step_number", 1).to_list(length=20)

    if journey_steps:
        label_by_id = {d["step_id"]: d["label"] for d in JOURNEY_STEPS_DEFINITION}
        current_step = next((s for s in journey_steps if s["status"] == "in_progress"), None)
        ctx["journey_total_steps"] = len(journey_steps)
        ctx["journey_completed_count"] = sum(1 for s in journey_steps if s["status"] == "done")
        if current_step:
            ctx["journey_current_step_number"] = current_step["step_number"]
            ctx["journey_current_step_id"] = current_step["step_id"]
            ctx["journey_current_step_label"] = label_by_id.get(current_step["step_id"], current_step["step_id"])
            ctx["journey_current_step_status"] = current_step["status"]
            ctx["journey_current_step_briefing_shown"] = current_step.get("stefania_briefing_shown", False)
        else:
            # Journey completato
            ctx["journey_current_step_id"] = "completato"
            ctx["journey_current_step_label"] = "Journey completato"
```

- [ ] **Step 3: Verifica sintassi**

Run: `cd backend && python -c "from routers.stefania_chat import _build_context; print('ok')"`
Expected: `ok` (o errore esplicito da risolvere).

- [ ] **Step 4: Commit**

```bash
git add backend/routers/stefania_chat.py
git commit -m "feat(stefania): inject live journey state into _build_context"
```

---

### Task 9: Estendi system prompt Stefania con sezione "MODALITÀ CONCIERGE JOURNEY"

**Files:**
- Modify: `backend/stefania_ai_onboarding.py`

- [ ] **Step 1: Apri il file e identifica fine del system prompt per modalità partner**

Run: `cd backend && grep -n "MODALITÀ\|STEFANIA_SYSTEM_PROMPT\|partner_phase" stefania_ai_onboarding.py | head -15`

- [ ] **Step 2: Aggiungi la nuova sezione al system prompt**

Trova la sezione che descrive il ruolo Stefania per il partner (cerca "partner" lowercased nelle istruzioni) e append PRIMA della chiusura del template, oppure aggiungi una funzione `build_concierge_section(ctx)` chiamata in fase di assembly. Versione minimale: aggiungi al template multi-modale partner una stringa che include i campi journey iniettati:

Inserisci nel system prompt partner (cerca il blocco che inizia con "MODALITÀ" o "RUOLO PARTNER") il seguente blocco:

```python
CONCIERGE_JOURNEY_BLOCK = """

═══════════════════════════════════════════════════════
MODALITÀ CONCIERGE JOURNEY — usa SEMPRE questi dati
═══════════════════════════════════════════════════════

Il partner sta facendo il percorso Partnership Evolution PRO esploso in 13 step concreti.
Stato attuale del partner:
- Step corrente: {journey_current_step_number}/{journey_total_steps} — {journey_current_step_label}
- Step completati: {journey_completed_count}
- Step ID corrente: {journey_current_step_id}
- Briefing già mostrato per questo step: {journey_current_step_briefing_shown}

Le tue 4 modalità in base allo stato:

1. BRIEFING (briefing_shown=false): il partner ha appena aperto lo step. Inizia spiegando
   in 30 secondi cosa serve fare. Tono: chiaro, non lungo, una sola frase apri.

2. AFFIANCAMENTO (briefing_shown=true, partner ti scrive): rispondi a dubbi specifici dello
   step corrente. Tono: pacato, diretto, non motivazionale. Zero emoji.

3. CONFERMA (chiamata dopo che il partner ha completato uno step): "Fatto. Hai chiuso lo
   step X. Andiamo al prossimo: Y." Una frase, niente di più.

4. PROATTIVA (partner inattivo >3gg sullo stesso step): "Ciao, sei rimasto fermo su X
   da N giorni. Vuoi che lo facciamo insieme adesso?" Tono caldo ma non insistente.

REGOLE OPERATIVE:
- Non suggerire step diversi da quello corrente. Il percorso è lineare.
- Se il partner chiede di saltare avanti, spiega che il percorso è lineare e che può
  modificare step già done cliccando sulla progress bar.
- Se ha problemi su upload/validazione, suggerisci di scrivere "ho un problema" e poi
  rispondi con calma proponendo la soluzione più semplice.
- Quando journey_current_step_id="completato", il partner ha finito. Modalità: caldo,
  grato. Esempio: "Hai chiuso tutto. Il tuo modello è live. Grazie a te per la fiducia."
"""
```

Poi inietta il blocco nella funzione che assembla il system prompt finale per il partner. Cerca dove il system prompt viene `.format()`ato o concatenato e aggiungi `CONCIERGE_JOURNEY_BLOCK.format(**ctx)` dove `ctx` è il dict ritornato da `_build_context`.

Esempio (adatta al pattern già presente):
```python
system_prompt_partner = STEFANIA_SYSTEM_PROMPT_PARTNER + CONCIERGE_JOURNEY_BLOCK.format(
    journey_current_step_number=ctx.get("journey_current_step_number", "?"),
    journey_total_steps=ctx.get("journey_total_steps", 13),
    journey_current_step_label=ctx.get("journey_current_step_label", "?"),
    journey_completed_count=ctx.get("journey_completed_count", 0),
    journey_current_step_id=ctx.get("journey_current_step_id", "?"),
    journey_current_step_briefing_shown=ctx.get("journey_current_step_briefing_shown", False),
)
```

- [ ] **Step 3: Verifica sintassi**

Run: `cd backend && python -c "from stefania_ai_onboarding import CONCIERGE_JOURNEY_BLOCK; print(len(CONCIERGE_JOURNEY_BLOCK))"`
Expected: numero > 1000.

- [ ] **Step 4: Commit**

```bash
git add backend/stefania_ai_onboarding.py
git commit -m "feat(stefania): add MODALITÀ CONCIERGE JOURNEY block to system prompt"
```

> **CHECKPOINT shippable:** Phase 1+2 sono backend complete. Da qui frontend può consumare. Smoke test via curl per validare:
> ```
> curl http://localhost:8000/api/partner-journey/operativo/state/1 | jq
> curl http://localhost:8000/api/partner-journey/operativo/stefania-context/1 | jq
> ```

---

## Phase 3 — Frontend shell

### Task 10: Container `PartnerOperativo.jsx` con routing dinamico step

**Files:**
- Create: `frontend/src/ciak/partner/operativo/PartnerOperativo.jsx`
- Create: `frontend/src/ciak/partner/operativo/hooks/useJourneyState.js`

- [ ] **Step 1: Crea hook `useJourneyState.js`**

```jsx
// frontend/src/ciak/partner/operativo/hooks/useJourneyState.js
import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "";

export function useJourneyState(partnerId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/partner-journey/operativo/state/${partnerId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setState(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const completeStep = useCallback(async (stepId, data) => {
    const r = await fetch(
      `${API}/api/partner-journey/operativo/complete/${partnerId}/${stepId}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data || {} }) }
    );
    if (!r.ok) throw new Error(`Complete failed: ${r.status}`);
    await refresh();
    return r.json();
  }, [partnerId, refresh]);

  const saveDraft = useCallback(async (stepId, data) => {
    const r = await fetch(
      `${API}/api/partner-journey/operativo/save-draft/${partnerId}/${stepId}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data || {} }) }
    );
    if (!r.ok) throw new Error(`SaveDraft failed: ${r.status}`);
    return r.json();
  }, [partnerId]);

  return { state, loading, error, refresh, completeStep, saveDraft };
}
```

- [ ] **Step 2: Crea container `PartnerOperativo.jsx`**

```jsx
// frontend/src/ciak/partner/operativo/PartnerOperativo.jsx
import React, { lazy, Suspense, useState } from "react";
import { useJourneyState } from "./hooks/useJourneyState";
import ProgressBar from "./ProgressBar";
import StefaniaVoiceNarrante from "./StefaniaVoiceNarrante";
import StefaniaDrawer from "./StefaniaDrawer";

const STEP_COMPONENTS = {
  "01-contratto":          lazy(() => import("./steps/Step01Contratto")),
  "02-discovery-video":    lazy(() => import("./steps/Step02DiscoveryVideo")),
  "03-brand-kit":          lazy(() => import("./steps/Step03BrandKit")),
  "04-posizionamento":     lazy(() => import("./steps/Step04Posizionamento")),
  "05-script-masterclass": lazy(() => import("./steps/Step05ScriptMasterclass")),
  "06-outline-lezioni":    lazy(() => import("./steps/Step06OutlineLezioni")),
  "07-registra-masterclass": lazy(() => import("./steps/Step07RegistraMasterclass")),
  "08-registra-lezioni":   lazy(() => import("./steps/Step08RegistraLezioni")),
  "09-funnel-asset":       lazy(() => import("./steps/Step09FunnelAsset")),
  "10-funnel-team-work":   lazy(() => import("./steps/Step10FunnelTeamWork")),
  "11-calendario-30gg":    lazy(() => import("./steps/Step11Calendario")),
  "12-prezzo-webinar":     lazy(() => import("./steps/Step12PrezzoWebinar")),
  "13-lancio":             lazy(() => import("./steps/Step13Lancio")),
};

const FinaleCelebrativa = lazy(() => import("./steps/StepFinaleCelebrativa"));
const OperativoContinuo = lazy(() => import("./steps/OperativoContinuo"));

export default function PartnerOperativo({ partnerId }) {
  const { state, loading, error, completeStep, saveDraft, refresh } = useJourneyState(partnerId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingStepId, setViewingStepId] = useState(null);  // se !== null: partner sta modificando uno step già done

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-[Poppins,system-ui,sans-serif] text-slate-500">Carico...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-[Poppins,system-ui,sans-serif] text-red-600">Errore: {error}</div>;
  if (!state) return null;

  const current = state.current_step;
  const allDone = state.completed_count === state.total_steps;
  const justCompleted = allDone && !sessionStorage.getItem(`celebrazione-vista-${partnerId}`);

  // Step da mostrare: o quello in viewing (se l'utente ha cliccato uno step done), o quello current
  const stepToShow = viewingStepId
    ? state.steps.find(s => s.step_id === viewingStepId)
    : current;

  let StepComponent;
  if (justCompleted) {
    StepComponent = FinaleCelebrativa;
  } else if (allDone) {
    StepComponent = OperativoContinuo;
  } else if (stepToShow) {
    StepComponent = STEP_COMPONENTS[stepToShow.step_id];
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[Poppins,system-ui,sans-serif] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <ProgressBar
          steps={state.steps}
          currentStepId={stepToShow?.step_id}
          onStepClick={(stepId) => {
            const s = state.steps.find(x => x.step_id === stepId);
            if (s && s.status === "done") setViewingStepId(stepId);
          }}
        />

        {!allDone && stepToShow && (
          <StefaniaVoiceNarrante
            stepLabel={stepToShow.label}
            stepNumber={stepToShow.step_number}
            totalSteps={state.total_steps}
            onAsk={() => setDrawerOpen(true)}
          />
        )}

        <div className="mt-4">
          {StepComponent ? (
            <Suspense fallback={<div className="text-slate-500 p-8">Carico step...</div>}>
              <StepComponent
                step={stepToShow}
                partnerId={partnerId}
                onSaveDraft={(d) => stepToShow && saveDraft(stepToShow.step_id, d)}
                onComplete={async (d) => {
                  if (!stepToShow) return;
                  await completeStep(stepToShow.step_id, d);
                  setViewingStepId(null);
                }}
                onDismissCelebrazione={() => {
                  sessionStorage.setItem(`celebrazione-vista-${partnerId}`, "1");
                  refresh();
                }}
              />
            </Suspense>
          ) : (
            <div className="text-slate-500 p-8">Step non riconosciuto: {stepToShow?.step_id}</div>
          )}
        </div>
      </div>

      <StefaniaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        partnerId={partnerId}
        currentStep={stepToShow}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/partner/operativo/PartnerOperativo.jsx frontend/src/ciak/partner/operativo/hooks/useJourneyState.js
git commit -m "feat(operativo): container PartnerOperativo + useJourneyState hook"
```

---

### Task 11: `ProgressBar.jsx` — 13 dots + label step corrente

**Files:**
- Create: `frontend/src/ciak/partner/operativo/ProgressBar.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/ProgressBar.jsx
import React from "react";

export default function ProgressBar({ steps, currentStepId, onStepClick }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex items-center gap-2">
      {steps.map((s, idx) => {
        const isDone = s.status === "done";
        const isNow = s.step_id === currentStepId;
        const isClickable = isDone;
        const dotClass = isNow
          ? "w-3 h-3 rounded-full bg-yellow-400 ring-4 ring-yellow-200"
          : isDone
          ? "w-2.5 h-2.5 rounded-full bg-slate-900"
          : "w-2.5 h-2.5 rounded-full bg-gray-200";
        return (
          <React.Fragment key={s.step_id}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(s.step_id)}
              className={`flex items-center ${isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
              title={`${s.step_number}. ${s.label} — ${s.status}`}
            >
              <span className={dotClass}></span>
            </button>
            {idx < steps.length - 1 && <span className="flex-1 h-0.5 bg-gray-200"></span>}
          </React.Fragment>
        );
      })}
      <span className="ml-auto text-xs text-slate-500 font-medium whitespace-nowrap">
        Step {steps.find(s => s.step_id === currentStepId)?.step_number ?? "—"}/{steps.length}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/ProgressBar.jsx
git commit -m "feat(operativo): ProgressBar component with 13 clickable dots"
```

---

### Task 12: `StefaniaVoiceNarrante.jsx` — banda orizzontale top

**Files:**
- Create: `frontend/src/ciak/partner/operativo/StefaniaVoiceNarrante.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/StefaniaVoiceNarrante.jsx
import React, { useState, useEffect } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "";

// Briefing di default per ogni step. Se Stefania risponde live, sostituiamo.
const DEFAULT_BRIEFING = {
  "01-contratto":          "Iniziamo. Carica contratto firmato + distinta di pagamento.",
  "02-discovery-video":    "Bene. Adesso guardiamo insieme un video di circa 15 minuti sul percorso.",
  "03-brand-kit":          "Ora servono logo + 1 foto + 3 colori del tuo brand. Ti spiego perché.",
  "04-posizionamento":     "Risposta a 8 domande su nicchia e promessa. Ci servono per costruire il messaggio.",
  "05-script-masterclass": "Adesso scriviamo lo script della masterclass. Ti aiuto io.",
  "06-outline-lezioni":    "Creiamo titoli e descrizioni delle lezioni del corso.",
  "07-registra-masterclass": "Registra la masterclass e caricala qui. Te la sistemiamo noi.",
  "08-registra-lezioni":   "Registra le lezioni una a una e caricale qui.",
  "09-funnel-asset":       "Confermiamo brand + scrivi la promessa hero del funnel.",
  "10-funnel-team-work":   "Ora tocca a noi. Antonella costruisce le pagine Systeme. Ti avvisiamo quando è pronto.",
  "11-calendario-30gg":    "Creiamo il calendario editoriale per i 30 giorni di pre-lancio.",
  "12-prezzo-webinar":     "Definiamo prezzo di lancio + strategia webinar live.",
  "13-lancio":             "Ultima checklist prima del lancio: data, webinar setup, pubblicazione.",
};

export default function StefaniaVoiceNarrante({ stepLabel, stepNumber, totalSteps, onAsk, currentStepId }) {
  const message = DEFAULT_BRIEFING[currentStepId] || `Siamo allo step ${stepNumber}: ${stepLabel}.`;
  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 flex items-center gap-3 mt-3">
      <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold">S</div>
      <div className="flex-1 text-sm text-slate-900 leading-relaxed">
        <strong className="font-semibold">Ora siamo allo step {stepNumber}: {stepLabel}.</strong> {message}
      </div>
      <button
        type="button"
        onClick={onAsk}
        className="text-xs font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-3 py-2 rounded transition"
      >
        Chiedi →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/StefaniaVoiceNarrante.jsx
git commit -m "feat(operativo): StefaniaVoiceNarrante banner with default briefings"
```

---

### Task 13: `StefaniaDrawer.jsx` — drawer chat da destra

**Files:**
- Create: `frontend/src/ciak/partner/operativo/StefaniaDrawer.jsx`

- [ ] **Step 1: Crea il drawer riusando l'endpoint chat esistente**

```jsx
// frontend/src/ciak/partner/operativo/StefaniaDrawer.jsx
import React, { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "";

export default function StefaniaDrawer({ open, onClose, partnerId, currentStep }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Siamo allo step ${currentStep?.step_number ?? "?"}: ${currentStep?.label ?? ""}. Cosa ti serve?`,
      }]);
    }
  }, [open, currentStep, messages.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const r = await fetch(`${API}/api/stefania/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          message: userMsg.content,
          partner_phase: currentStep?.fase_legacy ?? "F1",
        }),
      });
      const data = await r.json();
      setMessages(m => [...m, { role: "assistant", content: data.response || data.message || "..." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Errore: ${String(e)}` }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose}></div>
      <aside className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif]">
        <header className="border-b border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold">S</div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900">Stefania</div>
            <div className="text-xs text-slate-500">Step {currentStep?.step_number ?? "?"}/13</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.role === "user" ? "bg-yellow-400 text-slate-900" : "bg-slate-50 text-slate-900 border border-gray-200"}`}>
                {m.content}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-gray-200 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Scrivi a Stefania..."
            disabled={sending}
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={send}
            disabled={sending}
            className="bg-yellow-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            Invia
          </button>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/StefaniaDrawer.jsx
git commit -m "feat(operativo): StefaniaDrawer chat panel on right side"
```

---

## Phase 4 — Step components (MVP set: 13 + 2)

Tutti gli step usano un pattern comune: prop `step` (oggetto journey), `onSaveDraft(data)`, `onComplete(data)`. Per non duplicare CSS della "card azione + CTA", creiamo `StepBase.jsx` (Task 14) e tutti gli step lo riusano (Task 15-22).

Per MVP gli step che richiedono generatori AI (5, 6, 11, 12) usano un placeholder testuale + textarea libera; i generatori veri sono sub-progetto B. Gli step file/upload (1, 3, 7, 8) usano un componente upload semplice basato su Cloudinary widget esistente.

### Task 14: `StepBase.jsx` — wrapper comune (eyebrow + titolo + slot + CTA)

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/StepBase.jsx`

- [ ] **Step 1: Crea il wrapper**

```jsx
// frontend/src/ciak/partner/operativo/steps/StepBase.jsx
import React from "react";

export default function StepBase({ eyebrow, title, children, ctaLabel = "Fatto, avanti →", onCta, ctaDisabled = false, secondaryNote }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6">
      {eyebrow && (
        <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
          {eyebrow}
        </span>
      )}
      <h2 className="text-xl font-semibold text-slate-900 mt-2 mb-4 tracking-tight">{title}</h2>
      <div className="mb-6">{children}</div>
      {onCta && (
        <button
          type="button"
          onClick={onCta}
          disabled={ctaDisabled}
          className="bg-yellow-400 text-slate-900 font-semibold px-5 py-2.5 rounded-md text-sm hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ctaLabel}
        </button>
      )}
      {secondaryNote && <p className="text-xs text-slate-500 mt-3">{secondaryNote}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/StepBase.jsx
git commit -m "feat(operativo): StepBase wrapper component"
```

---

### Task 15: Step 1 (Contratto + distinta) — upload 2 PDF

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step01Contratto.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step01Contratto.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || "";

async function uploadToCloudinary(file) {
  // Usa endpoint backend già esistente per upload (vedi funnel_builder.py)
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/upload/file`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Upload fallito");
  const j = await r.json();
  return j.url;
}

export default function Step01Contratto({ step, onComplete, onSaveDraft }) {
  const [contractUrl, setContractUrl] = useState(step?.data?.contract_url || "");
  const [receiptUrl, setReceiptUrl] = useState(step?.data?.receipt_url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleFile = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadToCloudinary(file);
      if (kind === "contract") {
        setContractUrl(url);
        onSaveDraft({ contract_url: url });
      } else {
        setReceiptUrl(url);
        onSaveDraft({ receipt_url: url });
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const canComplete = contractUrl && receiptUrl;
  return (
    <StepBase
      eyebrow="Step 1 — Contratto"
      title="Carica contratto firmato + distinta di pagamento"
      ctaDisabled={!canComplete || busy}
      onCta={() => onComplete({ contract_url: contractUrl, receipt_url: receiptUrl })}
      secondaryNote="PDF, max 10 MB ciascuno. Li trasmettiamo a noi per archivio."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileSlot label="Contratto firmato" url={contractUrl} onPick={(f) => handleFile("contract", f)} />
        <FileSlot label="Distinta pagamento" url={receiptUrl} onPick={(f) => handleFile("receipt", f)} />
      </div>
      {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
    </StepBase>
  );
}

function FileSlot({ label, url, onPick }) {
  return (
    <label className="block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-6 text-center cursor-pointer hover:border-yellow-400 transition">
      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {url ? (
        <div className="text-xs text-green-700 mt-2 truncate">✓ Caricato — <a className="underline" href={url} target="_blank" rel="noreferrer">apri</a></div>
      ) : (
        <div className="text-xs text-slate-500 mt-2">⬆ Clicca o trascina PDF</div>
      )}
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step01Contratto.jsx
git commit -m "feat(operativo): Step 1 Contratto + distinta upload"
```

---

### Task 16: Step 2 (Discovery Video) — embed video + bottone "Visto"

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step02DiscoveryVideo.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step02DiscoveryVideo.jsx
import React from "react";
import StepBase from "./StepBase";

// Sostituire con il vero ID YouTube/Vimeo del video discovery quando disponibile.
const VIDEO_EMBED_URL = "https://www.youtube.com/embed/E2XDEdJgzcQ";

export default function Step02DiscoveryVideo({ onComplete }) {
  return (
    <StepBase
      eyebrow="Step 2 — Discovery"
      title="Guarda il video di onboarding (~15 min)"
      ctaLabel="L'ho visto, avanti →"
      onCta={() => onComplete({ watched: true })}
      secondaryNote="Spiega come funziona il percorso. Guarda con calma."
    >
      <div className="aspect-video w-full bg-slate-900 rounded-md overflow-hidden">
        <iframe
          src={VIDEO_EMBED_URL}
          title="Discovery video"
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    </StepBase>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step02DiscoveryVideo.jsx
git commit -m "feat(operativo): Step 2 Discovery video embed"
```

---

### Task 17: Step 3 (Brand kit) — upload logo + foto + palette picker

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step03BrandKit.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step03BrandKit.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || "";

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/upload/file`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Upload fallito");
  return (await r.json()).url;
}

export default function Step03BrandKit({ step, onComplete, onSaveDraft }) {
  const [logo, setLogo] = useState(step?.data?.logo_url || "");
  const [foto, setFoto] = useState(step?.data?.foto_url || "");
  const [colors, setColors] = useState(step?.data?.colors || ["#0F172A", "#FACC15", "#E5E7EB"]);
  const [busy, setBusy] = useState(false);

  const updateColor = (i, v) => {
    const next = [...colors]; next[i] = v; setColors(next);
    onSaveDraft({ colors: next });
  };

  const handleLogo = async (f) => {
    if (!f) return;
    setBusy(true);
    try { const url = await uploadFile(f); setLogo(url); onSaveDraft({ logo_url: url }); }
    finally { setBusy(false); }
  };
  const handleFoto = async (f) => {
    if (!f) return;
    setBusy(true);
    try { const url = await uploadFile(f); setFoto(url); onSaveDraft({ foto_url: url }); }
    finally { setBusy(false); }
  };

  const canComplete = logo && foto && colors.every(c => /^#[0-9a-f]{6}$/i.test(c));

  return (
    <StepBase
      eyebrow="Step 3 — Brand kit"
      title="Logo + 1 foto + 3 colori"
      ctaDisabled={!canComplete || busy}
      onCta={() => onComplete({ logo_url: logo, foto_url: foto, colors })}
      secondaryNote="Servono per costruire il tuo funnel coerente col tuo brand."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <UploadSlot label="Logo (PNG/SVG con sfondo trasparente)" accept="image/*" url={logo} onPick={handleLogo} />
        <UploadSlot label="Foto personale" accept="image/*" url={foto} onPick={handleFoto} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900 mb-2">Colori brand (3)</div>
        <div className="flex gap-3">
          {colors.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={c} onChange={(e) => updateColor(i, e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <input type="text" value={c} onChange={(e) => updateColor(i, e.target.value)} className="w-20 text-xs border border-gray-200 rounded px-2 py-1 font-mono" />
            </div>
          ))}
        </div>
      </div>
    </StepBase>
  );
}

function UploadSlot({ label, accept, url, onPick }) {
  return (
    <label className="block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-6 text-center cursor-pointer hover:border-yellow-400 transition">
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {url ? (
        <img src={url} alt="" className="mt-2 max-h-20 mx-auto rounded" />
      ) : (
        <div className="text-xs text-slate-500 mt-2">⬆ Clicca o trascina</div>
      )}
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step03BrandKit.jsx
git commit -m "feat(operativo): Step 3 Brand kit (logo + foto + 3 colors)"
```

---

### Task 18: Step 4 (Posizionamento) — form 8 domande

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx`

- [ ] **Step 1: Crea il componente**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const QUESTIONS = [
  { key: "nicchia",          label: "Qual è la nicchia precisa che vuoi servire?" },
  { key: "promessa",         label: "Qual è la promessa che fai al cliente in 1 frase?" },
  { key: "cliente_tipo",     label: "Descrivi il cliente tipo (età, ruolo, momento di vita)." },
  { key: "problema_chiave",  label: "Qual è il problema principale che risolvi?" },
  { key: "trasformazione",   label: "Quale trasformazione concreta vede il cliente dopo 90 gg?" },
  { key: "differenza",       label: "In cosa sei diverso dagli altri nel settore?" },
  { key: "metodo_proprio",   label: "Hai un metodo proprio? Come si chiama?" },
  { key: "prova_sociale",    label: "Hai un caso/risultato concreto da raccontare? Quale?" },
];

export default function Step04Posizionamento({ step, onComplete, onSaveDraft }) {
  const [answers, setAnswers] = useState(step?.data?.answers || {});

  const update = (k, v) => {
    const next = { ...answers, [k]: v }; setAnswers(next); onSaveDraft({ answers: next });
  };

  const canComplete = QUESTIONS.every(q => (answers[q.key] || "").trim().length > 5);

  return (
    <StepBase
      eyebrow="Step 4 — Posizionamento"
      title="Rispondi a 8 domande"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ answers })}
      secondaryNote="Sono le fondamenta del tuo messaggio. Rispondi con onestà."
    >
      <div className="space-y-3">
        {QUESTIONS.map(q => (
          <div key={q.key}>
            <label className="block text-sm font-medium text-slate-900 mb-1">{q.label}</label>
            <textarea
              value={answers[q.key] || ""}
              onChange={(e) => update(q.key, e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
        ))}
      </div>
    </StepBase>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step04Posizionamento.jsx
git commit -m "feat(operativo): Step 4 Posizionamento 8 questions form"
```

---

### Task 19: Step 5/6/11/12 — placeholder AI generator (4 step con stesso pattern)

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step05ScriptMasterclass.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/Step06OutlineLezioni.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/Step11Calendario.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/Step12PrezzoWebinar.jsx`

- [ ] **Step 1: Crea i 4 placeholder con stesso pattern**

Per ognuno dei 4 step, crea un file con questa struttura — sostituisci il prop `eyebrow`, `title`, `placeholder`, `helpText`:

```jsx
// frontend/src/ciak/partner/operativo/steps/Step05ScriptMasterclass.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step05ScriptMasterclass({ step, onComplete, onSaveDraft }) {
  const [text, setText] = useState(step?.data?.script || "");
  return (
    <StepBase
      eyebrow="Step 5 — Script masterclass"
      title="Scrivi lo script della masterclass (60 min)"
      ctaDisabled={text.trim().length < 100}
      onCta={() => onComplete({ script: text })}
      secondaryNote="🚧 Il generatore AI arriva nei prossimi giorni. Per ora scrivi tu liberamente, ti aiuto io in chat con bullet point e suggerimenti — basta cliccare 'Chiedi'."
    >
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); onSaveDraft({ script: e.target.value }); }}
        rows={14}
        placeholder="Apri con un gancio forte (1 min). Spiega il problema (5 min). Mostra il metodo (40 min). Chiudi con call to action (5 min)..."
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 font-mono"
      />
    </StepBase>
  );
}
```

Replica per gli altri 3 con questi parametri:

**Step06OutlineLezioni.jsx**: eyebrow="Step 6 — Outline lezioni", title="Crea titoli + descrizioni delle lezioni del corso", placeholder template "Lezione 1: ...", chiave data "outline"

**Step11Calendario.jsx**: eyebrow="Step 11 — Calendario", title="Calendario editoriale 30 giorni pre-lancio", placeholder template "Giorno 1: post LinkedIn — ...", chiave "calendario"

**Step12PrezzoWebinar.jsx**: eyebrow="Step 12 — Prezzo + Webinar", title="Strategia prezzo + webinar live", placeholder template "Prezzo di lancio: €... Promo early bird: ... Webinar live: data X, struttura Y...", chiave "strategia"

- [ ] **Step 2: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step05ScriptMasterclass.jsx \
        frontend/src/ciak/partner/operativo/steps/Step06OutlineLezioni.jsx \
        frontend/src/ciak/partner/operativo/steps/Step11Calendario.jsx \
        frontend/src/ciak/partner/operativo/steps/Step12PrezzoWebinar.jsx
git commit -m "feat(operativo): Step 5/6/11/12 textarea placeholders (AI gen in sub-proj B)"
```

---

### Task 20: Step 7/8 (Registra masterclass + lezioni) — upload video

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.jsx`

- [ ] **Step 1: Crea Step 7 (single video upload)**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || "";

export default function Step07RegistraMasterclass({ step, onComplete, onSaveDraft }) {
  const [videoUrl, setVideoUrl] = useState(step?.data?.video_url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${API}/api/upload/file`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(`Upload fallito: ${r.status}`);
      const url = (await r.json()).url;
      setVideoUrl(url); onSaveDraft({ video_url: url });
    } catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };

  return (
    <StepBase
      eyebrow="Step 7 — Masterclass"
      title="Carica il video grezzo della masterclass"
      ctaDisabled={!videoUrl || busy}
      onCta={() => onComplete({ video_url: videoUrl })}
      secondaryNote="MP4 o MOV, anche grezzo senza editing. Ci pensiamo noi al taglio + render finale."
    >
      <label className="block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-10 text-center cursor-pointer hover:border-yellow-400">
        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        {videoUrl ? <div className="text-sm text-green-700">✓ Caricato</div> : <div className="text-sm text-slate-500">⬆ Clicca o trascina il file video</div>}
      </label>
      {busy && <p className="text-xs text-slate-500 mt-2">Upload in corso...</p>}
      {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
    </StepBase>
  );
}
```

- [ ] **Step 2: Crea Step 8 (multi video upload)**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || "";

export default function Step08RegistraLezioni({ step, onComplete, onSaveDraft }) {
  const [videos, setVideos] = useState(step?.data?.videos || []);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${API}/api/upload/file`, { method: "POST", body: fd });
      const url = (await r.json()).url;
      const next = [...videos, { name: file.name, url }];
      setVideos(next); onSaveDraft({ videos: next });
    } finally { setBusy(false); }
  };

  return (
    <StepBase
      eyebrow="Step 8 — Lezioni"
      title="Carica i video delle lezioni (uno alla volta)"
      ctaDisabled={videos.length === 0 || busy}
      onCta={() => onComplete({ videos })}
      secondaryNote="Puoi tornare qui in qualunque momento per aggiungerne altre."
    >
      <label className="block bg-slate-50 border-2 border-dashed border-slate-400 rounded-md p-8 text-center cursor-pointer hover:border-yellow-400 mb-4">
        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        <div className="text-sm text-slate-500">⬆ Carica una lezione</div>
      </label>
      {videos.length > 0 && (
        <ul className="space-y-2">
          {videos.map((v, i) => (
            <li key={i} className="text-sm bg-slate-50 px-3 py-2 rounded flex items-center gap-2">
              <span className="text-green-700">✓</span>
              <span className="text-slate-900 truncate">{v.name}</span>
            </li>
          ))}
        </ul>
      )}
      {busy && <p className="text-xs text-slate-500 mt-2">Upload in corso...</p>}
    </StepBase>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step07RegistraMasterclass.jsx \
        frontend/src/ciak/partner/operativo/steps/Step08RegistraLezioni.jsx
git commit -m "feat(operativo): Step 7+8 video upload (single + multi)"
```

---

### Task 21: Step 9 (Funnel asset) + Step 10 (team work passivo)

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step09FunnelAsset.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/Step10FunnelTeamWork.jsx`

- [ ] **Step 1: Crea Step 9**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step09FunnelAsset.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step09FunnelAsset({ step, onComplete, onSaveDraft }) {
  const [promessa, setPromessa] = useState(step?.data?.promessa_hero || "");
  const [subPromessa, setSubPromessa] = useState(step?.data?.sub_promessa || "");
  const [confermaBrand, setConfermaBrand] = useState(step?.data?.conferma_brand_kit ?? false);

  const update = (key, val) => onSaveDraft({ [key]: val });
  const canComplete = promessa.length > 10 && subPromessa.length > 10 && confermaBrand;

  return (
    <StepBase
      eyebrow="Step 9 — Funnel asset"
      title="Conferma brand + scrivi la promessa hero"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ promessa_hero: promessa, sub_promessa: subPromessa, conferma_brand_kit: true })}
      secondaryNote="Con questi dati Antonella costruisce le pagine del funnel su Systeme nei prossimi giorni."
    >
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1">Promessa hero (1 frase forte)</span>
        <textarea rows={2} value={promessa}
          onChange={(e) => { setPromessa(e.target.value); update("promessa_hero", e.target.value); }}
          placeholder="Esempio: Trasforma la tua professione in un modello digitale in 90 giorni — senza imparare a fare marketing."
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" />
      </label>
      <label className="block mb-4">
        <span className="block text-sm font-medium text-slate-900 mb-1">Sub-promessa (1-2 righe a supporto)</span>
        <textarea rows={2} value={subPromessa}
          onChange={(e) => { setSubPromessa(e.target.value); update("sub_promessa", e.target.value); }}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400" />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-900">
        <input type="checkbox" checked={confermaBrand}
          onChange={(e) => { setConfermaBrand(e.target.checked); update("conferma_brand_kit", e.target.checked); }}
          className="mt-1" />
        <span>Confermo che il brand kit caricato allo step 3 (logo + foto + colori) è quello da usare per il funnel.</span>
      </label>
    </StepBase>
  );
}
```

- [ ] **Step 2: Crea Step 10 (passivo, status-only)**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step10FunnelTeamWork.jsx
import React from "react";
import StepBase from "./StepBase";

export default function Step10FunnelTeamWork({ step }) {
  const completedAt = step?.data?.team_completed_at;
  return (
    <StepBase
      eyebrow="Step 10 — Funnel team work"
      title="Stiamo costruendo le pagine del tuo funnel"
      secondaryNote="Antonella e il team Evolution stanno mettendo insieme le pagine su Systeme con i tuoi asset. Tempo stimato: 3-5 giorni lavorativi. Ti avvisiamo via email quando è pronto. Nel frattempo puoi tornare agli step 7/8 per registrare se non li hai chiusi."
    >
      <div className="bg-slate-50 border border-gray-200 rounded-md p-6 text-center">
        <div className="text-4xl mb-2">⏳</div>
        <p className="text-sm text-slate-900 font-medium">Tocca a noi adesso.</p>
        <p className="text-xs text-slate-500 mt-2">{completedAt ? `Completato il ${completedAt}` : "In lavorazione..."}</p>
      </div>
    </StepBase>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step09FunnelAsset.jsx \
        frontend/src/ciak/partner/operativo/steps/Step10FunnelTeamWork.jsx
git commit -m "feat(operativo): Step 9 funnel asset form + Step 10 passive status"
```

---

### Task 22: Step 13 (Lancio) — checklist + StepFinaleCelebrativa + OperativoContinuo

**Files:**
- Create: `frontend/src/ciak/partner/operativo/steps/Step13Lancio.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx`
- Create: `frontend/src/ciak/partner/operativo/steps/OperativoContinuo.jsx`

- [ ] **Step 1: Crea Step 13 (checklist)**

```jsx
// frontend/src/ciak/partner/operativo/steps/Step13Lancio.jsx
import React, { useState } from "react";
import StepBase from "./StepBase";

const CHECKLIST = [
  "Data di lancio fissata (giorno + ora)",
  "Webinar live programmato su Zoom/Webinar Jam",
  "Email di invito al webinar pronta su Systeme",
  "Pagine funnel pubblicate e testate",
  "Stripe checkout testato con pagamento reale (poi rimborsato)",
  "Pixel + analytics installati su tutte le pagine",
];

export default function Step13Lancio({ step, onComplete, onSaveDraft }) {
  const [checked, setChecked] = useState(step?.data?.checklist || {});
  const toggle = (i) => {
    const next = { ...checked, [i]: !checked[i] }; setChecked(next); onSaveDraft({ checklist: next });
  };
  const allDone = CHECKLIST.every((_, i) => checked[i]);

  return (
    <StepBase
      eyebrow="Step 13 — Lancio"
      title="Ultima checklist prima del go-live"
      ctaLabel="Lancio! 🚀"
      ctaDisabled={!allDone}
      onCta={() => onComplete({ checklist: checked, launched_at: new Date().toISOString() })}
      secondaryNote="Quando spunti tutto e clicchi 'Lancio!', il tuo journey di setup è chiuso. Da lì in poi ci concentriamo sulle vendite."
    >
      <ul className="space-y-2">
        {CHECKLIST.map((label, i) => (
          <li key={i}>
            <label className="flex items-start gap-2 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} className="mt-1" />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </StepBase>
  );
}
```

- [ ] **Step 2: Crea schermata celebrativa**

```jsx
// frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx
import React from "react";

export default function StepFinaleCelebrativa({ onDismissCelebrazione }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-10 text-center">
      <div className="text-5xl mb-4">🎬</div>
      <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">Hai fatto tutto.</h2>
      <p className="text-lg text-slate-900 mb-2">Il tuo modello digitale è live.</p>
      <p className="text-base text-slate-500 mb-8">È stato più semplice di quanto pensavi.</p>
      <div className="border-t border-gray-200 pt-6 mt-6">
        <p className="text-sm text-slate-900 italic">Grazie a te per la fiducia.</p>
        <p className="text-xs text-slate-500 mt-1">— Claudio Bertogliatti e il team Evolution PRO</p>
      </div>
      <button
        type="button"
        onClick={onDismissCelebrazione}
        className="mt-8 bg-yellow-400 text-slate-900 font-semibold px-6 py-2.5 rounded-md text-sm hover:bg-yellow-500"
      >
        Andiamo all'operativo →
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Crea operativo continuo placeholder**

```jsx
// frontend/src/ciak/partner/operativo/steps/OperativoContinuo.jsx
import React from "react";

export default function OperativoContinuo() {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-8">
      <span className="inline-block text-[10px] font-semibold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
        Operativo continuo
      </span>
      <h2 className="text-xl font-semibold text-slate-900 mt-2 mb-4 tracking-tight">
        Sei in produzione.
      </h2>
      <p className="text-sm text-slate-900 mb-2">
        Da qui ci concentriamo su KPI vendite + next-best-action mensile.
      </p>
      <p className="text-xs text-slate-500">
        🚧 Questa sezione è in costruzione. Per ora trovi tutto sulla vecchia dashboard
        (link "Strumenti avanzati" nel menu).
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/operativo/steps/Step13Lancio.jsx \
        frontend/src/ciak/partner/operativo/steps/StepFinaleCelebrativa.jsx \
        frontend/src/ciak/partner/operativo/steps/OperativoContinuo.jsx
git commit -m "feat(operativo): Step 13 + celebrazione + operativo continuo"
```

---

## Phase 5 — Migration + switch + smoke

### Task 23: Switch route partner default → /operativo

**Files:**
- Modify: `frontend/src/ciak/partner/CiakPartnerApp.jsx`

- [ ] **Step 1: Identifica struttura routing esistente**

Run: `cd frontend && grep -nE "Route|partner|operativo|Dashboard" src/ciak/partner/CiakPartnerApp.jsx | head -20`

- [ ] **Step 2: Aggiungi route /operativo e cambia default**

Modifica `frontend/src/ciak/partner/CiakPartnerApp.jsx`:

1. Aggiungi import:
```jsx
import PartnerOperativo from "./operativo/PartnerOperativo";
```

2. Aggiungi nuova route prima della rotta catch-all (e prima della dashboard default):
```jsx
<Route path="/operativo" element={<PartnerOperativo partnerId={partner?.id} />} />
```

3. Cambia il default redirect da `/dashboard` a `/operativo`:
   - Trova `<Navigate to="/dashboard" />` o simile → sostituisci con `<Navigate to="/operativo" />`
   - Mantieni `/dashboard` come route accessibile (montaggio vecchia `PartnerDashboard`)

4. Aggiungi voce menu "Strumenti avanzati" puntando a `/dashboard`:
   - Trova la sidebar/hamburger menu nel CiakPartnerApp
   - Aggiungi un link `<a href="/partner/dashboard">Strumenti avanzati</a>` visivamente secondario (text-xs, text-slate-500)

- [ ] **Step 3: Smoke test manuale frontend**

Run dev server (`cd frontend && npm run dev`) e verifica:
1. Login come partner → atterra su `/operativo`
2. Vedi progress bar 1/13 + Stefania top + Step 1 Contratto
3. Voce menu "Strumenti avanzati" presente → click ti porta su `/dashboard` (vecchia)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/ciak/partner/CiakPartnerApp.jsx
git commit -m "feat(operativo): switch partner default route /operativo + Strumenti avanzati menu link"
```

---

### Task 24: Esegui migrazione 26 partner esistenti

**Files:**
- Esegui: `backend/scripts/seed_partner_journey_v1.py` (creato in Task 7)

- [ ] **Step 1: Backup MongoDB (precauzione)**

Run sul server di produzione o dump locale:
```bash
mongodump --uri="$MONGO_URL" --db=evolution_pro --collection=partners --out=/tmp/backup-partners-pre-journey-$(date +%s)
```
Verifica file `.bson` creato.

- [ ] **Step 2: Dry-run (lettura senza scrittura)**

Aggiungi temporaneamente un flag `--dry-run` allo script, oppure esegui in ambiente staging contro un DB clone. In assenza di staging:

Run: `cd backend && python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import os, asyncio
async def main():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ.get('DB_NAME', 'evolution_pro')]
    parts = await db.partners.find({'active': True}, {'id':1, 'name':1, 'phase':1}).to_list(200)
    print(f'Partner attivi: {len(parts)}')
    from collections import Counter
    print('Distribuzione fasi:', dict(Counter(p.get('phase','?') for p in parts)))
asyncio.run(main())"`

Annota distribuzione fasi (es. F1: 10, F3: 8, F5: 6, F7: 2). Verifica plausibile.

- [ ] **Step 3: Esegui migrazione**

Run: `cd backend && python -m scripts.seed_partner_journey_v1`
Expected: output con elenco partner seedati, no errori. Es:
```
Found 26 active partners
  + 1 (Marco Ferretti): 13 step seedati, start=14 (phase=F7)
  + 2 (...): 13 step seedati, start=4 (phase=F2)
  ...
Done. Seedati: 26, skip (già esistenti): 0
```

- [ ] **Step 4: Verifica post-migrazione**

Run: `curl -s http://localhost:8000/api/partner-journey/operativo/state/1 | python -m json.tool | head -20`
Expected: stato 13 step per partner_id=1, con current_step corretto.

- [ ] **Step 5: Commit (script eventuale ulteriore fix se serve)**

Se durante la migrazione hai dovuto aggiustare lo script (es. caso edge), committa.

---

### Task 25: Smoke test end-to-end del golden path

**Files:**
- Verifica manuale + opzionalmente `backend/tests/test_partner_journey_operativo.py`

- [ ] **Step 1: Test end-to-end manuale completo**

Procedura (dura ~5 minuti):

1. Login come partner test fresh (es. nuovo account creato per QA):
   - Vai su `https://www.ciak.io/partner` (o ambiente staging)
   - Login → atterra su `/operativo` con step 1 "Contratto + distinta"
2. Upload 2 PDF placeholder → click "Fatto, avanti →" → step 2 si apre
3. Click "L'ho visto, avanti →" → step 3 si apre
4. Upload logo + foto + scegli 3 colori → "Fatto, avanti →" → step 4 si apre
5. Compila 8 domande, ognuna >5 caratteri → "Fatto, avanti →"
6. Scrivi script >100 caratteri → "Fatto, avanti →"
7. ... continua fino a step 13 (puoi fare TUTTI gli step in <10 minuti se preparato)
8. Step 13: spunta tutta la checklist → "Lancio! 🚀"
9. Verifica appare `StepFinaleCelebrativa` con messaggio "Hai fatto tutto."
10. Click "Andiamo all'operativo →" → vedi `OperativoContinuo` placeholder

- [ ] **Step 2: Run completo test suite backend**

Run: `cd backend && python -m pytest tests/test_partner_journey_operativo.py -v`
Expected: tutti i test verdi.

- [ ] **Step 3: Commit final tag**

```bash
git tag -a operativo-stefania-v1 -m "Sub-progetto A complete: Operativo Stefania v1"
git push origin operativo-stefania-v1
```

---

## Out of scope (rimandato a sub-progetti successivi)

- **Sub-progetto B (Generatori AI)**: Step 5/6/11/12 oggi sono textarea libere. B aggiunge endpoint `/api/partner-journey/operativo/generate/{step_id}` che chiama Claude API con prompt strutturati per generare bozze script/outline/calendario/strategia.
- **Sub-progetto C (Asset + handoff Systeme)**: l'upload file usa endpoint `/api/upload/file` generico esistente. C aggiunge una checklist Antonella in `ciak/admin/funnel-builds/{partner_id}` che mostra tutti gli asset di step 9 + bottone "marca step 10 done quando funnel pubblicato".
- **Sub-progetto D (Editing video assistito)**: Step 7/8 oggi sono upload semplice. D aggiunge pipeline video-use B che pulisce/sottotitola/renderizza i grezzi automaticamente.
- **Notifiche Telegram/email step 9→10**: non in MVP. Antonella vede l'admin dashboard ogni mattina (Sub-prog C la rifinisce).
- **Celery task `check_inactive_journey_steps`**: non in MVP. Per i primi 3-6 partner che useranno l'operativo, Claudio/Antonella monitorano manualmente.
- **Admin endpoint reopen step**: non in MVP. Per riaprire uno step bloccato, query Mongo manuale temporanea.

---

## Self-review

✅ **Spec coverage:**
- §3 Layout B → Task 10-13 (container + ProgressBar + StefaniaVoiceNarrante + StefaniaDrawer)
- §4 13 step + 2 → Task 15-22
- §5 4 modalità Stefania → Task 9 (system prompt) + Task 12 (UI briefing default)
- §6 sostituisce home → Task 23
- §7 architettura backend → Task 1-7
- §7.3 Stefania context → Task 8
- §8 fuori scope → "Out of scope" sezione finale plan
- §9 criteri accettazione → Task 25 smoke test e2e
- §10 decisioni locked:
  - 1 (re-do done) → Task 10 `viewingStepId` + ProgressBar `onStepClick`
  - 2 (multi-device autosave) → Task 5 save-draft + Task 10 hook
  - 3 (migrazione 26 partner) → Task 7 + Task 24
  - 4 (no validation v1) → assente per design (nessun task aggiunto)

✅ **Placeholder scan:** Tutti i task hanno codice completo. Le "🚧 sezione in costruzione" sono UI labels per il partner, non placeholder del piano.

✅ **Type consistency:** `JourneyStepStatus` enum coerente, `step_id` slug usato uniformemente in backend (DB), endpoint (path), frontend (key dict STEP_COMPONENTS). Hook `useJourneyState` espone `completeStep`/`saveDraft` con stesse signature in tutti gli step component.

✅ **Notes ambiguità risolte inline:** Task 19 ha pattern templato per 4 step gemelli con istruzioni esplicite per le varianti (non "do similar to Step 5" — è esplicitato).
