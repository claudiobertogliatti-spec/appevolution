# Ciak Admin CRM Vision

Aggiornamento: 2026-07-02

## Visione generale

L'area admin Ciak deve diventare un CRM operativo completo per gestire tutti i
reparti Evolution PRO in modo semplice, immediato e leggibile anche da un
imprenditore alle prime armi.

Il layout deve restare pulito, con sidebar stabile, grandi card descrittive,
testi semplici e priorita chiare. Ogni pagina deve aiutare Claudio a capire:

- cosa sta succedendo nel reparto;
- cosa funziona;
- cosa non funziona;
- cosa richiede una sua decisione;
- quale prossima azione ha piu impatto.

Non servono mille statistiche. Ogni reparto deve mostrare pochi numeri
fondamentali, orientati a decisioni reali.

## Struttura reparto

Ogni macro-reparto deve aprire una pagina con:

1. riquadro titolo del reparto visibile prima di tutto;
2. agente AI responsabile del reparto, con foto e chat contestuale subito sotto;
3. report di inizio giornata;
4. semaforo reparto;
5. grandi card operative;
6. lista delle cose che richiedono Claudio.

Dashboard e Cabina di Regia non devono essere due pagine separate per Claudio:
la Dashboard deve essere la home unica con Luca, chat, numeri essenziali,
semaforo e card dei reparti. Le vecchie URL possono rimanere come redirect per
non rompere link salvati.

La sidebar deve restare pulita: niente box "chat agenti" separato, perche ogni
reparto ha gia la propria chat responsabile nel contesto corretto.

Luca deve usare la foto ritagliata in `frontend/public/agents/luca.jpg`, in
formato quadrato coerente con gli altri agenti.

Delivery deve permettere il cambio rapido stato partner dalla tabella operativa:
attivo, in sospeso, quarantena. Lo stato "ex" resta gestito dalla sezione
dedicata per evitare cambi accidentali.

Struttura funzionale originale da preservare:

1. agente AI responsabile del reparto, con foto e chat contestuale;
2. report di inizio giornata;
3. semaforo reparto;
4. grandi card operative;
5. lista delle cose che richiedono Claudio.

Mappa agenti:

- Dashboard: Luca;
- Acquisizione / Marketing: Andrea;
- Vendite: Gaia;
- Delivery: Stefania;
- Casi studio: Andrea;
- Back office: Valentina.

## Report di inizio giornata

Ogni reparto deve avere un briefing sintetico con:

- analisi dei numeri;
- cosa sta funzionando;
- cosa non funziona;
- soluzione proposta per priorita;
- accorgimenti tattici.

## Requisito importante: dati reali partner da Drive

Il CRM deve prevedere la possibilita, con assistenza AI di Codex, di inserire
partner per partner tutti i dati reali e tutti i materiali gia in possesso di
Claudio, oggi conservati su Google Drive.

Questo requisito e centrale per rendere il CRM affidabile: non basta avere
schermate belle o pipeline vuote. Ogni partner deve poter diventare una scheda
reale, completa e consultabile.

### Obiettivo

Per ogni partner, il sistema deve poter raccogliere e ordinare:

- dati anagrafici e commerciali;
- stato contrattuale e pagamento;
- fase del percorso;
- materiali consegnati;
- materiali mancanti;
- file strategici;
- video, script, documenti, PDF, link e asset;
- note operative;
- prossime azioni;
- storico decisioni;
- risultati e KPI quando disponibili.

### Modalita desiderata

Claudio deve poter lavorare con Codex per importare o ricostruire i dati
partner-by-partner a partire dai materiali nel Drive.

Il flusso ideale:

1. selezione del partner;
2. recupero dei materiali disponibili da Google Drive;
3. lettura/analisi AI dei documenti;
4. proposta di compilazione della scheda partner;
5. revisione e conferma di Claudio;
6. salvataggio nel CRM;
7. evidenza automatica di dati mancanti o incoerenti.

### Principio operativo

L'AI non deve inventare dati. Deve:

- estrarre informazioni dai materiali reali;
- segnalare incertezza;
- proporre campi da completare;
- distinguere dato confermato, dato probabile e dato mancante;
- chiedere conferma prima di aggiornare informazioni sensibili.

### Impatto sui reparti

Delivery:
scheda partner completa, materiali ordinati, prossime azioni chiare.

Back office:
contratti, pagamenti, fatture e dati fiscali piu facili da verificare.

Vendite:
storico completo del passaggio da prospect a partner.

Casi studio:
risultati, prove, screenshot e testimonianze recuperabili dal materiale reale.

Dashboard:
fotografia aziendale piu affidabile per decisioni CEO.
