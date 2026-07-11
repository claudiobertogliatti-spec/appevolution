# Ciak Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere Ciak fail-closed, bloccare regressioni di sicurezza in CI, verificare autorizzazioni e dipendenze, quindi validare `www.ciak.io` senza side effect.

**Architecture:** La policy di ambiente, secret e CORS vive in un modulo backend puro e testabile. Stripe mantiene un secondo controllo fail-closed nel proprio handler; Vercel e nginx applicano gli stessi header. La CI esegue secret scanning e una suite security esplicita prima degli audit e dei test live.

**Tech Stack:** Python 3.11, FastAPI/Starlette, pytest, Stripe SDK, GitHub Actions, Gitleaks, Vercel, nginx, pip-audit, npm audit, curl.

## Global Constraints

- `APP_ENV` accetta solo `production`, `development`, `test`; assente significa `production`.
- Nessun webhook Stripe non firmato viene elaborato in alcun ambiente.
- Nessun wildcard CORS è ammesso in produzione.
- Nessun test dinamico modifica dati reali, crea pagamenti o elimina documenti.
- Non modificare l'area delivery o il motore cut-engine sviluppati in parallelo.
- Ogni task applicativo segue RED, GREEN, verifica completa e commit separato.

---

### Task 1: Configurazione fail-closed per JWT, Stripe e CORS

**Files:**
- Create: `backend/security_config.py`
- Create: `backend/tests/test_security_config.py`
- Create: `backend/tests/test_stripe_webhook_security.py`
- Modify: `backend/auth.py:18-21`
- Modify: `backend/server.py:115-151`
- Modify: `backend/routers/stripe_webhook.py:112-151`

**Interfaces:**
- Produces: `get_app_env() -> str`, `require_jwt_secret() -> str`, `require_stripe_webhook_secret() -> str`, `build_cors_origins(cors_env: str, react_backend_url: str) -> list[str]`.
- Consumes: `APP_ENV`, `JWT_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`.

- [ ] **Step 1: Scrivere i test fallenti della policy ambiente**

Copertura minima in `test_security_config.py`:

```python
def test_missing_app_env_defaults_to_production(monkeypatch): ...
def test_production_rejects_missing_or_legacy_jwt_secret(monkeypatch): ...
def test_test_env_accepts_explicit_test_secret(monkeypatch): ...
def test_production_rejects_wildcard_and_http_cors(monkeypatch): ...
def test_test_env_allows_localhost_cors(monkeypatch): ...
```

- [ ] **Step 2: Verificare RED**

Run: `python -m pytest -q backend/tests/test_security_config.py`

Expected: FAIL perché `security_config` non esiste.

- [ ] **Step 3: Implementare il modulo puro**

Usare `urllib.parse.urlparse`, deduplicazione stabile e `RuntimeError` con messaggi privi di secret. Il secret JWT production deve avere almeno 32 caratteri e non essere `evolution-pro-os-secret-key-2026`.

- [ ] **Step 4: Integrare JWT e CORS**

`auth.py` importa `require_jwt_secret`; `server.py` usa `build_cors_origins` e non costruisce più `['*']`.

- [ ] **Step 5: Scrivere test fallenti Stripe**

Verificare che secret assente/placeholder restituisca `503`, firma assente o errata `400`, firma valida raggiunga il dispatch. Mockare soltanto Stripe e DB, non la funzione di policy.

- [ ] **Step 6: Verificare RED e implementare GREEN**

Run: `python -m pytest -q backend/tests/test_stripe_webhook_security.py`

Rimuovere il ramo `json.loads(payload)` e chiamare sempre `stripe.Webhook.construct_event`.

- [ ] **Step 7: Verifica Task 1**

Run:

```text
python -m pytest -q backend/tests/test_security_config.py backend/tests/test_stripe_webhook_security.py backend/tests/test_checkout_trigger.py backend/tests/test_document_admin_auth.py
python -m compileall -q backend
```

Expected: tutti PASS, compileall exit 0.

- [ ] **Step 8: Commit**

`git commit -m "security: fail closed on auth webhook and cors config"`

---

### Task 2: Gitleaks e suite security bloccante in CI

**Files:**
- Create: `.gitleaks.toml`
- Modify: `.github/workflows/ci.yml`
- Modify: `backend/tests/test_security_config.py`

**Interfaces:**
- Consumes: test unitari ermetici e cronologia completa del checkout.
- Produces: job `security` bloccante prima del merge.

- [ ] **Step 1: Aggiungere test di configurazione della CI**

Il test legge YAML/testo e verifica `fetch-depth: 0`, action Gitleaks fissata a SHA, presenza dei test `test_security_config.py`, `test_stripe_webhook_security.py`, `test_document_admin_auth.py`, `test_partner_journey_auth_unittest.py`, `test_no_shadow_routes.py` e `test_proposta_security.py`.

- [ ] **Step 2: Verificare RED**

Run: `python -m pytest -q backend/tests/test_security_config.py`

Expected: FAIL sulle guardie CI mancanti.

- [ ] **Step 3: Configurare Gitleaks**

Checkout con `fetch-depth: 0`; action `gitleaks/gitleaks-action` fissata a commit SHA verificato dalla release ufficiale. `.gitleaks.toml` consente soltanto stringhe test esplicitamente finte e non esclude directory applicative.

- [ ] **Step 4: Estendere la suite CI**

Aggiungere i sei file security all'invocazione pytest esistente con `APP_ENV=test`, mantenendo i test di prodotto attuali.

- [ ] **Step 5: Verifica Task 2**

Run: suite security locale e `git diff --check`.

- [ ] **Step 6: Commit**

`git commit -m "ci: block secrets and run security regression suite"`

---

### Task 3: Header di sicurezza su Vercel e nginx

**Files:**
- Create: `backend/tests/test_frontend_security_headers.py`
- Modify: `frontend/vercel.json`
- Modify: `frontend/nginx.conf`

**Interfaces:**
- Produces: policy header equivalente sulle due superfici frontend.
- Consumes: domini Stripe, YouTube, Google Fonts, Cloudinary e backend Ciak già usati dall'app.

- [ ] **Step 1: Scrivere il test fallente degli header**

Il test carica `vercel.json` e `nginx.conf` e richiede HSTS, nosniff, referrer policy, permissions policy e CSP. La CSP deve includere `frame-ancestors 'self'`, `https://www.youtube.com`, Stripe e le API Ciak necessarie.

- [ ] **Step 2: Verificare RED**

Run: `python -m pytest -q backend/tests/test_frontend_security_headers.py`

Expected: FAIL per header assenti.

- [ ] **Step 3: Implementare gli header**

Applicare gli header globalmente su Vercel e con `add_header ... always` in nginx. Conservare le regole cache esistenti.

- [ ] **Step 4: Verificare build e test**

Run:

```text
python -m pytest -q backend/tests/test_frontend_security_headers.py
npm --prefix frontend run build
```

Expected: PASS ed exit 0.

- [ ] **Step 5: Commit**

`git commit -m "security: add frontend response headers"`

---

### Task 4: Inventario route pubbliche e verifica IDOR partner

**Files:**
- Create: `backend/security_route_inventory.py`
- Create: `backend/tests/test_route_security_inventory.py`
- Create: `docs/security/route-access-inventory.md`
- Modify: route vulnerabili confermate in `backend/server.py` o `backend/routers/*.py`
- Modify: test ownership esistenti pertinenti.

**Interfaces:**
- Produces: inventario ripetibile con metodo, path, handler, classe accesso e parametro sensibile.
- Consumes: decorator FastAPI e dependency `Depends` presenti nel backend.

- [ ] **Step 1: Generare inventario statico senza modificare route**

Estrarre decorator da `server.py` e `routers/*.py`; classificare `public`, `authenticated`, `partner_scoped`, `admin`, `signed_webhook`, `review_required`.

- [ ] **Step 2: Scrivere guardie fallenti per route mutative non classificate**

Ogni POST/PUT/PATCH/DELETE con `partner_id`, `user_id`, `cliente_id`, filename o token deve essere esplicitamente classificata. Le eccezioni pubbliche richiedono motivazione nel documento.

- [ ] **Step 3: Tracciare manualmente i candidati IDOR**

Per ciascun `review_required`, seguire input, dependency, lookup DB e mutazione. Registrare solo problemi con exploit concreto.

- [ ] **Step 4: Correggere ogni vulnerabilità confermata con TDD**

Per ogni route: test partner A contro risorsa B deve fallire prima del fix e restituire `403` dopo il fix; admin e proprietario restano consentiti.

- [ ] **Step 5: Verifica Task 4**

Run: inventario, test route, `test_partner_journey_auth_unittest.py`, `test_document_admin_auth.py`, `test_no_shadow_routes.py`, `test_proposta_security.py`, compileall.

- [ ] **Step 6: Commit**

`git commit -m "security: audit public routes and enforce partner ownership"`

---

### Task 5: Audit dipendenze e test dinamici non distruttivi

**Files:**
- Create: `docs/security/2026-07-11-dependency-and-live-audit.md`
- Modify: lockfile/requirements solo per vulnerabilità raggiungibili e approvate dalla verifica.

**Interfaces:**
- Consumes: backend e frontend già deployati con Task 1-4.
- Produces: report con finding, severità, raggiungibilità, fix o rischio accettato.

- [ ] **Step 1: Verificare deploy Task 1-4**

Controllare CI verde, revisione Cloud Run al 100% e `main` locale/remoto allineati.

- [ ] **Step 2: Eseguire audit dipendenze**

Run:

```text
python -m pip install pip-audit
python -m pip_audit -r backend/requirements.txt
npm --prefix frontend audit --json
```

Classificare CVE per uso diretto/transitivo e raggiungibilità. Non applicare major upgrade automatici.

- [ ] **Step 3: Verificare header e CORS live**

Usare `curl` con origin consentita e ostile. Atteso: header presenti; origin ostile senza `Access-Control-Allow-Origin`; wildcard assente.

- [ ] **Step 4: Verificare auth e Stripe live**

Chiamare route protette con identificativi innocui senza token e webhook Stripe con payload fittizio non firmato. Atteso: `401/403` e `400/503`, senza side effect.

- [ ] **Step 5: Verificare route pubbliche e IDOR**

Testare soltanto GET pubbliche e controlli negativi. Usare due account di test solo se già disponibili e autorizzati; altrimenti documentare il limite senza usare dati reali altrui.

- [ ] **Step 6: Scrivere report e correggere finding raggiungibili**

Ogni correzione dipendenze segue test/build completo e commit dedicato. Il report include comandi, versioni, risultati e rischi residui.

- [ ] **Step 7: Verifica finale e commit**

Run suite security, compileall, build frontend, controllo live, `git diff --check`.

Commit: `git commit -m "security: document dependency and live audit"`

---

## Gate di pubblicazione

Dopo ogni task:

1. verificare che non siano stati inclusi `AGENTS.md` o script non tracciati di Claude;
2. fetch di `origin/main` e controllo divergenze;
3. push su `main` solo con test del task verdi;
4. attendere CI/deploy quando il task modifica codice runtime;
5. verificare la revisione live prima di iniziare il task successivo che ne dipende.
