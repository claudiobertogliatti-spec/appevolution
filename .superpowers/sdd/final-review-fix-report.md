status: DONE

files changed:
- backend/routers/ciak_admin.py
- backend/routers/ciak_clients.py
- backend/routers/stripe_webhook.py
- backend/services/ciak_client_accounts.py
- backend/tests/test_checkout_trigger.py
- backend/tests/test_ciak_admin_clienti_ciak.py
- backend/tests/test_ciak_clients_router.py

verification commands with exact output:
- `$env:MONGO_URL='mongodb://localhost:27017/test'; py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_checkout_trigger.py -q`
  - `...........................................                              [100%]`
  - `43 passed in 7.88s`
- `py -m py_compile backend/routers/checkout.py backend/routers/ciak_clients.py backend/routers/ciak_admin.py backend/routers/stripe_webhook.py backend/services/ciak_client_accounts.py backend/server.py`
  - Exit 0, nessun output.
- `py -m compileall -q backend`
  - Exit 0, nessun output.

commit SHA(s):
- `4362903` - `fix: complete ciak client payment activation flow`

concerns:
- Nessuna preoccupazione aggiuntiva oltre ai vincoli gia' richiesti dal task.

---

update: 2026-07-02 stale partner flag suppression

files changed:
- backend/routers/ciak_admin.py
- backend/tests/test_ciak_admin_clienti_ciak.py

changes:
- `clienti-ciak` ora non propaga `partnership_attiva` e `stato_cliente` dal documento `ciak_clients` quando non esiste una corrispondenza canonica in `users`.
- L'upgrade a `access_level=partner` resta legato ai soli valori derivati dal canonical user.
- Aggiunta regression test per il caso `ciak_clients` con flag partner stale e nessun user corrispondente.

verification commands with exact output:
- `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py -q`
  - `....                                                                     [100%]`
  - `4 passed in 2.68s`
- `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_ciak_clients_router.py -q`
  - `.........................                                                [100%]`
  - `25 passed in 4.08s`
- `py -m py_compile backend/routers/ciak_admin.py backend/server.py`
  - Exit 0, nessun output.

commit SHA:
- `eababfd` - `fix: suppress stale ciak admin partner flags`

---

update: 2026-07-02 final re-review blockers

files changed:
- backend/routers/checkout.py
- backend/routers/ciak_admin.py
- backend/routers/ciak_clients.py
- backend/tests/test_checkout_trigger.py
- backend/tests/test_ciak_admin_clienti_ciak.py
- backend/tests/test_ciak_clients_router.py

changes:
- Blueprint checkout ora propaga il magic link cliente a Systeme.io con custom field `client_access_url` e tag/evento `ciak_client_access_ready`, senza esporre password.
- Admin `clienti-ciak` ora overlaya dallo user canonico `access_level`, `partnership_attiva` e `stato_cliente` quando l'attivazione partner arriva da `users`.
- `/api/ciak/client/auth/magic-login` preflighta `_jwt_secret()` prima di verificare/consumare il token magic login.

verification commands with exact output:
- `$env:MONGO_URL='mongodb://localhost:27017/test'; py -m pytest backend/tests/test_checkout_trigger.py backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_ciak_clients_router.py -q`
  - `..............................                                           [100%]`
  - `30 passed in 8.35s`
- `$env:MONGO_URL='mongodb://localhost:27017/test'; py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_checkout_trigger.py -q`
  - `...........................................                              [100%]`
  - `43 passed in 8.59s`
- `py -m py_compile backend/routers/checkout.py backend/routers/ciak_clients.py backend/routers/ciak_admin.py backend/services/ciak_client_accounts.py backend/server.py`
  - `Exit 0, nessun output.`
