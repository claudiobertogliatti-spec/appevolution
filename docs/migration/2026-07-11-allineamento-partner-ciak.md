# Allineamento Partner Reali in Ciak - 2026-07-11

## Obiettivo

Portare dentro Ciak lo stato reale dei partner prioritari, senza migrare dati alla cieca.
La giornata serve ad allineare scheda partner, Drive, materiali, prossima azione, owner e strategia operativa dove necessaria.

Il lavoro completo ha tre fasi:

1. Recuperare da Drive tutto il materiale disponibile per ogni partner.
2. Integrare correttamente i materiali nei profili Ciak e segnare cio che manca.
3. Contattare i partner e istruirli su come proseguire dentro il nuovo protocollo Ciak.

Regola non negoziabile: la migrazione non serve a dichiarare un partner pronto. Serve a simulare il percorso Ciak completo con i materiali reali in nostro possesso. I campi o le fasi senza materiale/prova restano vuoti o marcati come mancanti.

## Principio guida

Ogni partner va chiuso con una risposta chiara a cinque domande:

1. Dove si trova davvero oggi?
2. Che materiali esistono gia?
3. Che materiali mancano?
4. Qual e la prossima azione concreta?
5. Chi la possiede?

Se una di queste risposte manca, il partner non e ancora allineato.

## Regola standard Fase 1 - Esamina

Aggiornamento operativo 2026-07-10:

- La Fase 1 non contiene documenti da approvare.
- Si chiude con `OK operativo` quando in Ciak esiste una base utilizzabile per Esamina: posizionamento, storia/bio, brand kit o note di contesto recuperate da Ciak/Drive/web.
- Dati personali, documenti fiscali, IBAN o documento identita sono note di contesto per fasi successive: non bloccano la chiusura della Fase 1.
- Per il brand kit non fermarsi alla cartella `Immagini`: cercare anche in cartelle storiche, calendario editoriale, reel/storie/caroselli, funnel, live e asset di lancio.
- Luigi Calafiore e escluso dalla chiusura massiva: essendo nuovo partner deve procedere in autonomia nel percorso iniziale.

Stati usati:

- `fase1_chiusa_ok_operativo`: partner attivo o comunque da proseguire operativamente.
- `fase1_chiusa_ok_operativo_riabilitazione`: partner in quarantena/recupero; Fase 1 chiusa come base di riabilitazione.
- `fase1_chiusa_ok_operativo_ex_non_attivo`: partner ex/non attivo; Fase 1 chiusa come fotografia storica, non come rilancio.
- `fase1_chiusa_ok_operativo_ex_da_migrare`: partner ex/non attivo ma incluso nella migrazione materiali.
- `fase1_standby_contratto_insoluto`: partner in standby per contratto/pagamento insoluto; non proseguire finche non viene sbloccato amministrativamente.

Aggiornamento segmentazione:

- Marco Serra e Loris Bonomi sono ex partner, ma devono comunque far parte della migrazione materiali.
- Simone Ricco, Giuseppe Sarno, Alice Conventi ed Elena Perniola sono in standby per contratti insoluti di pagamento.
- Il record precedentemente indicato come Filadelfio Vasi va trattato come Alfredo Vasi.

## Sorgenti Drive individuate

Cartelle da usare come punto di partenza:

| Cartella | Uso operativo | URL |
| --- | --- | --- |
| 04 - EVOLUTION PRO | Cartella madre attuale del progetto. Contiene `01 Partner`, `01 - Clienti`, documenti strategici e la copia dei partner da risistemare. | https://drive.google.com/drive/folders/1Gi8TJ_vBYkxW9iz-UHDR5958_74qw4DI |
| Partner Evolution Pro da risistemare | Archivio storico operativo con materiali partner, funnel, masterclass, videocorso, calendari editoriali e documenti sparsi. | https://drive.google.com/drive/folders/1QFBh-93fiPXmFIKWE2-RBNRzCTiHlsLy |
| Partner Evolution Pro da risistemare (Copia) | Copia presente dentro `04 - EVOLUTION PRO`; usare come confronto se mancano materiali nella cartella originale. | https://drive.google.com/drive/folders/1dCQdOLcv2lyyjmiAAtOBh6t8w5yKszvW |

Regola: non fidarsi di una sola cartella. Per ogni partner cercare sia nella cartella madre sia nell'archivio storico, usando nome, cognome, nome corso/offerta e varianti note.

## Flusso end-to-end

### Fase 1 - Inventario Drive

Per ogni partner prioritario:

- [ ] Cercare cartelle e file con nome/cognome.
- [ ] Aprire eventuale cartella partner dedicata.
- [ ] Verificare sottocartelle ricorrenti: `Documenti`, `Masterclass`, `Video corso`, `Videocorso`, `Funnel`, `Calendario editoriale`, `Loghi`.
- [ ] Elencare file utili con titolo, tipo, link e data ultima modifica.
- [ ] Distinguere materiali pronti, bozze, duplicati e file vecchi.
- [ ] Segnare il miglior link sorgente per ogni asset da integrare in Ciak.

### Fase 2 - Integrazione Ciak

Per ogni partner:

- [ ] Aprire il profilo partner in Ciak.
- [ ] Inserire o aggiornare lo stato reale.
- [ ] Collegare i materiali trovati nei campi corretti del percorso.
- [ ] Compilare i materiali mancanti come gap espliciti.
- [ ] Aggiornare prossima azione e owner.
- [ ] Aggiungere strategia 30/60/90 dove serve.
- [ ] Verificare che il profilo sia leggibile anche per chi non ha seguito la migrazione.

### Fase 3 - Contatto partner

Solo dopo l'allineamento interno:

- [ ] Preparare messaggio sintetico per il partner.
- [ ] Spiegare dove si trova nel protocollo Ciak.
- [ ] Indicare cosa deve fare ora.
- [ ] Dare una sola istruzione principale, non una lista confusa.
- [ ] Se servono materiali, chiedere esattamente cosa inviare e dove.
- [ ] Se serve una call, indicare obiettivo della call e output atteso.

## Priorita di lavorazione

Ordine operativo iniziale aggiornato:

1. Sarah
2. Cosimo
3. Michele
4. Mariantonietta
5. Daniele
6. Marco
7. Andrea
8. Eva
9. Sara
10. Luigi Calafiore

Standby:

- Arianna Aceto: non cancellare dall'inventario, ma sospendere la migrazione operativa finche non viene riattivata.

Nota su Luigi Calafiore: trattarlo come nuovo partner appena firmato, non come partner fermo o da riabilitare.

## Stati Ciak da usare

Usare uno stato solo quando descrive il comportamento operativo reale, non l'aspirazione.

| Stato | Quando usarlo | Prossima azione tipica |
| --- | --- | --- |
| In costruzione | Offerta, funnel, masterclass o videocorso non sono ancora completi | Completare asset mancante |
| Pronto al lancio | Materiali principali pronti e serve solo preparare/attivare il lancio | Definire data, campagna, KPI |
| Ottimizza / recupero risultati | Partner gia lavorato o lanciato, ma risultati o conversioni da recuperare | Diagnosi 30/60/90 e interventi prioritari |
| Fermo da riabilitare | Partner bloccato, non ingaggiato o senza avanzamento reale | Re-ingaggio, call, piano minimo di ripartenza |
| Nuovo partner | Partner appena firmato, onboarding iniziale da impostare | Creare base dati, Drive, timeline e owner |

## Checklist per ogni partner

### 1. Aprire la scheda partner in Ciak

- [ ] Verificare nome, email, telefono, ruolo e dati anagrafici.
- [ ] Verificare fase corrente.
- [ ] Verificare che lo stato operativo sia coerente con la realta.
- [ ] Correggere eventuali incongruenze tra fase visibile e situazione reale.

### 2. Verificare Drive

- [ ] Aprire la cartella Drive del partner.
- [ ] Verificare se esistono materiali di posizionamento.
- [ ] Verificare se esistono script, masterclass, video grezzi o video finali.
- [ ] Verificare se esistono funnel, pagine, link Systeme.io, checkout o calendario.
- [ ] Annotare materiali mancanti direttamente in Ciak.

### 3. Inserire materiali presenti

Compilare o agganciare in Ciak:

- [ ] Posizionamento / promessa / target.
- [ ] Funnel light o opt-in.
- [ ] Script masterclass.
- [ ] Video masterclass grezzo.
- [ ] Video masterclass finale.
- [ ] Videocorso / lezioni disponibili.
- [ ] Funnel vendita.
- [ ] Checkout.
- [ ] Calendario o asset di lancio.
- [ ] Note operative utili per il team.

### 4. Definire materiali mancanti

Per ogni mancanza indicare:

- [ ] Che cosa manca.
- [ ] Perche blocca il percorso.
- [ ] Chi deve produrlo.
- [ ] Entro quando serve.
- [ ] Se e bloccante per lancio, delivery o recupero risultati.

### 5. Definire prossima azione

La prossima azione deve essere una sola, concreta e verificabile.

Esempi validi:

- "Chiamare partner e recuperare video grezzo masterclass."
- "Caricare link YouTube masterclass finale in Ciak."
- "Completare script vendita prima del lancio."
- "Validare funnel e checkout prima di attivare traffico."
- "Preparare piano recupero 30/60/90."

Esempi da evitare:

- "Sistemare tutto."
- "Fare follow-up."
- "Capire situazione."
- "Da vedere."

### 6. Assegnare owner

Ogni partner deve avere:

- [ ] Owner operativo principale.
- [ ] Eventuale owner contenuti/video.
- [ ] Eventuale owner funnel/tech.
- [ ] Eventuale owner commerciale/lancio.

Se non e chiaro, segnare "Owner da assegnare" come blocco esplicito.

## Strategia 30/60/90

Compilarla solo dove serve davvero: partner in Ottimizza / recupero risultati, pronti al lancio, o fermi da riabilitare.

### 30 giorni

- Obiettivo minimo.
- Asset da completare.
- Azione commerciale o di rilancio.
- KPI da guardare.

### 60 giorni

- Secondo ciclo di ottimizzazione.
- Correzioni su funnel, offerta, contenuti o vendita.
- Target operativo.

### 90 giorni

- Risultato atteso.
- Decisione: scalare, rifinire, rilanciare o cambiare strategia.

## Scheda sintetica da compilare

Usare questo formato nelle note operative quando serve un riepilogo rapido.

```text
Partner:
Stato reale:
Fase Ciak:
Gruppo operativo:
Materiali presenti:
Materiali mancanti:
Blocco principale:
Prossima azione:
Owner:
Strategia 30 giorni:
Strategia 60 giorni:
Strategia 90 giorni:
Note:
```

## Tabella di avanzamento

| Partner | Stato reale | Materiali verificati | Mancanze segnate | Prossima azione | Owner | 30/60/90 | Chiuso |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sarah | Fase 1 chiusa OK operativo | [x] | [x] | Mappare playlist YouTube tra masterclass e lezioni | Da assegnare | [ ] | [x] |
| Arianna | Ex/non attiva - Fase 1 chiusa come fotografia storica | [x] | [x] | Non procedere salvo riattivazione esplicita |  | [ ] | [x] |
| Michele | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Mariantonietta | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Daniele | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Cosimo | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Marco Lamanna | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Andrea | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Eva | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Sara | Fase 1 chiusa OK operativo | [x] | [x] | Proseguire con mappatura materiali fasi successive |  | [ ] | [x] |
| Luigi Calafiore | Nuovo partner appena firmato | [ ] | [ ] | Escluso dalla chiusura massiva: percorso Fase 1 da fare in autonomia |  | [ ] | [ ] |

### Chiusura massiva altri partner presenti in Ciak

Il 2026-07-10 e stata chiusa la Fase 1 anche per gli altri partner presenti in Ciak, escluso Luigi Calafiore:

| Partner | Stato Fase 1 | Prossima azione |
| --- | --- | --- |
| Alice Conventi | `fase1_standby_contratto_insoluto` | Standby per contratto/pagamento insoluto |
| Annamaria Depalma | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Daphne Oliveti | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Elena Perniola | `fase1_standby_contratto_insoluto` | Standby per contratto/pagamento insoluto |
| Federica Arimatea | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Alfredo Vasi | `fase1_chiusa_ok_operativo_riabilitazione` | Drive strutturato; procedere con recupero materiali fasi successive |
| Giuseppe Sarno | `fase1_standby_contratto_insoluto` | Standby per contratto/pagamento insoluto |
| Loris Bonomi | `fase1_chiusa_ok_operativo_ex_da_migrare` | Ex partner incluso nella migrazione materiali |
| Marco Orlandi | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Marco Serra | `fase1_chiusa_ok_operativo_ex_da_migrare` | Ex partner non rinnovato, ma incluso nella migrazione materiali |
| Maria Giulia Falcone | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Silvia Sedda | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |
| Simone Ricco | `fase1_standby_contratto_insoluto` | Standby per contratto/pagamento insoluto |
| Valter Romani | `fase1_chiusa_ok_operativo_riabilitazione` | Verificare Drive/materiali mancanti e definire azione minima di recupero |

## Regole di chiusura giornata

La giornata e chiusa bene solo se per ogni partner prioritario esiste almeno:

- stato reale in Ciak;
- materiali presenti verificati;
- materiali mancanti segnati;
- una prossima azione concreta;
- un owner;
- strategia 30/60/90 dove serve.

Se un partner non puo essere chiuso, lasciarlo con un blocco esplicito e non con una nota generica.
