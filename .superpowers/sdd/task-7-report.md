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

## Fix Report
- Changed files:
  - `frontend/src/ciak/admin/pages/ClientiCiak.jsx`
  - `frontend/src/ciak/admin/CiakAdminApp.jsx`
  - `.superpowers/sdd/task-7-report.md`
- Build summary:
  - `npm run build` from `frontend` exited 0.
  - Build completed with pre-existing ESLint `react-hooks/exhaustive-deps` warnings in:
    - `src/ciak/admin/pages/AgentDashboard.jsx`
    - `src/ciak/admin/pages/ClientiAnalisi.jsx`
    - `src/ciak/admin/pages/LeadManager.jsx`
    - `src/ciak/admin/pages/ListaFredda.jsx`
    - `src/ciak/admin/pages/ServiziExtraAdmin.jsx`
    - `src/ciak/admin/pages/StefaniaWarMode.jsx`
    - `src/ciak/admin/pages/TemplateEmail.jsx`
    - `src/ciak/partner/operativo/AgentDrawer.jsx`
    - `src/ciak/partner/sections/AvatarCheckout.jsx`
    - `src/ciak/partner/sections/PartnerFilesPage.jsx`
    - `src/ciak/partner/sections/PartnerProfileHub.jsx`
  - Output generated successfully, including `build/index.ciak.html`.
- Commit SHA:
- Frontend fix commit: `b938cfa8ce5457c5c23c124d5b09e918150a946a`

## Fix Report
- Changed files:
  - `backend/routers/ciak_admin.py`
  - `backend/tests/test_ciak_admin_clienti_ciak.py`
  - `frontend/src/ciak/admin/pages/ClientiCiak.jsx`
- Command summaries:
  - `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py -q` -> `2 passed in 1.27s`
  - `py -m pytest backend/tests/test_ciak_admin_clienti_ciak.py backend/tests/test_ciak_clients_router.py -q` -> `17 passed in 1.59s`
  - `npm run build` in `frontend` -> exit 0; compiled with pre-existing `react-hooks/exhaustive-deps` warnings and generated `build/index.ciak.html`
- Commit SHA:
  - `0bfee7f` (`fix: trim ciak admin clienti payload`)
