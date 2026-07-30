# Protezione endpoint `/api/admin/*` e `/api/partner-hub/*`

Data: 2026-07-30 · Stato: approvato da Claudio

## Problema

62 endpoint sotto `/api/admin/*` e `/api/partner-hub/*` sono raggiungibili **senza alcuna
autenticazione**. Verificato in produzione il 2026-07-30 su `www.ciak.io`:

```
200  GET /api/admin/stats                      ← nessun header, dati reali
404  GET /api/admin/partner/__probe__/full-data ← endpoint raggiungibile, partner inesistente
404  GET /api/partner-hub/__probe__             ← idem
401  GET /api/admin/ciak/stats                  ← questo invece è protetto
```

Un 404 (invece di 401) su un id inesistente prova che la richiesta arriva all'handler:
manca proprio il controllo, non è un caso di id sbagliato.

Espongono anagrafiche partner complete, CF/P.IVA/IBAN nelle note, risposte dei wizard,
parametri contrattuali (corrispettivo, rate), documenti d'identità, e permettono la
**scrittura** su fasi, questionari, posizionamento e hub partner.

## Censimento

154 route totali sotto i due prefissi → **92 protette, 62 no**.

| File | N° | Idioma di auth già presente nel file |
|---|---|---|
| `backend/server.py` | 41 | `verify_admin` (server.py:4315) |
| `routers/clienti.py` | 7 | importa già `require_ciak_admin` |
| `routers/contract.py` | 3 | nessuno — `admin_router` dedicato |
| `routers/partner_documents.py` | 3 | nessuno — `admin_router` dedicato |
| `routers/posizionamento_approval.py` | 3 | nessuno — `admin_router` dedicato |
| `routers/proposta.py` | 2 | nessuno — route admin sul router pubblico |
| `routers/servizi_extra.py` | 2 | nessuno — route admin sul router pubblico |
| `routers/ciak_admin.py` | 1 | `public-config` — **pubblico per progetto, si lascia** |

Il censimento è stato prodotto con parsing AST (non grep): per ogni handler risolve
transitivamente le `Depends(...)`, le `dependencies=[...]` sul decoratore, e i controlli
di token svolti nel corpo. Un primo passaggio a grep aveva dato 70 falsi positivi
(i 10 endpoint di `collaborator_settlements.py` sono protetti da `require_billing_admin`,
che a sua volta dipende da `require_ciak_admin`).

**Shadow route**: nessuna sui path interessati. `test_no_shadow_routes.py` è già in CI e
passa. `full-data` esiste su due path distinti (`/admin/partner/{id}/full-data` e
`/admin/partners/{id}/full-data`) — non è una collisione, sono due endpoint diversi,
entrambi aperti.

## Vincolo: ordine di definizione in `server.py`

`Depends(X)` è valutato al momento della decorazione, cioè all'import del modulo. La
dipendenza esistente `verify_admin` è definita a riga 4315, ma 13 degli endpoint da
proteggere stanno **prima** (dalla 2545). Usarla lì darebbe `NameError` all'avvio.

Soluzione: nuova dipendenza `require_admin_role` definita subito dopo `security`
(riga 1062), dove `decode_token` è già disponibile. Stessa implementazione di
`require_ciak_admin`, nessuna dipendenza da `get_current_user`/`auth_service`.

## Design

### 1. `backend/server.py`

- Nuova `require_admin_role(credentials)` dopo riga 1062: `decode_token` → 401 se assente
  o non valido → 403 se `role not in ("admin","superadmin")` → ritorna `TokenData`.
- `_admin=Depends(require_admin_role)` sui 38 endpoint admin.
- `verify_admin` allargato da `role == "admin"` a `("admin","superadmin")`. Motivo: il
  login admin del frontend (`ciak/admin/api.js`) fa entrare entrambi i ruoli, e tutte le
  altre dipendenze del repo (`require_ciak_admin`, `require_admin_token`,
  `require_partner_or_admin_for_partner`) accettano entrambi. `verify_admin` era l'unica
  a divergere. La modifica **allarga**, non restringe: nessun accesso viene tolto.
  `verify_admin` resta in uso sui suoi 9 call-site attuali (contratto di ritorno invariato:
  ritorna l'oggetto utente, non il TokenData) perché `test_document_admin_auth.py` la
  pretende per nome su 4 handler.

### 2. `partner-hub` (3 endpoint, in `server.py`)

Non sono admin-only: il partner vi accede sui **propri** dati e l'admin in "vista admin"
su tutti. Nuova `require_partner_or_admin(partner_id, credentials)`, replica dell'idioma
già presente in `routers/partner_journey.py:28`:

- `admin`/`superadmin` → passa su qualunque `partner_id`
- `partner` → passa solo se `users.partner_id == partner_id`
- altro ruolo → 403

In più, `PATCH /partner-hub/{id}/field` prende oggi il nome del campo dalla query string e
lo scrive con `$set` diretto: qualunque chiave, anche non prevista. Si aggiunge una
whitelist dei campi legittimi dell'hub; fuori lista → 422.

### 3. Router con `admin_router` dedicato (9 endpoint)

`contract.py`, `partner_documents.py`, `posizionamento_approval.py` montano le route admin
su un `APIRouter` separato, registrato a parte in `server.py`. Si mette
`dependencies=[Depends(require_ciak_admin)]` **sul costruttore APIRouter**: copre tutte le
route del router in un colpo e protegge automaticamente anche quelle aggiunte in futuro.

### 4. Router misti (11 endpoint)

In `clienti.py`, `proposta.py`, `servizi_extra.py` le route admin convivono con quelle
pubbliche sullo stesso router: la dipendenza va messa endpoint per endpoint, non sul
costruttore, per non chiudere anche le route pubbliche.

### 5. Frontend

Tutti i call-site admin passano già da `adminFetch`/`apiGet`/`apiPost`, che mandano
l'header `Authorization`. Nessuna modifica necessaria lato admin.

Le uniche `fetch()` nude sono 4, tutte su `partner-hub` lato partner:
- `ciak/partner/sections/PartnerProfileHub.jsx:84,105,130`
- `ciak/partner/operativo/steps/StepBurocrazia.jsx:67`

Vanno convertite a `authFetch` da `ciak/partner/api.js`.

### 6. Guardia anti-regressione

Nuovo `backend/tests/test_admin_endpoints_auth.py`, stesso stile di
`test_no_shadow_routes.py`: parsing AST di tutto `backend/`, fallisce se una route
`/api/admin/*` o `/api/partner-hub/*` non ha una dipendenza di auth. Allowlist esplicita
di **una sola** voce, `GET /api/admin/ciak/public-config`. Aggiunto alla lista pytest di
`.github/workflows/ci.yml`.

### 7. Documentazione

- `CLAUDE.md`, sezione "Metodo veloce per scrivere/leggere il Posizionamento": oggi
  documenta gli endpoint partner-hub come "SENZA autenticazione (verificato giu 2026)" e
  ci basa sopra un workflow da console browser. Va riscritta indicando l'header
  `Authorization: Bearer <ciak_admin_token>`.
- `CLAUDE.md`, sezione infra 2026-06-29: afferma "IL DEPLOY BACKEND NON E AUTOMATICO DA
  GITHUB: NON esiste trigger Cloud Build" e prescrive un deploy manuale da
  `C:\Users\berto\Desktop\appevolution` — che è la copia ritirata vietata dall'inizio dello
  stesso file. È obsoleta: `.github/workflows/deploy-backend.yml` deploya backend e worker
  su push a `main` con modifiche in `backend/**`. Va corretta.

## Fuori scope

- Gli 8 file in `backend/tests/` che chiamano gli endpoint admin senza token. Non girano in
  CI (la lista pytest di `ci.yml` è esplicita e non li include), quindi non bloccano il
  deploy. Decisione di Claudio: si lasciano.
- Endpoint fuori dai due prefissi. Il censimento AST copre tutte le 904 route del backend e
  può essere rieseguito su altri prefissi, ma non fa parte di questo intervento.

## Rischio e collaudo

La superficie chiusa è larga (62 endpoint) e il push su `main` deploya il backend in
automatico via GitHub Actions. La mitigazione è che il censimento dei call-site frontend è
esaustivo e sono tutti già autenticati. Il collaudo finale è manuale, da parte di Claudio,
loggato in admin su ciak.io dopo il deploy.

**Nessun push senza conferma esplicita di Claudio.**
