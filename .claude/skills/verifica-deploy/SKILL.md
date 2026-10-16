---
name: verifica-deploy
description: Verifica in sola lettura che l'ultimo deploy del backend su Cloud Run sia davvero arrivato e sano - run GitHub Actions, revisione che riceve il traffico, worker Celery acceso (min-instances >= 1, CPU sempre allocata), /api/health. Da lanciare dopo il merge di una PR che tocca backend/ e prima di cliccare o testare in produzione.
disable-model-invocation: true
allowed-tools: Bash(gh run list:*), Bash(gh run view:*), Bash(git fetch:*), Bash(git log:*), Bash(git -C:*), Bash(gcloud run services describe:*), Bash(gcloud run revisions list:*), Bash(curl:*)
---

# Verifica deploy backend (sola lettura)

Il merge su `main` NON significa che il codice sia in produzione. `deploy-backend.yml`
gira dopo il merge, impiega minuti e puo' fallire o restare in coda. Tre trappole gia'
successe: traffico rimasto su una revisione vecchia, worker spento con `min-instances=0`
(non riparte da solo: niente task periodici per ore), click in produzione mentre il
deploy era ancora in coda.

Questa skill **legge soltanto**. Se trova un problema lo riporta con il comando per
correggerlo: le scritture in produzione le lancia Claudio.

Progetto `gen-lang-client-0744698012`, regione `europe-west1`, servizi
`evolution-pro-backend` (HTTP) e `evolution-pro-worker` (Celery worker+beat).

## Passi

Esegui i controlli in quest'ordine e riporta ogni esito con la prova (output del comando).

### 1. Quale commit dovrebbe essere in produzione

```bash
git fetch -q origin main
git log -1 --format='%H %cd %s' --date=iso origin/main -- backend .github/workflows/deploy-backend.yml
```

E' l'ultimo commit di `main` che tocca il backend: il deploy deve corrispondere a questo.

### 2. Run di GitHub Actions

```bash
S=$(git log -1 --format=%H origin/main -- backend .github/workflows/deploy-backend.yml)
gh run list --workflow deploy-backend.yml --limit 10 \
  --json databaseId,status,conclusion,headSha,createdAt \
  -q "[.[] | select(.headSha==\"$S\")] | .[0] // \"NESSUN RUN per $S\""
```

Cerca il run **del commit del passo 1**. Non usare `--branch main` preso "il piu'
recente": puo' restituire un run di un altro commit (visto il 30/9). `--commit` di gh
e' molto lento: meglio il filtro jq qui sopra. Un `TLS handshake timeout` e' un
problema di rete momentaneo: riprova.

- `NESSUN RUN`: il workflow per quel commit non e' partito (o non e' tra gli ultimi 10).
- `status` = `completed` e `conclusion` = `success`.
- `queued` o `in_progress`: **il deploy non e' ancora arrivato**, dillo chiaramente e
  non considerare la produzione aggiornata.
- `failure`: leggi il log (`gh run view <id> --log-failed`) e riporta lo step fallito.

### 3. Revisione che riceve il traffico (backend e worker)

```bash
for s in evolution-pro-backend evolution-pro-worker; do
  gcloud run services describe $s --region europe-west1 --project gen-lang-client-0744698012 \
    --format='yaml(status.latestReadyRevisionName,status.latestCreatedRevisionName,status.traffic)'
done
```

- `latestCreatedRevisionName` diverso da `latestReadyRevisionName`: l'ultima revisione
  non e' partita (errore di avvio). Grave.
- Il 100% del traffico deve andare alla revisione `latestReadyRevisionName` (o avere
  `latestRevision: true`). Traffico su una revisione vecchia = il codice nuovo non serve.
- Correzione (la lancia Claudio):
  `gcloud run services update-traffic <servizio> --to-latest --region europe-west1 --project gen-lang-client-0744698012`

### 4. Worker Celery acceso

```bash
gcloud run services describe evolution-pro-worker --region europe-west1 --project gen-lang-client-0744698012 \
  --format='value(spec.template.metadata.annotations."autoscaling.knative.dev/minScale",spec.template.metadata.annotations."run.googleapis.com/cpu-throttling")'
```

- Primo valore (min-instances) deve essere **>= 1**. Con 0 il worker si spegne e non
  riparte piu': nessun task periodico, video in coda non lavorati.
- Secondo valore deve essere `false` (CPU sempre allocata: Celery lavora senza traffico HTTP).
- Correzione (la lancia Claudio):
  `gcloud run services update evolution-pro-worker --min-instances=1 --no-cpu-throttling --region europe-west1 --project gen-lang-client-0744698012`

### 5. Health pubblico

```bash
curl -s -o - -w '\nHTTP %{http_code}\n' https://www.ciak.io/api/health
```

Atteso HTTP 200. Un 5xx subito dopo il deploy puo' essere cold start: riprova 2-3 volte
a distanza di 10 secondi prima di dichiararlo rotto.

## Formato della risposta

Una tabella con una riga per controllo (✅ / ⚠️ / ⛔ + prova in breve), poi una riga
finale: **"Produzione allineata al commit `<sha breve>`: si puo' testare"** oppure
**"NON ancora: <motivo>"** con i comandi di correzione da dare a Claudio.
