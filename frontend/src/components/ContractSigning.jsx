import React, { useState, useRef, useEffect } from 'react';
import { FileText, Check, Pen, AlertTriangle, ArrowRight, Loader2, Send, MessageCircle, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const CONTRACT_TEXT = `Contratto di Collaborazione in Partnership per la Creazione, Promozione e Vendita di Videocorsi Digitali

TRA
Evolution PRO LLC, con sede legale in 8 The Green, Ste A, Dover, DE 19901, USA, File Number 2394173 Delaware Division of Corporations, EIN 30-1375330, in persona del legale rappresentante Claudio Bertogliatti, di seguito "Evolution PRO" o anche "Agenzia";

e

Il Partner sottoscrittore del presente contratto digitale.

ARTICOLO 1 - OGGETTO DEL CONTRATTO

1.1 Finalità della collaborazione
Il presente Contratto disciplina la collaborazione in partnership tra Evolution PRO e il Partner per la creazione, promozione e vendita di un videocorso digitale basato sulle competenze, sui contenuti e sul posizionamento del Partner. La proposta di Partnership viene formulata da Evolution PRO solo a seguito del completamento, da parte del Partner, di una preventiva Analisi Strategica a pagamento, finalizzata alla valutazione preliminare della sostenibilità, coerenza e fattibilità commerciale del progetto. Le Parti riconoscono pertanto che, alla data di sottoscrizione del presente Contratto, il progetto è già stato oggetto di valutazione preliminare positiva da parte di Evolution PRO nella suddetta fase precontrattuale. Tale valutazione positiva non costituisce garanzia di risultati economici futuri, ma esclusivamente presupposto per l'avvio del Programma Operativo oggetto del presente Contratto.

1.1-bis Fase precontrattuale di Analisi Strategica
Prima della sottoscrizione del presente Contratto, il Partner ha richiesto a Evolution PRO una prestazione autonoma di Analisi Strategica, avente natura precontrattuale e corrispettivo separato, finalizzata alla valutazione del progetto e alla verifica della sua idoneità a essere sviluppato in partnership. L'Analisi Strategica costituisce attività distinta e già eseguita rispetto alle prestazioni oggetto del presente Contratto e il relativo corrispettivo resta autonomo e non imputabile al prezzo della Partnership, salvo diverso accordo scritto.

1.1-ter Avvio operativo del progetto
L'avvio operativo del progetto è subordinato al pagamento del corrispettivo previsto all'Articolo 5, nonché alla compilazione e consegna del Documento di Posizionamento e dei materiali preliminari richiesti. Qualora tali condizioni non siano soddisfatte entro 30 giorni dalla sottoscrizione, Evolution PRO potrà inviare formale sollecito scritto concedendo un ulteriore termine di 15 giorni. Decorso inutilmente tale termine, Evolution PRO potrà sospendere l'avvio operativo del progetto o agire ai sensi delle ulteriori disposizioni contrattuali applicabili. In caso di sospensione dovuta a inerzia imputabile al Partner, l'esecuzione operativa resterà sospesa fino alla regolarizzazione, salvo diverso accordo scritto tra le Parti.

1.2 Contenuti forniti dal Partner
Il Partner si impegna a fornire ad Evolution PRO materiali originali, leciti e di propria titolarità (a titolo esemplificativo: testi, slide, immagini, loghi, tracce, format, video grezzi, audio, documenti didattici o formativi), garantendo che il loro utilizzo non violi diritti di terzi, inclusi ma non limitati a:
- diritti d'autore e diritti connessi
- marchi e segni distintivi
- diritti di immagine
- segreti commerciali o know-how protetto
Il Partner manleva e tiene indenne Evolution PRO da ogni pretesa, danno, costo, onere o sanzione che dovesse derivare da violazioni di diritti di terzi connesse ai materiali forniti, inclusi eventuali costi legali e spese processuali.

1.3 Prestazioni di Evolution PRO
Evolution PRO, nell'ambito della partnership, si impegna a fornire al Partner:
- una sessione iniziale di allineamento strategico
- consulenza strategica sul posizionamento del Corso e dell'offerta commerciale
- configurazione di n. 1 funnel base composto da pagina opt-in, pagina di vendita e checkout
- configurazione area corsi
- supporto copy per i principali asset di vendita
- servizi di editing per masterclass e lezioni videocorso
Evolution PRO potrà, a proprio ragionevole giudizio, sospendere o rinviare la pubblicazione di materiali ritenuti:
- non idonei sotto il profilo legale, etico o reputazionale
- in contrasto con norme di legge o con le policy delle piattaforme utilizzate
- tecnicamente inadeguati (bassa qualità audio/video, contenuti incompleti o difformi dal posizionamento concordato)
In tali ipotesi, Evolution PRO ne darà motivata comunicazione scritta al Partner (via e-mail o PEC), indicando:
- le ragioni della sospensione
- le modifiche suggerite
- un termine ragionevole entro cui il Partner dovrà fornire i contenuti corretti o integrare quelli esistenti
Il Partner si impegna a collaborare in buona fede per rendere i materiali conformi ai requisiti indicati da Evolution PRO.

1.4 Canali di pubblicazione e vendita - Esclusiva
Il Corso sarà pubblicato, promosso e distribuito tramite i canali digitali di Evolution PRO (piattaforme Systeme.io o equivalenti, siti web, funnel, liste e-mail) e/o di terzi espressamente autorizzati da Evolution PRO.
Per tutta la durata del presente Contratto e per i sessanta (60) giorni successivi alla sua cessazione, il Partner si impegna a non vendere, distribuire o promuovere autonomamente:
- il medesimo Corso
- Contenuti Sostanzialmente Equivalenti
Ai fini del presente Contratto, per "Contenuti Sostanzialmente Equivalenti" si intendono, esclusivamente prodotti formativi che, cumulativamente:
- abbiano medesimo target principale
- riproducano oltre il 60% della struttura didattica del Corso
- utilizzino in modo prevalente i medesimi materiali, casi studio, promesse o script sviluppati nell'ambito della Partnership
- risultino destinati a sostituire direttamente il Corso oggetto del presente Contratto
Restano espressamente esclusi dal divieto: consulenze 1:1, workshop dal vivo, webinar gratuiti, speech, contenuti editoriali e percorsi formativi diversi per struttura, finalità e promessa principale.
Qualsiasi vendita autonoma del Corso o di Contenuti Sostanzialmente Equivalenti da parte del Partner - online o offline - dovrà essere preventivamente autorizzata per iscritto da Evolution PRO (via PEC o e-mail con conferma di lettura). Tale autorizzazione non potrà essere irragionevolmente negata qualora:
- non sussista conflitto o concorrenza diretta con iniziative in corso di Evolution PRO
- non derivi un pregiudizio economico rilevante o un danno d'immagine per Evolution PRO

1.5 Gestione degli incassi e rendicontazione
Gli incassi derivanti dalla vendita del Corso saranno gestiti da Evolution PRO tramite la piattaforma Systeme.io o altra piattaforma equivalente.
Per "Importo Netto Incassato" si intende la somma:
- effettivamente accreditata sui conti di Evolution PRO
- al netto di rimborsi, storni, chargeback e commissioni dei sistemi di pagamento
I dati di vendita risultanti dai sistemi ufficiali utilizzati da Evolution PRO fanno fede salvo errore materiale, malfunzionamento tecnico documentato o prova contraria fornita dal Partner. Evolution PRO metterà a disposizione del Partner un report mensile riepilogativo contenente almeno: ordini, incassi lordi, commissioni, chargeback/rimborsi, importo netto incassato, quota spettante alle Parti.

ARTICOLO 2 - DURATA, RINNOVO, RECESSO E RISOLUZIONE

2.1 Durata del Contratto
Il presente Contratto ha durata determinata di dodici (12) mesi decorrenti dalla data di sottoscrizione da parte di entrambe le Parti. Per l'intera durata contrattuale resta valido l'accordo di Partnership disciplinato dal presente Contratto, comprensivo delle condizioni economiche di cui all'Articolo 5. La durata contrattuale non è soggetta a proroghe automatiche. Eventuali ritardi imputabili al Partner non comporteranno proroghe automatiche, salvo che il ritardo superi complessivamente 30 giorni e renda oggettivamente impossibile l'esecuzione del Programma nei tempi previsti; in tal caso le Parti si confronteranno in buona fede per un eventuale riallineamento scritto. Decorso il termine dei 12 (dodici) mesi, l'accordo di revenue share di cui all'Articolo 5 cesserà automaticamente, fatto salvo quanto maturato fino a tale data.

2.2 Natura del corrispettivo
Il corrispettivo previsto dal presente Contratto costituisce investimento una tantum per l'avvio e lo sviluppo del progetto in partnership e non configura abbonamento né canone ricorrente.

2.3 Scadenza e prosecuzione della collaborazione
Alla scadenza del periodo contrattuale di dodici (12) mesi, il Contratto cessa automaticamente senza rinnovo automatico. Eventuali ulteriori collaborazioni o nuovi progetti potranno essere concordati esclusivamente per iscritto tra le Parti, sulla base di nuove condizioni economiche e operative.

2.4 Comunicazione di rinnovo o modifica
Eventuali richieste di rinnovo, proroga o modifica delle condizioni dovranno essere inviate almeno trenta (30) giorni prima della data di scadenza del Contratto tramite mail all'indirizzo assistenza@evolution-pro.it o tramite PEC. In assenza di accordo scritto entro tale termine, il Contratto cesserà automaticamente, salvo gli obblighi già maturati.

2.5 Continuità tecnica e gestione post-contratto
Alla cessazione del Contratto, il Partner potrà mantenere online il Corso e le infrastrutture di marketing:
- sottoscrivendo autonomamente, a proprie spese, un abbonamento diretto con la piattaforma utilizzata (Systeme.io o equivalente)
- ovvero richiedendo il trasferimento del funnel, del database e delle automazioni verso altra piattaforma di propria scelta
In tali ipotesi, Evolution PRO non sarà tenuta a fornire assistenza tecnica o manutenzione inclusa nel canone, salvo la possibilità per il Partner di richiedere un preventivo separato per il servizio tecnico di migrazione dei dati. Entro 15 giorni dalla cessazione, Evolution PRO fornirà al Partner istruzioni minime per il subentro tecnico o per la prosecuzione autonoma, restando esclusa ogni attività operativa non espressamente pattuita.

2.6 Recesso unilaterale di Evolution PRO
Fermo restando quanto previsto in tema di risoluzione per inadempimento, Evolution PRO potrà recedere unilateralmente solo in presenza di sopravvenute circostanze oggettive, documentabili e non imputabili a propria scelta arbitraria, che rendano non più sostenibile la prosecuzione del progetto, quali: impossibilità tecnica sopravvenuta, rischio legale documentato, conflitto reputazionale grave e non rimediabile, cessazione del fornitore critico senza alternativa ragionevole. Il recesso non potrà essere esercitato in modo arbitrario o discriminatorio e dovrà essere motivato per iscritto. In caso di recesso di Evolution PRO non dovuto a inadempimento del Partner, quest'ultimo avrà diritto:
- alla consegna degli asset già realizzati e tecnicamente trasferibili
- al rimborso della parte di corrispettivo relativa alle attività non ancora eseguite restando fermo che il corrispettivo iniziale remunera attività già avviate, organizzazione e allocazione delle risorse, e non è soggetto a restituzione, salvo i soli casi inderogabili previsti dalla legge o grave inadempimento imputabile a Evolution PRO

2.7 Risoluzione per inadempimento (clausola risolutiva espressa)
Ciascuna Parte potrà risolvere anticipatamente il Contratto in caso di grave inadempimento dell'altra Parte, ai sensi di clausola risolutiva espressa.
Costituiscono, a titolo esemplificativo, inadempimenti gravi del Partner:
- mancato o ritardato pagamento dei corrispettivi dovuti ai sensi dell'Articolo 5, protratto oltre 15 (quindici) giorni dalla scadenza
- mancata consegna, entro i termini indicati da Evolution PRO, dei materiali minimi necessari per l'avvio del progetto (documento di posizionamento, outline del Corso, file video non editati), nonostante formale sollecito
- violazione degli obblighi di riservatezza di cui all'Articolo 6
- violazione delle clausole di cui agli Articoli 1.4, 4 e 12 in tema di esclusiva, utilizzo autonomo del Corso o Contenuti Sostanzialmente Equivalenti, tutela del brand e concorrenza sleale
- condotte lesive dell'immagine o reputazione commerciale di Evolution PRO consistenti in dichiarazioni false, diffamatorie, gravemente denigratorie o idonee a produrre un pregiudizio concreto e documentabile alla reputazione commerciale dell'altra Parte
Costituiscono, a titolo esemplificativo, inadempimenti gravi di Evolution PRO:
- omessa esecuzione delle attività minime previste nel Programma Operativo di cui all'Articolo 8, senza giustificato motivo e nonostante formale sollecito del Partner
- mancata messa online del Corso, nonostante la completa e puntuale consegna da parte del Partner dei materiali necessari e il regolare pagamento dei corrispettivi, protratta per oltre 60 (sessanta) giorni rispetto alle tempistiche ordinarie del Programma, fatta salva la prova di cause di forza maggiore o responsabilità del Partner
- violazioni accertate e gravi degli obblighi essenziali di protezione dei dati personali ai sensi dell'Articolo 10, imputabili a dolo o colpa grave
La Parte che intende avvalersi della presente clausola risolutiva espressa dovrà inviare all'altra Parte, mediante PEC, una diffida ad adempiere con termine non inferiore a 15 (quindici) giorni. Decorso inutilmente tale termine, il Contratto si intenderà risolto di diritto, fatti salvi gli obblighi economici già maturati e l'eventuale diritto al risarcimento del danno. La collaborazione attiva del Partner costituisce obbligazione essenziale ai fini della corretta esecuzione del presente Contratto.

ARTICOLO 3 - DIRITTI E OBBLIGHI DELLE PARTI

3.1 Obblighi principali del Partner
Il Partner si impegna a partecipare attivamente allo sviluppo del progetto, rispettando le tempistiche indicate da Evolution PRO. In particolare, salvo diversa pianificazione scritta concordata tra le Parti nel Programma Operativo o nei canali ufficiali di progetto, il Partner si obbliga a:
- compilare e consegnare il documento di posizionamento
- partecipare ai briefing strategici e alle sessioni di definizione del piano marketing
- fornire l'outline del Corso (argomenti, moduli, bonus)
- registrare e consegnare i file video non editati
- fornire i materiali necessari per la creazione del calendario editoriale
- collaborare alla produzione e pubblicazione dei contenuti social secondo il piano editoriale definito, restando inteso che la gestione operativa continuativa dei canali social non è inclusa nella partnership
- gestire in autonomia i contatti e i lead generati dalle campagne di marketing per le attività di vendita e relazione con i clienti, restando esclusa ogni attività di gestione tecnica delle piattaforme
- utilizzare la piattaforma fornita (Systeme.io o equivalente) con un livello base di competenze operative per consultare dati, vendite e risultati
L'assenza ingiustificata di comunicazione o operatività per oltre 30 (trenta) giorni consecutivi legittima Evolution PRO a sospendere temporaneamente le attività e, previa diffida scritta, a risolvere il Contratto per grave inadempimento.

3.2 Collaborazione e comunicazioni operative
Il Partner si impegna a:
- mantenere una comunicazione costante e tempestiva con il team Evolution PRO
- rispettare i termini di revisione dei materiali (entro 48 ore salvo diversa indicazione)
- approvare o segnalare modifiche entro i tempi stabiliti
- adottare un comportamento professionale e rispettoso verso i membri del team e i collaboratori

3.3 Ritardi o mancata collaborazione del Partner
Eventuali ritardi o omissioni da parte del Partner potranno comportare:
- sospensione temporanea delle attività operative
- posticipo proporzionale delle fasi successive del Programma
- nessuna proroga automatica del Contratto o riduzione dei corrispettivi
Evolution PRO informerà il Partner per iscritto e proporrà, ove possibile, un piano di riallineamento operativo. L'eventuale inattività del Partner superiore a 30 (trenta) giorni consecutivi potrà comportare la dichiarazione di progetto sospeso. Decorso un ulteriore termine di 15 (quindici) giorni senza ripristino operativo, il Contratto potrà essere risolto ai sensi dell'Articolo 2.7. In caso di sospensione del progetto per inattività imputabile al Partner superiore a 30 giorni consecutivi, Evolution PRO potrà dichiarare la sospensione operativa del progetto previa comunicazione scritta. Qualora l'inattività prosegua oltre ulteriori 15 giorni dalla diffida, Evolution PRO potrà risolvere il Contratto. La durata contrattuale non si prorogherà automaticamente; tuttavia, ove al momento della sospensione non siano ancora state eseguite attività essenziali per cause imputabili esclusivamente al Partner, le Parti potranno concordare un'estensione tecnica limitata e scritta.

3.4 Obblighi principali di Evolution PRO
Evolution PRO si impegna a:
- eseguire con professionalità le attività previste nel Programma Operativo (creazione funnel, editing, copywriting, supporto strategico alle attività di marketing e ADV, supporto tecnico)
- fornire al Partner accesso alla piattaforma di marketing per la consultazione delle attività, dei lead e dei risultati di vendita
- assicurare assistenza iniziale per l'apprendimento delle funzioni principali della piattaforma
- fornire supporto strategico e tecnico tramite i canali ufficiali (gruppo Telegram, e-mail dedicata assistenza@evolution-pro.it)
- avvalersi di collaboratori e fornitori esterni qualificati, restando comunque responsabile della corretta esecuzione complessiva del servizio nei confronti del Partner

3.5 Diritti comuni delle Parti
Le Parti potranno proporre modifiche, integrazioni o aggiornamenti al progetto, che saranno valutati e approvati per iscritto tramite PEC. Le Parti si impegnano a mantenere un atteggiamento trasparente e collaborativo per tutta la durata del Contratto e per i successivi sessanta (60) giorni. L'eventuale mancato adempimento del Partner agli obblighi di consegna o collaborazione non potrà essere considerato inadempimento di Evolution PRO, né giustificare richieste di rimborso o contestazioni del corrispettivo pattuito.

ARTICOLO 4 - PROPRIETÀ INTELLETTUALE

4.1 Titolarità dei diritti
Il Partner mantiene la piena titolarità dei diritti d'autore e di sfruttamento economico sui contenuti originali forniti (idee, testi, video, materiali didattici o formativi). Con la firma del presente Contratto, il Partner dichiara che tali contenuti sono di sua esclusiva proprietà e che il loro utilizzo non viola diritti di terzi.

4.2 Licenza concessa a Evolution PRO
Il Partner concede a Evolution PRO licenza d'uso temporanea, onerosa, non trasferibile e in esclusiva limitatamente al Corso oggetto della Partnership e ai canali di vendita concordati, al solo fine di consentirne:
- la produzione, pubblicazione, distribuzione e promozione del Corso attraverso canali digitali o fisici (piattaforme, siti web, social media, eventi, masterclass)
- la realizzazione delle attività di marketing, editing, funnel e copywriting previste nel Programma Operativo
La licenza è valida per la durata del presente Contratto e per i sessanta (60) giorni successivi alla sua cessazione, salvo eventuale rinnovo o proroga concordata per iscritto tramite indirizzo PEC. La licenza è non trasferibile a terzi, se non per ragioni tecniche strettamente necessarie all'erogazione dei servizi (hosting, piattaforme, fornitori).

4.3 Miglioramenti tecnici e adattamenti
Evolution PRO è autorizzata a modificare, adattare o ottimizzare i contenuti esclusivamente per migliorarne qualità visiva, accessibilità e performance commerciale, senza alterare il messaggio o la sostanza originale del Partner.

4.4 Divieto di utilizzo autonomo durante la partnership
Durante la vigenza del Contratto e nei sessanta (60) giorni successivi alla sua cessazione, il Partner si impegna a non riprodurre, distribuire, vendere o pubblicare autonomamente il medesimo Corso o Contenuti Sostanzialmente Equivalenti, senza preventiva autorizzazione scritta di Evolution PRO.

4.5 Uso promozionale e citazione del Partner
Evolution PRO potrà utilizzare estratti, immagini, clip o testimonianze del Corso e del Partner esclusivamente a fini promozionali o di portfolio aziendale, senza che ciò comporti una vendita diretta o uno sfruttamento commerciale autonomo dei contenuti. Tale utilizzo potrà proseguire anche dopo la cessazione del Contratto, nel rispetto della normativa vigente e senza pregiudicare i diritti morali o d'autore del Partner. Il Partner potrà revocare per giustificati motivi l'utilizzo di testimonianze personali o immagini che risultino lesive della propria reputazione o non più attuali, fermo restando l'uso di case study anonimizzati.

4.6 Tutela reciproca
Entrambe le Parti si impegnano a rispettare i diritti di proprietà intellettuale dell'altra e di eventuali terzi. Qualsiasi violazione comporterà la possibilità di risolvere il Contratto per giusta causa e richiedere il risarcimento dei danni subiti.

ARTICOLO 5 - CORRISPETTIVI E PAGAMENTI

5.1 Corrispettivo della partnership
Il corrispettivo per l'ingresso nella Partnership è pari a € 2.790,00 (duemilasettecentonovanta/00), iva inclusa quale investimento una tantum per l'attivazione del progetto.

5.2 Modalità di pagamento
Il pagamento avviene in un'unica soluzione alla firma del Contratto. In casi eccezionali, a discrezione di Evolution PRO e previa approvazione scritta, il pagamento potrà essere suddiviso in massimo 3 (tre) rate mensili a 30 (trenta) giorni. Tutti i pagamenti devono essere effettuati sul conto Revolut Bank UAB intestato a Evolution PRO LLC (IBAN: LT94 3250 0974 4929 5781) o tramite sistemi elettronici autorizzati (Stripe, PayPal, ecc.). I pagamenti si considerano perfezionati solo all'effettivo accredito.

5.3 Decadenza del beneficio
Il mancato pagamento anche di una sola rata oltre 10 giorni dalla scadenza, previa messa in mora scritta, comporta la decadenza dal beneficio della dilazione. In difetto, Evolution PRO potrà sospendere immediatamente l'accesso alla piattaforma e risolvere il Contratto per grave inadempimento. Il ritardo nel pagamento costituisce inadempimento essenziale ai sensi dell'Articolo 2.7.

5.4 Valore complessivo del progetto e ripartizione dell'investimento
Le Parti riconoscono che Evolution PRO sostiene, oltre al corrispettivo versato dal Partner, un ulteriore investimento organizzativo, strategico, tecnico e operativo, non quantificato come finanziamento o credito ma come apporto industriale al progetto.

5.5 Royalties a favore di Evolution PRO
A fronte dell'investimento sostenuto da Evolution PRO, il Partner riconosce a quest'ultima una royalty pari al 10% (dieci per cento) dei ricavi derivanti dalla vendita del Corso, per una durata di dodici (12) mesi dalla data di sottoscrizione del presente Contratto. La royalty del 10% è calcolata sull'Importo Netto Incassato come definito all'Articolo 1.5, ossia sull'importo effettivamente incassato da Evolution PRO per le vendite del Corso, al netto di rimborsi, storni, chargeback e commissioni dei sistemi di pagamento. Decorso il termine di dodici (12) mesi dalla sottoscrizione del presente Contratto, nessuna ulteriore royalty sarà dovuta, salvo diverso accordo scritto tra le Parti.

5.6 Durata e Applicazione della Revenue Share
La percentuale del 10% di cui all'Articolo 5 si applica esclusivamente alle vendite concluse durante il periodo di validità del presente Contratto. Per "vendite concluse" si intendono gli ordini o contratti formalizzati con accettazione da parte del cliente finale entro la scadenza dei 12 mesi, indipendentemente dalla data effettiva di incasso. Le vendite concluse successivamente alla scadenza del presente Contratto non saranno soggette ad alcuna percentuale a favore di Evolution PRO, salvo diverso accordo scritto tra le Parti.

5.7 Natura non rimborsabile del corrispettivo
Il corrispettivo iniziale remunera l'attivazione del progetto, la fase di impostazione strategica, l'allocazione delle risorse operative e l'avvio delle attività previste dalla Partnership e, in quanto tale, resta acquisito da Evolution PRO una volta avviata l'esecuzione del rapporto, fatti salvi i soli casi inderogabili previsti dalla legge o l'accertato grave inadempimento di Evolution PRO.

5.8 Licenza piattaforma
Alla cessazione del Contratto, il mantenimento online del Corso e delle automazioni richiede la sottoscrizione di una licenza diretta con la piattaforma Systeme.io (o equivalente). In assenza di rinnovo o sottoscrizione di tale licenza, Evolution PRO non fornirà supporto tecnico, salvo accordo separato. Le attività svolte dal Partner in autonomia sulla piattaforma non generano alcun diritto a compensi, commissioni o assistenza da parte di Evolution PRO.

5.9 Campagne pubblicitarie (ADV)
Le campagne pubblicitarie a pagamento (ADV) non sono obbligatorie, ma fortemente consigliate nella fase post-lancio del Corso, al fine di incrementarne la visibilità e le potenzialità di vendita. Eventuali attività ADV saranno valutate congiuntamente dalle Parti in base alle caratteristiche del progetto e al budget messo a disposizione dal Partner. I costi pubblicitari sono interamente a carico del Partner, che provvederà a saldarli direttamente alle piattaforme pubblicitarie tramite collegamento del proprio metodo di pagamento. Evolution PRO fornisce supporto strategico alle attività ADV senza assunzione di obblighi operativi continuativi né garanzia di risultati economici. L'eventuale mancata attivazione di ADV da parte del Partner non costituisce inadempimento, salvo che le Parti abbiano concordato per iscritto un piano di lancio che la preveda come elemento essenziale.

ARTICOLO 6 - CLAUSOLA DI RISERVATEZZA

6.1 Oggetto della riservatezza
Ciascuna Parte si impegna a mantenere strettamente riservate tutte le informazioni tecniche, strategiche, commerciali, operative o finanziarie apprese nel corso della collaborazione, comprese a titolo esemplificativo e non esaustivo:
- strategie di marketing, funnel e automazioni
- piani editoriali, campagne ADV e sistemi di vendita
- dati di performance, report e statistiche
- informazioni relative a clienti, lead, contatti o fornitori
- contenuti video, materiali didattici e testi promozionali non ancora pubblicati
- know-how, modelli organizzativi, procedure, documentazione interna e listini
Tali informazioni sono considerate confidenziali e non potranno essere comunicate, copiate, divulgate o utilizzate per fini diversi da quelli strettamente necessari all'esecuzione del presente Contratto.

6.2 Durata dell'obbligo
L'obbligo di riservatezza decorre dalla data di sottoscrizione del Contratto e rimane valido:
- per tutta la durata della collaborazione
- per un periodo di 90 (novanta) giorni successivi alla sua cessazione, indipendentemente dalla causa di conclusione

6.3 Eccezioni
Non sono soggette all'obbligo di riservatezza le informazioni che:
- erano già di pubblico dominio al momento della comunicazione
- siano divenute di pubblico dominio successivamente, senza violazione del presente Contratto
- siano state legittimamente acquisite da terzi non vincolati da obblighi di riservatezza
- debbano essere comunicate in forza di ordini o richieste provenienti da autorità competenti, nel rispetto della legge

6.4 Responsabilità e controllo
Ciascuna Parte garantisce che i propri dipendenti, collaboratori, consulenti o subappaltatori rispettino il medesimo obbligo di riservatezza, rispondendo direttamente di eventuali violazioni. Evolution PRO adotterà misure organizzative e tecniche idonee alla tutela dei dati e delle informazioni sensibili del Partner.

6.5 Violazione dell'obbligo - Penale
La violazione grave e imputabile dell'obbligo di riservatezza comporterà una penale di € 2.000 per ciascuna violazione autonoma, fatto salvo il maggior danno. Non costituiscono violazione autonoma pluralità di atti meramente esecutivi del medesimo fatto.

6.6 Riservatezza precontrattuale
L'obbligo di riservatezza si estende anche alle informazioni condivise in fase precontrattuale (es. trattative, preventivi, strategie di posizionamento), anche nel caso in cui il Contratto non venga successivamente eseguito o rinnovato.

ARTICOLO 7 - RECESSO E RISOLUZIONE ANTICIPATA

7.1 Esclusione del recesso ordinario
Il presente Contratto non prevede diritto di recesso ordinario da parte delle Parti, salvo quanto previsto dall'Articolo 2.6 a favore di Evolution PRO. Il rapporto contrattuale ha durata determinata di dodici (12) mesi dalla sottoscrizione e potrà cessare anticipatamente esclusivamente nei casi di risoluzione per grave inadempimento, ai sensi del presente articolo e dell'Articolo 2.7. Salvo dolo, colpa grave, violazione di obblighi essenziali o responsabilità inderogabili di legge, l'eventuale responsabilità risarcitoria complessiva di Evolution PRO non potrà eccedere l'importo dei corrispettivi effettivamente versati dal Partner.

7.2 Risoluzione per inadempimento di Evolution PRO
Il Partner potrà richiedere la risoluzione anticipata del Contratto esclusivamente in caso di grave e comprovato inadempimento contrattuale di Evolution PRO, previa diffida ad adempiere inviata tramite PEC e decorso infruttuoso di un termine di quindici (15) giorni. In tale ipotesi, il Partner potrà richiedere il rimborso dell'eventuale parte di importo versato non proporzionata alle attività già eseguite e ai costi sostenuti da Evolution PRO, secondo quanto previsto dalla legge e nel rispetto del principio di proporzionalità. Ai fini della proporzionalità del rimborso si terrà conto delle attività effettivamente eseguite, del loro stato di completamento, dei costi già sostenuti e dell'utilizzabilità degli asset da parte del Partner.

7.3 Risoluzione per inadempimento del Partner
In caso di grave inadempimento del Partner, Evolution PRO avrà diritto a trattenere il corrispettivo versato in relazione alle attività già eseguite e ai costi sostenuti, fatto salvo il diritto al risarcimento dell'eventuale maggior danno.

7.4 Effetti della risoluzione per inadempimento del Partner
In caso di risoluzione anticipata del Contratto per grave inadempimento del Partner, Evolution PRO avrà facoltà di completare le attività operative già avviate e di gestire la chiusura tecnica del progetto, senza obbligo di ulteriore sviluppo o investimento operativo. In tale ipotesi, il corrispettivo versato resterà acquisito da Evolution PRO nei limiti delle attività già eseguite e dei costi sostenuti, fatto salvo il diritto al risarcimento dell'eventuale maggior danno.

7.5 Risoluzione per cause non imputabili alle Parti
Qualora la prosecuzione del Contratto divenga oggettivamente impossibile per cause non imputabili alle Parti, ovvero per eventi straordinari che rendano irrealizzabile l'esecuzione del progetto, ciascuna Parte potrà risolvere il Contratto previa comunicazione scritta. In caso di impossibilità sopravvenuta non imputabile alle Parti, resteranno fermi gli effetti economici maturati in relazione alle attività già eseguite; per le attività non eseguite le Parti procederanno a una regolazione economica proporzionata alle attività effettivamente eseguite e ai costi sostenuti, da documentarsi su richiesta.

7.6 Limitazioni di responsabilità
Evolution PRO non garantisce risultati economici specifici in termini di vendite, conversioni o profitti, poiché tali variabili dipendono da fattori esterni (mercato, budget, contenuti, posizionamento del Partner, stagionalità). L'impegno contrattuale di Evolution PRO consiste nell'erogare i servizi con diligenza professionale, conformemente al Programma Operativo. In nessun caso Evolution PRO potrà essere ritenuta responsabile per danni indiretti o consequenziali (quali mancato guadagno o perdita di chance), salvo il caso di dolo o colpa grave. Evolution PRO non risponde, in particolare, di:
- malfunzionamenti imputabili a piattaforme esterne, servizi di terzi o forza maggiore
- risultati economici inferiori alle aspettative del Partner
- perdite o disservizi dovuti a inadempimenti del Partner nelle consegne o nelle approvazioni dei materiali
Il Partner riconosce che il successo economico del progetto dipende in misura significativa dalla qualità dei contenuti forniti, dal posizionamento personale e dall'impegno commerciale profuso. Il mancato raggiungimento di obiettivi di vendita non costituisce inadempimento contrattuale.

7.7 Comunicazioni formali
Ogni risoluzione del Contratto dovrà essere formalizzata per iscritto, a pena di inefficacia, secondo le modalità previste all'Articolo 13.

ARTICOLO 8 - SERVIZI FORNITI DA EVOLUTION PRO E OBBLIGHI DEL PARTNER

8.1 Servizi forniti da Evolution PRO
Nell'ambito della partnership, Evolution PRO fornisce al Partner servizi strategici, tecnici e operativi finalizzati alla creazione, pubblicazione, lancio e sviluppo del Corso, in particolare:
- analisi strategica iniziale e definizione del posizionamento del progetto
- supporto alla strutturazione dei contenuti formativi e dell'offerta commerciale
- configurazione tecnica della piattaforma di marketing e vendita (Systeme.io o equivalente), inclusi area corsi, funnel e automazioni
- realizzazione e ottimizzazione degli asset digitali necessari alla vendita del Corso (pagine, copy, materiali di supporto)
- definizione di un piano editoriale mensile dedicato alla fase di lancio del Corso, replicabile dal Partner nella fase post-lancio
- accesso a un gruppo Telegram dedicato e a un videocorso formativo riservato, comprensivo di risorse supplementari scaricabili
Il supporto successivo alla fase di lancio è da intendersi esclusivamente di natura strategica e comprende l'analisi dei risultati e dei principali KPI, con l'obiettivo di ottimizzare e scalare il progetto entro la durata contrattuale. La corretta esecuzione del progetto presuppone la collaborazione attiva del Partner secondo quanto previsto dal Programma Operativo e dalle richieste scritte inviate nei canali ufficiali. L'assenza di tale collaborazione esclude qualsiasi responsabilità per eventuali ritardi o risultati inferiori alle aspettative.

8.2 Obblighi del Partner
Il Partner si impegna a collaborare attivamente e con continuità allo sviluppo del progetto, fornendo con puntualità contenuti, informazioni e materiali richiesti secondo le tempistiche operative concordate. Il mancato rispetto reiterato delle tempistiche o la mancata fornitura dei materiali necessari potrà determinare la sospensione temporanea delle attività operative da parte di Evolution PRO, senza che ciò comporti responsabilità o obblighi risarcitori a carico della stessa. Il Partner è pienamente responsabile della qualità, liceità e veridicità dei contenuti forniti, nonché della gestione commerciale dei contatti e dei clienti generati, salvo diverso accordo scritto tra le Parti. Il progetto si intende attivo esclusivamente in presenza di collaborazione effettiva del Partner; eventuali ritardi imputabili al Partner non potranno essere considerati inadempienze da parte di Evolution PRO. Il Partner si impegna a garantire un livello minimo di attivazione commerciale durante la fase di lancio e post-lancio del Corso, comprendente:
- pubblicazione dei contenuti previsti dal piano editoriale
- gestione attiva e tempestiva dei lead generati
- disponibilità a confrontarsi in buona fede con Evolution PRO sull'opportunità di eventuali investimenti pubblicitari, senza obbligo di attivazione salvo diverso accordo scritto
L'assenza di attivazione commerciale esclude qualsiasi responsabilità di Evolution PRO in merito ai risultati economici del progetto.

8.3 Esclusioni
Sono espressamente esclusi dai servizi inclusi nel presente Contratto, salvo accordo scritto separato:
- la gestione operativa continuativa dei canali social
- la gestione diretta delle campagne pubblicitarie a pagamento
- la produzione di contenuti aggiuntivi non previsti
- qualsiasi attività non espressamente indicata al presente articolo

8.4 Aggiornamenti e migliorie del Programma Operativo
Il Metodo E.V.O. – Programma in 8 settimane costituisce parte integrante e sostanziale del presente Contratto e rappresenta la guida ufficiale per la corretta esecuzione delle fasi di lavoro. Il Partner si impegna a rispettare le tempistiche e le attività previste per ciascuna fase, collaborando in modo attivo e continuativo. Eventuali ritardi imputabili al Partner potranno comportare la sospensione temporanea delle attività operative fino al riallineamento delle condizioni necessarie allo sviluppo del progetto. Qualora il Partner rimanga inattivo per un periodo superiore a 60 giorni consecutivi senza giustificato motivo, Evolution PRO potrà considerare il progetto sospeso, senza obbligo di proroghe automatiche o rimborsi delle somme già corrisposte. Evolution PRO potrà apportare aggiornamenti tecnici, organizzativi o didattici al Programma Operativo purché non comportino una riduzione sostanziale delle attività minime previste né alterino in modo significativo l'equilibrio economico del Contratto.

8.5 Servizi extra non inclusi nella partnership
I servizi inclusi nella partnership sono esclusivamente quelli indicati nel presente Articolo 8.1 e nel Programma Operativo di riferimento. Durante la durata contrattuale, il Partner potrà richiedere a Evolution PRO l'attivazione di servizi extra, a titolo esemplificativo e non esaustivo:
- sessioni strategiche individuali aggiuntive
- servizi di intelligenza artificiale personalizzati
- gestione operativa dei canali social
- gestione operativa delle automazioni sulla piattaforma
- realizzazione o ottimizzazione di siti web, funnel o asset digitali aggiuntivi
- servizi di advertising operativo e gestione campagne a pagamento
Tali servizi saranno quantificati separatamente, su richiesta del Partner, e regolati da accordo scritto autonomo, senza modifica delle condizioni economiche, della durata o delle obbligazioni previste dal presente Contratto. L'eventuale mancata attivazione di servizi extra non costituisce inadempimento di Evolution PRO né incide sull'esecuzione della partnership.

8.6 Clausola di buona fede e cooperazione
Le Parti si impegnano a operare in spirito di collaborazione e trasparenza, mantenendo un dialogo costante e costruttivo. Ciascuna Parte adotterà la massima diligenza professionale nel rispettare le proprie scadenze e nel non ostacolare l'operato dell'altra.

ARTICOLO 9 - CLAUSOLA FISCALE

9.1 Dati societari di Evolution PRO
Evolution PRO LLC è una società estera regolarmente costituita nello Stato del Delaware (U.S.A.) in data 22/09/2023. Dati ufficiali:
- Ragione sociale: Evolution PRO LLC
- Sede legale: 8 The Green, Ste A, Dover, DE 19901, Stati Uniti
- File Number: 2394173 (Delaware Division of Corporations)
- EIN (Employer Identification Number): 30-1375330
- IBAN: LT94 3250 0974 4929 5781 (Revolut Bank UAB)
- E-mail: assistenza@evolution-pro.it
Le attività operative sono svolte in Italia (Torino) in modalità da remoto, attraverso le piattaforme di marketing integrate con i sistemi Go High Level (USA) e Systeme (Francia).

9.2 Regime IVA
Evolution PRO LLC non è soggetta a IVA in Italia e non possiede Partita IVA italiana. Le fatture emesse da Evolution PRO LLC sono quindi esenti da IVA in Italia e soggette al meccanismo di inversione contabile (reverse charge), ove applicabile secondo la normativa vigente.

9.3 Obblighi fiscali del Partner
Il Partner, in qualità di soggetto passivo d'imposta, si impegna a:
- integrare la fattura ricevuta con l'aliquota IVA prevista, se e in quanto dovuta
- registrare la fattura nei registri IVA acquisti e vendite, secondo la normativa del proprio Stato di stabilimento
- rispettare la normativa fiscale vigente in materia di registrazioni contabili e dichiarazioni fiscali
- fornire, se richiesto per esigenze di compliance documentale, le sole informazioni strettamente necessarie a comprovare il corretto inquadramento fiscale dell'operazione, nel rispetto della normativa applicabile

9.4 Responsabilità fiscale
Il Partner è l'unico responsabile della corretta gestione fiscale e previdenziale dei compensi percepiti, nonché del versamento di imposte, contributi e adempimenti connessi alla propria attività professionale. Evolution PRO resta invece responsabile della regolarità delle proprie fatture e delle operazioni di sua competenza, impegnandosi a emettere documentazione conforme alla normativa applicabile. Le Parti riconoscono espressamente che:
- il presente Contratto non costituisce rapporto di lavoro subordinato, di agenzia, di franchising o di associazione in partecipazione
- ciascuna Parte opera in piena autonomia giuridica e fiscale
- eventuali contestazioni fiscali dovranno essere gestite individualmente dalla Parte a cui si riferiscono, restando esclusa la corresponsabilità salvo dolo o colpa grave

ARTICOLO 10 - DATA PROCESSING AGREEMENT (DPA)

10.1 Parti e oggetto
Ai fini della protezione dei dati personali trattati nell'ambito del presente Contratto:
- il Partner agisce in qualità di Titolare del trattamento
- Evolution PRO LLC agisce in qualità di Responsabile del trattamento
Con il presente accordo, il Titolare affida al Responsabile i trattamenti di dati personali necessari all'erogazione dei servizi di marketing, automazione, vendita e gestione della piattaforma previsti dal Contratto di partnership. Il DPA entra in vigore alla sottoscrizione del Contratto e cessa con la cancellazione o restituzione dei dati trattati, salvo obblighi legali di conservazione.

10.2 Finalità del trattamento, tipologie di dati e categorie di interessati
- Finalità: gestione del Corso, attività di marketing, analisi campagne, amministrazione della piattaforma e assistenza clienti
- Tipologie di dati trattati: dati identificativi (nome, cognome, e-mail, telefono), dati fiscali e di pagamento, log di accesso, dati di navigazione, statistiche e preferenze utente
- Categorie di interessati: clienti e potenziali clienti del Corso (lead), utenti registrati, il Partner stesso e suoi collaboratori

10.3 Obblighi del Responsabile del trattamento (Evolution PRO)
Evolution PRO si impegna a:
- trattare i dati personali solo su istruzioni documentate del Partner
- garantire che le persone autorizzate al trattamento siano vincolate da obbligo di riservatezza
- adottare misure tecniche e organizzative adeguate (cifratura, autenticazione a due fattori, backup, logging e monitoraggio accessi)
- assistere il Partner nell'esercizio dei diritti degli interessati
- notificare eventuali violazioni di dati personali ("data breach") entro 48 ore dalla scoperta, fornendo tutte le informazioni necessarie, nei limiti di quanto richiesto dalla normativa applicabile
- consentire al Partner verifiche documentali e audit tecnici, previo preavviso di regola di almeno dieci (10) giorni lavorativi, riducibile in casi di urgenza motivata da potenziale grave violazione
- cancellare o restituire tutti i dati personali al termine del Contratto, salvo obblighi legali di conservazione

10.4 Sub-responsabili e fornitori tecnologici
Evolution PRO potrà avvalersi di sub-responsabili esterni (es. hosting, servizi cloud, piattaforme di marketing), che garantiscono adeguati livelli di protezione dei dati. I principali sub-responsabili e fornitori tecnologici verranno indicati in un elenco aggiornato reso disponibile al Partner, che potrà opporsi per iscritto, per motivi legittimi, alla nomina di specifici sub-responsabili. L'elenco dei sub-responsabili sarà disponibile in forma aggiornata su richiesta del Partner o mediante link/documento allegato.

10.5 Trasferimenti di dati extra-SEE
Eventuali trasferimenti di dati personali verso Paesi extra UE/SEE avverranno nel pieno rispetto della normativa applicabile, utilizzando garanzie adeguate (quali decisioni di adeguatezza, clausole contrattuali standard o altri strumenti equivalenti).

10.6 Responsabilità delle Parti
Ciascuna Parte risponde dei danni derivanti da trattamenti non conformi alle istruzioni concordate o alla normativa applicabile in materia di protezione dei dati personali. La responsabilità complessiva di Evolution PRO, in relazione alle attività di trattamento svolte in qualità di Responsabile, non potrà eccedere, salvo dolo, colpa grave o violazione di obblighi inderogabili di legge, i corrispettivi versati dal Partner nei 12 mesi precedenti l'evento dannoso.

ARTICOLO 11 - CLAUSOLA DI SALVAGUARDIA E PREVALENZA DELLE CONDIZIONI ECONOMICHE

11.1 Intero accordo tra le Parti
Il presente Contratto rappresenta l'unico, completo e integrale accordo tra le Parti in relazione all'oggetto della collaborazione e sostituisce ogni precedente intesa, proposta o comunicazione scritta o verbale intercorsa tra le stesse in merito ai servizi forniti da Evolution PRO.

11.2 Prevalenza delle condizioni economiche
Le condizioni economiche, la durata e le modalità di pagamento previste nel presente Contratto costituiscono elementi essenziali dell'accordo. Eventuali modifiche o aggiornamenti potranno essere oggetto di nuova negoziazione scritta, nel rispetto del principio di buona fede, equità e trasparenza contrattuale.

11.3 Validità e modifiche
Qualsiasi modifica, integrazione o deroga al presente Contratto dovrà essere concordata per iscritto e sottoscritta da entrambe le Parti. In assenza di tale forma, le modifiche non avranno efficacia né potranno essere invocate da una sola Parte.

11.4 Nullità parziale e sostituzione automatica
Qualora una o più disposizioni del presente Contratto siano dichiarate nulle, illegittime o inefficaci da un'autorità competente, tale invalidità non comporterà la nullità dell'intero Contratto, che continuerà a produrre effetti per le restanti clausole. Le Parti si impegnano, in tal caso, a sostituire la clausola nulla con una nuova pattuizione che rispetti il più possibile la volontà originaria e mantenga l'equilibrio del rapporto.

11.5 Versioni e lingua prevalente
In caso di differenze o contrasto tra più versioni del Contratto (cartacea, digitale o tradotta in altra lingua), fa fede unicamente la versione in lingua italiana, sottoscritta digitalmente o con firma autografa da entrambe le Parti.

11.6 Interpretazione e buona fede
Le clausole del presente Contratto devono essere interpretate secondo i principi di correttezza, buona fede e funzione economico-sociale dell'accordo. Eventuali ambiguità saranno risolte privilegiando un'interpretazione che mantenga l'equilibrio delle prestazioni reciproche.

ARTICOLO 12 - CLAUSOLA DI TUTELA DEL BRAND E RISERVATEZZA POST-CONTRATTUALE

12.1 Proprietà del marchio e degli elementi distintivi
Il Partner riconosce che il nome commerciale "Evolution PRO", il logo, i domini internet, i format grafici, i modelli di funnel, le metodologie operative, i testi e le procedure di marketing utilizzate da Evolution PRO costituiscono proprietà esclusiva di quest'ultima e sono tutelati dalle leggi in materia di diritto d'autore, marchi e segreti commerciali. Il Partner non potrà utilizzare, copiare, riprodurre o divulgare tali elementi, in tutto o in parte, senza previa autorizzazione scritta di Evolution PRO.

12.2 Divieti e obblighi alla cessazione del Contratto
Alla cessazione del Contratto, per qualsiasi causa, il Partner si impegna a:
- non presentarsi o qualificarsi pubblicamente come collaboratore, affiliato, partner o rappresentante di Evolution PRO
- rimuovere da siti web, social, piattaforme e materiali promozionali ogni riferimento al marchio, logo o contenuti riconducibili a Evolution PRO, salvo i meri riferimenti curricolari all'esperienza passata
- non utilizzare o diffondere per finalità commerciali, formative o promozionali il marchio, il nome commerciale, i format proprietari e gli elementi distintivi riconducibili a Evolution PRO, salvo accordo scritto con l'Agenzia
- non riutilizzare documenti, template, script, funnel, naming, elementi distintivi, sequenze o materiali proprietari di Evolution PRO in modo sostanzialmente identico o riconducibile

12.3 Durata della tutela post-contrattuale
Gli obblighi previsti dal presente articolo resteranno validi per un periodo di novanta (90) giorni successivi alla cessazione del Contratto, salvo rinnovo o proroga della collaborazione. Decorso tale termine, il Partner potrà riutilizzare materiali e strategie esclusivamente se rielaborati autonomamente e privi di riferimenti identificabili a Evolution PRO.

12.4 Divieto di concorrenza sleale
È vietato al Partner porre in essere condotte concretamente idonee a generare confusione sul mercato circa l'origine imprenditoriale dei servizi o a sfruttare parassitariamente, in modo riconoscibile, gli asset proprietari di Evolution PRO. Ogni violazione sarà considerata atto di concorrenza sleale ai sensi della normativa applicabile. Resta in ogni caso esclusa ogni limitazione all'utilizzo delle competenze professionali generali acquisite dal Partner, purché non venga riprodotto o imitato in modo riconoscibile il modello, il format o l'identità operativa di Evolution PRO.

12.5 Penale e risarcimento
In caso di violazione grave e documentata del presente articolo, il Partner sarà tenuto a corrispondere una penale di € 2.500 (duemilacinquecento/00), per ciascuna violazione autonoma, fatto salvo il maggior danno. Resta ferma la facoltà del giudice di ridurre la penale ove ne accerti la manifesta eccessività, nei limiti consentiti dalla legge.

12.6 Clausola di equilibrio e proporzionalità
Le Parti riconoscono che le presenti restrizioni sono necessarie e proporzionate per la tutela del know-how, della reputazione e degli investimenti di Evolution PRO, e che non limitano indebitamente la libertà professionale del Partner, il quale potrà comunque utilizzare le proprie competenze e conoscenze acquisite per progetti differenti e autonomi, purché non concorrenti.

ARTICOLO 13 - COMUNICAZIONI E NOTIFICHE

13.1 Mezzi di comunicazione ammessi
Tutte le comunicazioni, notifiche, diffide o richieste relative all'interpretazione, esecuzione o cessazione del presente Contratto dovranno essere effettuate per iscritto e saranno considerate valide solo se inviate tramite uno dei seguenti mezzi:
- Posta Elettronica Certificata (PEC)
- Raccomandata con Avviso di Ricevimento (A/R)
- piattaforma di firma digitale o gestionale condiviso, purché il Partner vi abbia accesso e le comunicazioni risultino tracciabili e scaricabili
- e-mail ordinaria con conferma di lettura, solo per comunicazioni non formali e prive di valore legale

13.2 Obbligo di PEC per le Parti
Le Parti si impegnano a comunicare reciprocamente un indirizzo PEC alla sottoscrizione del presente Contratto. Tale indirizzo sarà utilizzato come canale ufficiale per tutte le comunicazioni formali, comprese diffide e risoluzioni.

13.3 Validità delle comunicazioni
Le comunicazioni inviate tramite PEC o Raccomandata A/R si considerano ricevute alla data di consegna risultante dalla ricevuta o conferma di consegna. Le comunicazioni inviate tramite e-mail ordinaria si considerano ricevute solo con conferma scritta di lettura o riscontro da parte del destinatario.

13.4 Aggiornamento dei recapiti
Ciascuna Parte si impegna a comunicare entro quindici (15) giorni lavorativi ogni variazione dei propri indirizzi PEC, e-mail o domicilio fisico. In assenza di tale aggiornamento, le notifiche effettuate agli indirizzi originari si considereranno validamente eseguite a tutti gli effetti di legge.

ARTICOLO 14 - FORO COMPETENTE E LEGGE APPLICABILE

14.1 Legge applicabile
Il presente Contratto è regolato, interpretato ed eseguito in conformità alla legge italiana, anche qualora una delle Parti abbia sede legale o residenza al di fuori del territorio nazionale.

14.2 Tentativo di composizione bonaria
Prima di intraprendere qualsiasi azione giudiziaria, le Parti si impegnano a tentare una composizione amichevole della controversia, mediante scambio di comunicazioni scritte o convocazione di un incontro (anche da remoto) entro quindici (15) giorni dalla segnalazione del problema.

14.3 Foro competente esclusivo
Per ogni controversia relativa all'interpretazione, validità, esecuzione o risoluzione del presente Contratto, le Parti convengono espressamente che sarà competente in via esclusiva il Foro di Torino (Italia), con esclusione di qualsiasi altro foro alternativo, concorrente o estero.

14.4 Validità delle altre disposizioni
L'eventuale nullità o inefficacia di singole clausole non pregiudica la validità e l'efficacia delle restanti previsioni del Contratto, che continueranno a produrre i loro effetti.

ARTICOLO 15 - CLAUSOLA FINALE

15.1 Entrata in vigore e durata effettiva
Il presente Contratto entra in vigore alla data della sua sottoscrizione da parte di entrambe le Parti e produce effetti immediati. La durata, le condizioni economiche e gli obblighi reciproci decorrono dalla stessa data, salvo diversa indicazione scritta concordata tra le Parti.

15.2 Modalità di sottoscrizione
Il Contratto può essere sottoscritto:
- in forma elettronica, mediante firma digitale qualificata, firma elettronica avanzata o tramite piattaforme di firma elettronica riconosciute
- in forma autografa, su documento cartaceo in originale
Entrambe le modalità producono pieno valore legale e probatorio secondo la normativa applicabile.

15.3 Copia autentica e valore probatorio
In caso di sottoscrizione digitale, il documento in formato PDF firmato elettronicamente costituirà l'unica copia autentica avente valore legale e probatorio. Eventuali copie stampate o riproduzioni cartacee avranno valore di copia di cortesia e non di originale.

15.4 Dichiarazione di lettura e approvazione consapevole
Il Partner dichiara di aver letto attentamente e compreso integralmente tutte le clausole contrattuali, confermando di averne ricevuto copia. Dichiara inoltre di essere stato informato in modo chiaro circa:
- la durata minima vincolante del rapporto
- le modalità di pagamento e le ipotesi in cui non è previsto rimborso
- le limitazioni di responsabilità
- la tutela del marchio e la riservatezza post-contrattuale
- la scelta del foro competente
Il Partner dichiara di disporre del tempo, delle risorse organizzative e delle competenze digitali minime necessarie per partecipare attivamente al Programma Operativo. Eventuali difficoltà personali, organizzative o professionali del Partner non costituiranno di per sé motivo automatico di sospensione, proroga o revisione economica, salvo diverso accordo scritto tra le Parti o quanto previsto dalla legge.

ARTICOLO 16 - CLAUSOLE VESSATORIE - APPROVAZIONE SPECIFICA (artt. 1341 e 1342 c.c.)

Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile, il Partner dichiara di aver letto attentamente e di approvare specificamente le seguenti clausole:
- art. 1.4 esclusiva
- art. 2.6 recesso Evolution PRO
- art. 2.7 clausola risolutiva espressa
- art. 3 sospensione/risoluzione per inattività
- art. 5 decadenza dilazione e disciplina rimborsi
- art. 6.5 penale riservatezza
- art. 7 limitazioni di responsabilità
- art. 12 tutela brand e penale
- art. 14.3 foro esclusivo

ARTICOLO 17 – ACCETTAZIONE CONSAPEVOLE DEL MODELLO

Il Partner dichiara di aver compreso e accettato che:
- la Partnership ha natura di collaborazione strategica e operativa e non costituisce prestazione di risultato
- il successo economico del progetto dipende da molteplici fattori non controllabili da Evolution PRO
- il corrispettivo iniziale remunera l'accesso al sistema, al know-how e alle attività operative, indipendentemente dai risultati economici
- eventuali contestazioni relative a performance, vendite o risultati non costituiscono inadempimento contrattuale`;

// Clausole vessatorie
const CLAUSOLE_VESSATORIE = [
  { id: 'art_1_4', label: 'Art. 1.4 - Esclusiva' },
  { id: 'art_2_6', label: 'Art. 2.6 - Recesso Evolution PRO' },
  { id: 'art_2_7', label: 'Art. 2.7 - Clausola risolutiva espressa' },
  { id: 'art_3', label: 'Art. 3 - Sospensione/risoluzione per inattività' },
  { id: 'art_5', label: 'Art. 5 - Decadenza dilazione e disciplina rimborsi' },
  { id: 'art_6_5', label: 'Art. 6.5 - Penale riservatezza' },
  { id: 'art_7', label: 'Art. 7 - Limitazioni di responsabilità' },
  { id: 'art_12', label: 'Art. 12 - Tutela brand e penale' },
  { id: 'art_14_3', label: 'Art. 14.3 - Foro esclusivo' },
];

// Quick suggestion chips for chatbot
const QUICK_SUGGESTIONS = [
  "Cosa significa l'esclusiva?",
  "Posso recedere?",
  "Come funziona il rimborso?",
  "Cosa sono le clausole vessatorie?"
];

function renderContract(text) {
  return text.split('\n').map((line, i) => {
    line = line.trim();
    if (!line) return <div key={i} className="h-3" />;

    // ARTICOLO X - TITOLO
    if (line.startsWith('ARTICOLO')) {
      const articleNum = line.match(/\d+/)?.[0];
      const title = line.replace(/ARTICOLO \d+ - /, '').replace(/ARTICOLO \d+ – /, '');
      return (
        <div key={i} data-article={articleNum} className="mt-8 mb-4 first:mt-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {articleNum}
            </div>
            <h2 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">
              {title}
            </h2>
          </div>
          <div className="h-px bg-gray-100 mt-3" />
        </div>
      );
    }

    // X.X Sotto-articolo  
    if (/^\d+\.\d+/.test(line)) {
      return (
        <h3 key={i} className="text-sm font-semibold text-gray-800 mt-5 mb-2">
          {line}
        </h3>
      );
    }

    // Bullet point
    if (line.startsWith('-')) {
      return (
        <div key={i} className="flex gap-2 mb-1.5 ml-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a2e] mt-2 flex-shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed">{line.slice(1).trim()}</p>
        </div>
      );
    }

    // TRA / E
    if (line === 'TRA' || line === 'E' || line === 'e') {
      return (
        <p key={i} className="text-xs font-bold text-gray-400 uppercase tracking-widest my-3">
          {line}
        </p>
      );
    }

    // Testo normale
    return (
      <p key={i} className="text-sm text-gray-600 leading-[1.8] mb-3">
        {line}
      </p>
    );
  });
}

export default function ContractSigning({ partner, onContractSigned, initialStep, embedded }) {
  const [step, setStep] = useState(initialStep !== undefined ? initialStep : 0);
  const [scrollPct, setScrollPct] = useState(0);
  const [hasReadContract, setHasReadContract] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(1);
  const [clausoleApproved, setClausoleApproved] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 0 — dati personali
  const [partnerData, setPartnerData] = useState({
    nome: partner?.nome || '',
    cognome: partner?.cognome || '',
    nome_azienda: '',
    codice_fiscale: '',
    partita_iva: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    email: partner?.email || '',
    pec: '',
    iban: '',
  });
  const [savingData, setSavingData] = useState(false);
  const [dataError, setDataError] = useState(null);
  
  // Dynamic contract text
  const [dynamicContractText, setDynamicContractText] = useState(null);
  const [contractLoading, setContractLoading] = useState(true);
  const [customPdfUrl, setCustomPdfUrl] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Sono qui per aiutarti a capire il contratto. Chiedimi il significato di qualsiasi articolo o clausola.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Mobile tab
  const [mobileTab, setMobileTab] = useState('contract');
  
  const contractRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const chatEndRef = useRef(null);
  
  // Load personalized contract text + existing partner data
  useEffect(() => {
    const loadContractText = async () => {
      if (!partner?.id) {
        setContractLoading(false);
        return;
      }
      try {
        const [textRes, dataRes] = await Promise.allSettled([
          axios.get(`${API}/api/contract/text/${partner.id}`),
          axios.get(`${API}/api/contract/partner-data/${partner.id}`)
        ]);
        if (textRes.status === 'fulfilled' && textRes.value.data?.contract_text) {
          setDynamicContractText(textRes.value.data.contract_text);
        }
        if (textRes.status === 'fulfilled' && textRes.value.data?.custom_pdf_url) {
          setCustomPdfUrl(textRes.value.data.custom_pdf_url);
        }
        if (dataRes.status === 'fulfilled' && dataRes.value.data?.data) {
          setPartnerData(prev => ({ ...prev, ...dataRes.value.data.data }));
        }
      } catch (err) {
        console.warn('Fallback to default contract text');
      } finally {
        setContractLoading(false);
      }
    };
    loadContractText();
  }, [partner?.id]);

  const handleSavePartnerData = async () => {
    const required = ['nome', 'cognome', 'codice_fiscale', 'partita_iva', 'indirizzo', 'citta', 'cap', 'email', 'iban'];
    const missing = required.filter(k => !partnerData[k]?.trim());
    if (missing.length > 0) {
      setDataError('Compila tutti i campi obbligatori prima di procedere.');
      return;
    }
    setSavingData(true);
    setDataError(null);
    try {
      await axios.post(`${API}/api/contract/partner-data/${partner?.id || 'demo'}`, partnerData);
      // Ricarica il testo del contratto personalizzato
      if (partner?.id && partner.id !== 'demo') {
        const res = await axios.get(`${API}/api/contract/text/${partner.id}`);
        if (res.data?.contract_text) setDynamicContractText(res.data.contract_text);
      }
      setStep(1);
    } catch (err) {
      setDataError('Errore nel salvataggio dei dati. Riprova.');
    } finally {
      setSavingData(false);
    }
  };
  
  const activeContractText = dynamicContractText || CONTRACT_TEXT;

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && step === 2) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctxRef.current = ctx;
    }
  }, [step]);

  // Scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // IntersectionObserver for article tracking
  useEffect(() => {
    if (!contractRef.current) return;
    
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.dataset.article) {
            setCurrentArticle(parseInt(e.target.dataset.article));
          }
        });
      },
      { threshold: 0.4, root: contractRef.current }
    );
    
    contractRef.current.querySelectorAll('[data-article]').forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [step]);

  // Handle scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const pct = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollPct(Math.min(100, Math.max(0, pct)));
    if (pct >= 95) setHasReadContract(true);
  };

  // Drawing functions
  const startDrawing = (e) => {
    if (!ctxRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !ctxRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctxRef.current) {
      ctxRef.current.closePath();
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (ctxRef.current && canvasRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureData(null);
    }
  };

  // Chat functions
  const sendMessage = async (text) => {
    const msg = text || chatInput.trim();
    if (!msg || chatLoading) return;
    
    setChatInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    
    try {
      const response = await axios.post(`${API}/api/contract/chat`, {
        partner_id: partner?.id || 'unknown',
        message: msg,
        conversation_history: messages.slice(-8),
        current_article: currentArticle
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Mi dispiace, si è verificato un errore. Riprova tra poco.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const allClausoleApproved = CLAUSOLE_VESSATORIE.every(c => clausoleApproved[c.id]);
  const canSign = hasReadContract && allClausoleApproved && signatureData;

  const handleSign = async () => {
    if (!canSign) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/api/contract/sign`, {
        partner_id: partner?.id,
        signature_base64: signatureData,
        clausole_vessatorie_approved: true,
        contract_version: '1.0'
      });
      
      if (response.data.success) {
        toast.success('Contratto firmato con successo!', {
          description: 'Benvenuto nella partnership Evolution PRO',
          duration: 5000
        });
        onContractSigned && onContractSigned(response.data);
      } else {
        setError(response.data.message || 'Errore durante la firma');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50 p-4 md:p-6"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto"}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-gray-700 text-sm">Contratto di Partnership</span>
          </div>
          
          {/* Step indicator — 3 step */}
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 0 ? 'bg-emerald-600 text-white' : step > 0 ? 'bg-emerald-600 text-white' : 'bg-gray-300'}`}>
                {step > 0 ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <span className="font-medium">I tuoi dati</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-emerald-600 text-white' : hasReadContract && step > 1 ? 'bg-emerald-600 text-white' : 'bg-gray-300'}`}>
                {hasReadContract && step > 1 ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span className="font-medium">Leggi</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-gray-300'}`}>3</div>
              <span className="font-medium">Firma</span>
            </div>
          </div>
        </div>

        {/* ── STEP 0: DATI PERSONALI ── */}
        {step === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)' }}>
                <h2 className="text-xl font-bold text-white mb-1">I tuoi dati per il contratto</h2>
                <p className="text-sm text-white/60">Questi dati verranno inseriti nel contratto e hanno valore legale</p>
              </div>
              <div className="p-6 space-y-4">
                {/* Nome + Cognome */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nome <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.nome} onChange={e => setPartnerData(p => ({...p, nome: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Mario" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Cognome <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.cognome} onChange={e => setPartnerData(p => ({...p, cognome: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Rossi" />
                  </div>
                </div>
                {/* Nome Azienda */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nome Azienda / Ditta Individuale <span className="text-red-500">*</span></label>
                  <input type="text" value={partnerData.nome_azienda} onChange={e => setPartnerData(p => ({...p, nome_azienda: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Mario Rossi Coaching" />
                </div>
                {/* CF + P.IVA */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Codice Fiscale <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.codice_fiscale} onChange={e => setPartnerData(p => ({...p, codice_fiscale: e.target.value.toUpperCase()}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 font-mono" placeholder="RSSMRA80A01H501U" maxLength={16} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Partita IVA <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.partita_iva} onChange={e => setPartnerData(p => ({...p, partita_iva: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 font-mono" placeholder="IT12345678901" maxLength={13} />
                  </div>
                </div>
                {/* Indirizzo */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Indirizzo (via/piazza + numero civico) <span className="text-red-500">*</span></label>
                  <input type="text" value={partnerData.indirizzo} onChange={e => setPartnerData(p => ({...p, indirizzo: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Via Roma 1" />
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Città <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.citta} onChange={e => setPartnerData(p => ({...p, citta: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Milano" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">CAP <span className="text-red-500">*</span></label>
                    <input type="text" value={partnerData.cap} onChange={e => setPartnerData(p => ({...p, cap: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="20121" maxLength={5} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Provincia</label>
                    <input type="text" value={partnerData.provincia} onChange={e => setPartnerData(p => ({...p, provincia: e.target.value.toUpperCase()}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="MI" maxLength={2} />
                  </div>
                </div>
                {/* Email + PEC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={partnerData.email} onChange={e => setPartnerData(p => ({...p, email: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="mario@rossi.it" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">PEC <span className="text-gray-400 font-normal">(facoltativa)</span></label>
                    <input type="email" value={partnerData.pec} onChange={e => setPartnerData(p => ({...p, pec: e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="mario@pec.it" />
                  </div>
                </div>
                {/* IBAN */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">IBAN (per pagamento royalties) <span className="text-red-500">*</span></label>
                  <input type="text" value={partnerData.iban} onChange={e => setPartnerData(p => ({...p, iban: e.target.value.toUpperCase().replace(/\s/g, '')}))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 font-mono" placeholder="IT60X0542811101000000123456" />
                  <p className="text-xs text-gray-400 mt-1">Conto su cui Evolution PRO accrediterà la tua quota sulle vendite</p>
                </div>

                {dataError && (
                  <div className="p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">{dataError}</div>
                )}

                <button
                  onClick={handleSavePartnerData}
                  disabled={savingData}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all hover:bg-[#D0D0D0] hover:scale-[1.01] disabled:opacity-60"
                  style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
                >
                  {savingData ? 'Salvataggio...' : 'Salva e prosegui con il contratto →'}
                </button>
                <p className="text-xs text-center text-gray-400">I tuoi dati sono protetti e usati esclusivamente per la redazione del contratto</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 ? (
          <>
            {/* Mobile tabs */}
            <div className="md:hidden flex gap-2 mb-4">
              <button
                onClick={() => setMobileTab('contract')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  mobileTab === 'contract' 
                    ? 'bg-[#1a1a2e] text-white' 
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Contratto
              </button>
              <button
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  mobileTab === 'chat' 
                    ? 'bg-violet-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Supporto
              </button>
            </div>

            {/* Two column layout */}
            <div className="flex gap-6">
              {/* Contract Column - 65% */}
              <div className={`${mobileTab === 'contract' ? 'block' : 'hidden'} md:block md:w-[65%]`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Contract Header */}
                  <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4e] px-6 py-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="font-semibold text-base">Contratto di Collaborazione in Partnership</h2>
                        <p className="text-xs opacity-70">Evolution PRO LLC — Versione 1.0</p>
                      </div>
                      <span className="text-xs opacity-60">Articolo {currentArticle} / 17</span>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/80 transition-all duration-300"
                        style={{ width: `${scrollPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Contract Body */}
                  {customPdfUrl ? (
                    <div className="h-[calc(100vh-380px)] md:h-[calc(100vh-320px)] flex flex-col">
                      <iframe
                        src={customPdfUrl}
                        title="Contratto Partnership"
                        className="flex-1 w-full"
                        style={{ border: 'none' }}
                        onLoad={() => {
                          // Permetti di procedere dopo 10 secondi di visualizzazione PDF
                          setTimeout(() => setHasReadContract(true), 10000);
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      ref={contractRef}
                      onScroll={handleScroll}
                      className="px-6 py-5 font-['Georgia',serif] h-[calc(100vh-380px)] md:h-[calc(100vh-320px)] overflow-y-auto scroll-smooth"
                    >
                      {contractLoading ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          <span className="ml-2 text-sm text-gray-400">Caricamento contratto...</span>
                        </div>
                      ) : renderContract(activeContractText)}
                    </div>
                  )}

                  {/* Scroll/read indicator */}
                  {!hasReadContract ? (
                    <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center justify-between">
                      <span className="text-amber-700 text-xs">{customPdfUrl ? "Leggi il contratto per abilitare la firma" : "Scorri fino in fondo per abilitare la firma"}</span>
                      <ChevronDown className="w-4 h-4 text-amber-600 animate-bounce" />
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-2 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 text-xs">Contratto letto — puoi procedere alla firma</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Column - 35% */}
              <div className={`${mobileTab === 'chat' ? 'block' : 'hidden'} md:block md:w-[35%]`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-380px)] md:h-[calc(100vh-320px)]">
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 rounded-t-2xl text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <div>
                        <h3 className="font-semibold text-sm">Supporto contratto</h3>
                        <p className="text-xs opacity-75">Fai domande sugli articoli</p>
                      </div>
                    </div>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                      Art. {currentArticle}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-violet-600 text-xs font-bold">EP</span>
                          </div>
                        )}
                        <div className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm'
                            : 'bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-gray-700'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    
                    {chatLoading && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-violet-600 text-xs font-bold">EP</span>
                        </div>
                        <div className="flex gap-1 px-3 py-2 bg-white rounded-2xl w-fit shadow-sm">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick suggestions */}
                  {showSuggestions && (
                    <div className="flex flex-wrap gap-2 px-4 pb-3">
                      {QUICK_SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          className="bg-violet-50 border border-violet-100 text-violet-700 text-xs rounded-full px-3 py-1.5 hover:bg-violet-100 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                      placeholder="Chiedi informazioni sul contratto..."
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-violet-300"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Next button */}
            <div className="mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!hasReadContract}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                  hasReadContract
                    ? 'hover:bg-[#D0D0D0]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                style={hasReadContract ? { background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' } : {}}
              >
                {hasReadContract ? (
                  <>Procedi alla firma <ArrowRight className="w-5 h-5" /></>
                ) : (
                  'Scorri per leggere il contratto'
                )}
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Firma */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Clausole vessatorie */}
              <div className="p-6 bg-amber-50 border-b border-amber-100">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-800 text-sm mb-1">
                      Approvazione specifica clausole vessatorie
                    </h3>
                    <p className="text-xs text-amber-700">
                      Ai sensi degli artt. 1341 e 1342 c.c., approva specificamente:
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1.5 ml-8">
                  {CLAUSOLE_VESSATORIE.map((clausola) => (
                    <label 
                      key={clausola.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-amber-100/50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={clausoleApproved[clausola.id] || false}
                        onChange={(e) => setClausoleApproved(prev => ({
                          ...prev,
                          [clausola.id]: e.target.checked
                        }))}
                        className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs text-amber-800">{clausola.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Firma */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Pen className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700 text-sm">La tua firma</span>
                  </div>
                  <button onClick={clearSignature} className="text-xs text-gray-500 hover:text-gray-700 underline">
                    Cancella
                  </button>
                </div>
                
                <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Disegna la tua firma con il mouse o il dito
                </p>
              </div>

              {error && (
                <div className="px-6 pb-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                    {error}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 border-t space-y-3">
                <button
                  onClick={handleSign}
                  disabled={!canSign || loading}
                  className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                    canSign && !loading
                      ? 'hover:bg-[#D0D0D0]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  style={canSign && !loading ? { background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' } : {}}
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Firma in corso...</>
                  ) : (
                    <><Check className="w-5 h-5" /> Firma e attiva la partnership</>
                  )}
                </button>
                
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
                >
                  Torna al contratto
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              La firma digitale ha pieno valore legale ai sensi del Regolamento eIDAS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
