# Fase 2 Ciak: migrazione canonica e pilota Daniele Andolfi

**Data:** 15 agosto 2026

**Stato:** design approvato

**Pilota:** Daniele Andolfi, partner ID `23`

## Obiettivo

Rendere la Fase 2 del percorso Partner realmente eseguibile da F-8 a F-19, usando Daniele
Andolfi come primo collaudo reale. La soluzione deve conservare gli input e i video validi,
archiviare gli output storici, rigenerare con i template correnti ciò che non è conforme e
richiedere nuove approvazioni verificabili.

Il risultato non è una correzione manuale limitata a Daniele. È una migrazione canonica,
idempotente e riutilizzabile sugli altri partner dopo il collaudo.

## Decisioni approvate

- `partner_journey_steps` è l'unica fonte di verità dello stato del percorso.
- La sequenza canonica della Fase 2 è F-8–F-19.
- Dati, risposte e video originali validi vengono conservati.
- Gli output prodotti dal team con template superati non valgono come output correnti.
- Gli output storici non vengono cancellati: diventano versioni `legacy` o `superseded`.
- Uno step già `done` viene riaperto solo quando manca una versione conforme e approvata.
- I workspace sono viste aggregate dei dati canonici, non un secondo percorso.
- Daniele viene migrato e collaudato prima di qualsiasi intervento collettivo.

## Stato reale rilevato su Daniele

L'audit read-only del database di produzione ha rilevato una struttura stratificata:

- F-8, F-9 e F-10 sono memorizzati con numerazioni storiche `5`, `6` e `9`;
- esistono collisioni di `step_number`, tra cui F-10 e `09-funnel-asset` al numero `9`;
- F-11, F-12 e F-14 risultano `done` sulla base di completamenti storici;
- F-14 non ha alcuna versione nella collection canonica
  `partner_launch_calendar_versions`;
- F-13 risulta `done`, ma il record funnel non contiene le sette prove tecniche correnti;
- F-15 contiene una bozza ed è `in_progress`;
- F-16, F-18 e F-19 sono `pending`;
- la masterclass possiede un URL video storico, ma non l'approvazione corrente richiesta;
- il videocorso contiene un outline e 32 record lezione, da riconciliare con le versioni
  e le approvazioni correnti;
- non esistono ancora certificato Valida o Workbook finale versionati.

Questi dati dimostrano che lo stato `done` storico non può essere assunto come prova di
conformità corrente.

## Sequenza canonica

| Codice | Step ID | Output o evidenza necessaria | Completamento |
|---|---|---|---|
| F-8 | `05-script-masterclass` | Script masterclass corrente | Versione corrente approvata |
| F-9 | `06-outline-lezioni` | Outline corrente | Versione corrente approvata |
| F-10 | `07-script-videolezioni` | Script delle lezioni | Tutte le versioni richieste approvate |
| F-11 | `08-registra-masterclass` | Masterclass definitiva | Video corrente approvato dal partner |
| F-12 | `09-registra-lezioni` | Videolezioni definitive | Tutte le lezioni dell'outline corrente approvate |
| F-13 | `10-sistema-vendita` | Sistema commerciale | Sette verifiche server-side superate |
| F-14 | `11-calendario-30gg` | Calendario di lancio | Versione corrente approvata dal team |
| F-15 | `12-prezzo-webinar` | Prezzo, webinar e deck | Pacchetto corrente approvato |
| F-16 | `16-readiness-lancio` | Snapshot pre-lancio | Tutti i prerequisiti verificati |
| F-17 | `13-lancio` | Funnel pubblico | Probe live riuscito e lancio registrato |
| F-18 | `18-certificato-valida` | Certificato Valida | Documento versionato e archiviato |
| F-19 | `19-workbook-finale` | Workbook finale | Documento coerente con gli input approvati |

## Modello delle versioni

Ogni output governato deve avere un'identità immutabile composta almeno da:

- `partner_id`;
- `step_id` e categoria del materiale;
- numero di versione;
- identificatore e versione del template;
- checksum del contenuto;
- checksum o riferimenti degli input approvati;
- stato `draft`, `pending_review`, `changes_requested`, `approved`, `superseded` o `legacy`;
- autore e data di creazione;
- revisore, data e nota della decisione;
- riferimento alla versione sostituita.

Una nuova versione non modifica il contenuto di quella precedente. L'approvazione vale solo
per il checksum corrente. Qualunque nuova revisione revoca implicitamente la validità della
precedente come output corrente, senza cancellarne lo storico.

## Regole di riapertura

La migrazione calcola la conformità senza fidarsi del solo `status` storico.

Uno step viene mantenuto `done` esclusivamente quando l'evidenza corrente soddisfa la policy
canonica. In caso contrario:

1. lo stato storico e la relativa provenienza vengono salvati nello snapshot;
2. l'output esistente viene registrato come `legacy` o `superseded`;
3. lo step torna `in_progress` se è il primo step non conforme e raggiungibile;
4. gli step successivi dipendenti tornano `pending` oppure `blocked` con motivo esplicito;
5. dati validi, risposte e file sorgente non vengono rimossi.

La riapertura non deve affidarsi a `partners.phase`, che resta una proiezione legacy.

## Esperienza partner

Ogni step espone un solo stato comprensibile:

- Tocca a te;
- Il team sta lavorando;
- Pronto da controllare;
- Modifiche richieste;
- Approvato;
- Bloccato, con motivo e prossima azione.

Il partner non vede terminologia infrastrutturale come GCS, Celery, checksum, pipeline o
Stripe Price ID. La CTA `Visualizza materiali` compare solo per gli step che producono un
output consultabile e apre l'archivio versionato dello step.

Per un output pronto il partner può:

- approvare la versione corrente;
- richiedere modifiche inserendo una nota obbligatoria.

La richiesta crea lavoro nella coda team. Una nuova versione richiede una nuova approvazione.

## Esperienza team e Ciak Studio

Il team dispone di una coda unica della Fase 2, filtrabile per:

- materiali da generare;
- richieste di modifica;
- video da revisionare o montare;
- output in attesa del partner;
- errori tecnici recuperabili;
- partner pronti per la verifica di lancio.

Ciak Studio resta la cabina interna di produzione. I link Drive e GCS non sono esposti al
partner. Ogni montaggio costituisce una versione: se cambia, l'approvazione precedente non
vale più. Alla terza richiesta di modifica sullo stesso output viene creato un alert per la
gestione diretta del team, senza bloccare tecnicamente ulteriori revisioni.

## Flusso di produzione F-8–F-12

L'ordine è vincolante:

1. generazione e approvazione del nuovo script masterclass;
2. generazione e approvazione del nuovo outline;
3. generazione e approvazione degli script delle lezioni richieste dall'outline;
4. invio dei video grezzi;
5. revisione e montaggio del team;
6. approvazione partner della masterclass definitiva;
7. approvazione partner di tutte le lezioni definitive richieste.

I generatori usano solo input approvati della Fase 1, posizionamento corrente, brand kit
corrente e template ufficiale corrente. Se cambia un input di provenienza, Ciak marca gli
output dipendenti come potenzialmente obsoleti e richiede una scelta esplicita del team; non
rigenera né invalida silenziosamente.

## Sistema commerciale F-13–F-15

F-13 è `done` soltanto quando il backend verifica:

1. subaccount Systeme collegato;
2. dominio o sottodominio configurato;
3. pagine legali presenti;
4. funnel pubblicato;
5. checkout raggiungibile;
6. prezzo configurato;
7. automazioni di accesso attive.

Valori dichiarati dal browser non possono sostituire queste prove.

F-14 usa esclusivamente `partner_launch_calendar_versions`: invio partner, revisione team,
checksum approvato e contenuto persistito devono essere coerenti.

F-15 produce un pacchetto versionato unico:

- prezzo e condizioni;
- struttura e script del webinar;
- deck modificabile;
- PDF di consultazione;
- eventuale promozione con scadenza esplicita.

Gli identificativi tecnici e le configurazioni di pagamento restano nell'area team.

## Readiness, lancio e documenti finali F-16–F-19

F-16 registra uno snapshot solo dopo aver verificato:

- masterclass corrente approvata;
- tutte le lezioni correnti approvate;
- F-13 realmente pronto;
- calendario corrente approvato;
- pacchetto prezzo e webinar corrente approvato;
- data di lancio fissata;
- pagina vendita e checkout raggiungibili.

F-17 esegue un probe live della pagina pubblica e registra il lancio in modo idempotente.
Una checklist spuntata dal partner non costituisce prova tecnica.

F-18 e F-19 sono effetti automatici successivi al lancio verificato:

- il certificato viene archiviato come documento versionato;
- il Workbook usa esclusivamente output approvati e registra la loro provenienza;
- retry e richiami ripetuti non producono duplicati;
- un errore documentale non annulla il lancio già verificato;
- l'errore resta visibile e recuperabile nella coda team;
- F-20 si apre solo dopo F-17, F-18 e F-19 `done`.

## Workspace e step singoli

Gli step singoli restano le unità canoniche. I workspace Masterclass, Corso e Sistema di
vendita diventano proiezioni aggregate che leggono e comandano gli stessi endpoint e le
stesse versioni. Non mantengono flag di completamento autonomi.

Durante la transizione, ogni endpoint workspace che oggi scrive dati paralleli deve essere
inventariato e poi delegare al servizio canonico oppure essere ritirato. Non si rimuove una
surface finché i deep-link esistenti non sono stati migrati e coperti da test.

## Migrazione

La migrazione è un comando amministrativo esplicito con due modalità.

### Dry run

Produce un report persistito e scaricabile contenente:

- record duplicati e collisioni di numerazione;
- mapping vecchio → canonico;
- output da mantenere, archiviare o rigenerare;
- step da riaprire e dipendenze conseguenti;
- evidenze mancanti;
- operazioni previste, senza scritture sui dati journey.

### Apply

Richiede l'identificatore del dry run corrente. Prima di modificare:

- verifica che i dati sorgente non siano cambiati;
- salva uno snapshot completo e checksummed;
- usa operazioni idempotenti e confronti atomici;
- registra attore, timestamp, motivo e risultato;
- interrompe con errore esplicito in caso di concorrenza.

L'apply normalizza gli step, registra gli output storici, riapre ciò che non è conforme e
ricalcola il primo step raggiungibile. Una seconda esecuzione sullo stesso stato non crea
versioni, snapshot o notifiche duplicate.

Il ripristino è una procedura amministrativa separata che usa lo snapshot; non è un rollback
automatico implicito.

## Applicazione a Daniele

Il primo dry run deve proporre almeno:

- riallineamento dei codici e dei numeri F-8–F-19;
- gestione esplicita dei record storici e di `09-funnel-asset`;
- riapertura degli output testuali generati con template vecchi;
- verifica separata della riusabilità dei file video originali;
- invalidazione del `done` storico di F-13 in assenza delle sette prove;
- migrazione del calendario legacy verso una nuova bozza, mai verso una falsa approvazione;
- mantenimento di F-16–F-19 chiusi fino alle rispettive evidenze.

L'apply su Daniele avviene solo dopo il controllo umano del report.

## Errori e osservabilità

Ogni operazione asincrona espone stato, ultimo aggiornamento, errore sanificato e azione di
recupero. Gli errori non vengono convertiti in successi o fallback indistinguibili.

Sono richiesti:

- audit log per migrazione, generazione, revisione, approvazione e pubblicazione;
- idempotency key per generatori e operazioni finali;
- alert team per job falliti o bloccati oltre la soglia;
- messaggio partner non tecnico, con indicazione se deve agire o attendere;
- retry manuale autorizzato senza duplicare output.

## Sicurezza e autorizzazioni

- Il partner può leggere e approvare solo i propri materiali.
- L'admin può generare, revisionare, migrare e recuperare gli errori.
- L'admin non può impersonare l'approvazione del partner.
- Gli endpoint di migrazione richiedono ruolo amministrativo e dry-run corrente.
- Nessun URL sorgente privato viene esposto al partner.
- I flag governati arrivano solo da evidenze server-side.

## Strategia di test

### Unit test

- mapping e normalizzazione degli step;
- classificazione output corrente, legacy e superseded;
- regole di riapertura e propagazione delle dipendenze;
- policy F-8, F-9, F-10 e F-15 basate su versione approvata;
- idempotenza di migrazione, generazione, lancio e documenti finali;
- invalidazione dell'approvazione dopo una nuova versione.

### Test API autenticati

- partner proprio `200`, altro partner `403`, anonimo `401`;
- admin genera ma non approva al posto del partner;
- richiesta modifiche con nota obbligatoria;
- concorrenza tra approvazione e nuova revisione;
- dry run, apply con checksum corrente e rifiuto di report stale;
- readiness e lancio senza flag forniti dal client.

### Regressioni

- F-11 richiede il video corrente approvato;
- F-12 richiede tutte le lezioni dell'outline corrente;
- F-13 richiede tutte le sette verifiche;
- F-14 richiede una versione approvata integra;
- F-17 richiede un probe live riuscito;
- F-18/F-19 non duplicano documenti;
- i workspace riflettono esattamente gli step canonici.

### Smoke test Daniele

1. dry run e verifica del report;
2. apply limitato al partner `23`;
3. accesso autenticato partner e admin;
4. rigenerazione di un output per volta;
5. richiesta modifiche, nuova versione e approvazione;
6. avanzamento F-8–F-12;
7. completamento delle prove F-13–F-16;
8. probe e lancio F-17;
9. archivio F-18/F-19 e apertura F-20;
10. verifica che materiali storici e input originali siano ancora consultabili dal team.

## Strategia di rilascio

Il lavoro viene suddiviso in incrementi reversibili:

1. servizi canonici di versionamento e policy;
2. dry run e report Daniele;
3. apply Daniele;
4. interfaccia partner e coda team;
5. generatori con template correnti;
6. consolidamento workspace;
7. readiness, lancio e documenti finali;
8. smoke autenticato completo.

Ogni incremento passa CI prima del merge. Dopo il push su `main` si verificano separatamente:

- workflow CI;
- revisione backend e traffico Cloud Run;
- revisione worker e configurazione effettiva;
- deploy Vercel del progetto con root `frontend`;
- health API;
- bundle JavaScript realmente servito da `www.ciak.io`;
- comportamento autenticato con Daniele.

Solo dopo il collaudo viene prodotto un dry run aggregato per gli altri partner. L'estensione
collettiva richiede una decisione separata.

## Fuori ambito

- Riscrittura completa dell'intera area partner in un solo rilascio.
- Cancellazione dei materiali storici.
- Migrazione automatica di tutti i partner insieme a Daniele.
- Modifica del system prompt di Matteo.
- Pubblicazione automatica su Systeme senza evidenze, idempotenza e recupero esplicito.

## Criteri di accettazione

La prima iterazione è conclusa quando:

- Daniele possiede una sola sequenza canonica F-8–F-19;
- il report mostra e spiega ogni dato conservato, archiviato o riaperto;
- gli output vecchi restano nello storico ma non completano gli step correnti;
- i nuovi output riportano template, versione, checksum e approvazione;
- nessuno step governato è completabile tramite flag del browser;
- il partner distingue chiaramente la propria azione da quella del team;
- ogni blocco espone motivo e recupero;
- F-17 è sostenuto da una verifica live;
- F-18 e F-19 sono versionati, coerenti e non duplicabili;
- il percorso apre F-20 solo dopo tutte le evidenze richieste;
- CI, deploy e smoke autenticato live sono documentati con prove.
