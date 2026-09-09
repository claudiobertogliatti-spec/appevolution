# Autonomia Evolution — baseline iniziale

8 settembre 2026. Rilevazione per sviluppo backend-first; non certificazione del nuovo sistema.

## Codice e runtime

- `git fetch origin`: riuscito. Base isolata `71ce73c96375fbd3a50501c3b0b6c141b9d3def7`, branch `codex/evolution-autonomia` nel worktree `.worktrees/codex-evolution-autonomia`.
- Checkout condiviso su altro branch e sporco: preservato. Nessun reset, cambio branch o staging dei file concorrenti.
- `gcloud run services describe evolution-pro-backend --project gen-lang-client-0744698012 --region europe-west1 --format='json(status.latestReadyRevisionName,status.traffic,status.url)'`: `evolution-pro-backend-00581-74t`, traffico 100%.
- Stesso comando sul worker: `evolution-pro-worker-00198-md2`, traffico 100%. Una revisione pronta non dimostra che il consumer stia consumando la coda.
- `gcloud run revisions describe ... --format='json(metadata.labels,status.imageDigest)'`: nessuna etichetta commit disponibile. Digest backend `602255c43a918b1f64751ae859f409fe92291b304b29507cd2eb89df8619842f`; worker `bb50a4e0a91699873f5610bf300a33ebdc184fdcd685282738a2ea5fc79b09f3`. Associazione SHA deploy non verificata.
- HTTPX GET `https://www.ciak.io`: 200, bundle `/static/js/main.3d6be00a.js`. GET `/api/health`: 200, `{"status":"healthy","service":"evolution-pro-os"}`. Non prova autorizzazioni o esecuzione agenti.
- `gh run list --repo claudiobertogliatti-spec/appevolution --branch main --limit 3 --json headSha,status,conclusion,url`: sulla base 71ce73c9 run 34249998104 completata success; run 34249998138 in corso al rilevamento. Non sono test di questo branch.

## Capacità rilevate nel codice alla base

| Area | Presente | Limite provato dalla lettura |
|---|---|---|
| Coda generale | BackgroundJobExecutor, polling 60s da startup server | Lettura e update separati, senza lease; fallback Andrea/manuale e altri agenti restituiscono successo senza artefatto |
| Approvazioni | approval_workflow, API approva/rifiuta/scarta | execute_approved_task chiude anche su result.success falso; output generato può essere solo titolo; generazione Stefania può chiamare invio campagna |
| Segnalazioni | agent_task_system task_id/open/escalated | Schema diverso dalla coda id/pending; escalation non equivale a lavorazione eseguibile |
| Collaboratori | ciak_admin attività Antonella, timer, ore approvate | Stessa collection agent_tasks; assigned_to=antonella; non consumabile dal worker AI |
| Liquidazioni | collaborator_settlements router e servizio, storage privato | Esistono già importi, fatture e pagamenti registrati. Non provano regole contrattuali complete per Mariangela o bonus; riutilizzo da verificare in T23 |
| Acquisizione/Vendite | add_tag, sync_contacts, welcome/campaign in integrated_services | Effetti reali, non attivati nei test. Segmentazione ORION conta contatti senza produrre segmentazione |
| Delivery | generatori specialistici e pipeline video separati | Fallback ANDREA del motore generale non esegue la pipeline video |
| Luca | chat admin e briefing schedulato | Chat dichiara assenza tools; prompt contiene descrizioni storiche PC mentre esiste briefing server. Nessun mandato nuovo implicito |
| Runtime | Celery/beat configurati, monitor locale | celery_manager misura processi dell'istanza; KO locale non dimostra KO worker separato |

Riferimenti riproducibili: `backend/integrated_services.py` classe BackgroundJobExecutor; `backend/server.py` start_background_services e route agent-tasks; `backend/approval_workflow.py`; `backend/agent_task_system.py`; `backend/routers/ciak_admin.py` _ensure_antonella_weekly_tasks; `backend/routers/collaborator_settlements.py`; `backend/celery_app.py`; `backend/celery_manager.py`; `backend/luca_briefing_task.py`.

## Test iniziale

Runtime isolato Python 3.12, pytest 9.1.1. `PYTHONPATH=backend .venv-ops/Scripts/python.exe -m pytest backend/tests/test_agent_task_dismiss.py -q`: **4 passed in 0.78s**. Nessun database o provider reale contattato.

## Prove ancora aperte

- Campione autenticato di cinque task per reparto, input-esecutore-prova: non raccolto. Non inferire assenza di task.
- Heartbeat del consumer, scheduler unico, code e ultimi esiti: non verificati live.
- Contratto Antonella non recuperato; PDF Mariangela non analizzato in questa fase. Nessun dato contrattuale nel repository.
- Revisioni distribuite non ancora associate a SHA sorgente; frontend identificato dal bundle, non da commit.

T01 resta parziale. Questi limiti impediscono l'attivazione, non la libreria isolata senza collegamenti ai consumer.

## Primo blocco backend

Implementata fondazione T03: catalogo esplicito con esecutore/verificatore/policy, validazione input, versione contenuto e chiave idempotenza; proiezione legacy separata per AI, collaboratore, segnalazione e record ambiguo. Registro produzione vuoto; tutti i record legacy non eseguibili. Nessun consumer modificato: i difetti del motore precedente restano da correggere in T04–T07.

Controlli iniziali sul blocco: test nuovi + approvazioni legacy + liquidazioni **19 passed in 0.29s**; `compileall -q backend` exit 0; flake8 nuovi moduli e test `--select=E9,F821 --count`: 0; diff-check exit 0. Revisione indipendente in corso; questo risultato non è il gate finale.

Revisione indipendente: rilevati e corretti due difetti, versione di input annidato non serializzabile e chiusura storica senza prove con flag pending. Regressioni aggiunte. Suite finale `PYTHONPATH=backend .venv-ops/Scripts/python.exe -m pytest backend/tests/test_operational_task_contracts.py backend/tests/test_agent_task_dismiss.py backend/tests/test_collaborator_settlements.py -q`: **21 passed in 0.74s**. Compile mirato exit 0. Tentativo extra di collection `test_collaborator_settlements_api.py` interrotto per FastAPI assente dal venv minimo: nessun test di quel file eseguito, non è PASS. Nessuna dipendenza runtime del progetto modificata.
