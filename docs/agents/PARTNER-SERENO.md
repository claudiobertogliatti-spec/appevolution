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

## Secondo blocco: mappa del percorso — 8 settembre 2026

Implementato SerenoJourney dietro lo stesso flag disattivato: fase corrente aperta, conteggi derivati dagli stessi record visibili, ordinamento per codice F-n, record storici conservati in un gruppo separato, accesso diretto allo step corrente. Gli stati blocked, pending_review e skipped sono distinti. Il pannello materiali autenticato esistente viene riusato solo per passaggi completati che prevedono output. La presenza di un file non viene dedotta dal completamento.

La preview ora importa anche SerenoJourney, con cinque record dimostrativi espliciti. Verificati nel browser apertura script demo, ritorno in attesa e mappa senza CTA operativa durante pending_review. Mobile 390px: clientWidth=scrollWidth=375 (scrollbar esclusa), nessun overflow. Logo originale invariato.

Test: comando Jest del blocco 1 esteso con SerenoJourney.test.js e journeyModel.test.js: 6 suite, 17 test passati. Preview build: exit 0, asset preview.js 1.55 MiB.

Le approvazioni reali NON sono completate: nel router operativo _DOC_APPROVAL_STEPS e vuoto. Non introdurre un invio generico al team che dichiari una revisione inesistente. Verificare i contratti specifici per script/video/documenti e le versioni prima di collegare nuove azioni. Restano da verificare anche salvataggi e gestione errori nelle schermate legacy dei singoli passaggi. Nessuna modifica backend, nessun merge o deploy.
Build completa del secondo blocco: avviata con il flag attivo, fermata manualmente dopo rallentamento marcato del computer e nessun esito oltre Creating an optimized production build. Exit 1 da interruzione; NON e una build verificata. Da ripetere prima di integrazione. Test e build preview restano passati.

## Terzo blocco: Materiali e Assistenza onesti — 8 settembre 2026 (subentro Claude)

Codex interrotto da Claudio; ripreso il branch. Blocco 2 (SerenoJourney) messo in salvo come checkpoint.

**Livello onestà (anche sulle pagine legacy, così i partner live smettono di essere ingannati appena si mergia):**
- `TeamSupportoPage.jsx`: il `catch` della chat non fabbrica più "Ho preso in carico la tua richiesta". Conserva il testo, mostra "Messaggio non inviato", offre Riprova + il ripiego reale Telegram (`partner.telegram_group_url`).
- `PartnerFilesPage.jsx`: rimosso l'upload simulato (`Documento_Caricato_Dal_Partner.pdf` + `alert("File caricato con successo!")`). Il modale ora indica la consegna reale via Telegram. Rimosso l'import `Upload` orfano.

**Componenti sereno (dietro flag):**
- `SerenoAssistenza.jsx`: chat onesta (nessuna finta presa in carico; in preview senza backend lo stato di errore si mostra dal vivo), + pannello "team umano" su Telegram, distinto dall'AI.
- `SerenoMateriali.jsx`: "Consegna un file" → Telegram (niente upload finto); "Da controllare" e "Ultime consegne" prima; presenza file MAI dedotta dal completamento.
- Preview: le route `/partner/team` e `/partner/materiali` non sono più segnaposto, usano i due componenti reali.

**Evidenze verificate (non dichiarate):**
- SHA256 logo copia = originale `763f79…f1b5` (identico byte per byte).
- Suite: `node node_modules/jest/bin/jest.js --config=preview/sereno/jest.config.cjs` sui 7 file → **7 suite, 19 test passati**.
- Controprova onestà: reintrodotta la finta "preso in carico" in homeModel e in SerenoAssistenza → in entrambi i casi il test **fallisce**; ripristinato.
- `SerenoAssistenza.test.js`: fetch che rigetta → nessun "preso in carico", alert "Messaggio non inviato", ripiego Telegram sul canale del partner. Fetch ok → risposta mostrata, nessun alert.
- Preview webpack: `node preview/sereno/build.cjs` → exit 0, `preview.js` 1.57 MiB. Prova visiva su `/partner/team` (stato errore onesto) e `/partner/materiali` (consegna Telegram) catturata.
- Nessun deploy, nessun merge, nessuna modifica backend. Build di produzione craco completa ancora da eseguire prima dell'integrazione.

Restano: blocco 4 (Servizi/Piano su dati reali), blocco 5 (pilota: test autenticati, mobile/tastiera, build/CI, rollback). E la persistenza reale delle consegne file (backend) resta scorporata, da stimare a parte.

## Quarto blocco: Servizi e Piano su dati reali — 8 settembre 2026 (Claude)

Principio: **collegare il catalogo esistente, non ricostruirlo** — mai duplicare o inventare prezzi (anti-pattern noto: prezzi hardcoded che divergono tra file).

- Esportati i dati reali in place (una parola, EvoSPage/BoosterEvoPage intatti): `PLANS`, `CONTINUITY_POINTS` da `EvoSPage.jsx`; `GROUPS` da `BoosterEvoPage.jsx`. Fonte unica.
- `SerenoPiano.jsx`: "Il tuo piano" — status corrente PRIMA, onesto: senza dato verificato mostra "Da collegare" (mai una scadenza inventata). Sotto, le 4 opzioni di rinnovo EVO S dai `PLANS` reali (Inside 147 / Pro 297 / Premium 497 / Elite 797 € / mese), CTA "Valuta il rinnovo" → flusso reale `/partner/rinnovo` (checkout/eligibility invariati).
- `SerenoServizi.jsx`: "Servizi aggiuntivi" — cornice calma sui 4 `GROUPS` reali, marcati "Facoltativi", link al catalogo reale `/partner/servizi-extra` (prezzi/checkout lì, nulla di simulato).
- Preview: route `/partner/rinnovo` e `/partner/servizi-extra` non più segnaposto.

**Evidenze verificate:**
- `SerenoPiano.test.js`: rende i prezzi reali 147/297/497/797 (non inventati); senza piano → "Da collegare"; con piano passato → mostra il piano, niente placeholder. 3 test.
- Suite completa: **8 suite, 22 test passati**. Preview build: exit 0, `preview.js` 1.69 MiB.
- Prova visiva su `/partner/rinnovo` (Inside · 147 € / mese, Premium · 497 € / mese, status "Da collegare") e `/partner/servizi-extra` (4 gruppi reali, "Facoltativi").
- Nessun deploy, nessun merge, nessuna modifica ai flussi commerciali/backend.

Nota: nell'APP reale `/partner/servizi-extra` e `/partner/rinnovo` già renderizzano EvoSPage/BoosterEvoPage reali dentro la shell sereno; queste viste sereno sono la cornice proposta, per ora mostrata in preview. Il wiring nell'app (branch flag come per SerenoJourney) è passo d'integrazione, insieme a Materiali/Assistenza sereno. Resta il blocco 5 (pilota) e la build prod craco.

## Quinto blocco (pilota) — 8 settembre 2026 (Claude)

Decisione di Claudio: **rivestire il legacy tenendo le funzioni** (non sostituire con le viste sereno più semplici). Skin sereno selezionata dal flag; default = UI attuale invariata.

- ✅ **Build di produzione craco chiusa** (flag attivo, exit 0, `build/` deployabile; warning solo `exhaustive-deps` PREESISTENTI in file non toccati — zero dai miei file). Gate che Codex aveva lasciato aperto.
- ✅ **Mobile 375px**: zero overflow su tutte le viste, touch target ≥44.
- **Rollback** = il flag (spento → UI attuale).

**5.1 Materiali rivestito:** `SerenoMateriali` è ora la skin completa (ricerca, filtro cartella, segmento Tutti/Da Ciak/Da te, accordion cartelle, righe file con Apri/Scarica, consegna onesta via Telegram). `PartnerFilesPage` quando il flag è attivo rende `<SerenoMateriali>` passando i dati reali (`files`) e gli **handler autenticati reali** (`apriFile`/`scaricaFile`) — nessuna funzione persa, logica invariata. Preview aggiornata con dati demo (4 cartelle, 5 file). Verificato via DOM: 5 file, conteggi cartella corretti, Apri/Scarica presenti, zero overflow. Build preview exit 0.

Prossimo: 5.2 Assistenza, 5.3 Servizi, 5.4 Piano (stessa tecnica: container legacy + skin sereno dietro flag). Poi test autenticati partner/admin.

**5.2 Assistenza rivestita:** `SerenoAssistenza` è ora la skin completa (roster: 6 assistenti AI con chat 1-on-1 + 5 referenti umani Evolution Pro, banner Telegram, accordion). La chat 1-on-1 usa lo stesso contratto del drawer legacy (`/api/stefania/chat` con `target_agent`) e mantiene l'errore ONESTO (niente "preso in carico" nel catch → "Messaggio non inviato" + Riprova + Telegram). `TeamSupportoPage` col flag rende `<SerenoAssistenza>` passando `AGENTIC_TEAM`/`HUMAN_TEAM`, `apiBase={API}`, partner id/name; nessuna funzione persa. `SerenoAssistenza.test.js` aggiornato (roster mostrato; fetch reject → nessun "preso in carico", alert + fallback Telegram; fetch ok → risposta, nessun alert) = 3 test. Verificato live: roster → chat Simona → stato onesto. Preview build exit 0.
