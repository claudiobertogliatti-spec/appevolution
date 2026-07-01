status
- DONE_WITH_CONCERNS

files changed
- backend/routers/ciak_clients.py
- backend/tests/test_ciak_client_accounts.py
- backend/tests/test_ciak_clients_router.py

tests run with exact output
- `py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py -q`
```text
..........................                                               [100%]
26 passed in 0.87s
```
- `py -m py_compile backend/routers/ciak_clients.py backend/services/ciak_client_accounts.py backend/server.py`
```text
```

commit SHA(s)
- Base: d77dc18e7cb5b793e4167469e7bfe1fcaf704c5b

concerns/questions
- Start checkout is implemented in `backend/routers/ciak_clients.py` with the existing Stripe checkout shim, and Start activation is exposed via `POST /api/ciak/client/start/activate`. I did not modify Stripe webhooks because the task brief explicitly asked for the activation endpoint and allowed touching checkout/webhook only if required.
- That means automatic post-payment Start activation is not handled in this task; activation remains a separate step for the current tree.

## Fix Report

changed files
- `backend/routers/ciak_clients.py`
- `backend/tests/test_ciak_clients_router.py`

exact commands and output
- `py -m pytest backend/tests/test_ciak_clients_router.py -q`
```text
...............                                                          [100%]
15 passed in 1.08s
```
- `py -m pytest backend/tests/test_ciak_client_accounts.py backend/tests/test_ciak_clients_router.py -q`
```text
............................                                             [100%]
28 passed in 0.85s
```
- `py -m py_compile backend/routers/ciak_clients.py backend/services/ciak_client_accounts.py backend/server.py`
```text
```

commit SHA
- `e925e0f`
