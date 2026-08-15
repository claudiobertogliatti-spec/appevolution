# Fase 2 Daniele Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la fondazione canonica, versionata e idempotente che produce il dry run della Fase 2 di Daniele e consente un apply controllato solo dopo revisione umana.

**Architecture:** Nuovi servizi puri classificano output e step senza dipendere da FastAPI; un servizio asincrono costruisce report persistiti e applica un piano mediante snapshot e compare-and-set. Un router admin sottile espone dry run, lettura report e apply. Questa tranche non rigenera documenti, non cambia UI e non esegue automaticamente l'apply in produzione.

**Tech Stack:** Python 3.12, FastAPI, Motor/PyMongo, pytest/pytest-asyncio, MongoDB, GitHub Actions, Cloud Run.

**Spec:** `docs/superpowers/specs/2026-08-15-fase-2-daniele-pilota-design.md`

## Global Constraints

- `partner_journey_steps` è l'unica fonte di verità dello stato del percorso.
- Non cancellare materiali, input, risposte o video storici.
- `partners.phase` è soltanto una proiezione legacy.
- Nessun output storico completa uno step corrente senza evidenza conforme.
- Dry run obbligatorio prima dell'apply; l'apply rifiuta report stale.
- Tutte le scritture devono essere idempotenti e tracciate.
- L'admin non può approvare al posto del partner.
- Non modificare il system prompt di Matteo.
- Mai `git add .` o `git add -A`; aggiungere ogni file per nome.
- Questa tranche termina dopo il dry run live di Daniele: l'apply live richiede un gate umano separato.

## Roadmap oltre questa tranche

Il design completo viene attuato con piani separati, in quest'ordine:

1. **Questo piano:** modello versioni, conformità, dry run, snapshot e apply controllato.
2. **Output F-8–F-10/F-15:** generatori con template correnti e approvazioni server-side.
3. **Esperienza partner/team:** stati leggibili, archivio per step e coda operativa.
4. **Video F-11/F-12:** riconciliazione asset, revisioni e approvazione versione corrente.
5. **Vendita/lancio F-13–F-19:** readiness, probe, documenti finali e apertura F-20.
6. **Consolidamento workspace:** eliminazione dello stato parallelo e migrazione dei deep-link.

---

## File map

### Nuovi file

- `backend/services/phase2_output_versions.py`: contratto e archivio append-only degli output F-8–F-15.
- `backend/services/phase2_conformity.py`: classificazione pura delle evidenze correnti.
- `backend/services/phase2_migration.py`: costruzione report, snapshot, CAS e apply.
- `backend/routers/phase2_migration.py`: API admin senza logica di dominio.
- `backend/scripts/migrate_phase2_partner.py`: CLI sicura; default dry run, singolo partner.
- `backend/tests/test_phase2_output_versions.py`: versionamento e concorrenza.
- `backend/tests/test_phase2_conformity.py`: matrice di conformità F-8–F-19.
- `backend/tests/test_phase2_migration.py`: dry run, snapshot, stale report e idempotenza.
- `backend/tests/test_phase2_migration_api.py`: auth e contratto HTTP.

### File modificati

- `backend/db_indexes.py`: indici unici per versioni, report e snapshot.
- `backend/server.py`: registrazione router e injection del database.
- `.github/workflows/ci.yml`: inclusione esplicita delle nuove suite, se l'allowlist è ancora esplicita.
- `docs/agents/HANDOFF.md`: evidenze, commit e stato aperto; voce nuova in cima.

---

### Task 1: Archivio append-only degli output della Fase 2

**Files:**
- Create: `backend/services/phase2_output_versions.py`
- Create: `backend/tests/test_phase2_output_versions.py`
- Modify: `backend/db_indexes.py`

**Interfaces:**
- Produces: `OutputVersionRequest`, `OutputVersionResult`, `archive_phase2_output(db, request)`, `current_approved_output(db, partner_id, step_id)`.
- Mongo collections: `partner_phase2_output_versions`, `partner_phase2_output_counters`.

- [ ] **Step 1: Write failing tests for immutable identity and idempotency**

```python
@pytest.mark.asyncio
async def test_same_identity_is_idempotent(fake_db):
    request = OutputVersionRequest(
        partner_id="23", step_id="05-script-masterclass",
        category="script_masterclass", template_id="masterclass-v3",
        template_version="3", content={"title": "Nuovo script"},
        source_checksums={"positioning": "abc"}, actor_id="admin-1",
    )
    first = await archive_phase2_output(fake_db, request)
    retry = await archive_phase2_output(fake_db, request)
    assert first.version == retry.version == 1
    assert first.checksum == retry.checksum
    assert retry.created is False
    assert len(fake_db.partner_phase2_output_versions.docs) == 1

@pytest.mark.asyncio
async def test_new_content_supersedes_without_mutating_old_version(fake_db):
    first = await archive_phase2_output(fake_db, make_request(content={"v": 1}))
    second = await archive_phase2_output(fake_db, make_request(content={"v": 2}))
    assert (first.version, second.version) == (1, 2)
    assert fake_db.partner_phase2_output_versions.docs[0]["status"] == "superseded"
    assert fake_db.partner_phase2_output_versions.docs[0]["content"] == {"v": 1}
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd backend; python -m pytest tests/test_phase2_output_versions.py -q`

Expected: collection fails with `ModuleNotFoundError: services.phase2_output_versions`.

- [ ] **Step 3: Implement canonical serialization and archive service**

```python
@dataclass(frozen=True)
class OutputVersionRequest:
    partner_id: str
    step_id: str
    category: str
    template_id: str
    template_version: str
    content: dict[str, Any]
    source_checksums: dict[str, str]
    actor_id: str

async def archive_phase2_output(db, request: OutputVersionRequest) -> OutputVersionResult:
    payload = json.dumps(request.content, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    checksum = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    source_hash = canonical_source_checksum(request.source_checksums)
    identity = {
        "partner_id": request.partner_id,
        "step_id": request.step_id,
        "template_id": request.template_id,
        "template_version": request.template_version,
        "checksum": checksum,
        "source_checksum": source_hash,
    }
    # Find identity, reserve atomic counter, insert, then mark older current
    # versions superseded. DuplicateKeyError returns the winning identity.
```

Implementare `current_approved_output` con filtro esatto:

```python
{"partner_id": partner_id, "step_id": step_id, "status": "approved", "is_current": True}
```

- [ ] **Step 4: Add critical unique indexes**

Add to `_CRITICAL_COMPOUND_INDEXES`:

```python
(
    "partner_phase2_output_versions",
    [("partner_id", 1), ("step_id", 1), ("template_id", 1),
     ("template_version", 1), ("checksum", 1), ("source_checksum", 1)],
    {"unique": True, "name": "phase2_output_identity_unique"},
),
(
    "partner_phase2_output_counters",
    [("partner_id", 1), ("step_id", 1)],
    {"unique": True, "name": "phase2_output_counter_unique"},
),
```

- [ ] **Step 5: Run focused tests and index regressions**

Run: `cd backend; python -m pytest tests/test_phase2_output_versions.py tests/test_partner_document_versions.py -q`

Expected: all tests pass; concurrency test yields distinct sequential versions and no duplicate identity.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add backend/services/phase2_output_versions.py backend/tests/test_phase2_output_versions.py backend/db_indexes.py
git commit -m "feat(phase2): add immutable output versions"
```

---

### Task 2: Pure conformity evaluator for F-8–F-19

**Files:**
- Create: `backend/services/phase2_conformity.py`
- Create: `backend/tests/test_phase2_conformity.py`

**Interfaces:**
- Consumes: canonical step definitions from `models.partner_journey_step` and normalized evidence dictionaries.
- Produces: `StepConformity`, `evaluate_phase2_conformity(step_id, evidence)`, `dependent_step_ids(step_id)`.

- [ ] **Step 1: Write the failing policy matrix**

```python
@pytest.mark.parametrize("step_id,flag", [
    ("05-script-masterclass", "masterclass_script_approved"),
    ("06-outline-lezioni", "course_outline_approved"),
    ("07-script-videolezioni", "lesson_scripts_approved"),
    ("08-registra-masterclass", "masterclass_current_version_approved"),
    ("09-registra-lezioni", "all_required_lessons_current_version_approved"),
    ("10-sistema-vendita", "sales_system_ready"),
    ("11-calendario-30gg", "launch_calendar_approved"),
    ("12-prezzo-webinar", "price_webinar_approved"),
    ("16-readiness-lancio", "launch_readiness_verified"),
    ("13-lancio", "launch_verified"),
    ("18-certificato-valida", "valida_certificate_archived"),
    ("19-workbook-finale", "final_workbook_archived"),
])
def test_every_phase2_step_requires_its_server_evidence(step_id, flag):
    assert not evaluate_phase2_conformity(step_id, {}).conformant
    result = evaluate_phase2_conformity(step_id, {flag: True})
    assert result.conformant
    assert result.evidence_key == flag
```

Add a regression proving `status="done"` alone never makes a governed step conformant.

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd backend; python -m pytest tests/test_phase2_conformity.py -q`

Expected: module import failure.

- [ ] **Step 3: Implement an explicit policy table**

```python
PHASE2_POLICY_EVIDENCE = {
    "05-script-masterclass": "masterclass_script_approved",
    "06-outline-lezioni": "course_outline_approved",
    "07-script-videolezioni": "lesson_scripts_approved",
    "08-registra-masterclass": "masterclass_current_version_approved",
    "09-registra-lezioni": "all_required_lessons_current_version_approved",
    "10-sistema-vendita": "sales_system_ready",
    "11-calendario-30gg": "launch_calendar_approved",
    "12-prezzo-webinar": "price_webinar_approved",
    "16-readiness-lancio": "launch_readiness_verified",
    "13-lancio": "launch_verified",
    "18-certificato-valida": "valida_certificate_archived",
    "19-workbook-finale": "final_workbook_archived",
}
```

Return a frozen dataclass with `step_id`, `conformant`, `evidence_key`, `reason` and sanitized `details`.

- [ ] **Step 4: Run policy and existing completion tests**

Run: `cd backend; python -m pytest tests/test_phase2_conformity.py tests/test_journey_completion.py tests/test_protocollo_evo_valida.py -q`

Expected: all pass and the existing 20-step definition remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add backend/services/phase2_conformity.py backend/tests/test_phase2_conformity.py
git commit -m "feat(phase2): define canonical conformity policies"
```

---

### Task 3: Evidence loader and Daniele migration planner

**Files:**
- Create: `backend/services/phase2_migration.py`
- Create: `backend/tests/test_phase2_migration.py`

**Interfaces:**
- Consumes: `evaluate_phase2_conformity`, `current_approved_output`, existing journey/video/funnel/calendar/document collections.
- Produces: `build_phase2_evidence(db, partner_id)`, `plan_phase2_migration(db, partner_id, actor_id) -> MigrationPlan`.
- Persists no writes in this task.

- [ ] **Step 1: Create a Daniele-shaped fixture and failing dry-run test**

The fixture must include old numbers `5`, `6`, `9`, duplicate number `9`, legacy F-14 data with no canonical calendar version, F-13 `done` with incomplete funnel evidence, historical masterclass URL and 32 lesson records.

```python
@pytest.mark.asyncio
async def test_plan_reopens_legacy_done_steps_without_deleting_sources(daniele_db):
    before = deepcopy(daniele_db.dump())
    plan = await plan_phase2_migration(daniele_db, "23", "admin-1")
    assert plan.partner_id == "23"
    assert plan.source_checksum
    assert "05-script-masterclass" in plan.reopen_step_ids
    assert "10-sistema-vendita" in plan.reopen_step_ids
    assert "11-calendario-30gg" in plan.reopen_step_ids
    assert plan.archive_actions
    assert daniele_db.dump() == before
```

- [ ] **Step 2: Run and verify RED**

Run: `cd backend; python -m pytest tests/test_phase2_migration.py::test_plan_reopens_legacy_done_steps_without_deleting_sources -q`

Expected: missing planner import.

- [ ] **Step 3: Implement sanitized evidence loading**

`build_phase2_evidence` must derive rather than accept client flags:

```python
return {
    "journey_steps": steps_by_id,
    "approved_outputs": approved_outputs_by_step,
    "masterclass_current_version_approved": masterclass_current_version_approved(masterclass),
    "all_required_lessons_current_version_approved": all_required_lessons_approved(outline, lessons),
    "sales_system_ready": sales_report.ready,
    "launch_calendar_approved": calendar_context.get("launch_calendar_approved", False),
    "launch_readiness_verified": launch_report.ready,
    "launch_verified": bool(launch.get("launched") and launch.get("probe_verified")),
    "valida_certificate_archived": bool(certificate and certificate.get("checksum")),
    "final_workbook_archived": bool(workbook and workbook.get("checksum")),
}
```

Map approved output existence to F-8, F-9, F-10 and F-15 evidence keys.

- [ ] **Step 4: Implement deterministic planning**

Canonicalize only F-8–F-19 definitions. Each action is a serializable dict with `action_id`, `kind`, `step_id`, `reason`, `before` and `after`. Compute `source_checksum` over the exact source snapshot using sorted JSON and normalized datetimes.

The plan must classify:

- metadata normalization;
- legacy material archival;
- step reopening;
- downstream pending/blocked transitions;
- records that are preserved without change.

- [ ] **Step 5: Add negative and determinism tests**

```python
assert (await plan_phase2_migration(db, "23", "a")).source_checksum == (
    await plan_phase2_migration(db, "23", "b")
).source_checksum
assert not any(action["kind"] == "delete" for action in plan.actions)
```

Also test an already-conformant partner produces zero reopen/archive actions.

- [ ] **Step 6: Run focused tests**

Run: `cd backend; python -m pytest tests/test_phase2_migration.py tests/test_journey_video_gates.py tests/test_editorial_calendar_api.py -q`

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/services/phase2_migration.py backend/tests/test_phase2_migration.py
git commit -m "feat(phase2): plan conservative partner migration"
```

---

### Task 4: Persisted dry run, snapshot and compare-and-set apply

**Files:**
- Modify: `backend/services/phase2_migration.py`
- Modify: `backend/tests/test_phase2_migration.py`
- Modify: `backend/db_indexes.py`

**Interfaces:**
- Produces: `create_phase2_dry_run(db, partner_id, actor_id)`, `apply_phase2_migration(db, report_id, actor_id)`.
- Collections: `partner_phase2_migration_reports`, `partner_phase2_migration_snapshots`, `partner_phase2_migration_audit`.

- [ ] **Step 1: Write failing stale-report and retry tests**

```python
@pytest.mark.asyncio
async def test_apply_rejects_report_when_source_changed(db):
    report = await create_phase2_dry_run(db, "23", "admin-1")
    await db.partner_journey_steps.update_one(
        {"partner_id": "23", "step_id": "12-prezzo-webinar"},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    with pytest.raises(MigrationConflict, match="stale"):
        await apply_phase2_migration(db, report.report_id, "admin-1")

@pytest.mark.asyncio
async def test_apply_retry_returns_same_snapshot_and_no_duplicate_audit(db):
    report = await create_phase2_dry_run(db, "23", "admin-1")
    first = await apply_phase2_migration(db, report.report_id, "admin-1")
    retry = await apply_phase2_migration(db, report.report_id, "admin-1")
    assert retry.snapshot_id == first.snapshot_id
    assert await db.partner_phase2_migration_audit.count_documents({"report_id": report.report_id}) == 1
```

- [ ] **Step 2: Run and verify RED**

Run: `cd backend; python -m pytest tests/test_phase2_migration.py -q`

Expected: new API functions are missing.

- [ ] **Step 3: Persist immutable dry-run reports**

Use `report_id = uuid.uuid4().hex`; persist `status="review_required"`, source checksum, actions, actor and timestamps. Never store binary material content in the report; store stable IDs and sanitized metadata.

- [ ] **Step 4: Implement lease-based apply**

Claim exactly once:

```python
claimed = await db.partner_phase2_migration_reports.find_one_and_update(
    {"report_id": report_id, "status": "review_required", "source_checksum": current_checksum},
    {"$set": {"status": "applying", "lease_id": lease_id, "apply_started_at": now}},
    return_document=ReturnDocument.AFTER,
)
```

If no claim exists, return the previous completed result when status is `applied`; otherwise raise `MigrationConflict`. Save the full source snapshot before journey writes. Every step update filters on the expected `updated_at` or absence value recorded in the report.

- [ ] **Step 5: Implement exact state transitions**

- Normalize canonical metadata with `$set` only.
- Register legacy references in `partner_phase2_output_versions` with `status="legacy"` and no partner approval.
- Set the first reachable non-conformant step to `in_progress`.
- Set later dependent steps to `pending` with `blocked_reason_code="upstream_output_not_current"`.
- Preserve source fields and historical `completed_at` inside snapshot/audit; clear current `completed_at` only on reopened canonical steps.
- Never alter `partners.phase` directly; call the existing projection helper after successful apply.

- [ ] **Step 6: Add critical indexes**

```python
("partner_phase2_migration_reports", [("report_id", 1)],
 {"unique": True, "name": "phase2_migration_report_id_unique"}),
("partner_phase2_migration_snapshots", [("report_id", 1)],
 {"unique": True, "name": "phase2_migration_snapshot_report_unique"}),
("partner_phase2_migration_audit", [("report_id", 1)],
 {"unique": True, "name": "phase2_migration_audit_report_unique"}),
```

- [ ] **Step 7: Run concurrency and regression tests**

Run: `cd backend; python -m pytest tests/test_phase2_migration.py tests/test_journey_f20_migration.py tests/test_partner_journey_operativo.py -q`

Expected: all pass; two simultaneous apply attempts yield one writer and one idempotent completed response.

- [ ] **Step 8: Commit**

```bash
git add backend/services/phase2_migration.py backend/tests/test_phase2_migration.py backend/db_indexes.py
git commit -m "feat(phase2): add reviewed idempotent migration apply"
```

---

### Task 5: Admin API and safe CLI

**Files:**
- Create: `backend/routers/phase2_migration.py`
- Create: `backend/scripts/migrate_phase2_partner.py`
- Create: `backend/tests/test_phase2_migration_api.py`
- Modify: `backend/server.py`

**Interfaces:**
- `POST /api/admin/phase2-migrations/{partner_id}/dry-run`
- `GET /api/admin/phase2-migrations/reports/{report_id}`
- `POST /api/admin/phase2-migrations/reports/{report_id}/apply`
- CLI: `python -m scripts.migrate_phase2_partner --partner-id 23 [--apply --report-id ID]`.

- [ ] **Step 1: Write failing auth and contract tests**

```python
def test_anonymous_dry_run_is_401(client):
    assert client.post("/api/admin/phase2-migrations/23/dry-run").status_code == 401

def test_partner_cannot_create_or_apply_migration(client, partner_headers):
    assert client.post("/api/admin/phase2-migrations/23/dry-run", headers=partner_headers).status_code == 403

def test_apply_requires_existing_reviewed_report(client, admin_headers):
    response = client.post(
        "/api/admin/phase2-migrations/reports/missing/apply", headers=admin_headers
    )
    assert response.status_code == 404
```

- [ ] **Step 2: Run and verify RED**

Run: `cd backend; python -m pytest tests/test_phase2_migration_api.py -q`

Expected: routes return 404.

- [ ] **Step 3: Implement thin authenticated router**

```python
router = APIRouter(prefix="/api/admin/phase2-migrations", tags=["phase2-migration"])

@router.post("/{partner_id}/dry-run", status_code=201)
async def dry_run(partner_id: str, credentials=Depends(security)):
    admin = await require_admin(credentials)
    return (await create_phase2_dry_run(db, partner_id, admin["id"])).to_dict()
```

Map `MigrationConflict` to HTTP `409` with stable `detail.code`; map missing partner/report to `404`. Do not return snapshots containing private raw material content.

- [ ] **Step 4: Register router using the existing set_db pattern**

In `backend/server.py`, next to `partner_journey_router`:

```python
from routers.phase2_migration import router as phase2_migration_router, set_db as set_phase2_migration_db
set_phase2_migration_db(db)
app.include_router(phase2_migration_router)
```

- [ ] **Step 5: Implement CLI with fail-closed arguments**

Rules:

- `--partner-id` is mandatory;
- default action creates a dry run;
- `--apply` requires `--report-id`;
- no `--all` flag exists in this tranche;
- JSON output contains report/action counts, never Mongo credentials or material bodies.

- [ ] **Step 6: Run API, auth and CLI parser tests**

Run: `cd backend; python -m pytest tests/test_phase2_migration_api.py tests/test_partner_journey_auth_unittest.py tests/test_partner_journey_auth_coverage.py -q`

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/routers/phase2_migration.py backend/scripts/migrate_phase2_partner.py backend/tests/test_phase2_migration_api.py backend/server.py
git commit -m "feat(phase2): expose reviewed partner migration"
```

---

### Task 6: Full verification and release preparation

**Files:**
- Modify: `.github/workflows/ci.yml` only if the current workflow uses an explicit test allowlist.
- Modify: `docs/agents/HANDOFF.md`

**Interfaces:** None; this is the release gate for the foundation.

- [ ] **Step 1: Add new tests to CI allowlist if required**

Add exactly:

```text
tests/test_phase2_output_versions.py
tests/test_phase2_conformity.py
tests/test_phase2_migration.py
tests/test_phase2_migration_api.py
```

If CI already discovers `backend/tests` dynamically, leave the workflow unchanged and record that evidence in HANDOFF.

- [ ] **Step 2: Run focused suite**

Run:

```bash
cd backend
python -m pytest \
  tests/test_phase2_output_versions.py \
  tests/test_phase2_conformity.py \
  tests/test_phase2_migration.py \
  tests/test_phase2_migration_api.py \
  tests/test_journey_completion.py \
  tests/test_journey_video_gates.py \
  tests/test_protocollo_evo_valida.py \
  tests/test_partner_journey_operativo.py \
  tests/test_partner_document_versions.py -q
```

Expected: zero failures.

- [ ] **Step 3: Run static and repository gates**

Run from repository root:

```bash
python -m compileall -q backend
python -m flake8 backend --select=E9,F821
git diff --check origin/main...HEAD
if git diff -U0 origin/main...HEAD | rg "sk_live_|sk-ant-|mongodb\+srv://"; then exit 1; fi
```

Expected: all commands exit `0`; secret scan returns no new credentials.

- [ ] **Step 4: Perform independent diff review**

Review specifically:

- no delete operation;
- no client-supplied governed flag;
- snapshots precede journey writes;
- stale report cannot apply;
- retry cannot duplicate versions, snapshots or audit rows;
- report responses contain no raw private documents.

Any P1/P2 finding is fixed and the relevant focused tests are rerun before continuing.

- [ ] **Step 5: Update HANDOFF with declared and verified evidence**

Add a new top entry naming branch, commits, exact test commands/results, and explicitly state:

```text
APERTO: nessun apply di migrazione eseguito su Daniele; il primo deploy produce soltanto il dry run.
```

- [ ] **Step 6: Commit release metadata**

```bash
git add .github/workflows/ci.yml docs/agents/HANDOFF.md
git commit -m "test(phase2): gate canonical migration foundation"
```

Omit `.github/workflows/ci.yml` from `git add` when unchanged.

---

### Task 7: Deploy foundation and produce Daniele dry run

**Files:** No planned source changes; evidence is appended to `docs/agents/HANDOFF.md` after verification.

**Interfaces:** Uses the admin endpoint or safe CLI deployed by Task 5.

- [ ] **Step 1: Rebase/fetch safety check before merge**

Run:

```bash
git fetch origin
git status --short
git rev-list --left-right --count origin/main...HEAD
```

Expected: clean worktree; reconcile new remote changes without reset or overwriting concurrent work.

- [ ] **Step 2: Push branch and require green CI**

Push the feature branch, open a PR, and wait for CI. Do not merge on red or cancelled checks.

- [ ] **Step 3: Merge and verify all deployment surfaces**

Evidence required:

- merge SHA and green CI run;
- Cloud Run backend latest ready revision and 100% traffic;
- worker latest ready revision/configuration;
- `GET https://www.ciak.io/api/health` returns `200`;
- anonymous dry-run endpoint returns `401`, proving route presence and protection.

- [ ] **Step 4: Create dry run for partner 23 only**

Call through the authenticated admin session tooling, keeping the bearer token out of shell
history and command output:

```http
POST /api/admin/phase2-migrations/23/dry-run
Authorization: Bearer [redacted at capture time]
```

Expected: `201`, `status="review_required"`, non-empty `source_checksum`, explicit preservation/archive/reopen actions, and no database journey mutations.

- [ ] **Step 5: Verify dry run was read-only**

Compare pre/post sanitized snapshots of:

- `partner_journey_steps` for partner `23`;
- masterclass and videocorso source records;
- funnel/lancio/calendar/document collections.

Expected: source checksums and document counts unchanged; only one migration report document was added.

- [ ] **Step 6: Stop at the human review gate**

Present the report to Claudio with:

- steps preserved;
- steps reopened;
- legacy outputs archived;
- blockers and reasons;
- exact proposed writes.

Do **not** call `/apply` in this task. Apply becomes the first step of the next approved execution tranche.

- [ ] **Step 7: Record verified live evidence**

Append the sanitized report ID, deployment revisions, health result and read-only checksum comparison to `docs/agents/HANDOFF.md`; commit and push that evidence separately.

---

## Completion gate

This plan is complete only when the foundation is deployed and a read-only report for Daniele
exists in production. It is not complete merely because code was pushed. No journey status,
material or partner record for Daniele may be changed during this plan's live phase.
