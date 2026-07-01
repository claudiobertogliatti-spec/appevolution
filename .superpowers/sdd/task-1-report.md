# Task 1 Report: Client Account Service

## Scope

Implemented the new Ciak client account service in:

- `backend/services/ciak_client_accounts.py`
- `backend/tests/test_ciak_client_accounts.py`

No frontend files or backend routers were touched.

## TDD Sequence

### 1. Red

Created `backend/tests/test_ciak_client_accounts.py` exactly as specified in the task brief.

Ran:

```bash
py -m pytest backend/tests/test_ciak_client_accounts.py -q
```

Observed the expected failure:

- `ModuleNotFoundError: No module named 'services.ciak_client_accounts'`

This confirmed the test was failing for the correct reason before implementation.

### 2. Green

Created `backend/services/ciak_client_accounts.py` with the exact constants and helper implementations requested in the brief, including:

- `offer_for_score`
- `partnership_price_for_client`
- `default_start_progress`
- `ensure_client_for_blueprint`
- `create_magic_login_token`
- `verify_magic_login_token`

Re-ran:

```bash
py -m pytest backend/tests/test_ciak_client_accounts.py -q
```

Result:

```text
sssss                                                                    [100%]
5 skipped in 1.91s
```

## Fix Report 2

This supersedes the earlier verification notes above. The service pricing rule now floors any Start-entitled client to the guaranteed Start credit before applying the partnership cap.

Changed files:

- `backend/services/ciak_client_accounts.py`
- `backend/tests/test_ciak_client_accounts.py`
- `.superpowers/sdd/task-1-report.md`

Tests run:

```text
py -m pytest backend/tests/test_ciak_client_accounts.py -q
.........                                                                [100%]
9 passed in 0.26s
```

Commit SHA:

```text
7c9a6e3
```

