# Fatture passive dei collaboratori Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a Ciak Admin liquidazioni periodiche, archivio fatture passive e registrazione bonifici per Antonella e futuri collaboratori, mantenendo il confronto con le ore approvate.

**Architecture:** Estrarre la logica contabile in un servizio backend focalizzato, persistere snapshot immutabili in `collaborator_settlements` e salvare i file privati in GCS. Esporre endpoint admin generici sotto il router Ciak esistente e ampliare la pagina `Collaboratori` con una sezione contabile separata dalle fatture attive.

**Tech Stack:** FastAPI, Pydantic, Motor/MongoDB, Google Cloud Storage, React, Tailwind CSS, Vitest/Testing Library, pytest.

## Global Constraints

- Antonella e' `collaboratore/fornitore`, mai cliente o partner.
- Solo Claudio/superadmin puo' vedere o modificare fatture passive e dati bancari; `admin_type=antonella` deve ricevere HTTP 403.
- Il compenso calcolato e l'importo fatturato rimangono entrambi visibili.
- Periodi supportati: settimanali, quindicinali e mensili; una liquidazione usa task approvati non ancora liquidati.
- Una differenza tra calcolato e fatturato non blocca il flusso, ma richiede una nota.
- Una differenza tra fatturato e pagato richiede una nota.
- Fattura obbligatoriamente PDF, massimo 10 MB; distinta PDF/PNG/JPEG, massimo 10 MB.
- I documenti sono privati e scaricabili solo tramite endpoint autenticato.
- Non modificare il system prompt di Matteo.
- Brand voice: italiano semplice, diretto, senza gergo contabile non necessario.

---

## File structure

- Create `backend/services/collaborator_settlements.py`: regole di calcolo, transizioni, autorizzazione contabile e validazione file.
- Create `backend/services/collaborator_document_storage.py`: upload/download/delete di oggetti GCS privati, isolato dal dominio.
- Create `backend/routers/collaborator_settlements.py`: modelli request/response e endpoint FastAPI.
- Modify `backend/server.py`: inizializzazione DB e registrazione del router.
- Create `backend/tests/test_collaborator_settlements.py`: test unitari del servizio e delle transizioni.
- Create `backend/tests/test_collaborator_settlements_api.py`: test API, autorizzazione e multipart.
- Modify `frontend/src/ciak/admin/api.js`: helper multipart e download autenticato.
- Create `frontend/src/ciak/admin/pages/CollaboratorSettlements.jsx`: UI contabile isolata.
- Modify `frontend/src/ciak/admin/pages/Collaboratori.jsx`: tab Attivita'/Fatture e montaggio nuova UI.
- Create `frontend/src/ciak/admin/pages/CollaboratorSettlements.test.jsx`: test del flusso amministrativo.

---

### Task 1: Dominio liquidazioni e test delle regole

**Files:**
- Create: `backend/services/collaborator_settlements.py`
- Create: `backend/tests/test_collaborator_settlements.py`

**Interfaces:**
- Consumes: task Mongo con `task_id`, `approved_at`, `approved_minutes`, `approved_amount`, `hourly_rate`.
- Produces: `build_settlement(collaborator_id, period_start, period_end, tasks, actor) -> dict`, `validate_transition(settlement, target_status, payload) -> None`, `calculate_difference(left, right) -> Decimal`, `can_manage_collaborator_billing(admin) -> bool`.

- [ ] **Step 1: Scrivere i test fallenti di calcolo e snapshot**

```python
from services.collaborator_settlements import build_settlement

def test_build_settlement_snapshots_approved_work():
    tasks = [
        {"task_id": "a", "approved_at": "2026-07-06T10:00:00+00:00", "approved_minutes": 60, "approved_amount": 20.0, "hourly_rate": 20.0},
        {"task_id": "b", "approved_at": "2026-07-08T10:00:00+00:00", "approved_minutes": 90, "approved_amount": 30.0, "hourly_rate": 20.0},
    ]
    doc = build_settlement("antonella", "2026-07-06", "2026-07-12", tasks, "claudio@ciak.io")
    assert doc["task_ids"] == ["a", "b"]
    assert doc["approved_minutes"] == 150
    assert doc["calculated_amount"] == 50.0
    assert doc["hourly_rate_snapshot"] == 20.0
    assert doc["status"] == "draft"
```

- [ ] **Step 2: Eseguire il test e verificare il fallimento**

Run: `python -m pytest backend/tests/test_collaborator_settlements.py -q`  
Expected: FAIL con `ModuleNotFoundError: services.collaborator_settlements`.

- [ ] **Step 3: Implementare tipi, calcolo e creazione snapshot**

```python
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

VALID_STATUSES = {"draft", "awaiting_invoice", "to_verify", "to_pay", "paid", "cancelled"}

def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def calculate_difference(left, right) -> Decimal:
    return _money(left) - _money(right)

def build_settlement(collaborator_id, period_start, period_end, tasks, actor):
    if not tasks:
        raise ValueError("Nessuna attivita' approvata nel periodo")
    rates = {str(_money(t.get("hourly_rate"))) for t in tasks}
    if len(rates) != 1:
        raise ValueError("Il periodo contiene tariffe diverse")
    now = datetime.now(timezone.utc).isoformat()
    return {
        "settlement_id": f"set_{uuid4().hex[:16]}",
        "collaborator_id": collaborator_id,
        "period_start": period_start,
        "period_end": period_end,
        "task_ids": [t["task_id"] for t in tasks],
        "approved_minutes": sum(int(t.get("approved_minutes") or 0) for t in tasks),
        "hourly_rate_snapshot": float(next(iter(rates))),
        "calculated_amount": float(sum((_money(t.get("approved_amount")) for t in tasks), Decimal("0.00"))),
        "status": "draft",
        "invoice": None,
        "payment": None,
        "created_by": actor,
        "created_at": now,
        "updated_at": now,
        "audit_log": [{"action": "created", "actor": actor, "at": now}],
    }
```

- [ ] **Step 4: Aggiungere test fallenti per transizioni, note e autorizzazione**

```python
import pytest
from types import SimpleNamespace
from services.collaborator_settlements import validate_transition, can_manage_collaborator_billing

def test_invoice_difference_requires_note_before_to_pay():
    settlement = {"status": "to_verify", "calculated_amount": 100, "invoice": {"amount": 110}}
    with pytest.raises(ValueError, match="nota"):
        validate_transition(settlement, "to_pay", {"difference_note": ""})
    validate_transition(settlement, "to_pay", {"difference_note": "Rimborso spese"})

def test_antonella_cannot_manage_billing():
    assert not can_manage_collaborator_billing(SimpleNamespace(role="admin", admin_type="antonella"))
    assert can_manage_collaborator_billing(SimpleNamespace(role="admin", admin_type="claudio"))
    assert can_manage_collaborator_billing(SimpleNamespace(role="superadmin", admin_type=None))
```

- [ ] **Step 5: Implementare matrice transizioni e guardia contabile**

```python
TRANSITIONS = {
    "draft": {"awaiting_invoice", "cancelled"},
    "awaiting_invoice": {"to_verify", "cancelled"},
    "to_verify": {"to_pay", "cancelled"},
    "to_pay": {"paid", "cancelled"},
    "paid": {"cancelled"},
    "cancelled": set(),
}

def validate_transition(settlement, target_status, payload):
    current = settlement.get("status")
    if target_status not in TRANSITIONS.get(current, set()):
        raise ValueError(f"Passaggio non consentito: {current} -> {target_status}")
    if current == "to_verify" and target_status == "to_pay":
        invoice_amount = (settlement.get("invoice") or {}).get("amount")
        if calculate_difference(invoice_amount, settlement.get("calculated_amount")) and not str(payload.get("difference_note") or "").strip():
            raise ValueError("Inserisci una nota per spiegare la differenza")
    if current == "to_pay" and target_status == "paid":
        invoice_amount = (settlement.get("invoice") or {}).get("amount")
        if calculate_difference(payload.get("amount"), invoice_amount) and not str(payload.get("note") or "").strip():
            raise ValueError("Inserisci una nota per spiegare la differenza di pagamento")

def can_manage_collaborator_billing(admin):
    return getattr(admin, "role", None) == "superadmin" or (
        getattr(admin, "role", None) == "admin" and getattr(admin, "admin_type", None) != "antonella"
    )
```

- [ ] **Step 6: Eseguire tutti i test del dominio**

Run: `python -m pytest backend/tests/test_collaborator_settlements.py -q`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/services/collaborator_settlements.py backend/tests/test_collaborator_settlements.py
git commit -m "feat(collaboratori): add settlement domain rules"
```

---

### Task 2: Storage privato GCS

**Files:**
- Create: `backend/services/collaborator_document_storage.py`
- Create: `backend/tests/test_collaborator_document_storage.py`

**Interfaces:**
- Consumes: byte file validati dal router.
- Produces: `upload_private_document(collaborator_id, settlement_id, kind, filename, content_type, data) -> dict`, `download_private_document(object_key) -> tuple[bytes, str]`, `delete_private_document(object_key) -> None`.

- [ ] **Step 1: Scrivere test fallenti per object key e metadati**

```python
from services.collaborator_document_storage import build_object_key

def test_object_key_is_private_and_ignores_original_path():
    key = build_object_key("antonella", "set_123", "invoice", "../../fattura luglio.pdf")
    assert key.startswith("private/collaborators/antonella/settlements/set_123/invoice/")
    assert ".." not in key
    assert key.endswith(".pdf")
```

- [ ] **Step 2: Eseguire il test e verificare il fallimento**

Run: `python -m pytest backend/tests/test_collaborator_document_storage.py -q`  
Expected: FAIL per modulo mancante.

- [ ] **Step 3: Implementare adapter GCS senza ACL pubbliche**

```python
import os
from pathlib import Path
from uuid import uuid4
from google.cloud import storage

BUCKET = os.environ.get("GCS_BUCKET", "gen-lang-client-0744698012_cloudbuild")

def build_object_key(collaborator_id, settlement_id, kind, filename):
    ext = Path(filename or "document").suffix.lower()
    return f"private/collaborators/{collaborator_id}/settlements/{settlement_id}/{kind}/{uuid4().hex}{ext}"

def upload_private_document(collaborator_id, settlement_id, kind, filename, content_type, data):
    key = build_object_key(collaborator_id, settlement_id, kind, filename)
    bucket = storage.Client().bucket(BUCKET)
    blob = bucket.blob(key)
    blob.upload_from_string(data, content_type=content_type)
    return {"object_key": key, "filename": Path(filename).name, "content_type": content_type, "size": len(data)}

def download_private_document(object_key):
    blob = storage.Client().bucket(BUCKET).blob(object_key)
    if not blob.exists():
        raise FileNotFoundError(object_key)
    return blob.download_as_bytes(), blob.content_type or "application/octet-stream"

def delete_private_document(object_key):
    storage.Client().bucket(BUCKET).blob(object_key).delete()
```

- [ ] **Step 4: Testare upload/download con client GCS finto**

Usare `monkeypatch` per sostituire `storage.Client` e verificare che `make_public` e URL firmati non siano mai chiamati; controllare byte, MIME e object key.

- [ ] **Step 5: Eseguire i test storage**

Run: `python -m pytest backend/tests/test_collaborator_document_storage.py -q`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/services/collaborator_document_storage.py backend/tests/test_collaborator_document_storage.py
git commit -m "feat(collaboratori): add private invoice storage"
```

---

### Task 3: API liquidazioni, upload e download autenticati

**Files:**
- Create: `backend/routers/collaborator_settlements.py`
- Modify: `backend/server.py`
- Create: `backend/tests/test_collaborator_settlements_api.py`

**Interfaces:**
- Consumes: servizio Task 1, storage Task 2, `require_ciak_admin`, Mongo `agent_tasks` e `collaborator_settlements`.
- Produces: endpoint definiti nella spec sotto `/api/admin/ciak/collaboratori/{collaborator_id}/settlements`.

- [ ] **Step 1: Scrivere test API fallenti per creazione e anti-duplicazione**

```python
def test_create_settlement_uses_only_approved_unsettled_tasks(client, claudio_headers, seeded_tasks):
    response = client.post(
        "/api/admin/ciak/collaboratori/antonella/settlements",
        headers=claudio_headers,
        json={"period_start": "2026-07-06", "period_end": "2026-07-12"},
    )
    assert response.status_code == 201
    assert response.json()["settlement"]["task_ids"] == ["approved-in-range"]
    duplicate = client.post(response.request.url, headers=claudio_headers, json={"period_start": "2026-07-06", "period_end": "2026-07-12"})
    assert duplicate.status_code == 409
```

- [ ] **Step 2: Implementare router, modelli Pydantic e registrazione in `server.py`**

```python
class SettlementCreate(BaseModel):
    period_start: date
    period_end: date

class SettlementVerify(BaseModel):
    difference_note: str = ""

class SettlementPayment(BaseModel):
    paid_at: date
    amount: Decimal = Field(gt=0)
    reference: str = ""
    note: str = ""

async def require_billing_admin(admin=Depends(require_ciak_admin)):
    if not can_manage_collaborator_billing(admin):
        raise HTTPException(403, "Contabilita' collaboratori riservata")
    return admin
```

Nel create: cercare `assigned_to=collaborator_id`, `approved_at` nel periodo, `settlement_id` assente; inserire con indice univoco multikey su `task_ids` oppure prenotare atomicamente ogni task con `collaborator_settlement_id` e rollback in caso di errore. La seconda soluzione e' quella richiesta per impedire race condition.

- [ ] **Step 3: Scrivere test multipart fallenti per fattura**

```python
def test_invoice_upload_requires_pdf_and_max_10mb(client, claudio_headers, awaiting_invoice):
    bad = client.post(
        f"/api/admin/ciak/collaboratori/antonella/settlements/{awaiting_invoice}/invoice",
        headers=claudio_headers,
        data={"invoice_number": "12", "invoice_date": "2026-07-12", "amount": "100"},
        files={"file": ("fattura.txt", b"no", "text/plain")},
    )
    assert bad.status_code == 422
```

- [ ] **Step 4: Implementare close, invoice, verify, payment e cancel**

Il router deve leggere al massimo `10 * 1024 * 1024 + 1` byte, validare magic bytes `%PDF` per fatture e firme PNG/JPEG/PDF per distinte, chiamare lo storage e salvare solo metadati. Ogni update usa filtro `{"settlement_id": id, "status": expected}` e restituisce 409 se lo stato e' cambiato.

- [ ] **Step 5: Implementare elenco, totali e download autenticato**

```python
@router.get("/{collaborator_id}/settlements/{settlement_id}/files/{kind}")
async def download_file(collaborator_id: str, settlement_id: str, kind: Literal["invoice", "payment_receipt"], admin=Depends(require_billing_admin)):
    settlement = await db.collaborator_settlements.find_one({"settlement_id": settlement_id, "collaborator_id": collaborator_id})
    if not settlement:
        raise HTTPException(404, "Liquidazione non trovata")
    metadata = settlement["invoice"] if kind == "invoice" else (settlement.get("payment") or {}).get("receipt")
    if not metadata:
        raise HTTPException(404, "Documento non trovato")
    data, content_type = download_private_document(metadata["object_key"])
    return Response(data, media_type=content_type, headers={"Content-Disposition": f'attachment; filename="{metadata["filename"]}"'})
```

- [ ] **Step 6: Testare esplicitamente il 403 per Antonella e l'idempotenza pagamento**

```python
def test_antonella_cannot_list_settlements(client, antonella_headers):
    response = client.get("/api/admin/ciak/collaboratori/antonella/settlements", headers=antonella_headers)
    assert response.status_code == 403

def test_repeated_payment_does_not_duplicate_audit_entry(client, claudio_headers, to_pay):
    payload = {"paid_at": "2026-07-13", "amount": 100, "reference": "TRN1", "note": ""}
    first = client.post(f"/api/admin/ciak/collaboratori/antonella/settlements/{to_pay}/payment", headers=claudio_headers, json=payload)
    second = client.post(first.request.url, headers=claudio_headers, json=payload)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["settlement"]["audit_log"] == first.json()["settlement"]["audit_log"]
```

- [ ] **Step 7: Eseguire test API e regressione router**

Run: `python -m pytest backend/tests/test_collaborator_settlements.py backend/tests/test_collaborator_document_storage.py backend/tests/test_collaborator_settlements_api.py -q`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/routers/collaborator_settlements.py backend/server.py backend/tests/test_collaborator_settlements_api.py
git commit -m "feat(collaboratori): add invoice settlement API"
```

---

### Task 4: Client API multipart e UI contabile

**Files:**
- Modify: `frontend/src/ciak/admin/api.js`
- Create: `frontend/src/ciak/admin/pages/CollaboratorSettlements.jsx`
- Modify: `frontend/src/ciak/admin/pages/Collaboratori.jsx`
- Create: `frontend/src/ciak/admin/pages/CollaboratorSettlements.test.jsx`

**Interfaces:**
- Consumes: endpoint Task 3.
- Produces: `apiMultipart(path, formData)`, `downloadAdminFile(path, fallbackName)`, componente `CollaboratorSettlements({ collaborator, onAuthExpired })`.

- [ ] **Step 1: Scrivere test UI fallente per riepilogo e differenza**

```jsx
it("mostra calcolato, fatturato e richiede la nota quando differiscono", async () => {
  apiGet.mockResolvedValue({
    summary: { calculated: 100, invoiced: 110, to_pay: 110, paid: 0, anomalies: 1 },
    settlements: [{ settlement_id: "set1", period_start: "2026-07-01", period_end: "2026-07-07", approved_minutes: 300, calculated_amount: 100, invoice: { amount: 110 }, status: "to_verify" }],
  });
  render(<CollaboratorSettlements collaborator={{ id: "antonella", name: "Antonella" }} />);
  expect(await screen.findByText("EUR 100,00")).toBeInTheDocument();
  expect(screen.getByText("EUR 110,00")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /verifica/i }));
  expect(screen.getByLabelText(/motivo della differenza/i)).toBeRequired();
});
```

- [ ] **Step 2: Aggiungere helper multipart e download**

```js
export async function apiMultipart(path, formData) {
  const res = await fetch(`/api/admin/ciak${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (res.status === 401 || res.status === 403) { clearSession(); throw new Error("AUTH_EXPIRED"); }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || `Errore ${res.status}`);
  return res.json();
}

export async function downloadAdminFile(path, fallbackName) {
  const res = await adminFetch(`/api/admin/ciak${path}`);
  if (!res.ok) throw new Error(`Errore ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = fallbackName; a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Implementare riepilogo, filtri ed elenco liquidazioni**

Il componente usa cinque card (`Maturato`, `Fatturato`, `Da pagare`, `Pagato`, `Da verificare`), filtri stato/date e tabella responsive. Gli importi usano `Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })`.

- [ ] **Step 4: Implementare modale di creazione periodo**

La modale richiede `period_start` e `period_end`, carica l'anteprima restituita dall'API e mostra task, ore e totale prima della conferma. Scorciatoie: `Ultima settimana` e `Ultimi 15 giorni`.

- [ ] **Step 5: Implementare form fattura, verifica e pagamento**

Il form fattura costruisce `FormData` con `file`, `invoice_number`, `invoice_date`, `amount`, `due_date`. Il form verifica rende obbligatoria la nota solo se `difference_amount !== 0`. Il form bonifico include data, importo, riferimento, nota e distinta facoltativa.

- [ ] **Step 6: Integrare due tab nella pagina Collaboratori**

```jsx
const [tab, setTab] = useState("work");
// pulsanti: "Attivita' e compensi" e "Fatture e pagamenti"
return tab === "work"
  ? <CollaboratorWorkView data={data} onReload={load} />
  : <CollaboratorSettlements collaborator={data.collaborator} onAuthExpired={onAuthExpired} />;
```

Estrarre la UI esistente in una funzione locale `CollaboratorWorkView` senza cambiare comportamento.

- [ ] **Step 7: Eseguire test frontend**

Run: `cd frontend; npm test -- --run CollaboratorSettlements.test.jsx`  
Expected: PASS.

- [ ] **Step 8: Eseguire build frontend**

Run: `cd frontend; npm run build`  
Expected: build completata senza errori ESLint o bundling.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/ciak/admin/api.js frontend/src/ciak/admin/pages/CollaboratorSettlements.jsx frontend/src/ciak/admin/pages/Collaboratori.jsx frontend/src/ciak/admin/pages/CollaboratorSettlements.test.jsx
git commit -m "feat(collaboratori): add invoices and payments UI"
```

---

### Task 5: Indici, regressione e verifica end-to-end

**Files:**
- Modify: `backend/server.py`
- Modify: `backend/tests/test_collaborator_settlements_api.py`
- Modify: `docs/superpowers/plans/2026-07-13-fatture-collaboratori.md` (spuntare risultati solo durante l'esecuzione)

**Interfaces:**
- Consumes: implementazione Tasks 1-4.
- Produces: indici Mongo idempotenti e feature verificata in modo completo.

- [ ] **Step 1: Aggiungere inizializzazione indici idempotente**

```python
await db.collaborator_settlements.create_index("settlement_id", unique=True)
await db.collaborator_settlements.create_index([("collaborator_id", 1), ("period_start", -1)])
await db.collaborator_settlements.create_index([("collaborator_id", 1), ("status", 1)])
await db.agent_tasks.create_index("collaborator_settlement_id", sparse=True)
```

- [ ] **Step 2: Aggiungere test di rollback prenotazione task**

Simulare errore Mongo dopo aver marcato il primo task e verificare che nessun task conservi `collaborator_settlement_id`; simulare errore GCS dopo upload e verificare che l'oggetto venga eliminato.

- [ ] **Step 3: Eseguire suite backend mirata**

Run: `python -m pytest backend/tests/test_collaborator_settlements.py backend/tests/test_collaborator_document_storage.py backend/tests/test_collaborator_settlements_api.py -q`  
Expected: tutti PASS.

- [ ] **Step 4: Eseguire test e build frontend**

Run: `cd frontend; npm test -- --run CollaboratorSettlements.test.jsx; npm run build`  
Expected: test PASS e build completata.

- [ ] **Step 5: Verifica manuale locale**

Accedere come Claudio, aprire `Back office → Collaboratori → Fatture e pagamenti`, creare un periodo di 7 giorni con ore approvate, caricare un PDF con importo differente, verificare che la nota sia obbligatoria, registrare un bonifico e scaricare fattura/distinta. Accedere poi come Antonella e verificare che tab e API contabili siano assenti/403.

- [ ] **Step 6: Controllare il diff finale**

Run: `git diff --check; git status --short`  
Expected: nessun whitespace error; solo file previsti dal piano modificati.

- [ ] **Step 7: Commit finale se necessario**

```bash
git add backend/server.py backend/tests/test_collaborator_settlements_api.py
git commit -m "test(collaboratori): verify invoice settlement workflow"
```

- [ ] **Step 8: Push e controllo deploy**

Run: `git push origin main`  
Expected: push riuscito; Cloud Build `auto-deploy-main` avviato.

