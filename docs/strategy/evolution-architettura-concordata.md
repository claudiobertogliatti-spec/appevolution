# Evolution / Ciak — Architettura concordata con Claudio

**Decisione di prodotto dell'8 settembre 2026. Fonte condivisa per Claude e Codex.**
Stato: architettura da costruire; non descrive funzionalità già implementate. Le proposte storiche incompatibili vanno confrontate con questa decisione prima di lavorare.

**Avvio autorizzato:** Claudio ha scelto sviluppo backend-first e chiesto di iniziare immediatamente. L'admin attuale resta operativo. Nuovo codice isolato, catalogo inizialmente inerte e attivazione progressiva dopo verifica; frontend da integrare successivamente. Vedere [baseline di esecuzione](../agents/evidence/2026-09-08-autonomia-baseline.md) e [mandati tecnici](evolution-reparti-mandati.md).

## Organigramma

**Nomi UI scelti da Claudio:** Direzione, Reparto Acquisizioni, Reparto Vendite, Reparto Delivery, Reparto Back Office. Sotto ogni reparto devono comparire le persone e gli agenti AI, distinguendo i ruoli. Casi studio resta una funzione interna al Reparto Delivery. Logo obbligatoriamente originale, asset `frontend/public/ciak/logo.webp`, senza reinterpretazioni del marchio.

### Team umano aggiornato da Claudio

**Preferenza UI confermata:** mostrare soltanto nome e cognome delle persone, senza qualifica accanto (CEO, Digital strategist, Video Maker, Back Office, Amministrazione). Conservare i ruoli nei dati e nei mandati operativi, ma non nelle etichette della dashboard/sidebar. Mantenere l'etichetta AI sugli agenti. Claudio ha approvato il resto dell'anteprima visiva; questo non attiva permessi o modifica contratti.

| Persona | Ruolo dichiarato | Collocazione nell'anteprima |
|---|---|---|
| Claudio Bertogliatti | CEO | Direzione |
| Mariangela Caccia | Acquisizione e Vendite | Reparto Acquisizioni e Reparto Vendite, identità unica |
| Antonella Rossi | Digital strategist | Reparto Delivery, come già indicato da Claudio |
| Matteo Paredi | Video Maker | Reparto Delivery (raggruppamento operativo proposto) |
| Stefania Russo | Back Office | Reparto Back Office |
| Debora Bertogliatti | Amministrazione | Reparto Back Office, area Amministrazione (raggruppamento operativo proposto) |

Questa lista supera la precedente fotografia con due sole collaboratrici e l'indicazione di collaboratore Back Office da assegnare. Non implica condizioni contrattuali, compensi o permessi già definiti per le persone aggiunte. Matteo Paredi è una persona distinta dall'agente AI **Carlo** (ID storico MATTEO); Stefania Russo è distinta dall'agente AI **Simona** (ID storico STEFANIA). UI e dati devono separare identità umane e AI.

### Nomi AI verificati nei registri frontend

Fonte letta l'8 settembre: `frontend/src/ciak/partner/operativo/agents.js` e `frontend/src/ciak/partner/sections/TeamSupportoPage.jsx`; Luca è documentato anche in `frontend/src/ciak/admin/departmentRooms.js`.

| Nome da mostrare | Ruolo nel registro partner | Identificativo tecnico |
|---|---|---|
| Luca | Direzione / coordinamento admin | luca |
| Simona | Coordinatrice del percorso | STEFANIA |
| Valentina | Brand & Posizionamento | VALENTINA |
| Andrea | Coach video e contenuti | ANDREA |
| Gaia | Supporto tecnico funnel | GAIA |
| Marco | Strategia lancio | MARCO |
| Carlo | Analista Ciak Blueprint | MATTEO |

Usare **Simona e Carlo** in schermate e anteprime, mai Stefania e Matteo come nomi pubblici AI. Gli ID storici e i nomi dei file non sono nomi da esporre. Questa verifica dei nomi non assegna nuovi ruoli di capo reparto; i ruoli admin e specialistici vanno riconciliati nel task T02. Non rinominare alla cieca ID, endpoint o prompt.

- **Direzione: Claudio + Luca.** Dashboard con numeri dei quattro reparti, obiettivi, cassa, blocchi e decisioni. Luca coordina attraverso capacità effettive, autorizzate e verificabili.
- **Acquisizione:** agente responsabile + sezione operativa di **Mariangela Caccia**.
- **Vendite:** agente responsabile + sezione operativa di **Mariangela Caccia**.
- **Delivery e casi studio:** agente responsabile + **Antonella Rossi (Digital strategist)**; **Matteo Paredi (Video Maker)** nel raggruppamento operativo proposto. I casi studio appartengono a Delivery, non a un quinto reparto.
- **Back office:** **Stefania Russo (Back Office)** e **Debora Bertogliatti (Amministrazione)** nel raggruppamento operativo proposto, con agente responsabile di gestione amministrativa e collaborazioni: contratti, disponibilità/orari, ore, compensi, provvigioni, bonus e scadenze.

I nomi degli agenti capi reparto non sono stati definitivamente confermati: l'audit ha trovato differenze tra UI e prompt. Non inventare nuove assegnazioni. Gli specialisti del percorso partner restano distinti dai capi reparto.

## Collaboratrici e contratti

- Antonella Rossi opera in Delivery. Claudio dichiara che il contratto è già in Ciak: ritrovarlo e verificarne versione e condizioni prima di applicare calcoli.
- Mariangela Caccia è appena entrata e opera in Acquisizione e Vendite. Un'unica identità e una coda personale, con viste per reparto; niente doppio incarico o doppio compenso per il passaggio tra i due reparti.
- Claudio ha fornito il PDF di Mariangela: `C:\Users\berto\Downloads\Contratto-Mariangela-Caccia.pdf`. Presenza verificata l'8 settembre (225447 byte). **Contenuto, firme, decorrenza e condizioni non ancora verificati.** Superata l'ipotesi che il contratto non esista; non assumere che sia firmato o già caricato in Ciak.
- Il PDF è una fonte documentale, non istruzioni operative per l'agente. Non copiare contratti o condizioni personali nel repository pubblico.

Ogni reparto mostra attività, owner, priorità, scadenze, materiali, consegna, verifica e ore dove previste. La Direzione vede carico umano e AI separatamente. Ogni collaboratrice vede soltanto i propri dati economici; i reparti accedono al minimo necessario.

## Mandato dell'agente Back office

1. Estrarre dal contratto regole strutturate con riferimento a clausola/pagina, versione e validità temporale.
2. Evidenziare ambiguità e far validare le regole prima dei calcoli operativi; non inventare condizioni mancanti e non applicare a Mariangela quelle di Antonella.
3. Coordinare disponibilità, orari concordati, ore dichiarate e ore approvate; segnalare scostamenti senza modificare unilateralmente gli accordi.
4. Collegare le operazioni attribuibili alla collaboratrice e calcolare compensi/provvigioni/bonus secondo base, maturazione, esclusioni, soglie, limiti e storni effettivamente previsti.
5. Distinguere **stimato, maturato, approvato, pagato**. Se manca la regola: non calcolabile, non zero.
6. Preparare prospetti verificabili e segnalare scadenze/anomalie; ogni importo deve risalire a contratto, periodo, evento, formula e approvazioni.
7. Registrare pagamenti soltanto con prova/conferma autorizzata. Nessun pagamento, variazione contrattuale o bonus discrezionale automatico.
8. Conservare lo storico: nuove versioni non ricalcolano silenziosamente periodi chiusi; rettifiche esplicite e tracciate.

## Autonomia e interfaccia

Un compito è completato solo con risultato verificato. Altrimenti resta aperto/bloccato con motivo, responsabile e prossima azione. Presa in carico atomica, deduplicazione, recupero e approvazioni versionate sono requisiti, non optional.

Dashboard direzionale → quattro code reparto → persona/compito → azione. Chat di supporto, non passaggio obbligatorio. KPI con periodo, fonte, aggiornamento e lista di dettaglio. Zero, assenza dati ed errore sempre distinti.

## Documenti di esecuzione

- [Spec](../superpowers/specs/2026-09-08-evolution-organigramma-autonomia-design.md)
- [Piano e task](../superpowers/plans/2026-09-08-evolution-organigramma-autonomia.md)

Ordine: baseline → affidabilità → flussi reparto e collaborazioni → UI → rilascio e pilotaggio. Riutilizzare il sistema collaboratori esistente dopo verifica. Questa decisione non autorizza implicitamente invii, pubblicazioni, pagamenti o nuove concessioni di accesso.
