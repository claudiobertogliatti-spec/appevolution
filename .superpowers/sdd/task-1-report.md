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

## Verification Notes

The repository-level `backend/tests/conftest.py` automatically skips any test not marked `unit` when `REACT_APP_BACKEND_URL` is not set. Because the brief required the exact test file content and that file does not include a `unit` marker, the final targeted pytest run collected successfully but skipped all 5 tests instead of executing them.

Important detail:

- The red step was verified correctly with the expected import failure.
- After implementation, the module imported cleanly and the file no longer failed collection.
- Final execution status is therefore structurally improved, but not a fully executed green run under the current repository pytest policy and the exact test content required by the brief.

## Commit

Created commit:

```text
feat: add ciak client account service
```

## Concerns

1. Final pytest status is `skipped`, not executed `passed`, because of the repo-wide skip policy in `backend/tests/conftest.py`.
2. I did not modify the test file to add a `unit` marker because the brief explicitly said to create it with the provided contents exactly.

## Controller Verification

Re-ran with the repository live-test gate enabled:

`powershell
='http://localhost'; py -m pytest backend/tests/test_ciak_client_accounts.py -q
` 

Result: 5 passed in 0.09s.

## Fix Report

Changed files:

- `backend/services/ciak_client_accounts.py`
- `backend/tests/test_ciak_client_accounts.py`
- `.superpowers/sdd/task-1-report.md`

Tests run:

```text
py -m pytest backend/tests/test_ciak_client_accounts.py -q
........                                                                 [100%]
8 passed in 0.10s
```

Commit SHA:

```text
d5b506f
```

