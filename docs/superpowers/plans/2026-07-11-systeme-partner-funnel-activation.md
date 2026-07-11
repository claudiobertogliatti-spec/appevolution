# Systeme Partner Funnel Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire in Ciak una pratica operativa che porta ogni partner dal subaccount Systeme.io all'anteprima approvata, quindi al dominio autenticato e al funnel collaudato Live.

**Architecture:** Una nuova collezione MongoDB `systeme_activations` conserva stato, requisiti, approvazioni, DNS e collaudo senza sovraccaricare `partner_funnel`. Un service puro governa transizioni e prerequisiti; un router dedicato espone API partner/admin; il workspace Gaia presenta il percorso al partner e una nuova coda admin governa il lavoro Evolution. Le azioni Systeme non disponibili tramite API restano checklist operative tracciate, mentre DNS e raggiungibilita' vengono verificati automaticamente.

**Tech Stack:** FastAPI, Pydantic, Motor/MongoDB, dnspython, httpx, React CRA, Tailwind CSS, pytest, Jest/React Testing Library.

## Global Constraints

- Ogni partner vive in un subaccount Systeme.io separato sotto l'account Evolution PRO.
- Costruzione e approvazione avvengono sul sottodominio gratuito; il dominio definitivo non viene toccato prima dell'approvazione.
- Dominio e casella professionale esistono gia' e restano a carico del partner.
- Evolution configura DNS, SSL e mittente; il partner fornisce accessi e conferma la casella.
- Le legal pages generate da Ciak mostrano un disclaimer e richiedono approvazione versionata; i testi del legale non vengono alterati.
- Nessuna password viene persistita in chiaro.
- Nessuna pratica passa a `live` senza collaudo completo o deroga admin motivata e tracciata.
- Il partner non vede termini tecnici che non corrispondono a una sua azione.
- Non modificare il system prompt di Matteo.

---

## File Structure

- Create `backend/models/systeme_activation.py`: enum, modelli Pydantic e costanti dei controlli.
- Create `backend/services/systeme_activation_service.py`: transizioni, percentuale, responsabilita' e audit event.
- Create `backend/services/domain_verification.py`: controlli DNS/HTTPS puri e asincroni.
- Create `backend/routers/systeme_activation.py`: API partner/admin e autorizzazioni.
- Modify `backend/server.py`: registra router e dipendenza DB.
- Modify `backend/requirements.txt`: aggiunge `dnspython` solo se non gia' transitivo/dichiarato.
- Modify `backend/routers/workspace_vendita.py`: include il nuovo riepilogo nel workspace esistente.
- Modify `backend/routers/partner_journey.py`: collega legal esistenti alla pratica e invalida approvazioni su rigenerazione.
- Create `frontend/src/ciak/partner/operativo/SystemeActivationPanel.jsx`: percorso partner.
- Modify `frontend/src/ciak/partner/operativo/Workspace3SistemaVendita.jsx`: monta il pannello e rimuove copy da servizio extra.
- Create `frontend/src/ciak/admin/pages/SystemeActivationQueue.jsx`: coda admin.
- Modify `frontend/src/ciak/admin/AdminSidebarLight.jsx`: voce di navigazione.
- Modify `frontend/src/App.js`: route admin.
- Create `backend/tests/test_systeme_activation_models.py`.
- Create `backend/tests/test_systeme_activation_service.py`.
- Create `backend/tests/test_domain_verification.py`.
- Create `backend/tests/test_systeme_activation_router.py`.
- Create `frontend/src/ciak/partner/operativo/SystemeActivationPanel.test.jsx`.
- Create `frontend/src/ciak/admin/pages/SystemeActivationQueue.test.jsx`.

### Task 1: Modello canonico e macchina a stati

**Files:**
- Create: `backend/models/systeme_activation.py`
- Create: `backend/services/systeme_activation_service.py`
- Test: `backend/tests/test_systeme_activation_models.py`
- Test: `backend/tests/test_systeme_activation_service.py`

**Interfaces:**
- Produces: `ActivationStatus`, `ActivationOwner`, `QA_CHECK_IDS`, `build_activation(partner_id)`, `transition_activation(doc, target, actor, note=None)`, `derive_activation_summary(doc)`.
- Consumes: dizionari Mongo serializzabili; nessun accesso DB diretto.

- [ ] **Step 1: Scrivere i test fallenti per default, transizioni e percentuale**

```python
def test_new_activation_waits_for_required_data():
    doc = build_activation("p-1")
    assert doc["status"] == "missing_data"
    assert doc["next_owner"] == "partner"
    assert doc["progress"] == 0

def test_domain_configuration_requires_funnel_approval():
    doc = build_activation("p-1")
    with pytest.raises(InvalidActivationTransition, match="funnel_approved"):
        transition_activation(doc, "domain_configuring", actor={"id": "a-1", "role": "admin"})

def test_live_requires_all_mandatory_qa_checks():
    doc = ready_for_qa_activation()
    with pytest.raises(InvalidActivationTransition, match="qa obbligatorio"):
        transition_activation(doc, "live", actor={"id": "a-1", "role": "admin"})
```

- [ ] **Step 2: Eseguire i test e verificare il fallimento**

Run: `python -m pytest backend/tests/test_systeme_activation_models.py backend/tests/test_systeme_activation_service.py -q`
Expected: FAIL per moduli mancanti.

- [ ] **Step 3: Implementare enum, documento iniziale e regole**

```python
class ActivationStatus(str, Enum):
    MISSING_DATA = "missing_data"
    READY_TO_BUILD = "ready_to_build"
    SUBACCOUNT_CREATED = "subaccount_created"
    FUNNEL_BUILDING = "funnel_building"
    PREVIEW_READY = "preview_ready"
    CHANGES_REQUESTED = "changes_requested"
    FUNNEL_APPROVED = "funnel_approved"
    WAITING_DNS_ACCESS = "waiting_dns_access"
    DOMAIN_CONFIGURING = "domain_configuring"
    WAITING_EMAIL_CONFIRMATION = "waiting_email_confirmation"
    QA = "qa"
    LIVE = "live"
    BLOCKED = "blocked"

QA_CHECK_IDS = (
    "https_valid", "final_domain_reachable", "no_preview_links",
    "mobile_navigation", "form_consent", "test_contact_created",
    "automation_active", "test_email_received", "legal_links",
    "cookie_banner", "checkout_redirect",
)
```

`transition_activation` deve usare una mappa esplicita delle transizioni, verificare approvazione funnel prima del dominio e richiedere tutti i check applicabili con `status == "passed"` prima di Live. Ogni transizione aggiunge a `history` `{from, to, actor, note, at}`.

- [ ] **Step 4: Eseguire i test**

Run: `python -m pytest backend/tests/test_systeme_activation_models.py backend/tests/test_systeme_activation_service.py -q`
Expected: PASS.

- [ ] **Step 5: Committare**

```bash
git add backend/models/systeme_activation.py backend/services/systeme_activation_service.py backend/tests/test_systeme_activation_models.py backend/tests/test_systeme_activation_service.py
git commit -m "feat: add Systeme activation state machine"
```

### Task 2: API della pratica e autorizzazioni

**Files:**
- Create: `backend/routers/systeme_activation.py`
- Modify: `backend/server.py`
- Test: `backend/tests/test_systeme_activation_router.py`

**Interfaces:**
- Consumes: funzioni della Task 1 e collection `db.systeme_activations`.
- Produces: `GET /api/systeme-activation/{partner_id}`, `PUT /requirements`, `POST /preview`, `POST /review`, `POST /transition`, `PUT /qa/{check_id}`, `POST /waiver`; `GET /api/admin/systeme-activations`.

- [ ] **Step 1: Scrivere test API fallenti**

```python
def test_partner_cannot_read_another_activation(client, partner_token):
    response = client.get("/api/systeme-activation/other", headers=partner_token)
    assert response.status_code == 403

def test_partner_review_records_version(client, partner_token):
    response = client.post("/api/systeme-activation/p-1/review", headers=partner_token,
        json={"decision": "approved", "version": 3, "comments": []})
    assert response.status_code == 200
    assert response.json()["funnel_approval"]["version"] == 3

def test_password_like_fields_are_rejected(client, admin_token):
    response = client.put("/api/systeme-activation/p-1/requirements", headers=admin_token,
        json={"domain": "example.it", "registrar_password": "secret"})
    assert response.status_code == 422
```

- [ ] **Step 2: Verificare che i test falliscano**

Run: `python -m pytest backend/tests/test_systeme_activation_router.py -q`
Expected: FAIL con route non trovate.

- [ ] **Step 3: Implementare schema e route**

```python
class RequirementUpdate(BaseModel):
    domain: str | None = None
    registrar: str | None = None
    professional_email: EmailStr | None = None
    sender_name: str | None = None
    dns_access_available: bool | None = None
    legal_mode: Literal["ciak_generated", "lawyer_supplied"] | None = None

    model_config = ConfigDict(extra="forbid")
```

Le route partner verificano `current_user.partner_id == partner_id`; le mutazioni tecniche richiedono admin. Usare upsert atomico e valorizzare `updated_at`. La lista admin accetta `status`, `next_owner`, `blocked_code` e paginazione.

- [ ] **Step 4: Registrare il router in `server.py` e rieseguire i test**

Run: `python -m pytest backend/tests/test_systeme_activation_router.py -q`
Expected: PASS.

- [ ] **Step 5: Committare**

```bash
git add backend/routers/systeme_activation.py backend/server.py backend/tests/test_systeme_activation_router.py
git commit -m "feat: expose Systeme activation workflow API"
```

### Task 3: Integrazione legal versionata

**Files:**
- Modify: `backend/routers/partner_journey.py`
- Modify: `backend/legal_pages_service.py`
- Test: `backend/tests/test_systeme_activation_router.py`

**Interfaces:**
- Consumes: `systeme_activations.legal_mode`, legal esistenti in `partner_funnel.legal`.
- Produces: `legal_version`, `legal_disclaimer_accepted_at`, `legal_approval`; invalidazione automatica dopo rigenerazione.

- [ ] **Step 1: Aggiungere test fallenti**

```python
def test_regeneration_invalidates_prior_legal_approval(client, partner_token, seeded_approved_legal):
    response = client.post("/api/partner-journey/funnel/generate-legal", headers=partner_token,
                           json={"partner_id": "p-1"})
    assert response.status_code == 200
    activation = load_activation("p-1")
    assert activation["legal_approval"] is None
    assert activation["legal_version"] == 2

def test_generated_legal_requires_disclaimer_acceptance(client, partner_token):
    response = client.post("/api/systeme-activation/p-1/legal-approve", headers=partner_token,
                           json={"version": 1, "disclaimer_accepted": False})
    assert response.status_code == 422
```

- [ ] **Step 2: Eseguire il test e verificare il fallimento**

Run: `python -m pytest backend/tests/test_systeme_activation_router.py -k legal -q`
Expected: FAIL.

- [ ] **Step 3: Implementare versionamento e disclaimer**

Il testo mostrato e persistito come `legal_disclaimer_text` deve essere: `I documenti sono modelli informativi generati sulla base dei dati forniti. Non costituiscono consulenza legale e non garantiscono da soli la conformita'. Rimani responsabile della verifica e puoi rivolgerti a un professionista.`

Per `lawyer_supplied`, salvare `source="lawyer_supplied"`, `declared_author`, `uploaded_at` e checksum SHA-256; non passare il testo al generatore.

- [ ] **Step 4: Eseguire test legal e regressione funnel**

Run: `python -m pytest backend/tests/test_systeme_activation_router.py -k legal -q backend/tests/test_funnel_lead_endpoints.py`
Expected: PASS.

- [ ] **Step 5: Committare**

```bash
git add backend/routers/partner_journey.py backend/legal_pages_service.py backend/tests/test_systeme_activation_router.py
git commit -m "feat: version partner legal approvals"
```

### Task 4: Verifica DNS, HTTPS e retry

**Files:**
- Create: `backend/services/domain_verification.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/routers/systeme_activation.py`
- Test: `backend/tests/test_domain_verification.py`

**Interfaces:**
- Produces: `verify_domain(domain, expected_records, resolver=None, http_client=None) -> DomainVerificationResult` e `POST /api/systeme-activation/{partner_id}/verify-domain`.
- Consumes: record attesi salvati nella pratica; non modifica DNS.

- [ ] **Step 1: Scrivere test fallenti con resolver e HTTP finti**

```python
@pytest.mark.asyncio
async def test_verify_domain_reports_propagating_record():
    result = await verify_domain("example.it", [{"type": "CNAME", "name": "www", "value": "target.systeme.io"}],
                                 resolver=FakeResolver({}), http_client=FakeHttp(200))
    assert result.status == "propagating"
    assert result.checks[0].code == "dns_record_missing"

@pytest.mark.asyncio
async def test_verify_domain_detects_https_and_expected_record():
    result = await verify_domain("example.it", EXPECTED, resolver=FakeResolver(MATCHING), http_client=FakeHttp(200))
    assert result.status == "passed"
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `python -m pytest backend/tests/test_domain_verification.py -q`
Expected: FAIL per modulo mancante.

- [ ] **Step 3: Implementare resolver asincrono e controllo HTTPS**

Normalizzare FQDN, punti finali, maiuscole e TXT spezzati. Restituire codici stabili: `dns_record_missing`, `dns_record_mismatch`, `https_unreachable`, `ssl_invalid`, `domain_reachable`. Timeout HTTP 10 secondi; nessun follow-up verso host diverso dal dominio richiesto oltre 3 redirect.

- [ ] **Step 4: Persistire risultato e `next_retry_at`**

La route salva `domain_checks`, `last_checked_at` e, per propagazione, `next_retry_at = now + 15 minuti`; un nuovo controllo sostituisce il risultato ma resta nell'audit `history`.

- [ ] **Step 5: Eseguire test e committare**

Run: `python -m pytest backend/tests/test_domain_verification.py backend/tests/test_systeme_activation_router.py -q`
Expected: PASS.

```bash
git add backend/services/domain_verification.py backend/requirements.txt backend/routers/systeme_activation.py backend/tests/test_domain_verification.py backend/tests/test_systeme_activation_router.py
git commit -m "feat: verify partner domain activation"
```

### Task 5: Collegare workspace Gaia e flusso partner

**Files:**
- Modify: `backend/routers/workspace_vendita.py`
- Create: `frontend/src/ciak/partner/operativo/SystemeActivationPanel.jsx`
- Modify: `frontend/src/ciak/partner/operativo/Workspace3SistemaVendita.jsx`
- Test: `frontend/src/ciak/partner/operativo/SystemeActivationPanel.test.jsx`

**Interfaces:**
- Consumes: API Task 2 e campo `systeme_activation` nel payload workspace.
- Produces: form requisiti, anteprima, richieste modifica, approvazione e conferma email visibili al partner.

- [ ] **Step 1: Scrivere test componente fallenti**

```jsx
it("mostra solo l'azione richiesta al partner", () => {
  render(<SystemeActivationPanel activation={{status:"waiting_email_confirmation", next_owner:"partner", professional_email:"info@example.it"}} />);
  expect(screen.getByText(/conferma ricevuta su info@example.it/i)).toBeInTheDocument();
  expect(screen.queryByText(/DKIM|CNAME|pipeline/i)).not.toBeInTheDocument();
});

it("invia approvazione con la versione mostrata", async () => {
  render(<SystemeActivationPanel activation={previewReady(4)} partnerId="p-1" />);
  await userEvent.click(screen.getByRole("button", {name:/approva il funnel/i}));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/review"), expect.objectContaining({method:"POST"}));
});
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd frontend; npm test -- --watchAll=false SystemeActivationPanel.test.jsx`
Expected: FAIL per componente mancante.

- [ ] **Step 3: Implementare pannello partner**

Mostrare una timeline semplificata in quattro blocchi: `Dati`, `Anteprima`, `Dominio e email`, `Online`. Visualizzare il dettaglio tecnico solo come stato comprensibile. Le correzioni hanno `{page_id, comment}`; l'approvazione invia la `preview_version` corrente.

- [ ] **Step 4: Integrare il payload backend e rimuovere il copy “servizio extra”**

`Workspace3SistemaVendita` deve presentare il lavoro come incluso nel processo Evolution, coerentemente con la decisione approvata, e non come upsell opzionale.

- [ ] **Step 5: Eseguire test e committare**

Run: `cd frontend; npm test -- --watchAll=false SystemeActivationPanel.test.jsx`
Expected: PASS.

```bash
git add backend/routers/workspace_vendita.py frontend/src/ciak/partner/operativo/SystemeActivationPanel.jsx frontend/src/ciak/partner/operativo/SystemeActivationPanel.test.jsx frontend/src/ciak/partner/operativo/Workspace3SistemaVendita.jsx
git commit -m "feat: guide partner through Systeme activation"
```

### Task 6: Coda operativa admin

**Files:**
- Create: `frontend/src/ciak/admin/pages/SystemeActivationQueue.jsx`
- Create: `frontend/src/ciak/admin/pages/SystemeActivationQueue.test.jsx`
- Modify: `frontend/src/ciak/admin/AdminSidebarLight.jsx`
- Modify: `frontend/src/App.js`

**Interfaces:**
- Consumes: lista e mutazioni admin della Task 2, verifica dominio Task 4.
- Produces: route admin `systeme-activation`, filtri, dettaglio, checklist e transizioni operative.

- [ ] **Step 1: Scrivere test fallenti della coda**

```jsx
it("evidenzia responsabile e prossima azione", async () => {
  mockFetchList([{partner_id:"p-1", partner_name:"Mario", status:"waiting_dns_access", next_owner:"partner", next_action:"Fornire accesso DNS"}]);
  render(<SystemeActivationQueue />);
  expect(await screen.findByText("Mario")).toBeInTheDocument();
  expect(screen.getByText("Partner")).toBeInTheDocument();
  expect(screen.getByText("Fornire accesso DNS")).toBeInTheDocument();
});
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `cd frontend; npm test -- --watchAll=false SystemeActivationQueue.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implementare coda e dettaglio**

Filtri: stato, responsabile, codice blocco. Colonne: partner, stato, responsabile, prossima azione, ultima attivita', scadenza. Il dettaglio mostra link subaccount/preview/finale, record attesi senza credenziali, legal, audit, QA e pulsante `Ricontrolla dominio`.

- [ ] **Step 4: Aggiungere navigazione**

Aggiungere sotto PARTNER la voce `Attivazioni Systeme` con chiave `systeme-activation`; montare `SystemeActivationQueue` nella route admin corrispondente.

- [ ] **Step 5: Eseguire test e committare**

Run: `cd frontend; npm test -- --watchAll=false SystemeActivationQueue.test.jsx`
Expected: PASS.

```bash
git add frontend/src/ciak/admin/pages/SystemeActivationQueue.jsx frontend/src/ciak/admin/pages/SystemeActivationQueue.test.jsx frontend/src/ciak/admin/AdminSidebarLight.jsx frontend/src/App.js
git commit -m "feat: add admin Systeme activation queue"
```

### Task 7: Solleciti, audit e collaudo Live

**Files:**
- Modify: `backend/celery_tasks.py`
- Modify: `backend/services/systeme_activation_service.py`
- Modify: `backend/routers/systeme_activation.py`
- Test: `backend/tests/test_systeme_activation_service.py`
- Test: `backend/tests/test_systeme_activation_router.py`

**Interfaces:**
- Consumes: `next_owner`, `next_retry_at`, `qa_checks`, notifiche Ciak esistenti.
- Produces: task `process_systeme_activation_followups`, audit delle deroghe e gate Live definitivo.

- [ ] **Step 1: Scrivere test fallenti per retry e solleciti idempotenti**

```python
def test_followup_is_not_sent_twice_in_same_window():
    result = select_due_followups([waiting_partner(last_reminder_at=now_minus(hours=2))], now=NOW)
    assert result == []

def test_admin_waiver_requires_reason():
    response = client.post("/api/systeme-activation/p-1/waiver", headers=admin_token,
                           json={"check_id":"checkout_redirect", "reason":""})
    assert response.status_code == 422
```

- [ ] **Step 2: Eseguire e verificare il fallimento**

Run: `python -m pytest backend/tests/test_systeme_activation_service.py backend/tests/test_systeme_activation_router.py -k "followup or waiver" -q`
Expected: FAIL.

- [ ] **Step 3: Implementare follow-up e deroghe**

Inviare solleciti solo per azioni partner concrete, massimo uno ogni 48 ore, e interromperli al cambio stato. La deroga contiene `check_id`, `reason` minimo 20 caratteri, `actor`, `created_at`; vale come esito esplicito per il gate Live ma resta visibile nel report QA.

- [ ] **Step 4: Aggiungere esecuzione periodica senza duplicare beat esistenti**

Registrare il task nello scheduler Celery esistente con frequenza 15 minuti; lo stesso task riesegue i controlli DNS con `next_retry_at <= now`.

- [ ] **Step 5: Eseguire test e committare**

Run: `python -m pytest backend/tests/test_systeme_activation_service.py backend/tests/test_systeme_activation_router.py backend/tests/test_domain_verification.py -q`
Expected: PASS.

```bash
git add backend/celery_tasks.py backend/services/systeme_activation_service.py backend/routers/systeme_activation.py backend/tests/test_systeme_activation_service.py backend/tests/test_systeme_activation_router.py
git commit -m "feat: automate Systeme activation followups"
```

### Task 8: Migrazione, regressione e documentazione operativa

**Files:**
- Create: `backend/scripts/backfill_systeme_activations.py`
- Create: `docs/operations/systeme-partner-activation-runbook.md`
- Modify: `docs/marketing/systeme-motore-vendite-setup.md`
- Test: `backend/tests/test_systeme_activation_service.py`

**Interfaces:**
- Consumes: `partner_funnel`, `partners`, `build_activation`.
- Produces: backfill idempotente e runbook per Gaia/team.

- [ ] **Step 1: Scrivere test del mapping legacy**

```python
def test_backfill_maps_preview_without_marking_live():
    activation = activation_from_legacy("p-1", {"funnel_systeme_url":"https://mario.systeme.io", "published":True})
    assert activation["status"] == "preview_ready"
    assert activation["preview_url"] == "https://mario.systeme.io"
```

- [ ] **Step 2: Implementare backfill dry-run e apply**

Lo script accetta `--dry-run` predefinito e `--apply`; non marca mai Live dai soli campi legacy. Stampa conteggi `created`, `skipped`, `conflicts` senza stampare credenziali o dati personali completi.

- [ ] **Step 3: Scrivere runbook completo**

Documentare: creazione subaccount, import funnel condiviso, registrazione ID/URL, raccolta record DNS, snapshot record preesistenti, collegamento dominio, autenticazione email, conferma mittente, QA, rollback DNS e gestione conflitto dominio gia' autenticato.

- [ ] **Step 4: Eseguire suite mirate e build frontend**

Run: `python -m pytest backend/tests/test_systeme_activation_models.py backend/tests/test_systeme_activation_service.py backend/tests/test_domain_verification.py backend/tests/test_systeme_activation_router.py backend/tests/test_funnel_lead_endpoints.py -q`
Expected: PASS.

Run: `cd frontend; npm test -- --watchAll=false SystemeActivationPanel.test.jsx SystemeActivationQueue.test.jsx`
Expected: PASS.

Run: `cd frontend; npm run build`
Expected: build completata senza errori.

- [ ] **Step 5: Eseguire backfill dry-run e committare**

Run: `python backend/scripts/backfill_systeme_activations.py --dry-run`
Expected: riepilogo senza scritture.

```bash
git add backend/scripts/backfill_systeme_activations.py backend/tests/test_systeme_activation_service.py docs/operations/systeme-partner-activation-runbook.md docs/marketing/systeme-motore-vendite-setup.md
git commit -m "docs: add Systeme activation migration and runbook"
```

## Final Verification

- [ ] Eseguire `git diff --check` e verificare zero errori.
- [ ] Eseguire tutte le suite indicate nella Task 8.
- [ ] Verificare manualmente un partner di prova: requisiti -> preview -> modifica -> approvazione -> DNS simulato -> conferma email -> QA -> Live.
- [ ] Verificare che un partner non possa leggere o modificare la pratica di un altro partner.
- [ ] Verificare che nessuna risposta API o schermata esponga password/access token.
- [ ] Verificare che `app.evolution-pro.it` non compaia nei nuovi file; usare esclusivamente `www.ciak.io` per link Ciak.
- [ ] Pubblicare su `main` solo dopo review del diff e test verdi; il push attiva Cloud Build.

