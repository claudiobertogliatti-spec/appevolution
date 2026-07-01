status
- DONE

files changed
- .superpowers/sdd/task-6-report.md
- frontend/src/ciak/client/api.js
- frontend/src/ciak/client/pages/BlueprintPage.jsx
- frontend/src/ciak/client/pages/ClientHome.jsx
- frontend/src/ciak/client/pages/PartnershipEducationPage.jsx
- frontend/src/ciak/client/pages/StartPage.jsx

build/test run with exact output
- Command: `CI=true npm test -- --runInBand --watch=false src/ciak/client/pages/__task6_temp__.test.jsx`

```text
> frontend@0.1.0 test
> craco test --runInBand --watch=false src/ciak/client/pages/__task6_temp__.test.jsx

PASS src/ciak/client/pages/__task6_temp__.test.jsx
  task 6 client area pages
    √ start page keeps the workspace locked before the recommendation arrives (83 ms)
    √ partnership education shows the guaranteed credit math for start customers (25 ms)
    √ home page summarizes the current call and partnership state (13 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        4.137 s
Ran all test suites matching /src\\ciak\\client\\pages\\__task6_temp__.test.jsx/i.
```

- Command: `npm run build`

```text
> frontend@0.1.0 build
> craco build && node scripts/postbuild-ciak.js

Creating an optimized production build...
Compiled with warnings.

[eslint] 
src\ciak\admin\pages\AgentDashboard.jsx
  Line 75:6:  React Hook useEffect has missing dependencies: 'loadData' and 'loadDiscoveryLeads'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
  Line 80:6:  React Hook useEffect has a missing dependency: 'loadDiscoveryLeads'. Either include it or remove the dependency array                   react-hooks/exhaustive-deps

src\ciak\admin\pages\ClientiAnalisi.jsx
  Line 289:6:  React Hook useEffect has missing dependencies: 'loadClienti' and 'loadStats'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\admin\pages\LeadManager.jsx
  Line 725:32:  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\admin\pages\ListaFredda.jsx
  Line 40:6:  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\admin\pages\ServiziExtraAdmin.jsx
  Line 32:6:  React Hook useEffect has a missing dependency: 'loadStats'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\admin\pages\StefaniaWarMode.jsx
  Line 55:6:  React Hook useEffect has a missing dependency: 'loadData'. Either include it or remove the dependency array          react-hooks/exhaustive-deps
  Line 79:6:  React Hook useEffect has a missing dependency: 'loadPartnerHooks'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\admin\pages\TemplateEmail.jsx
  Line 128:6:  React Hook useEffect has a missing dependency: 'fetchTemplates'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\partner\operativo\AgentDrawer.jsx
  Line 26:6:  React Hook useEffect has missing dependencies: 'agent.name', 'agent.role', and 'currentStep'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\partner\sections\AvatarCheckout.jsx
  Line 38:6:  React Hook useEffect has a missing dependency: 'pollPaymentStatus'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\partner\sections\PartnerFilesPage.jsx
  Line 101:6:  React Hook useEffect has a missing dependency: 'loadFiles'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src\ciak\partner\sections\PartnerProfileHub.jsx
  Line 79:6:  React Hook useEffect has a missing dependency: 'loadProfile'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

Search for the keywords to learn more about each warning.
To ignore, add // eslint-disable-next-line to the line before.

File sizes after gzip:

  287.04 kB (+1.45 kB)  build\static\js\main.af6cbe9a.js
  15.23 kB (+24 B)      build\static\css\main.eae07ca9.css
  14.75 kB              build\static\js\213.3e285c99.chunk.js
  8.52 kB               build\static\js\556.2c7769fd.chunk.js
  5.88 kB               build\static\js\339.1ab4817c.chunk.js
  5.74 kB               build\static\js\818.11c768d9.chunk.js
  5.61 kB               build\static\js\485.cfc5576b.chunk.js
  5.15 kB               build\static\js\515.34a95ebb.chunk.js
  4.9 kB                build\static\js\194.723eef9c.chunk.js
  4.57 kB               build\static\js\69.c4e39a75.chunk.js
  3.67 kB               build\static\js\595.cc956700.chunk.js
  3.52 kB               build\static\js\26.2d5eb81a.chunk.js
  3.27 kB               build\static\js\731.3c7c5a57.chunk.js
  3.19 kB               build\static\js\958.c90f4b53.chunk.js
  3.1 kB                build\static\js\188.e484d8f6.chunk.js
  3.01 kB               build\static\js\204.86bbf9bb.chunk.js
  2.76 kB               build\static\js\842.164bce20.chunk.js
  1.76 kB               build\static\js\83.e8724de6.chunk.js
  1.49 kB               build\static\js\489.2a116c1f.chunk.js
  1.37 kB               build\static\js\80.f66e23ba.chunk.js
  1.19 kB               build\static\js\317.e8fe15dd.chunk.js
  1.07 kB               build\static\js\891.55186d6c.chunk.js
  315 B                 build\static\js\597.a5f14c82.chunk.js

The project was built assuming it is hosted at /.
You can control this with the homepage field in your package.json.

The build folder is ready to be deployed.
You may serve it with a static server:

  npm install -g serve
  serve -s build

Find out more about deployment here:

  https://cra.link/deployment

✓ Generated build/index.ciak.html (12.0 KB)
✓ Removed build/index.html (solo index.ciak.html viene servito)
```

commit SHA(s)
- 8eb620dc3eb3fda542cb7bc252570099d359fa4d

concerns/questions
- Build passes, but existing unrelated ESLint hook dependency warnings remain in admin/partner areas.
