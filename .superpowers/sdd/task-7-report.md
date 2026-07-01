status
- DONE_WITH_CONCERNS

files changed
- backend/routers/ciak_admin.py
- backend/tests/test_ciak_admin_clienti_ciak.py

tests/compile run with exact output
- `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py -q`
```text
FF                                                                       [100%]
================================== FAILURES ===================================
____________ test_clienti_ciak_lists_clients_sorted_by_updated_at _____________

client_app = <starlette.testclient.TestClient object at 0x0000013759401400>

    def test_clienti_ciak_lists_clients_sorted_by_updated_at(client_app):
        response = client_app.get("/api/admin/ciak/clienti-ciak")

>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

backend\tests\test_ciak_admin_clienti_ciak.py:105: AssertionError
______________________ test_clienti_ciak_respects_limit _______________________

client_app = <starlette.testclient.TestClient object at 0x0000013759434910>

    def test_clienti_ciak_respects_limit(client_app):
        response = client_app.get("/api/admin/ciak/clienti-ciak?limit=2")

>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

backend\tests\test_ciak_admin_clienti_ciak.py:116: AssertionError
=========================== short test summary info ============================
FAILED backend\tests\test_ciak_admin_clienti_ciak.py::test_clienti_ciak_lists_clients_sorted_by_updated_at
FAILED backend\tests\test_ciak_admin_clienti_ciak.py::test_clienti_ciak_respects_limit
2 failed in 1.01s
```
- `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py -q`
```text
..                                                                       [100%]
2 passed in 0.87s
```
- `py -m py_compile backend/routers/booking.py backend/routers/ciak_admin.py backend/routers/ciak_clients.py`
```text
```
- `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_ciak_clients_router.py -q`
```text
.................                                                        [100%]
17 passed in 1.24s
```

commit SHA(s)
- b569c7760a8677317aae37f50fc8183d7fe087ce

concerns/questions
- Il brief richiedeva anche una pagina frontend (`frontend/src/ciak/admin/pages/ClientiCiak.jsx` e routing in `CiakAdminApp.jsx`), ma il write set autorizzato per questo task consente modifiche solo in backend/tests/report. Ho quindi implementato esclusivamente l'hook backend admin e i test relativi.
