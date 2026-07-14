# Evolution PRO — Correzioni motion e impaginazione

**Data:** 2026-07-14

**Ambito:** sito vetrina `www.evolution-pro.it` (`evolution-pro-site`)

**Stato:** approvato verbalmente da Claudio

## Obiettivo

Correggere le animazioni che oggi sovrappongono più scene, rendere più leggibile la hero e rifinire le sezioni collaborazioni, problema, sistema umano, storia e testimonianze senza modificare il posizionamento generale del sito.

La direzione scelta è **scene controllate**: una sola scena visibile alla volta, con transizioni autonome basate su opacità e trasformazioni. Le animazioni non dipendono dallo scroll.

## Principi di interazione

- Una sola scheda o scena è montata e visibile in ogni area animata.
- Entrata e uscita usano dissolvenza e movimento breve, senza sovrapposizioni leggibili.
- Le animazioni sono autonome e continuano anche quando la sezione è già nel viewport.
- Il ciclo si mette in pausa quando l’utente interagisce con l’elemento.
- `prefers-reduced-motion` mostra una composizione stabile, senza sequenze continue.
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

La sezione viene trasformata in un mockup di laptop:

- cornice del portatile in navy/ink;
- schermo con sfondo dashboard coordinato alla palette;
- barra superiore e piccoli moduli grafici per suggerire un ambiente operativo;
- nomi dei partner in scorrimento continuo dentro lo schermo;
- pausa su hover/focus e versione statica con movimento ridotto.

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

## Direzione prima degli strumenti

La sequenza conserva i tre momenti narrativi, ma monta una sola scena alla volta:

1. rumore degli strumenti;
2. “Lo strumento senza direzione è solo rumore.” con il video MP4 fornito da Claudio posizionato sotto il testo;
3. “Prima la direzione. Poi gli strumenti.”

Il video sarà `muted`, `playsInline`, in loop e con controlli coerenti con l’intento narrativo; non deve coprire il testo né causare salti di layout.

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
- Le scene narrative continuano a ruotare una alla volta.
- I numeri non si sovrappongono alle immagini o ai testi durante il cambio.

## Metodo EVO

Il testo introduttivo diventa:

> 3 passaggi semplici dentro un protocollo testato negli ultimi 7 anni

Le tre fasi Esamina, Valida e Ottimizza vengono mostrate una alla volta con transizione pulita e senza elementi residui della fase precedente.

## Videotestimonianze e busta

### Aspetto

- Il triangolo/grembiule della busta passa dal giallo al grigio chiaro `#D8D8D8`.
- La busta riceve un sigillo in ceralacca navy `#0D2952`.
- Il sigillo contiene il marchio Evolution PRO in oro `#FBC002`, usando l’asset ufficiale disponibile nel progetto.
- Il sigillo si apre prima del sollevamento del messaggio.

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
- Recuperare il video MP4 già fornito da Claudio e copiarlo tra gli asset pubblici del sito con nome descrittivo.
- Generare due immagini tematiche originali, una per “Problema” e una per “Sistema umano e AI”, senza testi o loghi inventati.
- Ottimizzare immagini e video per il web senza degradare la leggibilità.

## Verifica

### Test automatici

- copy esatto della hero, problema e Metodo EVO;
- presenza dei 20 partner;
- una sola scena hero visibile/montata alla volta;
- video presente nella seconda scena “direzione”;
- CTA della testimonianza apre il video;
- sigillo e lettera presenti con ruoli/accessibilità corretti;
- rispetto di `prefers-reduced-motion`;
- nessun overflow orizzontale su viewport mobile.

### Verifica visiva

- desktop 1440 × 900;
- laptop 1280 × 800;
- tablet 768 × 1024;
- mobile 390 × 844;
- controllo della testa di Claudio, della busta, del laptop e delle transizioni hero;
- controllo live dopo il deploy su `https://www.evolution-pro.it`.

## Fuori ambito

- Modifiche alla piattaforma applicativa `www.ciak.io`.
- Nuovi funnel o cambi alla destinazione CTA.
- Modifiche ai contenuti degli agenti oltre alla loro presentazione visiva.
