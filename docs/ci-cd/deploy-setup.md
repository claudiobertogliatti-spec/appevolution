# Deploy automatico backend su Cloud Run — setup (una tantum)

Il workflow `.github/workflows/deploy-backend.yml` deploya `evolution-pro-backend`
su Cloud Run a ogni push su `main` che tocca `backend/`. Usa **Workload Identity
Federation (WIF)**: nessuna chiave JSON da conservare (più sicuro, soprattutto
perché il repo è pubblico).

Lancia questi comandi **una sola volta** da una shell con `gcloud` loggato come
owner del progetto. (Io, da Cowork, non ho accesso `gcloud`.)

## Variabili
```bash
export PROJECT_ID=gen-lang-client-0744698012
export PROJECT_NUMBER=977860235035
export REGION=europe-west1
export REPO=claudiobertogliatti-spec/appevolution
export DEPLOY_SA=gh-deployer@$PROJECT_ID.iam.gserviceaccount.com
export RUNTIME_SA=977860235035-compute@developer.gserviceaccount.com   # SA con cui gira il servizio
export POOL=github-pool
export PROVIDER=github-provider
```

## 1) Abilita le API necessarie
```bash
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com \
  --project $PROJECT_ID
```

## 2) Service account di deploy + permessi
```bash
gcloud iam service-accounts create gh-deployer \
  --display-name="GitHub Actions deployer" --project $PROJECT_ID

for ROLE in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.admin roles/storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$DEPLOY_SA" --role="$ROLE"
done

# Permette al deployer di "agire come" la SA runtime del servizio Cloud Run
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/iam.serviceAccountUser" --project $PROJECT_ID
```

## 3) Workload Identity Federation (pool + provider GitHub)
```bash
gcloud iam workload-identity-pools create $POOL \
  --location=global --display-name="GitHub pool" --project $PROJECT_ID

gcloud iam workload-identity-pools providers create-oidc $PROVIDER \
  --location=global --workload-identity-pool=$POOL \
  --display-name="GitHub provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'" \
  --project $PROJECT_ID
```

## 4) Consenti al repo di impersonare la SA di deploy
```bash
gcloud iam service-accounts add-iam-policy-binding $DEPLOY_SA \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" \
  --project $PROJECT_ID
```

## 5) Recupera il nome-risorsa del provider (serve come secret)
```bash
gcloud iam workload-identity-pools providers describe $PROVIDER \
  --location=global --workload-identity-pool=$POOL \
  --project $PROJECT_ID --format="value(name)"
# Output tipo:
# projects/977860235035/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

## 6) Aggiungi i 2 secret su GitHub
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valore |
|---|---|
| `GCP_WIF_PROVIDER` | l'output del passo 5 (`projects/977860235035/.../providers/github-provider`) |
| `GCP_DEPLOY_SA`    | `gh-deployer@gen-lang-client-0744698012.iam.gserviceaccount.com` |

## Fatto
Al prossimo push su `main` che tocca `backend/`, il deploy parte da solo e punta
il traffico all'ultima revisione. Per provarlo subito: Actions → "Deploy Backend
(Cloud Run)" → (oppure un commit qualsiasi sotto `backend/`).

## Nota: worker
Esiste anche il servizio `evolution-pro-worker`. Se va ridiscovato/ridistribuito
con lo stesso flusso, aggiungere uno step gemello con il suo comando di deploy
(da definire: stessa `--source ./backend` con entrypoint worker, o servizio dedicato).
