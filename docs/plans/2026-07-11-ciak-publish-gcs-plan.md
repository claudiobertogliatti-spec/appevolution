# Ciak Publish su GCS (Fase 1B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dopo l'approvazione dei tagli, montare la lezione videocorso e pubblicarla **su GCS** (non YouTube), esponendo un **link permanente servito da Ciak** (copia-incolla in Systeme) e salvandolo nei **File del partner** (`db.files`).

**Architecture:** Un modulo puro `backend/services/ciak_publish.py` (path GCS, URL Ciak, snippet embed, record File partner) + modifica al ramo **videocorso** di `_apply_approved_cuts` in `video_pipeline_task.py` (upload GCS via `_gcs_upload_public` invece di YouTube + insert in `db.files`) + endpoint di serving `GET /api/lesson-video/{pid}/{lesson_id}` (redirect 302 all'URL GCS).

**Tech Stack:** Python 3.11, `google-cloud-storage` (helper `_gcs_upload_public` già esistente), FastAPI, pytest (`unit`).

**Riferimenti:** spec `docs/specs/2026-07-11-ciak-editing-studio-design.md`. Fatti dal codice:
- Upload GCS pubblico: `_gcs_upload_public(local_path, blob_subpath, content_type) -> public_url` (video_pipeline_task.py:977).
- File partner: collezione `db.files` (campi `file_id, partner_id, original_name, category, internal_url`).
- Montaggio lezione: ramo `is_lesson` in `_apply_approved_cuts` (video_pipeline_task.py) — oggi fa `upload_to_youtube_sync` e scrive `lessons.{lid}.video_youtube_url/embed_url`.

---

### Task 1: `ciak_publish.py` — helper puri (path GCS, URL Ciak, snippet, record file)

**Files:**
- Create: `backend/services/ciak_publish.py`
- Test: `backend/tests/test_ciak_publish.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_ciak_publish.py
import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_publish as cp

pytestmark = pytest.mark.unit


def test_edited_gcs_subpath():
    assert cp.edited_gcs_subpath("23", "m1_l2", 3) == "edited_videos/23/m1_l2/v3.mp4"


def test_ciak_lesson_url_default_base():
    assert cp.ciak_lesson_url("23", "m1_l2") == "https://www.ciak.io/api/lesson-video/23/m1_l2"


def test_ciak_lesson_url_custom_base_strips_slash():
    assert cp.ciak_lesson_url("23", "m1_l2", base="https://www.ciak.io/") == "https://www.ciak.io/api/lesson-video/23/m1_l2"


def test_embed_snippet():
    s = cp.embed_snippet("https://www.ciak.io/api/lesson-video/23/m1_l2")
    assert s.startswith("<video") and 'src="https://www.ciak.io/api/lesson-video/23/m1_l2"' in s and "controls" in s


def test_partner_file_doc():
    doc = cp.partner_file_doc("23", "m1_l2", "Il corpo non mente",
                              "https://www.ciak.io/api/lesson-video/23/m1_l2", now="2026-07-11T10:00:00Z")
    assert doc["partner_id"] == "23"
    assert doc["category"] == "lezione_video"
    assert doc["internal_url"] == "https://www.ciak.io/api/lesson-video/23/m1_l2"
    assert doc["original_name"] == "Il corpo non mente"
    assert doc["lesson_id"] == "m1_l2"
    assert isinstance(doc["file_id"], str) and len(doc["file_id"]) >= 8
    assert doc["created_at"] == "2026-07-11T10:00:00Z"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_ciak_publish.py -q`
Expected: FAIL con `ModuleNotFoundError: No module named 'services.ciak_publish'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/ciak_publish.py
"""
Ciak Publish — helper PURI per la pubblicazione delle lezioni montate su GCS.

Nessun I/O: costruisce path GCS, URL permanente servito da Ciak, snippet embed e
il record da inserire nei File del partner (collezione db.files).
"""
from __future__ import annotations

import uuid

DEFAULT_BASE = "https://www.ciak.io"
EDITED_PREFIX = "edited_videos"
LESSON_VIDEO_CATEGORY = "lezione_video"


def edited_gcs_subpath(partner_id: str, lesson_id: str, version: int) -> str:
    """Sub-path GCS del montato: edited_videos/{pid}/{lesson_id}/v{version}.mp4."""
    return f"{EDITED_PREFIX}/{partner_id}/{lesson_id}/v{int(version)}.mp4"


def ciak_lesson_url(partner_id: str, lesson_id: str, base: str = DEFAULT_BASE) -> str:
    """Link permanente servito da Ciak (redirect verso GCS)."""
    return f"{base.rstrip('/')}/api/lesson-video/{partner_id}/{lesson_id}"


def embed_snippet(url: str) -> str:
    """Snippet HTML da incollare in Systeme (blocco codice)."""
    return f'<video src="{url}" controls width="720" style="max-width:100%"></video>'


def partner_file_doc(partner_id: str, lesson_id: str, title: str, ciak_url: str, now: str) -> dict:
    """Record da inserire in db.files (I Miei File del partner)."""
    return {
        "file_id": uuid.uuid4().hex,
        "partner_id": str(partner_id),
        "lesson_id": lesson_id,
        "original_name": title or f"Lezione {lesson_id}",
        "category": LESSON_VIDEO_CATEGORY,
        "internal_url": ciak_url,
        "created_at": now,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_ciak_publish.py -q`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ciak_publish.py backend/tests/test_ciak_publish.py
git commit -m "feat(publish): helper puri ciak_publish (gcs path, ciak url, embed, file record)"
```

---

### Task 2: Montaggio videocorso → GCS + File partner (invece di YouTube)

**Files:**
- Modify: `backend/video_pipeline_task.py` — ramo `is_lesson` di `_apply_approved_cuts` (la sezione che oggi fa `upload_to_youtube_sync` e scrive i campi YouTube della lezione).

- [ ] **Step 1: Leggere la sezione da modificare**

Run: `cd backend && py -c "s=open('video_pipeline_task.py',encoding='utf-8').read(); i=s.find('async def _apply_approved_cuts'); print(s[i:i+60])"`
Expected: stampa l'inizio della funzione (conferma che esiste).

Aprire `_apply_approved_cuts` e individuare, nel ramo `is_lesson` (`video_type == "videocorso"`), il punto in cui — dopo aver prodotto `final_path` — si fa `upload_to_youtube_sync(...)` e si scrivono i campi `{lk}.video_youtube_url`, `{lk}.video_embed_url`, `pipeline_status="ready_for_review"`.

- [ ] **Step 2: Sostituire l'upload YouTube con upload GCS + File partner (solo ramo lezione)**

Nel ramo `is_lesson`, sostituire l'upload YouTube e la scrittura dei campi finali con:

```python
        # PUBBLICAZIONE VIDEOCORSO: GCS invece di YouTube (link servito da Ciak)
        from services.ciak_publish import edited_gcs_subpath, ciak_lesson_url, partner_file_doc
        _vc = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"lessons." + lesson_id: 1}) or {}
        _prev = ((_vc.get("lessons") or {}).get(lesson_id) or {})
        _version = int(_prev.get("output_version") or 0) + 1
        _subpath = edited_gcs_subpath(partner_id, lesson_id, _version)
        try:
            _public_url = _gcs_upload_public(final_path, _subpath, "video/mp4")
        except Exception as _up_err:
            logger.error(f"[VIDEO-APPLY] Upload GCS lezione fallito: {_up_err}")
            await _set("error", {"video_pipeline_error": f"Upload GCS fallito: {str(_up_err)[:200]}"})
            return
        _ciak_url = ciak_lesson_url(partner_id, lesson_id)
        _lesson_title = _prev.get("title") or _prev.get("titolo") or f"Lezione {lesson_id}"
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.partner_videocorso.update_one(
            {"partner_id": partner_id},
            {"$set": {
                f"{lk}.pipeline_status": "ready_for_review",
                f"{lk}.output_gcs_url": _public_url,
                f"{lk}.output_version": _version,
                f"{lk}.video_embed_url": _ciak_url,
                f"{lk}.video_transcript": (transcript or "")[:5000],
                f"{lk}.video_filler_report": filler_report,
                f"{lk}.video_raw_duration_s": int(raw_dur),
                f"{lk}.video_final_duration_s": int(final_dur),
                f"{lk}.video_time_saved_s": int(raw_dur - final_dur),
                f"{lk}.video_approved": False,
                f"{lk}.video_reviewed": True,
                f"{lk}.pipeline_completed_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        # Salva il link nei File del partner (idempotente per lesson_id)
        try:
            _fdoc = partner_file_doc(partner_id, lesson_id, _lesson_title, _ciak_url, now_iso)
            await db.files.update_one(
                {"partner_id": str(partner_id), "lesson_id": lesson_id, "category": "lezione_video"},
                {"$set": _fdoc}, upsert=True,
            )
        except Exception as _fe:
            logger.warning(f"[VIDEO-APPLY] Salvataggio File partner non bloccante: {_fe}")
        logger.info(f"[VIDEO-APPLY] Lezione {lesson_id} pubblicata su GCS: {_public_url}")
        return
```

> NOTA implementatore: mantenere il ramo **masterclass** invariato (continua su YouTube).
> Verificare i nomi in scope nel ramo lezione: `final_path`, `raw_dur`, `final_dur`, `transcript`,
> `filler_report`, `lk`, `lesson_id`, `partner_id`, `_set`, `_gcs_upload_public`, `db`, `logger`,
> `datetime`, `timezone`. Se qualcosa non è in scope → BLOCKED con i nomi mancanti.

- [ ] **Step 3: Compilare**

Run: `cd backend && py -m py_compile video_pipeline_task.py`
Expected: nessun errore

- [ ] **Step 4: Commit**

```bash
git add backend/video_pipeline_task.py
git commit -m "feat(publish): montaggio videocorso pubblica su GCS + File partner (no YouTube)"
```

---

### Task 3: Endpoint di serving `GET /api/lesson-video/{pid}/{lesson_id}`

**Files:**
- Create: `backend/routers/lesson_video.py`
- Modify: `backend/server.py` (registrazione router: `include_router` + `set_db`)
- Test: `backend/tests/test_lesson_video_router.py`

- [ ] **Step 1: Write the failing test (redirect builder puro)**

```python
# backend/tests/test_lesson_video_router.py
import os
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from routers import lesson_video as lv

pytestmark = pytest.mark.unit


def test_resolve_lesson_url_from_doc():
    vc = {"lessons": {"m1_l2": {"output_gcs_url": "https://storage.googleapis.com/b/edited_videos/23/m1_l2/v1.mp4"}}}
    assert lv._resolve_output_url(vc, "m1_l2") == "https://storage.googleapis.com/b/edited_videos/23/m1_l2/v1.mp4"


def test_resolve_lesson_url_missing():
    assert lv._resolve_output_url({"lessons": {}}, "m1_l2") is None
    assert lv._resolve_output_url(None, "m1_l2") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && py -m pytest tests/test_lesson_video_router.py -q`
Expected: FAIL con `ModuleNotFoundError: No module named 'routers.lesson_video'`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/routers/lesson_video.py
"""
Serving pubblico del video-lezione montato: link permanente Ciak → redirect a GCS.
`GET /api/lesson-video/{partner_id}/{lesson_id}` → 302 verso l'URL GCS del montato.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/api/lesson-video", tags=["lesson-video"])

db = None


def set_db(database) -> None:
    global db
    db = database


def _resolve_output_url(vc_doc, lesson_id: str):
    if not vc_doc:
        return None
    lesson = (vc_doc.get("lessons") or {}).get(lesson_id) or {}
    return lesson.get("output_gcs_url") or None


@router.get("/{partner_id}/{lesson_id}")
async def serve_lesson_video(partner_id: str, lesson_id: str):
    if db is None:
        raise HTTPException(503, "Database non configurato")
    vc = await db.partner_videocorso.find_one({"partner_id": partner_id}, {"lessons." + lesson_id: 1})
    url = _resolve_output_url(vc, lesson_id)
    if not url:
        raise HTTPException(404, "Video lezione non disponibile")
    return RedirectResponse(url, status_code=302)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && py -m pytest tests/test_lesson_video_router.py -q`
Expected: PASS (2 test)

- [ ] **Step 5: Registrare il router in server.py**

In `backend/server.py`, vicino agli altri `include_router` (es. dove è registrato `ciak_admin_router`), aggiungere:

```python
from routers.lesson_video import router as lesson_video_router, set_db as set_lesson_video_db
set_lesson_video_db(db)
app.include_router(lesson_video_router)
```

- [ ] **Step 6: Compilare + commit**

Run: `cd backend && py -m py_compile routers/lesson_video.py server.py`
Expected: nessun errore

```bash
git add backend/routers/lesson_video.py backend/tests/test_lesson_video_router.py backend/server.py
git commit -m "feat(publish): endpoint /api/lesson-video (redirect permanente a GCS)"
```

---

### Task 4: Admin — link + copia + snippet nella card di approvazione lezione

**Files:**
- Modify: `frontend/src/ciak/admin/pages/VideoReview.jsx` (VideoCard: se `video_type/type === "videocorso"` e c'è `video_embed_url` Ciak, mostrare il link + bottone Copia + snippet)

- [ ] **Step 1: Aggiungere il blocco link nella VideoCard**

Nel componente `VideoCard`, nella riga Actions (dove ci sono già i `CopyButton` per YouTube), aggiungere — quando `video.embed_url` (o `video.video_embed_url`) inizia con `/api/lesson-video` o con `https://www.ciak.io/api/lesson-video`:

```jsx
        {video.video_embed_url && String(video.video_embed_url).includes("/api/lesson-video/") && (
          <>
            <a href={video.video_embed_url} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
               style={{ background: C.blueDim, color: C.blue, border: `1px solid #BFDBFE` }}>
              <Play className="w-3.5 h-3.5" /> Apri video (Ciak)
            </a>
            <CopyButton text={video.video_embed_url} label="Copia link Ciak" />
            <CopyButton text={`<video src="${video.video_embed_url}" controls width="720" style="max-width:100%"></video>`} label="Copia embed Systeme" />
          </>
        )}
```

> NOTA: confermare che l'aggregazione `/api/admin/video-review` esponga `video_embed_url` per le
> lezioni videocorso; se il campo ha un altro nome, adeguare (leggere l'endpoint in `server.py`/
> `routers`). Non modificare il ramo masterclass/YouTube.

- [ ] **Step 2: Build frontend**

Run: `cd frontend && DISABLE_ESLINT_PLUGIN=true CI=false npm run build`
Expected: build OK, `build/index.ciak.html` generato

- [ ] **Step 3: Commit**

```bash
git add frontend/src/ciak/admin/pages/VideoReview.jsx
git commit -m "feat(publish): admin mostra link Ciak + copia + snippet Systeme per lezioni videocorso"
```

---

## Verifica E2E (dopo deploy backend+worker+frontend)
Su una lezione di Daniele già a `da_revisionare` (es. `m1_l2`): dalla pagina "Revisione del taglio"
premere **"Approva e monta"** → attendere `ready_for_review` → verificare che `output_gcs_url` sia
un URL `storage.googleapis.com/...`, che `GET https://www.ciak.io/api/lesson-video/23/m1_l2` faccia
**redirect 302** al video, che il record sia in **`db.files`**, e che l'admin mostri il **link Ciak +
copia + snippet**. Incollare il link in Systeme come prova finale (blocco HTML custom).

## Note
- Modifica `backend/**`+`frontend/**` → push su `main` triggera deploy backend/worker (+ Vercel).
- `GCS_RENDER_BUCKET` (usato da `_gcs_upload_public`) deve essere impostato sul worker (già usato dal path GCS-fallback esistente).
- Il ramo **masterclass** resta su YouTube (fuori scope Fase 1B).

## Prossimo (Fase 2)
Intro/outro voce unica HeyGen (intro dinamica, outro template), montati prima/dopo la lezione.
