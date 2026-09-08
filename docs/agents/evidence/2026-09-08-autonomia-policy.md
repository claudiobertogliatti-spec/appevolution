# T06 — approvazioni e autorizzazioni applicate dal server

Continuazione backend-first su `codex/evolution-autonomia`, base `98104a31` (T05 wiring).
Implementatore: Claude. La PR resta bozza; nessun deploy.

## Difetti affrontati (letti nel codice)

- Le rotte `POST /agent-tasks/{id}/approve|reject|dismiss` e `PATCH /agent-tasks/{id}/status`
  e le letture `GET /agent-tasks/approvals|approval-stats` **non avevano auth**: chiunque
  poteva approvare/rifiutare o forzare `status=completed` con una stringa, bypassando il verificatore.
- Il `reviewer` arrivava dal **corpo della richiesta** (`getAdminUser().name || "Claudio"` lato UI):
  identità dichiarata dal client, non dimostrata.
- `reject_task` al 3° rifiuto **sollevava** e lasciava il task `rejected` con `revision_count=3`:
  il loop rigenera solo con `revision_count < 3`, quindi il task restava **orfano** (nessun consumatore).
- L'approvazione non era legata a una versione: approvare la bozza A poteva autorizzare l'esecuzione
  di una bozza B modificata dopo.

## Cosa è stato implementato

`backend/services/operational_tasks/policy.py` (puro, nessun effetto):
- `authorize_admin(actor)` — l'identità viene dal TokenData autenticato (ruolo admin/superadmin +
  email/user_id), mai da un nome libero.
- `approval_authorizes_output(approval, current_checksum, now)` — un'approvazione autorizza solo se
  `approved`, con reviewer identificato, non scaduta, e legata **allo stesso checksum** dell'output
  corrente. Impedisce che «approvo A» valga per «B».
- `canonical_checksum`, `MAX_REVISIONS=3`, `APPROVAL_TTL_SECONDS=7 giorni`.

`backend/approval_workflow.py`:
- `approve_task` registra `approval.approved_checksum` (dell'output visionato) e `approval.expires_at`.
- `reject_task`: al raggiungimento di `MAX_REVISIONS` transita a **`blocked`** con `error_code`
  `max_revisions_exceeded` e `next_action.owner_id` = revisore; non solleva più, niente task orfano.

`backend/server.py`:
- `require_admin_role` aggiunto a approve/reject/dismiss/status e alle letture approvals/approval-stats.
- Il **reviewer è l'admin autenticato** (`_admin.email`), non `request.reviewer` (deprecato, ignorato).
- `PATCH /status`: `completed` (e `failed`) NON impostabili a mano — un task si completa solo passando
  dal verificatore nel motore.

## Verifica

`.venv-ops`, `PYTHONPATH=backend`:
- `test_operational_task_policy.py` (nuovo, in `ci.yml`) — **12 passed**: policy pura (anonimo/partner
  respinti, admin ok con identità reale, approvazione legata alla versione / scaduta / non firmata),
  `approve_task`/`reject_task` su db finto (blocco al 3° rifiuto, feedback obbligatorio), e **asserzioni
  AST su `server.py`** (le 6 rotte richiedono `require_admin_role`; `status` non accetta `completed`;
  il reviewer viene da `_admin.email`, non da `request.reviewer`).
- Suite operational completa **56 passed, 2 skipped**; compileall OK; flake8 E9/F821 pulito.
- Frontend verificato: `ApprovalsQueue` usa `adminFetch` (Bearer token) → l'auth aggiunta non rompe la UI.

## Residui onesti

- **Rotte non ancora protette**: `POST /agent-tasks` (create) e `POST /jobs/task` (con `execute_now`)
  restano aperte: possono avere chiamanti interni non autenticati, vanno verificati prima di chiuderle.
- `approval_authorizes_output` è la primitiva di autorizzazione all'esecuzione: si **collega** al punto
  in cui un task approvato viene eseguito quando il percorso di esecuzione del contratto sarà attivo.
  Oggi l'esecuzione legacy degli approvati è già **bloccata** da T04 (nessun effetto senza provenienza).
- La prova su app FastAPI autenticata reale (client con token) non è stata eseguita: l'auth è verificata
  per struttura (AST) e per allineamento a 20+ rotte admin identiche, non con una chiamata live.

## Prossimo

- T07 prove/dedup/riconciliazione degli effetti; poi T08 registro/recupero, T09 salute runtime.
- Follow-up route-auth: `POST /agent-tasks` e `/jobs/task` dopo verifica dei chiamanti.
