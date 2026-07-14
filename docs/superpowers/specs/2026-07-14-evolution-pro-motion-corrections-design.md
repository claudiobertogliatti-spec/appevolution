# Evolution PRO — Correzioni motion e impaginazione

**Data:** 2026-07-14

**Ambito:** sito vetrina `www.evolution-pro.it` (`evolution-pro-site`)

**Stato:** revisione approvata verbalmente da Claudio; aggiornamento finale del 2026-07-14 con laptop realistico nella sezione strumenti

## Obiettivo

Correggere le animazioni che oggi sovrappongono più scene, rendere più leggibile la hero e rifinire le sezioni collaborazioni, problema, sistema umano, storia e testimonianze senza modificare il posizionamento generale del sito.

La direzione scelta è **scene controllate**: una sola scena visibile alla volta, con transizioni autonome basate su opacità e trasformazioni. Le animazioni non dipendono dallo scroll.

## Principi di interazione

- Una sola scheda o scena è montata e visibile in ogni area animata.
- Entrata e uscita usano dissolvenza e movimento breve, senza sovrapposizioni leggibili.
- Le animazioni sono autonome e continuano anche quando la sezione è già nel viewport.
- Il ciclo non si mette in pausa al passaggio del mouse e resta autonomo.
- Le sequenze richieste da Claudio restano attive anche quando il browser segnala `prefers-reduced-motion`, evitando il blocco completo osservato in produzione.
- Le animazioni usano principalmente `transform` e `opacity`.
- Su mobile si riducono ampiezza e durata, preservando testo e controlli.

## Hero

### Copy

La pillola gialla, non cliccabile, sostituisce il piccolo testo “Evolution PRO”:

> PER CONSULENTI, COACH E PROFESSIONISTI

Il titolo usa quattro righe editoriali esplicite:

> La tua<br>
> competenza<br>
> merita una<br>
> direzione

Il sottotitolo diventa:

> Prima di costruire la tua Accademia Digitale, bisogna capire se hai la direzione corretta che può venderla.

### Motion

- Viene mostrato un solo agente per volta.
- Al cambio, la scena corrente esce completamente prima che la successiva diventi leggibile.
- Foto, nome, ruolo e presentazione appartengono alla stessa scena.
- L’intero blocco animato viene spostato leggermente più in alto rispetto all’attuale allineamento, restando otticamente affiancato al titolo e con spazio sufficiente dalla navbar.
- Le sei persone restano disponibili semanticamente alle tecnologie assistive.
- Il titolo mantiene le quattro righe su desktop; su schermi stretti può adattarsi senza tagli o overflow.

## Collaborazioni

La sezione mantiene la barra orizzontale semplice presente nella prima versione:

- nomi dei partner in scorrimento continuo, senza cornice di computer;
- nessun modulo dashboard o statistica nella sezione collaborazioni;
- lista completa disponibile semanticamente e disposizione leggibile su mobile.

Elenco completo:

1. Michele Baggio
2. Mariantonietta Tornello
3. Sarah Arensi
4. Andrea Fredi
5. Valter Romani
6. Marco Lamanna
7. Cosimo Filieri
8. Alice Conventi
9. Arianna Aceto
10. Marco Orlandi
11. Silvia Sedda
12. Federica Arimatea
13. Daniele Andolfi
14. Daphne Oliveti
15. Annamaria Depalma
16. Maria Giulia Falcone
17. Luigi Calafiore
18. Sara Stella Duè
19. Alfredo Vasi
20. Eva Gugliucciello

## Strumenti nel laptop realistico

Il computer appartiene esclusivamente alla sezione strumenti:

- al centro della pagina compare un portatile fotorealistico visto frontalmente, non una cornice costruita con soli bordi CSS;
- l’asset del portatile ha uno schermo vuoto con area utile definita, dentro cui viene integrata l’animazione dei dodici loghi reali;
- il ventaglio dei loghi ruota automaticamente nello schermo e resta contenuto nella cornice;
- il computer è centrato e mantiene proporzioni realistiche su desktop, tablet e mobile;
- il titolo e il testo introduttivo rimangono sopra il portatile.

## Direzione prima degli strumenti

La sequenza conserva i tre momenti narrativi, ma monta una sola scena alla volta:

1. rumore degli strumenti;
2. “Lo strumento senza direzione è solo rumore.”;
3. “Prima la direzione. Poi gli strumenti.”

Il video indicato da Claudio (`https://cdn.dribbble.com/userupload/48249026/file/a061928a6f36b905ec15d4d711e8391c.mp4`) viene scaricato tra gli asset locali e usato come sfondo a piena sezione. Sarà `muted`, `playsInline`, `autoplay` e in loop. Un overlay navy/ink protegge la leggibilità dei testi animati, che restano sopra il filmato senza salti di layout.

## Problema

L’etichetta diventa:

> IL PROBLEMA COMUNE AL 95% DELLA CATEGORIA

La sezione passa a una composizione a due colonne:

- a sinistra, immagine tematica senza testo incorporato;
- a destra, animazione dei problemi e conclusione;
- un solo punto è evidenziato per volta, senza rendere il resto confuso;
- su mobile, immagine sopra e contenuto sotto.

L’immagine deve rappresentare un professionista competente bloccato da strumenti, attività e direzioni frammentate, con palette navy, ink, giallo e grigi del brand.

## Sistema umano e AI

La sezione “Un sistema umano, potenziato dall’AI” diventa una composizione a due colonne:

- immagine tematica a sinistra;
- titolo, introduzione e quattro componenti del sistema a destra;
- ingressi progressivi discreti, senza carosello continuo.

L’immagine deve comunicare collaborazione tra persona, team e tecnologia, senza estetica fantascientifica e senza testo incorporato.

## Storia di Claudio

- La foto ritratto usa un posizionamento ancorato in alto per mantenere visibile tutta la testa.
- Le scene narrative ruotano automaticamente una alla volta ogni circa 3 secondi, anche con puntatore fermo o impostazione browser di movimento ridotto.
- La transizione è visibile tramite dissolvenza e breve spostamento; nessuna scena resta congelata permanentemente.
- I numeri non si sovrappongono alle immagini o ai testi durante il cambio.

## Metodo EVO

Il testo introduttivo diventa:

> 3 passaggi semplici dentro un protocollo testato negli ultimi 7 anni

Le tre fasi Esamina, Valida e Ottimizza vengono mostrate una alla volta ogni circa 3 secondi con transizione pulita, visibile e senza elementi residui della fase precedente. Il ciclo non si ferma su hover e non viene disattivato da `prefers-reduced-motion`.

## Videotestimonianze e busta

### Aspetto

- Il triangolo superiore della busta torna giallo `#FBC002`.
- Il sigillo non ha cerchio, fondo o wordmark.
- Il sigillo mostra esclusivamente la spirale del marchio Evolution PRO, riempita in grigio `#787878`/`#D8D8D8` e ritagliata su trasparenza.
- La spirale si apre o scompare prima del sollevamento del messaggio.

### Leggibilità e azione

- La lettera sale più in alto rispetto al fronte della busta.
- Foto, citazione, nome, cinque stelle e CTA rimangono completamente visibili.
- Il fronte della busta non intercetta il click.
- La CTA apre il video corretto in modale accessibile.
- Le tre testimonianze possono avere un piccolo ritardo sfalsato, ma ogni busta resta leggibile e cliccabile.

## Palette

- Oro/giallo: `#FBC002`
- Navy: `#0D2952`
- Ink: `#101326`
- Grigio argento: `#787878`
- Grigio chiaro: `#D8D8D8`

Non vengono introdotti colori dominanti esterni alla palette.

## Asset

- Riutilizzare il logo ufficiale Evolution PRO già presente nel progetto.
- Scaricare il video MP4 Dribbble indicato da Claudio e copiarlo tra gli asset pubblici del sito con nome descrittivo, senza dipendenza runtime dal CDN esterno.
- Creare un asset fotorealistico di portatile frontale con schermo vuoto, destinato alla sezione strumenti.
- Estrarre o ricostruire la sola spirale Evolution PRO su trasparenza e in grigio per il sigillo.
- Generare due immagini tematiche originali, una per “Problema” e una per “Sistema umano e AI”, senza testi o loghi inventati.
- Generare un’immagine tematica originale per la CTA finale, coerente con il concetto di scelta della direzione, senza testo incorporato.
- Ottimizzare immagini e video per il web senza degradare la leggibilità.

## CTA finale

La sezione “Prima di costruire, scegli una direzione” passa a due colonne:

- testo, descrizione e pulsante a sinistra;
- immagine tematica coerente a destra;
- immagine con persona/professionista e segnali di pianificazione o scelta strategica, senza estetica stock generica, loghi inventati o testo;
- su mobile l’immagine va sotto il contenuto e non riduce la visibilità della CTA.

## Verifica

### Test automatici

- copy esatto della hero, problema e Metodo EVO;
- presenza dei 20 partner;
- una sola scena hero visibile/montata alla volta;
- video di sfondo presente e in autoplay nella sezione “direzione”;
- laptop realistico centrato nella sezione strumenti e assente dalle collaborazioni;
- rotazione effettiva di storia e Metodo EVO anche con movimento ridotto;
- CTA della testimonianza apre il video;
- sigillo e lettera presenti con ruoli/accessibilità corretti;
- contenuti accessibili con `prefers-reduced-motion`, mantenendo però attive le sequenze espressamente richieste;
- nessun overflow orizzontale su viewport mobile.

### Verifica visiva

- desktop 1440 × 900;
- desktop compatto 1280 × 800;
- tablet 768 × 1024;
- mobile 390 × 844;
- controllo della testa di Claudio, della busta, del laptop realistico, dell’immagine CTA e delle transizioni hero/storia/Metodo EVO;
- controllo live dopo il deploy su `https://www.evolution-pro.it`.

## Fuori ambito

- Modifiche alla piattaforma applicativa `www.ciak.io`.
- Nuovi funnel o cambi alla destinazione CTA.
- Modifiche ai contenuti degli agenti oltre alla loro presentazione visiva.
