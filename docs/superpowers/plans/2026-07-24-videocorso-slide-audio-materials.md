# Videocorso Slide, Audio e Materiali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generare, far approvare, montare e pubblicare per ogni lezione del videocorso un deck PPTX/PDF, l'audio originale e un ripasso audio Ciak a due voci, con consegna automatica nella lezione Systeme.io del partner.

**Architecture:** La fonte di verità rimane `partner_videocorso.lessons.<lesson_id>.learning_materials`. Servizi piccoli e indipendenti generano deck strutturato, file, timing video e audio; il router orchestra autorizzazioni e approvazioni; Celery esegue i lavori pesanti; il publisher Systeme.io aggiorna in modo idempotente la lezione esistente.

**Tech Stack:** FastAPI, MongoDB/Motor, Celery/Redis, Google Cloud Storage, Anthropic gateway esistente, `python-pptx`, LibreOffice headless, FFmpeg, Google Cloud Text-to-Speech, React, Jest, Pytest.

## Global Constraints

- Un notebook o servizio NotebookLM non fa parte dell'implementazione.
- Non modificare il system prompt di Matteo.
- Solo il partner proprietario può approvare definitivamente deck, video e ripasso audio.
- Il caricamento del video grezzo è bloccato finché il deck non è approvato.
- Il video mostra slide 16:9 a schermo intero mantenendo l'audio originale continuo.
- Il numero di slide e gli inserti sono decisi dall'AI in base ai concetti pronunciati.
- Ogni modifica successiva al deck crea una nuova versione e invalida timing e video derivati.
- Il ripasso usa due voci italiane neutre, senza nomi o avatar.
- Il ripasso viene pubblicato soltanto dopo un'approvazione separata.
- Ciak/GCS è la fonte di verità; Systeme.io è il canale di fruizione.
- La pubblicazione Systeme.io deve essere idempotente e non creare lezioni duplicate.
- Tutti gli endpoint partner devono usare `require_partner_or_admin_for_partner`; l'approvazione verifica inoltre che il token appartenga al partner, non a un admin.
- Il rollout è protetto da `LESSON_MATERIALS_ENABLED`; default `false`.

---

## Tranche A — Deck, versionamento e approvazione

### Task 1: Modello di dominio dei materiali lezione

**Files:**
- Create: `backend/services/lesson_materials_domain.py`
- Test: `backend/tests/test_lesson_materials_domain.py`

**Interfaces:**
- Consumes: dizionario Mongo della singola lezione.
- Produces: `new_learning_materials()`, `next_deck_version(materials)`, `approve_deck(materials, actor_id, sha256, now)`, `invalidate_deck_derivatives(materials)`, `partner_can_upload_video(materials)`.

- [ ] **Step 1: Scrivere i test fallenti**

```python
from datetime import datetime, timezone
from services.lesson_materials_domain import (
    approve_deck,
    invalidate_deck_derivatives,
    new_learning_materials,
    next_deck_version,
    partner_can_upload_video,
)


def test_new_materials_start_blocked():
    materials = new_learning_materials()
    assert materials["deck"]["status"] == "not_started"
    assert materials["video"]["status"] == "waiting_slides"
    assert partner_can_upload_video(materials) is False


def test_approve_deck_freezes_version_and_unlocks_video():
    materials = new_learning_materials()
    materials["deck"].update({"status": "review_required", "version": 1})
    approved = approve_deck(
        materials, actor_id="partner-1", sha256="abc",
        now=datetime(2026, 7, 24, tzinfo=timezone.utc),
    )
    assert approved["deck"]["status"] == "approved"
    assert approved["deck"]["approved_by"] == "partner-1"
    assert approved["deck"]["sha256"] == "abc"
    assert approved["video"]["status"] == "ready_for_video"
    assert partner_can_upload_video(approved) is True


def test_new_deck_version_invalidates_timing_and_video():
    materials = new_learning_materials()
    materials["deck"].update({"status": "approved", "version": 2})
    materials["video"].update({"status": "approved", "source_deck_version": 2})
    materials["timing_plan"] = [{"slide_id": "s1", "start_s": 8, "end_s": 14}]
    invalidated = invalidate_deck_derivatives(materials)
    assert invalidated["deck"]["status"] == "review_required"
    assert invalidated["deck"]["version"] == 3
    assert invalidated["video"]["status"] == "waiting_slides"
    assert invalidated["timing_plan"] == []
    assert next_deck_version(invalidated) == 4
```

- [ ] **Step 2: Verificare il fallimento**

Run:

```bash
cd backend
pytest -q tests/test_lesson_materials_domain.py
```

Expected: collection error perché `services.lesson_materials_domain` non esiste.

- [ ] **Step 3: Implementare il dominio senza I/O**

```python
from copy import deepcopy


def new_learning_materials() -> dict:
    return {
        "deck": {"status": "not_started", "version": 0},
        "video": {"status": "waiting_slides"},
        "original_audio": {"status": "waiting_video"},
        "audio_recap": {"status": "waiting_video", "version": 0},
        "systeme": {"status": "not_ready", "assets": {}},
        "timing_plan": [],
    }


def next_deck_version(materials: dict) -> int:
    return int(materials.get("deck", {}).get("version", 0)) + 1


def partner_can_upload_video(materials: dict) -> bool:
    return materials.get("deck", {}).get("status") == "approved"


def approve_deck(materials: dict, actor_id: str, sha256: str, now) -> dict:
    result = deepcopy(materials)
    result["deck"].update({
        "status": "approved",
        "sha256": sha256,
        "approved_by": actor_id,
        "approved_at": now.isoformat(),
    })
    result["video"]["status"] = "ready_for_video"
    return result


def invalidate_deck_derivatives(materials: dict) -> dict:
    result = deepcopy(materials)
    result["deck"]["version"] = next_deck_version(result)
    result["deck"]["status"] = "review_required"
    result["video"] = {"status": "waiting_slides"}
    result["timing_plan"] = []
    result["systeme"] = {"status": "not_ready", "assets": {}}
    return result
```

- [ ] **Step 4: Eseguire i test**

Run: `cd backend && pytest -q tests/test_lesson_materials_domain.py`

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/services/lesson_materials_domain.py backend/tests/test_lesson_materials_domain.py
git commit -m "feat(videocorso): add lesson materials domain"
```

### Task 2: Generatore grounded del deck

**Files:**
- Create: `backend/services/lesson_deck.py`
- Test: `backend/tests/test_lesson_deck.py`
- Reference: `backend/services/webinar_deck.py`

**Interfaces:**
- Consumes: `generate_lesson_deck(script: str, lesson_title: str, brand: dict, sources: list[dict])`.
- Produces: `{"title": str, "slides": list[SlideSpec], "source": "ai"|"fallback"}`; ogni `SlideSpec` contiene `slide_id`, `order`, `title`, `body`, `visual_direction`, `source_excerpt`, `concept_key`, `speaker_note`.

- [ ] **Step 1: Scrivere i test fallenti**

```python
from services.lesson_deck import normalize_deck, validate_grounding


def test_normalize_deck_assigns_stable_ids_and_orders():
    raw = {"title": "Lezione 1", "slides": [
        {"title": "Il problema", "body": ["Uno", "Due"], "source_excerpt": "Uno"},
        {"title": "Il metodo", "body": ["Passo A"], "source_excerpt": "Passo A"},
    ]}
    deck = normalize_deck(raw)
    assert [s["slide_id"] for s in deck["slides"]] == ["slide-001", "slide-002"]
    assert [s["order"] for s in deck["slides"]] == [1, 2]


def test_validate_grounding_rejects_excerpt_missing_from_sources():
    deck = {"slides": [{"source_excerpt": "dato inventato"}]}
    assert validate_grounding(deck, "testo approvato") is False


def test_validate_grounding_accepts_normalized_excerpt():
    deck = {"slides": [{"source_excerpt": "Il metodo parte dal problema reale."}]}
    assert validate_grounding(deck, "IL METODO parte dal problema reale") is True
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_deck.py`

Expected: import error.

- [ ] **Step 3: Implementare schema, prompt e fallback**

Implementare:

```python
def normalize_deck(raw: dict) -> dict:
    slides = []
    for index, item in enumerate(raw.get("slides") or [], start=1):
        slides.append({
            "slide_id": f"slide-{index:03d}",
            "order": index,
            "title": str(item.get("title") or "").strip(),
            "body": [str(x).strip() for x in item.get("body") or [] if str(x).strip()],
            "visual_direction": str(item.get("visual_direction") or "").strip(),
            "source_excerpt": str(item.get("source_excerpt") or "").strip(),
            "concept_key": str(item.get("concept_key") or f"concept-{index:03d}").strip(),
            "speaker_note": str(item.get("speaker_note") or "").strip(),
        })
    return {"title": str(raw.get("title") or "").strip(), "slides": slides}
```

Il prompt deve imporre:

```text
Una slide = un concetto. Usa soltanto fatti presenti nello script e nelle fonti.
source_excerpt deve essere una citazione breve letterale della fonte.
Non creare statistiche, promesse, testimonianze o citazioni.
Il numero di slide dipende dalla densità didattica, non da una quota fissa.
Testo a schermo breve: titolo massimo 9 parole, massimo 4 bullet da 12 parole.
```

`generate_lesson_deck()` deve usare lo stesso gateway LLM strutturato di `webinar_deck.py`; se l'output non è valido, il fallback crea una slide per ciascun titolo/sezione riconoscibile nello script senza inventare testo.

- [ ] **Step 4: Eseguire i test**

Run: `cd backend && pytest -q tests/test_lesson_deck.py`

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/services/lesson_deck.py backend/tests/test_lesson_deck.py
git commit -m "feat(videocorso): generate grounded lesson decks"
```

### Task 3: Renderer PPTX, PDF, immagini e storage

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/Dockerfile`
- Create: `backend/services/lesson_deck_renderer.py`
- Create: `backend/services/lesson_material_storage.py`
- Test: `backend/tests/test_lesson_deck_renderer.py`

**Interfaces:**
- Consumes: `render_deck(deck: dict, brand: dict, output_dir: Path)`.
- Produces: `RenderedDeck(pptx_path, pdf_path, image_paths, sha256)`.
- Storage: `upload_material(partner_id, lesson_id, version, kind, path) -> StoredAsset`.

- [ ] **Step 1: Aggiungere test renderer fallenti**

```python
from pathlib import Path
from pptx import Presentation
from services.lesson_deck_renderer import render_deck


def test_render_deck_creates_editable_widescreen_pptx(tmp_path: Path):
    deck = {"title": "Lezione", "slides": [{
        "slide_id": "slide-001", "title": "Concetto",
        "body": ["Punto chiave"], "visual_direction": "", "speaker_note": "",
    }]}
    result = render_deck(deck, {"primary_color": "#0F172A", "accent_color": "#FACC15"}, tmp_path)
    prs = Presentation(result.pptx_path)
    assert round(prs.slide_width / prs.slide_height, 2) == round(16 / 9, 2)
    assert len(prs.slides) == 1
    assert result.pdf_path.exists()
    assert result.image_paths[0].exists()
    assert len(result.sha256) == 64
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_deck_renderer.py`

Expected: missing `pptx` o missing renderer.

- [ ] **Step 3: Aggiungere dipendenze e runtime**

In `backend/requirements.txt` aggiungere versioni fissate:

```text
python-pptx==1.0.2
google-cloud-texttospeech==2.27.0
```

Nel comando `apt-get install` di `backend/Dockerfile` aggiungere:

```dockerfile
libreoffice-impress \
fonts-dejavu-core \
fonts-liberation
```

- [ ] **Step 4: Implementare renderer e storage**

Il renderer deve:

```python
prs = Presentation()
prs.slide_width = Inches(13.333333)
prs.slide_height = Inches(7.5)
```

Creare solo text box, forme e immagini editabili. Usare `subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", ...], check=True, timeout=120)` per PDF e immagini, senza shell. Calcolare SHA-256 sul PPTX.

Lo storage deve usare il client GCS esistente e il percorso:

```text
learning-materials/{partner_id}/{lesson_id}/v{version}/{kind}/{filename}
```

Restituire soltanto path interni; URL firmati vengono creati on demand.

- [ ] **Step 5: Eseguire test e smoke container**

Run:

```bash
cd backend
pytest -q tests/test_lesson_deck_renderer.py
python -m compileall -q services/lesson_deck_renderer.py services/lesson_material_storage.py
```

Expected: test verde e compileall senza output.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/Dockerfile backend/services/lesson_deck_renderer.py backend/services/lesson_material_storage.py backend/tests/test_lesson_deck_renderer.py
git commit -m "feat(videocorso): render and store lesson decks"
```

### Task 4: API deck, approvazione partner e blocco upload

**Files:**
- Create: `backend/routers/lesson_materials.py`
- Modify: `backend/server.py`
- Modify: `backend/routers/partner_journey.py:1375-1422`
- Modify: `backend/routers/partner_journey.py:video upload/confirm routes`
- Test: `backend/tests/test_lesson_materials_routes.py`
- Test: `backend/tests/test_partner_journey_auth_unittest.py`

**Interfaces:**
- Produces:
  - `POST /api/lesson-materials/{partner_id}/{lesson_id}/deck/generate`
  - `POST /api/lesson-materials/{partner_id}/{lesson_id}/deck/upload`
  - `POST /api/lesson-materials/{partner_id}/{lesson_id}/deck/approve`
  - `POST /api/lesson-materials/{partner_id}/{lesson_id}/deck/regenerate`
  - `GET /api/lesson-materials/{partner_id}/{lesson_id}`
  - `GET /api/lesson-materials/{partner_id}/{lesson_id}/asset/{kind}`

- [ ] **Step 1: Scrivere test di autorizzazione e stato**

```python
async def test_admin_cannot_give_final_deck_approval(client, admin_headers, seeded_lesson):
    response = await client.post(
        "/api/lesson-materials/p1/l1/deck/approve", headers=admin_headers
    )
    assert response.status_code == 403


async def test_partner_cannot_upload_video_before_deck_approval(client, partner_headers):
    response = await client.post(
        "/api/partner-journey/video/confirm-upload",
        headers=partner_headers,
        json={"partner_id": "p1", "video_type": "videocorso", "lesson_id": "l1",
              "lesson_title": "L1", "gcs_path": "gs://bucket/raw.mp4"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Approva prima le slide della lezione."
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_materials_routes.py`

Expected: 404 sugli endpoint.

- [ ] **Step 3: Implementare router e guardia partner-only**

Il router usa `require_partner_or_admin_for_partner` per la lettura, ma l'approvazione chiama un helper:

```python
async def require_partner_owner(partner_id: str, credentials):
    token = await require_partner_or_admin_for_partner(partner_id, credentials)
    if token.role != "partner" or token.partner_id != partner_id:
        raise HTTPException(403, "Solo il partner può approvare definitivamente.")
    return token
```

La generazione viene accodata su Celery e scrive `deck.status=generating`. Upload:

- accetta solo `.pptx`;
- massimo 50 MB;
- valida ZIP/PPTX, aspect ratio 16:9 e almeno una slide;
- crea una nuova versione;
- rigenera PDF/immagini;
- invalida timing/video derivati.

- [ ] **Step 4: Bloccare conferma upload video**

Prima di accodare `process_partner_video`, leggere:

```python
materials = lesson.get("learning_materials") or new_learning_materials()
if not partner_can_upload_video(materials):
    raise HTTPException(409, "Approva prima le slide della lezione.")
```

- [ ] **Step 5: Eseguire test**

Run:

```bash
cd backend
pytest -q tests/test_lesson_materials_routes.py tests/test_partner_journey_auth_unittest.py
```

Expected: tutte verdi.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/lesson_materials.py backend/routers/partner_journey.py backend/server.py backend/tests/test_lesson_materials_routes.py backend/tests/test_partner_journey_auth_unittest.py
git commit -m "feat(videocorso): add deck review and approval API"
```

### Task 5: UI partner per script, slide e registrazione

**Files:**
- Create: `frontend/src/ciak/partner/operativo/LessonMaterialsCard.jsx`
- Create: `frontend/src/ciak/partner/operativo/LessonMaterialsCard.test.jsx`
- Modify: `frontend/src/ciak/partner/operativo/Workspace2Corso.jsx`

**Interfaces:**
- Consumes: stato restituito da `GET /api/lesson-materials/{partner_id}/{lesson_id}`.
- Produces: callback `onChanged()` che ricarica lo stato workspace.

- [ ] **Step 1: Scrivere test UI fallenti**

```jsx
test("blocca la registrazione finché le slide non sono approvate", () => {
  render(<LessonMaterialsCard partnerId="p1" lesson={lessonWithDeckReview} />);
  expect(screen.getByText("Approva le slide prima di registrare")).toBeInTheDocument();
  expect(screen.queryByLabelText("Carica video grezzo")).not.toBeInTheDocument();
});

test("mostra download, upload e approvazione del deck", () => {
  render(<LessonMaterialsCard partnerId="p1" lesson={lessonWithDeckReview} />);
  expect(screen.getByRole("link", {name: /scarica powerpoint/i})).toBeInTheDocument();
  expect(screen.getByLabelText(/carica powerpoint corretto/i)).toBeInTheDocument();
  expect(screen.getByRole("button", {name: /approva le slide/i})).toBeInTheDocument();
});
```

- [ ] **Step 2: Verificare il fallimento**

Run:

```bash
npm --prefix frontend test -- --watchAll=false --runInBand LessonMaterialsCard.test.jsx
```

Expected: module not found.

- [ ] **Step 3: Implementare componente e integrare Workspace**

Il componente presenta in ordine:

```text
1. Script approvato
2. Slide: anteprima PDF, Scarica PowerPoint, Carica correzione, Rigenera, Approva
3. Registrazione: visibile solo con deck.status === "approved"
4. Video definitivo
5. Audio originale
6. Ripasso audio Ciak
7. Pubblicazione Systeme.io
```

Non mostrare eccezioni, nomi Celery, bucket o path GCS. Usare `authHeaders()` per ogni chiamata.

- [ ] **Step 4: Eseguire test e build**

Run:

```bash
npm --prefix frontend test -- --watchAll=false --runInBand LessonMaterialsCard.test.jsx
npm --prefix frontend run build
```

Expected: test verde; build completata con soli warning preesistenti.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ciak/partner/operativo/LessonMaterialsCard.jsx frontend/src/ciak/partner/operativo/LessonMaterialsCard.test.jsx frontend/src/ciak/partner/operativo/Workspace2Corso.jsx
git commit -m "feat(videocorso): add lesson materials review UI"
```

---

## Tranche B — Timing e montaggio video

### Task 6: Motore di timing semantico

**Files:**
- Create: `backend/services/slide_timing.py`
- Test: `backend/tests/test_slide_timing.py`

**Interfaces:**
- Consumes: `build_timing_plan(slides, transcript_segments, confidence_threshold=0.78)`.
- Produces: lista `{"slide_id", "start_s", "end_s", "confidence", "reason"}`.

- [ ] **Step 1: Scrivere test fallenti**

```python
from services.slide_timing import build_timing_plan


def test_matches_slide_to_spoken_concept():
    slides = [{"slide_id": "s1", "concept_key": "test del contrario",
               "source_excerpt": "Se tutti possono dirlo non differenzia"}]
    segments = [{"start": 12.0, "end": 18.0,
                 "text": "Se questa promessa possono dirla tutti, non ci differenzia."}]
    plan = build_timing_plan(slides, segments, confidence_threshold=0.5)
    assert plan[0]["slide_id"] == "s1"
    assert plan[0]["start_s"] == 12.0
    assert 4 <= plan[0]["end_s"] - plan[0]["start_s"] <= 12


def test_drops_low_confidence_and_avoids_overlaps():
    slides = [
        {"slide_id": "s1", "concept_key": "uno", "source_excerpt": "uno"},
        {"slide_id": "s2", "concept_key": "due", "source_excerpt": "due"},
    ]
    segments = [{"start": 1, "end": 3, "text": "argomento estraneo"}]
    assert build_timing_plan(slides, segments, confidence_threshold=0.95) == []
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_slide_timing.py`

- [ ] **Step 3: Implementare matching deterministico più adapter semantico**

Il core deve essere puro e testabile:

```python
def clamp_duration(reading_seconds: float, spoken_seconds: float) -> float:
    return max(4.0, min(12.0, max(reading_seconds, spoken_seconds)))
```

Usare normalizzazione/token overlap come fallback. L'adapter AI riceve solo estratti e timestamp, restituisce punteggi; il core ordina, elimina sovrapposizioni e scarta punteggi sotto soglia. Escludere segmenti classificati `greeting`, `personal`, `transition`, `cta`.

- [ ] **Step 4: Eseguire test**

Run: `cd backend && pytest -q tests/test_slide_timing.py`

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/services/slide_timing.py backend/tests/test_slide_timing.py
git commit -m "feat(videocorso): map approved slides to transcript"
```

### Task 7: Compositore FFmpeg con audio continuo

**Files:**
- Create: `backend/services/video_slide_composer.py`
- Test: `backend/tests/test_video_slide_composer.py`
- Modify: `backend/Dockerfile` only if fonts added in Task 3 are insufficient.

**Interfaces:**
- Consumes: `compose_slides(video_path, slide_images, timing_plan, output_path)`.
- Produces: `CompositionResult(output_path, duration_s, audio_duration_s, inserted_slide_ids)`.

- [ ] **Step 1: Scrivere test d'integrazione FFmpeg**

Creare fixture video sintetico di 15 secondi con tono audio continuo e una PNG 1920×1080. Test:

```python
def test_composer_keeps_audio_duration_and_inserts_slide(video_fixture, slide_fixture, tmp_path):
    result = compose_slides(
        video_fixture,
        {"s1": slide_fixture},
        [{"slide_id": "s1", "start_s": 4.0, "end_s": 9.0}],
        tmp_path / "out.mp4",
    )
    assert result.inserted_slide_ids == ["s1"]
    assert abs(result.duration_s - result.audio_duration_s) < 0.08
    assert abs(result.duration_s - 15.0) < 0.15
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_video_slide_composer.py`

- [ ] **Step 3: Implementare comando FFmpeg senza shell**

Costruire `filter_complex` con overlay temporali o concatenazione video; mappare sempre l'audio originale:

```text
-map [video_out] -map 0:a? -c:v libx264 -c:a copy -shortest
```

Se `-c:a copy` non è compatibile col container di output, usare AAC 192k senza tagliare o filtrare la traccia. Validare con `ffprobe` durata video e audio.

- [ ] **Step 4: Eseguire test**

Run: `cd backend && pytest -q tests/test_video_slide_composer.py`

Expected: verde e differenza audio/video sotto 80 ms.

- [ ] **Step 5: Commit**

```bash
git add backend/services/video_slide_composer.py backend/tests/test_video_slide_composer.py
git commit -m "feat(videocorso): compose full-screen slide inserts"
```

### Task 8: Integrazione nella pipeline Celery

**Files:**
- Create: `backend/celery_lesson_materials.py`
- Modify: `backend/celery_app.py`
- Modify: `backend/video_pipeline_task.py:videocorso branch around approved_script and final upload`
- Test: `backend/tests/test_lesson_materials_pipeline.py`

**Interfaces:**
- Produces task:
  - `generate_lesson_deck_task(partner_id, lesson_id, version)`
  - `compose_lesson_slides_task(partner_id, lesson_id, source_video_path)`

- [ ] **Step 1: Scrivere test orchestration fallenti**

```python
async def test_pipeline_uses_only_approved_deck(fake_db, fake_composer):
    lesson = seeded_lesson(deck_status="approved", deck_version=2)
    result = await run_slide_composition(fake_db, "p1", "l1", "/tmp/video.mp4")
    assert fake_composer.source_deck_version == 2
    assert result["video"]["source_deck_version"] == 2


async def test_pipeline_skips_when_feature_flag_disabled(fake_db, monkeypatch):
    monkeypatch.setenv("LESSON_MATERIALS_ENABLED", "false")
    result = await run_slide_composition(fake_db, "p1", "l1", "/tmp/video.mp4")
    assert result["skipped"] == "feature_disabled"
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_materials_pipeline.py`

- [ ] **Step 3: Implementare task e integrazione**

Nel ramo `video_type == "videocorso"`:

1. leggere deck approvato;
2. costruire timing dalla trascrizione già prodotta;
3. comporre le slide prima del caricamento del master definitivo;
4. salvare `timing_plan`, `source_deck_version`, report e stato;
5. se il deck è assente e flag disabilitato, mantenere il comportamento attuale;
6. se il flag è attivo ma il deck non è approvato, fallire con stato partner-facing “Le slide devono essere approvate”.

- [ ] **Step 4: Eseguire test pipeline**

Run:

```bash
cd backend
pytest -q tests/test_lesson_materials_pipeline.py tests/test_celery_tasks_db_contract.py tests/test_video_health.py
```

Expected: tutte verdi.

- [ ] **Step 5: Commit**

```bash
git add backend/celery_lesson_materials.py backend/celery_app.py backend/video_pipeline_task.py backend/tests/test_lesson_materials_pipeline.py
git commit -m "feat(videocorso): integrate slides into video pipeline"
```

---

## Tranche C — Audio, Systeme.io e Materiali

### Task 9: Estrazione audio e copione grounded del ripasso

**Files:**
- Create: `backend/services/lesson_audio.py`
- Test: `backend/tests/test_lesson_audio.py`

**Interfaces:**
- Produces:
  - `extract_original_audio(video_path, output_path) -> AudioAsset`
  - `generate_recap_script(script, slides, target_ratio=(0.25, 0.40)) -> RecapScript`
  - `validate_recap_grounding(recap, sources) -> bool`

- [ ] **Step 1: Scrivere test fallenti**

```python
def test_recap_has_two_neutral_speakers_and_no_names():
    recap = generate_recap_script(
        "Il metodo parte dall'analisi del problema.",
        [{"title": "Il metodo", "body": ["Analizza il problema"]}],
    )
    assert {turn["speaker"] for turn in recap["turns"]} == {"guide", "expert"}
    forbidden = {"Stefania", "Valentina", "Andrea", "Gaia", "Marco", "Matteo"}
    assert not forbidden.intersection(recap["text"].split())


def test_extract_original_audio_keeps_video_duration(video_fixture, tmp_path):
    asset = extract_original_audio(video_fixture, tmp_path / "lesson.m4a")
    assert abs(asset.duration_s - 15.0) < 0.15
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_audio.py`

- [ ] **Step 3: Implementare**

FFmpeg:

```text
ffmpeg -y -i input.mp4 -vn -c:a aac -b:a 192k output.m4a
```

Il prompt del copione impone turni `guide`/`expert`, durata stimata 25–40%, nessun nome proprio per le voci e `source_excerpt` obbligatorio per ogni turno. Il validatore rifiuta turni senza excerpt presente nelle fonti.

- [ ] **Step 4: Eseguire test**

Run: `cd backend && pytest -q tests/test_lesson_audio.py`

- [ ] **Step 5: Commit**

```bash
git add backend/services/lesson_audio.py backend/tests/test_lesson_audio.py
git commit -m "feat(videocorso): generate original and recap audio sources"
```

### Task 10: Sintesi a due voci, review e approvazione

**Files:**
- Create: `backend/services/dual_voice_tts.py`
- Modify: `backend/routers/lesson_materials.py`
- Modify: `backend/celery_lesson_materials.py`
- Test: `backend/tests/test_dual_voice_tts.py`
- Test: `backend/tests/test_audio_recap_routes.py`
- Modify: `frontend/src/ciak/partner/operativo/LessonMaterialsCard.jsx`
- Modify: `frontend/src/ciak/partner/operativo/LessonMaterialsCard.test.jsx`

**Interfaces:**
- Consumes: `synthesize_recap(recap_script, voice_map, output_path)`.
- Produces endpoint:
  - `POST .../audio-recap/generate`
  - `POST .../audio-recap/regenerate`
  - `POST .../audio-recap/approve`

- [ ] **Step 1: Scrivere test TTS e route**

```python
def test_synthesizer_alternates_configured_voices(fake_tts):
    synthesize_recap(
        {"turns": [
            {"speaker": "guide", "text": "Apriamo."},
            {"speaker": "expert", "text": "Approfondiamo."},
        ]},
        {"guide": "it-IT-Neural2-A", "expert": "it-IT-Neural2-C"},
        "/tmp/recap.mp3",
        provider=fake_tts,
    )
    assert fake_tts.voice_calls == ["it-IT-Neural2-A", "it-IT-Neural2-C"]


async def test_admin_cannot_approve_audio_recap(client, admin_headers):
    response = await client.post(
        "/api/lesson-materials/p1/l1/audio-recap/approve", headers=admin_headers
    )
    assert response.status_code == 403
```

- [ ] **Step 2: Verificare il fallimento**

Run:

```bash
cd backend
pytest -q tests/test_dual_voice_tts.py tests/test_audio_recap_routes.py
```

- [ ] **Step 3: Implementare provider e API**

Usare `google.cloud.texttospeech.TextToSpeechClient`; mappa di default:

```python
DEFAULT_VOICES = {
    "guide": os.getenv("CIAK_RECAP_GUIDE_VOICE", "it-IT-Neural2-A"),
    "expert": os.getenv("CIAK_RECAP_EXPERT_VOICE", "it-IT-Neural2-C"),
}
```

Normalizzare volume e pause con `pydub`, concatenare i turni, caricare su GCS e impostare `audio_recap.status=review_required`. Solo la route partner-only imposta `approved`.

- [ ] **Step 4: Estendere la UI**

Mostrare player, “Rigenera con indicazioni” e “Approva ripasso audio”. Il player dell'audio originale è disponibile dopo l'approvazione video; quello del ripasso solo in review/approved.

- [ ] **Step 5: Eseguire test e build**

Run:

```bash
cd backend
pytest -q tests/test_dual_voice_tts.py tests/test_audio_recap_routes.py
cd ../
npm --prefix frontend test -- --watchAll=false --runInBand LessonMaterialsCard.test.jsx
npm --prefix frontend run build
```

- [ ] **Step 6: Commit**

```bash
git add backend/services/dual_voice_tts.py backend/routers/lesson_materials.py backend/celery_lesson_materials.py backend/tests/test_dual_voice_tts.py backend/tests/test_audio_recap_routes.py frontend/src/ciak/partner/operativo/LessonMaterialsCard.jsx frontend/src/ciak/partner/operativo/LessonMaterialsCard.test.jsx
git commit -m "feat(videocorso): add partner-approved dual voice recap"
```

### Task 11: Publisher idempotente per Systeme.io

**Files:**
- Create: `backend/services/systeme_lesson_materials.py`
- Modify: `backend/video_pipeline_task.py:systeme_publish_lesson`
- Modify: `backend/routers/partner_journey.py:1375-1422`
- Modify: `backend/celery_lesson_materials.py`
- Test: `backend/tests/test_systeme_lesson_materials.py`

**Interfaces:**
- Consumes: `publish_lesson_materials(partner, lesson, materials, client)`.
- Produces: `PublishResult(status, remote_lesson_id, assets, idempotency_key)`.

- [ ] **Step 1: Scrivere test idempotenza**

```python
async def test_republish_updates_same_lesson_without_duplicates(fake_systeme):
    first = await publish_lesson_materials(partner, lesson, materials_v1, fake_systeme)
    second = await publish_lesson_materials(partner, lesson, materials_v2, fake_systeme)
    assert first.remote_lesson_id == second.remote_lesson_id
    assert fake_systeme.created_lessons == 1
    assert fake_systeme.updated_lessons == 1


async def test_unapproved_recap_is_not_published(fake_systeme):
    materials = materials_with_recap(status="review_required")
    result = await publish_lesson_materials(partner, lesson, materials, fake_systeme)
    assert "audio_recap" not in result.assets
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_systeme_lesson_materials.py`

- [ ] **Step 3: Implementare publisher**

Chiave idempotente:

```python
f"{partner['id']}:{partner['systeme_course_id']}:{lesson['lesson_id']}"
```

Il publisher:

1. cerca `systeme_lesson_id` già salvato;
2. crea la lezione solo se assente;
3. aggiorna descrizione/player/link asset nella lezione esistente;
4. include recap solo se `status == "approved"`;
5. verifica la risposta remota;
6. salva per ogni asset `version`, `status`, `published_at`;
7. su errore imposta `retrying`, conserva gli asset già riusciti e accoda retry con backoff.

Gli asset non caricabili direttamente sono link autenticati Ciak stabili, non URL GCS firmati inseriti permanentemente.

- [ ] **Step 4: Sostituire la pubblicazione fire-and-forget**

In `approve_videocorso_lesson` non restituire più sempre “pubblicata”. Impostare:

```python
materials["systeme"]["status"] = "queued"
publish_lesson_materials_task.delay(partner_id, lesson_id)
```

La risposta diventa “Lezione approvata. Pubblicazione Systeme.io in corso.”

- [ ] **Step 5: Eseguire test**

Run:

```bash
cd backend
pytest -q tests/test_systeme_lesson_materials.py tests/test_partner_journey_auth_unittest.py
```

- [ ] **Step 6: Commit**

```bash
git add backend/services/systeme_lesson_materials.py backend/video_pipeline_task.py backend/routers/partner_journey.py backend/celery_lesson_materials.py backend/tests/test_systeme_lesson_materials.py
git commit -m "feat(videocorso): publish lesson materials to Systeme"
```

### Task 12: Materiali partner, feature flag e collaudo

**Files:**
- Modify: `backend/routers/lesson_materials.py`
- Modify: `backend/routers/partner_journey.py:workspace corso aggregator`
- Modify: `frontend/src/ciak/partner/sections/PartnerFilesPage.jsx`
- Test: `backend/tests/test_lesson_materials_e2e.py`
- Test: `frontend/src/ciak/partner/sections/PartnerFilesPage.test.jsx`
- Create: `docs/runbooks/lesson-materials-rollout.md`

**Interfaces:**
- Consumes: asset approvati della lezione.
- Produces: righe Materiali senza duplicare blob; checklist rollout.

- [ ] **Step 1: Scrivere test di visibilità**

```python
async def test_materials_list_exposes_only_approved_assets(client, partner_headers):
    response = await client.get("/api/lesson-materials/p1/l1", headers=partner_headers)
    assets = response.json()["published_assets"]
    assert {a["kind"] for a in assets} == {
        "video", "original_audio", "pptx", "pdf", "audio_recap"
    }
    assert all("storage_path" not in asset for asset in assets)
```

- [ ] **Step 2: Verificare il fallimento**

Run: `cd backend && pytest -q tests/test_lesson_materials_e2e.py`

- [ ] **Step 3: Integrare Materiali partner**

`PartnerFilesPage` raggruppa gli asset sotto:

```text
Videocorso / <Modulo> / <Lezione>
```

Visualizza nome, tipo, versione e data approvazione. Usa endpoint autenticato di download; non memorizza una seconda copia del file.

- [ ] **Step 4: Scrivere runbook**

Il runbook deve includere:

```text
1. Deploy con LESSON_MATERIALS_ENABLED=false.
2. Verifica dipendenze LibreOffice, FFmpeg e Google TTS sul worker.
3. Abilita il flag solo per partner demo tramite allowlist LESSON_MATERIALS_PARTNER_IDS.
4. Esegui una lezione completa.
5. Verifica PPTX/PDF, audio continuo, due voci, approvazioni, Systeme.io e Materiali.
6. Controlla costi e tempi.
7. Estendi a un partner reale consenziente.
8. Non eseguire backfill sui corsi esistenti.
```

- [ ] **Step 5: Eseguire suite completa**

Run:

```bash
cd backend
python -m compileall -q .
pytest -q \
  tests/test_lesson_materials_domain.py \
  tests/test_lesson_deck.py \
  tests/test_lesson_deck_renderer.py \
  tests/test_lesson_materials_routes.py \
  tests/test_slide_timing.py \
  tests/test_video_slide_composer.py \
  tests/test_lesson_materials_pipeline.py \
  tests/test_lesson_audio.py \
  tests/test_dual_voice_tts.py \
  tests/test_audio_recap_routes.py \
  tests/test_systeme_lesson_materials.py \
  tests/test_lesson_materials_e2e.py \
  tests/test_partner_journey_auth_unittest.py \
  tests/test_celery_tasks_db_contract.py \
  tests/test_video_health.py
cd ../
npm --prefix frontend test -- --watchAll=false --runInBand \
  LessonMaterialsCard.test.jsx PartnerFilesPage.test.jsx
npm --prefix frontend run build
```

Expected: zero failure; build completa.

- [ ] **Step 6: Verifica live demo**

Con un partner demo:

```text
PASS se:
- il PPTX è 16:9, modificabile e ri-caricabile;
- la registrazione resta bloccata prima dell'approvazione;
- il video contiene almeno una slide e l'audio non salta;
- audio originale e recap sono riproducibili;
- il recap non appare in Systeme.io prima dell'approvazione;
- il secondo publish aggiorna la stessa lezione;
- i cinque asset appaiono nei Materiali del partner.
```

- [ ] **Step 7: Commit**

```bash
git add backend/routers/lesson_materials.py backend/routers/partner_journey.py frontend/src/ciak/partner/sections/PartnerFilesPage.jsx backend/tests/test_lesson_materials_e2e.py frontend/src/ciak/partner/sections/PartnerFilesPage.test.jsx docs/runbooks/lesson-materials-rollout.md
git commit -m "feat(videocorso): complete lesson materials rollout"
```

## Final release gate

- [ ] Rieseguire la suite completa del Task 12.
- [ ] Eseguire `git diff --check`.
- [ ] Verificare che `git status --short` contenga solo file intenzionali.
- [ ] Fare push su `main`.
- [ ] Attendere CI verde.
- [ ] Verificare backend e worker Cloud Run sulla stessa revisione sorgente.
- [ ] Verificare `https://www.ciak.io/api/health` HTTP 200.
- [ ] Verificare che il worker abbia FFmpeg, LibreOffice, font e credenziali TTS.
- [ ] Abilitare inizialmente solo il partner demo.
- [ ] Registrare un verdetto finale PASS/FAIL nel runbook.
