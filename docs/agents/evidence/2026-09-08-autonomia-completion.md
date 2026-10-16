# T04 — completamento verificabile del motore generale

Continuazione backend-first su `codex/evolution-autonomia`, base `8798339e`. La PR resta bozza; nessun deploy o effetto esterno nel collaudo.

## Difetti riprodotti da coprire

Il codice di partenza in `backend/integrated_services.py` contiene:

- Andrea restituisce success anche quando richiede elaborazione manuale; Luca, Marta e Atlas restituiscono messaggi generici senza consegna.
- La generazione può usare il solo titolo come output; il ramo Stefania richiama un esecutore che può inviare una campagna.
- L'esecuzione approvata chiude sempre completed, anche quando il risultato GAIA è false. Per gli altri agenti non controlla alcun artefatto.
- Errori diretti ricevono completed_at; task con schemi diversi possono entrare nei loop che assumono un id AI.

Baseline prima delle modifiche: `PYTHONPATH=backend .venv-ops/Scripts/python.exe -m pytest backend/tests/test_operational_task_contracts.py backend/tests/test_agent_task_dismiss.py backend/tests/test_collaborator_settlements.py -q`: **21 passed in 0.28s**.

## Confini dei chiamanti verificati nel codice

| Chiamante | Comportamento attuale | Implicazione prima del rollout |
|---|---|---|
| server.py start_background_services | avvia worker polling 60s | Una modifica al motore cambia il consumer esistente al deploy; non distribuire il branch incompleto |
| integrated_services.create_agent_task(execute_now=True) | invoca direttamente execute_task | Le protezioni devono valere anche per il percorso diretto |
| stefania_actions._sync_systeme_contacts | se result.success mostra completata, altrimenti mostra in coda | Il risultato del motore deve riflettere blocked; messaggio di fallback da allineare prima del rollout |
| server.py PATCH agent-tasks/{id}/status | consente completed con semplice stringa | T06 deve impedire il bypass del verificatore dalle API; T04 non certifica questa route |
| server.py approve/reject/dismiss e jobs/* | firme senza Depends di autorizzazione; api_router senza dipendenze globali | T06 deve verificare copertura autorizzazioni prima di collegare nuove capacità; non è stata effettuata prova di attacco live |
| ApprovalsQueue.jsx | mostra solo awaiting_approval | I nuovi blocchi richiedono coda/metriche previste in T08; nessuna completezza UI dichiarata qui |

La revisione legge codice, non prova il comportamento autenticato di produzione. L'assenza di nuove route in T04 non risolve automaticamente i vecchi percorsi di mutazione.

## Scelta di implementazione

Un effetto accettato dal provider ma non verificato non è una consegna: conservarne il risultato e fermarlo per riconciliazione. Non reinviare automaticamente. Questo può lasciare bloccati adapter legacy incompleti, che vanno completati prima del rollout. La compatibilità non giustifica un falso successo.

Generazione, approvazione e pubblicazione restano passi distinti. I documenti possono concludersi solo con verificatore registrato e prova dell'artefatto; una dichiarazione nel payload non conferisce poteri al task.

## Stato

Implementazione e regressioni T04 in corso. Lease/claim T05, autorizzazioni versionate T06, riconciliazione T07 e visibilità T08 restano gate di attivazione. Nessun test simulato vale come prova di atomicità su Mongo reale.
