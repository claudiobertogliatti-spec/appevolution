# Area partner serena — sviluppo e anteprime

Layout approvato da Claudio nella conversazione dell'8 settembre 2026. Logo originale obbligatorio. Anteprima a ogni blocco; Ciak attuale deve restare operativo. Servizi aggiuntivi e Il tuo piano sono voci secondarie, accessibili anche da mobile.

## Isolamento

- Branch `codex/partner-sereno`, base `71ce73c9`, worktree `.worktrees/codex-partner-sereno`.
- Non intervenire nel branch concorrente `codex/evolution-autonomia` (backend organizzazione).
- Nuova shell e Home abilitate soltanto con `REACT_APP_PARTNER_SERENO=true` in fase di build; default vecchia UI.
- Nessun deploy o merge prima dei gate di integrazione. Il flag non e un controllo di autorizzazione: API e permessi esistenti rimangono necessari.

## Anteprima riproducibile

Da `frontend`, con dipendenze installate:

```text
node preview/sereno/build.cjs
node preview/sereno/serve.cjs
```

Aprire `http://127.0.0.1:4178/partner`. Il server ascolta solo localhost e non inoltra richieste API. La preview importa gli stessi `SerenoShell`, `SerenoHome` e modello usati nell'app, con fixture locali dichiarate. Il logo viene copiato byte per byte da `public/ciak/logo.webp`. Dettaglio script, altre sezioni e cambio di stato sono dimostrativi.

## Blocchi e gate

1. **Shell e Home:** logo, navigazione desktop/mobile, stati reali tramite hook esistente, apertura via parametro `step`, errori recuperabili, feature flag chiuso. Anteprima locale e test modello.
2. **Percorso e approvazioni:** ordinamento e conteggio coerenti con stato canonico; accesso diretto alla singola attivita; verifica autorizzazioni e versioni approvabili. Non cambiare progressione backend senza ricognizione e test dedicati.
3. **Materiali e assistenza:** eliminare upload simulato e false prese in carico, riconciliare archivio e journey, consegne/revisioni persistenti, errori e recupero verificati. Non introdurre ticketing completo o promesse di risposta non concordate.
4. **Servizi e piano:** collegare catalogo e condizioni esistenti, distinguere incluso/facoltativo, nessun prezzo o scadenza inventati.
5. **Pilota:** test autenticati partner/admin, revisione mobile e tastiera, build/CI, rollback, approvazione anteprima finale prima dell'attivazione pubblica.

## Limiti rilevati al blocco 1

L'endpoint operativo restituisce `status` e `approval_status` ma non una prossima consegna o SLA affidabile. `pending_review` indica revisione del team: non inferire approvazione partner dal solo owner o dall'etichetta. Home non dichiara materiali pronti se non provato. Le schermate operative dei singoli step restano quelle esistenti e richiedono verifica nel blocco 2. Le pagine collegate ai servizi/piano nell'app restano quelle esistenti; in preview sono esplicitamente segnaposto.

Le dipendenze locali del worktree usano una junction al `frontend/node_modules` preesistente; non installare o aggiornare pacchetti tramite quella junction. I binari `.bin` Windows non sono completi: usare il file Node di Craco. Jest necessita `--testMatch '**/*.test.js'` per evitare il pattern misto Windows del worktree.

## Evidenze del primo blocco — 8 settembre 2026

- `node node_modules/jest/bin/jest.js --config=preview/sereno/jest.config.cjs --runInBand --runTestsByPath src/ciak/partner/sereno/PartnerNavigation.test.js src/ciak/partner/sereno/homeModel.test.js src/ciak/partner/sereno/feature.test.js src/ciak/partner/operativo/journeyPresentation.test.js`: **4 suite, 13 test passati**. Include apertura step reale, conservazione query, indietro browser, deep-link legacy admin e recupero URL invalido.
- `node node_modules/@craco/craco/dist/bin/craco.js build` con `REACT_APP_PARTNER_SERENO=true`, `GENERATE_SOURCEMAP=false`: **exit 0, Compiled with warnings**, avvisi hooks in file non modificati. Prima esecuzione fermata da EPERM nella cache ESLint; ripetuta con accesso alla cache. Non eseguito deploy/postbuild.
- `node preview/sereno/build.cjs`: **exit 0**, bundle preview generato. Il logo originale e la copia hanno SHA256 `763F794797CA3BCD24555630C2578EAA55D2510A40C8558740781C4A68D6F1B5`.
- Browser su localhost: Home, apertura script demo, invio demo e ritorno in attesa team verificati. Stato blocked mostra richiesta supporto, nessuna azione di approvazione.
- Viewport 390 e 320: logo caricato, navigazione accessibile; a 320 `scrollWidth=305`, `clientWidth=305`, nessun overflow orizzontale. Servizi e piano raggiungibili. Ripristinato viewport desktop e lasciata anteprima sulla Home.
- Nessun accesso API della preview, nessuna modifica a dati reali, nessun merge/main/deploy. Restano aperti i blocchi 2–5, i test autenticati e la verifica completa delle schermate legacy nel nuovo layout.
