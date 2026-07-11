# Attivazione Funnel Partner in Systeme.io

Data: 2026-07-11

## Decisione

Evolution PRO gestisce ogni partner in un subaccount Systeme.io separato, creato sotto l'account principale Evolution. Il subaccount mantiene separati funnel, contatti, email, statistiche e configurazioni del partner.

Questa decisione sostituisce, per i nuovi setup partner, il modello descritto nella spec del 2026-07-09 che prevedeva un account Systeme autonomo di proprieta' del partner.

Il processo ha due fasi nettamente separate:

1. costruzione e approvazione sul sottodominio gratuito Systeme.io;
2. collegamento del dominio e pubblicazione definitiva solo dopo l'approvazione.

## Obiettivo

Ridurre il lavoro artigianale e i tempi morti nella creazione del funnel partner, rendendo visibili responsabilita', blocchi e prossima azione. Il partner fornisce gli asset indispensabili e approva; Evolution esegue la configurazione tecnica; Ciak governa il processo e ne verifica il completamento.

## Confini di responsabilita'

### Partner

- possiede gia' un dominio prima della messa online;
- possiede una casella professionale reale sul dominio, ad esempio `info@dominiopartner.it`;
- mantiene dominio e casella a proprio carico;
- fornisce i dati legali e gli accessi tecnici necessari;
- conferma l'indirizzo mittente dalla propria casella;
- approva funnel e legal pages;
- puo' scegliere di fornire testi preparati dal proprio legale.

### Evolution PRO

- crea e gestisce il subaccount Systeme.io;
- importa e personalizza il funnel master;
- pubblica l'anteprima sul sottodominio Systeme.io;
- genera o importa le legal pages;
- collega il dominio definitivo;
- configura i record richiesti da Systeme.io per web ed email;
- configura e verifica il mittente professionale;
- esegue il collaudo finale e pubblica.

### Ciak

- raccoglie i dati una sola volta;
- genera documenti e materiali;
- registra stato, responsabilita', blocchi e storico;
- presenta l'anteprima e raccoglie approvazione o correzioni;
- verifica automaticamente tutto cio' che e' osservabile dall'esterno;
- impedisce il passaggio a Live finche' i controlli obbligatori non sono superati.

## Approccio scelto

Si adotta una regia operativa assistita.

Le API eseguono le operazioni supportate ufficialmente. Le operazioni non esposte dalle API di Systeme.io vengono completate mediante procedura browser guidata e checklist verificabile. Non si basa il primo rilascio su un'automazione browser totalmente autonoma, perche' interfaccia, autenticazione, email di conferma e provider DNS sono punti variabili.

## Fase A: costruzione e approvazione

### Prerequisiti di lavorazione

Ciak raccoglie:

- dati anagrafici, fiscali e legali del partner;
- titolare del trattamento, indirizzo e contatti;
- dominio posseduto;
- provider o registrar del dominio;
- email professionale funzionante e nome mittente;
- offerta, copy, immagini e dati checkout;
- strumenti usati nel funnel: analytics, pixel, newsletter, pagamenti e altri trattamenti;
- modalita' legal scelta: generazione Ciak oppure testi del legale.

Il dominio e la casella devono esistere prima della messa online, ma la loro configurazione non blocca la costruzione dell'anteprima.

### Esecuzione

1. Evolution crea il subaccount Systeme.io e assegna il sottodominio gratuito.
2. Importa il funnel master mediante la funzione di condivisione di Systeme.io.
3. Personalizza pagine, copy, immagini, form, tag, email, automazioni e checkout previsti.
4. Genera o importa Privacy, Cookie e Termini.
5. Pubblica l'anteprima sul sottodominio Systeme.io.
6. Ciak mostra al partner un'unica area di revisione con link alle pagine e commenti associabili alla pagina interessata.
7. Il partner richiede correzioni oppure approva esplicitamente la versione.
8. L'approvazione registra versione, data e utente e apre la fase tecnica.

Il dominio definitivo non viene modificato prima dell'approvazione.

## Fase B: dominio, email e pubblicazione

1. Ciak verifica dominio, casella professionale e disponibilita' dell'accesso DNS.
2. Evolution rileva i record DNS esistenti prima di ogni modifica, per evitare interruzioni a sito e posta gia' attivi.
3. Evolution collega il dominio al subaccount Systeme.io.
4. Configura i record web richiesti e attende la propagazione e l'emissione SSL.
5. Avvia in Systeme.io l'autenticazione del dominio email.
6. Configura i record forniti da Systeme.io, inclusi DKIM e DMARC e gli eventuali CNAME richiesti.
7. Il partner completa la conferma ricevuta nella casella professionale.
8. Evolution configura nome e indirizzo mittente e sostituisce gli URL provvisori.
9. Ciak esegue il collaudo obbligatorio.
10. Evolution pubblica; Ciak registra URL, data, versione ed esito del collaudo.

Un dominio puo' essere autenticato per l'invio email in un solo account o subaccount Systeme.io. Un conflitto deve quindi bloccare la pratica e indicare l'account da scollegare o la configurazione da correggere.

## Legal pages

### Percorso generato da Ciak

Ciak genera Privacy, Cookie e Termini usando modelli standard e i dati dichiarati dal partner.

Prima dell'approvazione mostra un disclaimer esplicito: i testi sono modelli informativi generati sulla base dei dati forniti, non costituiscono consulenza legale e non garantiscono da soli la conformita'. Il partner resta responsabile della verifica e puo' rivolgersi a un professionista.

Ogni documento ha versione e data. Una modifica ai dati sorgente o una rigenerazione invalida l'approvazione precedente.

### Percorso con legale del partner

Il partner carica o incolla i testi definitivi. Ciak controlla presenza e pubblicabilita', ma Evolution non ne modifica il contenuto. Versione, autore dichiarato e data vengono registrati.

## Modello di stato

La pratica `systeme_activation` usa questi stati principali:

1. `missing_data` - dati mancanti;
2. `ready_to_build` - pronto per la costruzione;
3. `subaccount_created` - subaccount creato;
4. `funnel_building` - funnel in lavorazione;
5. `preview_ready` - anteprima pronta;
6. `changes_requested` - modifiche richieste;
7. `funnel_approved` - funnel approvato;
8. `waiting_dns_access` - in attesa accesso DNS;
9. `domain_configuring` - dominio in configurazione;
10. `waiting_email_confirmation` - in attesa conferma email;
11. `qa` - collaudo;
12. `live` - online;
13. `blocked` - bloccato.

Ogni pratica espone sempre:

- stato attuale;
- percentuale di avanzamento derivata dai controlli, non inserita manualmente;
- responsabile della prossima azione: partner, Evolution o sistema;
- prossima azione;
- ultima attivita';
- scadenza o sollecito, se applicabile;
- eventuale codice blocco e spiegazione operativa.

## Dati persistiti

Ciak conserva almeno:

- `partner_id`;
- ID, nome e URL operativo del subaccount Systeme.io;
- sottodominio provvisorio;
- dominio definitivo e registrar;
- email professionale e nome mittente;
- stato verifica casella e autenticazione dominio;
- dati legali e modalita' legal scelta;
- documenti, versioni e approvazioni;
- ID e URL delle pagine funnel;
- record DNS richiesti, valori attesi, ultimo controllo e stato;
- versione funnel approvata;
- date di approvazione e pubblicazione;
- checklist ed esito del collaudo;
- storico transizioni, note e blocchi.

Ciak non conserva password in chiaro. Si preferiscono inviti, accessi delegati o credenziali temporanee gestite fuori dai documenti applicativi.

## Blocchi riconosciuti

Il sistema deve distinguere almeno:

- dominio non posseduto o non raggiungibile;
- dominio gia' collegato a un altro account;
- dominio email gia' autenticato altrove;
- accesso DNS mancante;
- record CNAME, DKIM o DMARC mancante, errato o non propagato;
- conflitto con record di sito o posta esistenti;
- SSL non ancora valido;
- casella professionale inesistente;
- conferma mittente non completata;
- legal page mancante o approvazione invalidata;
- URL essenziale ancora collegato al sottodominio provvisorio;
- form che non registra il contatto;
- automazione o email di prova non ricevuta;
- checkout o redirect non funzionante.

Ogni blocco indica causa, responsabile, azione richiesta e ultimo controllo. La propagazione DNS in corso e' uno stato di attesa con retry, non un errore definitivo.

## Collaudo obbligatorio

Il passaggio a `live` richiede:

- HTTPS valido sul dominio definitivo;
- homepage o pagina principale raggiungibile;
- assenza di link essenziali al sottodominio provvisorio;
- navigazione desktop e mobile verificata;
- form e consensi funzionanti;
- contatto di prova creato nel subaccount corretto;
- tag e automazione previsti attivati;
- email di prova ricevuta con mittente professionale corretto;
- Privacy, Cookie e Termini raggiungibili da footer e form;
- cookie banner coerente con gli strumenti dichiarati;
- checkout, pagamento di test e redirect verificati quando presenti.

Il sistema conserva evidenza temporale dei controlli. Un operatore puo' ripetere un controllo fallito, ma non ignorare un controllo obbligatorio senza una deroga esplicita, motivata e tracciata da un amministratore.

## Interfacce Ciak

### Partner

Il partner vede una procedura semplice:

- cosa deve fornire;
- anteprima del funnel;
- richiesta modifiche o approvazione;
- eventuale conferma email da completare;
- stato della messa online;
- URL definitivo.

Non vede termini tecnici di pipeline non utili alla sua azione.

### Admin Evolution

L'admin vede una coda operativa filtrabile per stato, responsabile, scadenza e blocco. La scheda partner contiene dati, link rapidi a Systeme.io, record DNS attesi, legal pages, storico, checklist e comando di riesecuzione dei controlli.

## Notifiche e solleciti

Ciak notifica soltanto azioni concrete:

- dati mancanti;
- anteprima pronta;
- modifiche completate e nuova approvazione richiesta;
- accesso DNS richiesto;
- conferma mittente richiesta;
- blocco rilevato;
- funnel pubblicato.

I solleciti si interrompono automaticamente quando l'azione e' completata. Nessuna notifica deve chiedere al partner di eseguire configurazioni tecniche riservate a Evolution.

## Criteri di successo

- il funnel puo' essere costruito e approvato senza attendere il dominio;
- ogni pratica mostra sempre il responsabile della prossima azione;
- nessun dominio viene modificato prima dell'approvazione del funnel;
- nessuna password viene salvata in chiaro;
- nessun funnel viene marcato Live senza collaudo registrato;
- il partner interviene solo per dati, accessi, conferma email e approvazioni;
- i tempi di attesa del partner e quelli di lavorazione Evolution sono misurabili separatamente;
- il processo e' replicabile senza ricostruire una checklist diversa per ogni partner.

## Riferimenti Systeme.io verificati

- Subaccount: https://help.systeme.io/article/4243-how-to-create-a-sub-account-on-systeme-io
- Condivisione funnel: https://help.systeme.io/article/148-create-
- Autenticazione dominio email: https://help.systeme.io/article/316-how-to-authenticate-your-personal-domain-name
- Membri e limiti degli accessi: https://help.systeme.io/article/1709-invite-assistant-account

