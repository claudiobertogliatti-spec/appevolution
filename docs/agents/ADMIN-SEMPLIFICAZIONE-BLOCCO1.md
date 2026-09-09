# Admin — blocco 1 di semplificazione

Base: 20f43d4d (fetch del 9 settembre 2026). Branch codex/admin-semplificazione, worktree C:/Users/berto/appevolution/.worktrees/codex-admin-semplificazione.

## Matrice di parità del blocco

| Capacità prima | Accesso dopo | Conservazione / prova |
|---|---|---|
| Tutte le route registrate e relativi componenti | Stessi URL e binding | verify-admin-parity.cjs confronta l'intero blocco Routes |
| Tutte le voci NAV, gruppi e hideFor | Stessi ingressi, ricerca facoltativa nelle card reparto | Catalogo NAV identico alla base |
| Code Acquisizione, Vendite, Delivery, Back office | Prima del supporto | Stessi componenti, callback e props; nessuna riga operativa rimossa |
| Chat responsabile, priorità e indicatori | Pannello espandibile sotto la coda | DepartmentRoomIntro conserva tutti i contenuti; solo intestazione duplicata omessa |
| Import CSV | Pulsante Importa lista apre lo stesso tab CSV | Handler e endpoint identici |
| Inserimento manuale | Pulsante Nuovo lead apre direttamente lo stesso form | Handler e endpoint identici; campi originali conservati |
| Ricerca Google Attività | Pulsante Ricerca automatica | Stesso PlacesSearchModal, nessun avvio automatico |
| Modifica, approvazione, cancellazione lead; filtri/paginazione | Invariati | Diff limitato a ingressi e label del modal |
| Account, materiali, viste cliente/partner, pipeline, KPI, obiettivi | Moduli e URL invariati | Nessuna modifica a questi componenti |
| Sezione attiva sidebar | Matching di segmento | Pipeline Blueprint non attiva erroneamente Acquisizione |

Non è l'inventario completo di tutte le azioni annidate dell'app: è la prova di parità per questo diff limitato, che non modifica i moduli non interessati. Nessuna funzionalità rimossa. L'unico elemento eliminato è l'intestazione duplicata; il supporto è spostato in details e resta montato.

## Comandi

Da root worktree: `node docs/agents/evidence/verify-admin-parity.cjs`.
Da frontend: `npm test -- --watchAll=false --runInBand --runTestsByPath src/ciak/admin/pages/LeadManager.test.jsx src/ciak/admin/navigationMatch.test.js src/ciak/admin/components/DepartmentRoom.test.jsx`.
Build: `npm run build`.

## Da completare nel passaggio Claude

Questo blocco NON conclude la riorganizzazione complessiva. Restano: navigazione specifica completa per reparto, ricerca trasversale autorizzata, accessi contestuali account/materiali e code Vendite/Back office, eventuali accorpamenti verificati, parità completa delle azioni e collaudo browser con profili autorizzati. Non diagnosticato/corretto scraping intermittente; nessuna modifica backend. Non integrare le fixture della preview nel prodotto.

Il documento di consegna principale è C:/Users/berto/appevolution/docs/agents/CLAUDE-ADMIN-SEMPLIFICAZIONE.md nel checkout condiviso. Verificare gli aggiornamenti remoti e il lavoro concorrente prima di proseguire. Nessun deploy o operazione su dati reali nel blocco.

## Verifiche del 9 settembre 2026

- Installazione dipendenze nel worktree: npm ci --legacy-peer-deps --no-audit --no-fund con cache locale tmp/npm-admin-cache, exit 0, 1506 pacchetti. Nessuna modifica lockfile.
- Parità statica: PASS (NAV, Routes/binding e handler CSV/manuale identici, ignorati solo CRLF/LF).
- Test: 3 suite PASS, 9 test PASS, 40.352 s. Comando Windows effettivo: `npm test -- --watchAll=false --runInBand --watchman=false --testMatch='**/src/**/*.test.js' --testMatch='**/src/**/*.test.jsx' --runTestsByPath src/ciak/admin/pages/LeadManager.test.jsx src/ciak/admin/navigationMatch.test.js src/ciak/admin/components/DepartmentRoom.test.jsx`.
- Il testMatch generato da CRA contiene slash misti davanti a .worktrees su Windows e non trova test: l'override CLI sopra risolve senza modificare configurazioni progetto.
- Avvisi HTML nei test: il plugin visual-edits attivo in modalità non-production inserisce span in option/select/tbody. I test passano; il build production disattiva quel plugin in craco.config.js. Non corretto in questo scope.
- Browser autenticato, altri profili e stato live non collaudati per questo diff.
- Build completa `npm run build`: exit 0, Compiled with warnings; postbuild genera index.ciak.html e le quattro landing. Bundle main.aefa0726.js, CSS main.0549e020.css. Warning hook in codice non modificato (anche load di LeadManager preesistente); nessun errore di compilazione.
- Diff-check exit 0. Scansione pattern credenziali sulle aggiunte applicative PASS; review dei nuovi helper/test/documenti senza segreti. Nessun deploy, CI remota o collaudo live.
