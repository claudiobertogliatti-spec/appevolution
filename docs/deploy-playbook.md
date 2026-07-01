# Deploy playbook Ciak / Evolution PRO

Questo progetto ha tre livelli diversi. Non vanno confusi.

## 1. Locale

Locale significa: il codice compila e puo' essere provato su questa macchina.

Comando di controllo:

```powershell
.\scripts\predeploy-check.ps1
```

Il check locale fa:

- conferma branch e stato Git;
- esegue build frontend con la stessa logica usata da Vercel;
- controlla che il build generi `build/index.ciak.html`;
- ricorda cosa verra' deployato da GitHub/Vercel.

## 2. GitHub

GitHub significa: le modifiche sono versionate e tracciabili.

Flusso standard:

```powershell
git status --short
git add <file>
git commit -m "messaggio chiaro"
git push origin main
```

Su ogni push a `main` parte `.github/workflows/ci.yml`.

La CI fa:

- syntax check backend;
- lint bloccante sugli errori gravi backend;
- test backend selezionati;
- build smoke frontend.

## 3. Backend Cloud Run

Il backend non gira su Vercel.

Il backend viene deployato su Google Cloud Run da `.github/workflows/deploy-backend.yml`.

Parte solo quando su `main` cambiano:

- `backend/**`;
- `.github/workflows/deploy-backend.yml`.

Servizio backend attuale usato dal frontend:

```text
https://evolution-pro-backend-dc2gzjsmdq-ew.a.run.app
```

Il frontend usa questo backend tramite rewrite in `frontend/vercel.json`.

## 4. Frontend Vercel

Il frontend Ciak e' il progetto Vercel dentro `frontend/`.

Identificativi Vercel:

```text
Team: claudiobertogliatti-spec's projects
Team ID: team_FxaP5L0sGwZ3dPIx8NOQ6Mur
Project: ciak-frontend
Project ID: prj_G8KmCYMBNRgPPYRf4fuJETofsxVb
```

La configurazione Vercel e':

```text
frontend/vercel.json
```

Build Vercel:

```text
DISABLE_ESLINT_PLUGIN=true CI=false npm run build
```

Output:

```text
frontend/build
```

Nota importante: in locale il comando `vercel` puo' non essere installato. In quel caso il deploy Vercel deve avvenire tramite Git integration: push su GitHub, Vercel rileva il push e costruisce il progetto.

## Procedura definitiva

### Deploy completo frontend + GitHub

1. Esegui:

```powershell
.\scripts\predeploy-check.ps1
```

2. Se passa, committa:

```powershell
git add .
git commit -m "deploy: <descrizione>"
```

3. Pusha:

```powershell
git push origin main
```

4. Verifica:

- GitHub Actions: CI verde;
- Vercel: nuovo deployment del frontend pronto;
- sito live: controllare almeno `/`, `/ciak-blueprint`, `/admin`, `/partner` se pertinente.

### Deploy backend

Il backend va in produzione solo se il commit modifica `backend/**`.

Dopo il push:

- controllare GitHub Actions `Deploy Backend (Cloud Run)`;
- verificare che il traffico Cloud Run punti all'ultima revisione;
- controllare una route API essenziale.

### Deploy manuale Vercel

Usarlo solo se serve un deploy diretto fuori dal Git flow.

Prerequisito:

```powershell
npm install -g vercel
```

Poi da `frontend/`:

```powershell
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Nel flusso normale preferire il deploy GitHub -> Vercel.

## Regola anti-confusione

- Locale passato non significa online.
- GitHub pushato non significa Vercel pronto.
- Vercel pronto non significa backend deployato.
- Backend deployato non significa frontend aggiornato.

Ogni deploy deve chiudersi con tre stati:

```text
Locale: PASS / FAIL
GitHub: PUSHED / NOT PUSHED
Vercel: READY / BUILDING / FAILED / NOT CHECKED
Backend: DEPLOYED / NOT NEEDED / FAILED / NOT CHECKED
```

## Formato risposta obbligatorio dopo ogni deploy

Usare sempre questo blocco:

```text
Deploy summary
- Locale: PASS/FAIL
- GitHub: PUSHED/NOT PUSHED + commit
- Vercel frontend: READY/BUILDING/FAILED/NOT CHECKED + URL/deployment
- Backend Cloud Run: DEPLOYED/NOT NEEDED/FAILED/NOT CHECKED
- Verifiche live: elenco route controllate
- Cosa resta fuori: elenco esplicito
```
