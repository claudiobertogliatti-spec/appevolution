# Evolution — Direzione, reparti e autonomia verificabile

Data: 8 settembre 2026. Stato: proposta operativa derivata dalla conversazione con Claudio; nomi dei responsabili e nuove autorizzazioni da confermare prima dell'attivazione.

## Obiettivo concordato

Claudio e Luca presidiano una dashboard direzionale con numeri dei quattro reparti: Acquisizione, Vendite, Delivery con Casi studio, Back office. Ogni reparto ha un agente responsabile, compiti identificabili e risultati verificabili. Gli specialisti del percorso partner continuano a lavorare sotto il reparto competente.

Un incarico è concluso soltanto quando il risultato previsto è stato verificato. Un'approvazione, una risposta in chat o un messaggio di successo non costituiscono da soli una consegna.

## Requisiti

Fonte condivisa aggiornata: [architettura concordata](../../strategy/evolution-architettura-concordata.md). Include le successive decisioni su collaboratrici e mandato contrattuale Back office.

- R11: sezioni operative Antonella Rossi in Delivery e Mariangela Caccia in Acquisizione/Vendite, con identità unica, assegnazioni, ore e visibilità per ruolo.
- R12: contratti versionati e regole validate per orari, compensi, provvigioni e bonus; prospetti spiegabili, stati economici distinti, nessun ricalcolo silenzioso dei periodi chiusi.

- R1: organigramma e responsabilità coerenti in interfaccia, contesto AI e instradamento operativo.
- R2: catalogo di compiti eseguibili con input, autorizzazioni, esecutore, verificatore, scadenza e recupero.
- R3: presa in carico atomica, deduplicazione e ripresa dopo interruzioni; effetti esterni incerti da riconciliare prima di ripetere.
- R4: approvazione legata a versione e contenuto esatti; nessuna autoattribuzione di poteri da parte del modello.
- R5: errori, ritardi, attese e responsabilità visibili; nessun falso completamento.
- R6: almeno un flusso completo verificato per ogni reparto; i task non supportati sono dichiarati tali.
- R7: direzione con cassa, risultati, blocchi e decisioni; KPI apribili, datati e con definizioni omogenee.
- R8: reparti con coda di lavoro prima della chat; partner con prossimo passo, responsabile, scadenza e materiali.
- R9: casi studio dentro Delivery, utilizzabili commercialmente solo con prove, consenso e approvazione.
- R10: rollout progressivo, preservazione dello storico e del lavoro concorrente, evidenza sul software effettivamente distribuito.

## Vincoli globali

- Applicazione su https://www.ciak.io; repository C:\Users\berto\appevolution.
- Italiano semplice. Font Poppins; palette Ciak #0F172A #64748B #E5E7EB #FACC15. Brand partner separato.
- Riutilizzare FastAPI, MongoDB, Celery, React e servizi esistenti. Nessun nuovo servizio o abbonamento implicito.
- Non modificare il system prompt di Matteo senza via libera esplicito di Claudio.
- Nessun invio, pubblicazione, variazione di budget, pagamento o modifica contrattuale deriva dalla sola approvazione del piano.
- Preservare le approvazioni partner previste per materiali e video; ogni versione richiede il proprio consenso.
- Prezzi, sconti, contratti, pagamenti, rimborsi, accessi e decisioni commerciali straordinarie restano nei rispettivi flussi autorizzati.
- Non usare percentuali di avanzamento o ricavi come prova automatica di un caso studio.
- Non sovrascrivere lavoro concorrente; staging solo per file espliciti. Il piano autorizza documentazione, non attiva nuovi poteri in produzione.

## Confine dell'autonomia

La direzione assegna obiettivi; l'agente può proporre e scomporre il lavoro in task del catalogo. Il backend valida tipi, permessi, prerequisiti e approvazioni. Gli esecutori specialistici producono gli effetti; un verificatore controlla il risultato. Luca vede le evidenze e coordina le eccezioni.

Non si costruisce un esecutore universale di comandi arbitrari. Si costruisce un percorso affidabile per azioni definite, progressivamente estendibile.

## Accettazione finale

Tutti i task di pilotaggio hanno un esito verificato oppure un blocco esplicito con responsabile e prossima azione. Nessun duplicato nei test di concorrenza e recupero. Le schermate distinguono zero, errore e dato assente. Le quattro code alimentano la stessa direzione e ogni KPI rimanda al proprio insieme di dati.
