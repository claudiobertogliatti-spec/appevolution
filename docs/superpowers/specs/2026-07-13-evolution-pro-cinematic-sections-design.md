# Evolution PRO — Sezioni cinematiche

Data: 13 luglio 2026

## Obiettivo

Trasformare le sezioni Strumenti, Videotestimonianze e Ciak della bozza locale in tre scene cinematiche coordinate allo scroll. Il linguaggio visivo segue la soluzione B approvata: profondità, inclinazioni, sovrapposizioni e cambi di scala, mantenendo la palette ufficiale Evolution PRO.

## Principi condivisi

- Palette: oro `#FBC002`, navy `#0D2952`, ink `#101326`, argento `#787878`, grigio chiaro `#D8D8D8`.
- Il movimento è determinato dalla posizione dello scroll, non da un autoplay temporizzato.
- Ogni sequenza è reversibile: tornando indietro, anche l’animazione torna allo stato precedente.
- Le animazioni desktop usano scene sticky e una timeline normalizzata da 0 a 1.
- Sotto `59.99rem` il layout diventa compatto e statico, mostrando comunque tutti i contenuti e le CTA.
- Nessuna copia letterale dei riferimenti Dribbble: si riprendono ritmo, profondità e regia usando contenuti Evolution PRO.

## Scena 1 — Strumenti

### Esperienza

Una sezione sticky introduce gli strumenti come card-logo. Le card entrano dai lati, ruotano leggermente e formano un ventaglio. Proseguendo nello scroll, una card alla volta raggiunge il centro, aumenta di scala e mostra nome e funzione. Canva e HeyGen devono essere presenti e riconoscibili insieme agli altri strumenti già censiti.

### Componente

`ToolsMarquee` viene sostituito o rifattorizzato come sequenza cinematica. I dati continuano a provenire da `siteContent.tools`; la presentazione non duplica il contenuto semantico.

### Stati

1. Ingresso delle card dai bordi.
2. Composizione a ventaglio.
3. Evidenza progressiva dello strumento centrale.
4. Chiusura della composizione e passaggio alla sezione successiva.

## Scena 2 — Videotestimonianze

### Esperienza

Ogni testimonianza pubblicabile ha una propria timeline. La busta compare chiusa, il lembo si apre, la scheda emerge con una lieve rotazione e infine diventano visibili foto, frase, cinque stelle e CTA video. Il click sulla CTA apre il video nel modal esistente.

### Contenuti

Si usano soltanto testimonianze con frase e video verificati. Foto, poster e file video già presenti restano la fonte dei contenuti. In assenza di materiali verificati resta visibile il messaggio editoriale già previsto, senza card finte.

### Stati

1. Busta chiusa.
2. Apertura del lembo.
3. Uscita della scheda e comparsa della foto.
4. Comparsa di frase e valutazione.
5. Comparsa della CTA video.

## Scena 3 — Ciak

### Esperienza

Le cinque schermate grafiche già costruite diventano un collage 3D ispirato al montaggio di riferimento. Entrano da direzioni diverse con rotazioni e scale differenti. Durante lo scroll una schermata alla volta passa in primo piano e si espande, mentre le altre restano visibili come contesto in parallasse.

### Contenuti

Le schermate restano quelle sintetiche già presenti e non mostrano dati reali. I cinque momenti sono:

1. Brainstorming guidato.
2. Posizionamento.
3. Struttura del videocorso.
4. Avanzamento operativo.
5. Prossima azione.

### Chiusura

L’ultimo stato ricompone il collage e mantiene visibile la CTA verso `https://www.ciak.io`.

## Architettura del movimento

Ogni sezione possiede un elemento radice, una scena sticky e trasformazioni derivate da `useSafeScrollProgress`. Le trasformazioni vengono suddivise in intervalli espliciti per opacità, traslazione, rotazione e scala. I dati restano separati dalla regia visiva, così l’aggiunta o la sostituzione di uno strumento o di una testimonianza non richiede di riscrivere l’intera sequenza.

Le animazioni non devono introdurre timer, listener globali non rimossi o aggiornamenti React a ogni frame quando un `MotionValue` può aggiornare direttamente lo stile.

## Accessibilità e comportamento responsivo

- Titoli, testi, loghi e CTA rimangono presenti nel DOM in ordine comprensibile.
- Le decorazioni duplicate sono escluse dall’albero accessibile.
- Il modal video mantiene chiusura con `Escape`, focus trap e ripristino del focus.
- Su mobile niente scene alte o contenuti sovrapposti: le card diventano una sequenza leggibile.
- I controlli interattivi restano raggiungibili da tastiera e hanno etichette esplicite.

## Prestazioni

- Animare solo `transform` e `opacity` quando possibile.
- Evitare immagini duplicate ad alta risoluzione.
- Mantenere il caricamento lazy per risorse non iniziali.
- Non incorporare il video Dribbble nel sito: è solo un riferimento di regia.

## Verifica

### Test automatici

- Strumenti: contenuto completo, composizione desktop e fallback mobile.
- Testimonianze: stati iniziale, intermedio e finale; reverse; apertura e chiusura video.
- Ciak: presenza dei cinque stati, ordine narrativo e CTA corretta.
- Build TypeScript e Vite senza errori.

### Verifica browser

- Desktop Chromium: scroll avanti e indietro attraverso tutte e tre le timeline.
- Mobile: leggibilità, assenza di sovrapposizioni e CTA raggiungibili.
- Console priva di errori runtime.

## Fuori ambito

- Sostituzione delle schermate sintetiche Ciak con screenshot reali.
- Produzione o montaggio di nuovi video testimoniali.
- Modifiche alle sezioni non coinvolte.
- Deploy della bozza locale sul sito pubblico.
