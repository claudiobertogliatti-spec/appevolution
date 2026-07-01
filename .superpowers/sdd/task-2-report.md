## Task 2 - 2026-07-01

- status: DONE
- files changed:
  - `backend/routers/ciak_clients.py`
  - `backend/server.py`
  - `backend/tests/test_ciak_clients_router.py`
  - `.superpowers/sdd/task-2-report.md`
- tests run with exact output:
  - `py -m pytest backend/tests/test_ciak_clients_router.py -q`
    ```text
    ...                                                                      [100%]
    3 passed in 1.80s
    ```
  - `py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py -q`
    ```text
    .............                                                            [100%]
    13 passed in 1.25s
    ```
  - `py -m py_compile backend\routers\ciak_clients.py backend\services\ciak_client_accounts.py backend\server.py`
    ```text
    [exit 0, no output]
    ```
- commit SHA(s):
  - `8a17071`
- concerns/questions:
  - Nessuna al momento. Il router cliente espone solo dati sanitizzati e tiene l'area Partnership non disponibile finche' l'accesso resta `cliente_blueprint` o `cliente_start`.
