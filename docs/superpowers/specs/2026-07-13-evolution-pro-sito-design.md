# Evolution PRO — Design del nuovo sito istituzionale

**Data:** 13 luglio 2026  
**Stato:** approvato da Claudio  
**Destinazione:** `www.evolution-pro.it`  
**Tipo:** sito standalone, separato dalla SPA applicativa Ciak

## 1. Obiettivo

Ricostruire il sito istituzionale Evolution PRO come esperienza editoriale premium, dinamica e orientata alla fiducia. Il sito presenta il problema, il principio strategico, Claudio, il Metodo EVO, il team, la piattaforma Ciak e le prove reali. Le CTA portano al funnel ospitato su `www.ciak.io`.

Il sito non deve sembrare una landing aggressiva né una vetrina SaaS generica. Deve comunicare una partnership operativa: prima la direzione, poi gli strumenti.

## 2. Direzione visiva approvata

La base è la soluzione editoriale ispirata al riferimento CoreShift: tipografia grande, composizioni pulite, spazio bianco e gerarchia netta. A questa base si aggiungono:

- sezioni tecnologiche su fondo scuro per agenti, Metodo EVO e Ciak;
- concetti decisivi evidenziati in giallo, come segni editoriali;
- alternanza di blocchi chiari, navy e ink;
- fotografie reali dentro composizioni organiche, non griglie aziendali rigide;
- ritmo motion alternato: spettacolare nei passaggi chiave, controllato nelle pause.

La struttura si ispira ai riferimenti forniti senza copiarne identità, layout o contenuti.

## 3. Identità Evolution PRO

### Palette esatta campionata dal logo

| Ruolo | Colore | Uso |
|---|---|---|
| Oro/giallo | `#FBC002` | CTA, concetti da ricordare, avanzamento motion |
| Navy | `#0D2952` | sfondi autorevoli, forme grafiche, brand primario |
| Ink | `#101326` | testo, sezioni scure, contrasto massimo |
| Grigio argento | `#787878` | testi secondari, loghi inattivi |
| Grigio chiaro | `#D8D8D8` | bordi, superfici e separatori |

Il logo Evolution PRO deve essere ben visibile nell'header e nella hero. Non deve essere sostituito dal logo Ciak. Ciak è la piattaforma operativa presentata più avanti nella pagina.

Font principale: Poppins, pesi 400, 500, 600 e 700.

## 4. Principi motion

Le animazioni principali sono controllate dallo scroll. L'utente fa avanzare la storia e può invertirla tornando indietro.

- Le sequenze narrative usano sezioni sticky solo quando migliorano la comprensione.
- Si alternano scene spettacolari e scene calme.
- Il giallo compare come evidenziatore, non come riempimento decorativo continuo.
- Trasformazioni principali: `transform`, `opacity` e clip/mask ottimizzate.
- Nessuna animazione deve impedire la lettura o lo scroll.
- Mobile: stessa storia, movimenti semplificati e sticky ridotti.
- `prefers-reduced-motion`: contenuto completo in versione statica.

### Intensità per sezione

| Sezione | Intensità | Movimento |
|---|---|---|
| Hero | spettacolare | rotazione e ingrandimento degli agenti |
| Collaborazioni | controllata | marquee fluido |
| Strumenti | controllata | marquee lento, accensione colore |
| Direzione | spettacolare | rottura e riallineamento della scena |
| Problema | controllata | accumulo progressivo delle criticità |
| Claudio | spettacolare | composizione fotografica e numeri |
| Metodo EVO | spettacolare | percorso scroll-linked fra le fasi |
| Team umano + AI | controllata | relazioni e ruoli che si compongono |
| Ciak.io | spettacolare | interfaccia e conversazioni simulate |
| Testimonianze | premium controllata | apertura busta e uscita messaggio |
| FAQ | sobria | accordion accessibile |
| CTA finale | spettacolare breve | chiusura e richiamo alla direzione |

## 5. Architettura narrativa

### 5.1 Header

Header flottante/sticky con logo Evolution PRO ben visibile, ancore principali e CTA. Sullo scroll acquisisce blur e superficie più compatta.

### 5.2 Hero — competenza e direzione

Copy di apertura derivato dal sito attuale:

> La tua competenza merita una direzione.

Sottotitolo: prima di costruire l'Accademia Digitale bisogna verificare mercato, posizionamento e fattibilità.

A fianco del titolo, le fotografie dei sei agenti entrano a turno in primo piano. Ogni agente mostra nome, ruolo e frase “Sono X e ti aiuto a…”.

Agenti:

- Stefania — coordinamento del percorso;
- Valentina — brand e posizionamento;
- Andrea — video e contenuti;
- Gaia — supporto tecnico funnel;
- Marco — strategia di lancio;
- Matteo — analisi Ciak Blueprint.

### 5.3 Collaborazioni

Marquee continuo con i loghi reali di partner e collaborazioni. Movimento lento, pausa su hover e duplicazione accessibile per garantire continuità.

### 5.4 Strumenti utilizzati

Mini-blocco, non una sezione dominante. Loghi monocromatici che recuperano il colore originale su hover/focus:

`Systeme.io · Stripe · Cal.com · Vercel · Google Cloud · Meta · YouTube · ElevenLabs · Anthropic · Descript · Canva · HeyGen`

Il messaggio implicito è solidità dell'infrastruttura. Gli strumenti non sostituiscono la direzione.

### 5.5 Prima la direzione, poi gli strumenti

Scena ad alto impatto. In apertura, funnel, ads, automazioni e videocorso appaiono come rumore disordinato. Con lo scroll vengono ridotti e riallineati dentro una rotta leggibile. Il messaggio “Prima la direzione” entra evidenziato in giallo; “poi gli strumenti” completa la frase.

### 5.6 Il problema del target

Il copy del sito attuale viene sintetizzato e redistribuito:

- vendere il proprio tempo;
- riempire l'agenda;
- aumentare il carico operativo;
- provare strumenti senza un sistema;
- restare economicamente fermi nonostante la competenza.

Le criticità emergono durante lo scroll e convergono nella diagnosi: non manca la competenza, manca un sistema digitale con una direzione.

### 5.7 Claudio — storia, numeri e nascita di Evolution PRO

Sezione completa, non ridotta a una fascia statistiche. Usa entrambe le immagini fornite:

- ritratto ravvicinato per l'apertura personale;
- fotografia ambientata nell'ufficio Evolution PRO per la parte istituzionale.

La storia mantiene i fatti del sito attuale: oltre 20 anni, 13 settori, oltre 25.000 trattative, più di 6 milioni di euro di vendite e 7 anni nelle Accademie Digitali. I numeri si compongono con lo scroll. La chiusura spiega perché Evolution PRO nasce come partner operativo e non come agenzia tradizionale.

### 5.8 Metodo EVO

Fulcro del sito. Il Metodo EVO viene raccontato come percorso e non come tre card statiche:

1. Esamina;
2. Valida;
3. Ottimizza.

Le 12 fasi operative possono apparire come livelli secondari. Lo scroll attiva progressivamente E, V e O e mostra come ogni fase dipenda dalla precedente.

### 5.9 Team umano e agenti AI

Spiega che il sistema organizza il lavoro mentre il team Evolution PRO supervisiona strategia, direzione e crescita. Non presentare l'AI come sostituto delle persone. La relazione da mostrare è: piattaforma → agenti → team umano → partner.

### 5.10 Piattaforma Ciak.io

Dimostrazione dinamica della semplicità operativa:

- brainstorming con un agente;
- definizione del posizionamento;
- costruzione della struttura del videocorso;
- avanzamento di script, registrazione e funnel;
- prossima azione sempre visibile.

La demo usa mockup realistici della piattaforma, non schermate inventate che contraddicono il prodotto. Microcopy di transizione: “Il tuo percorso operativo continua su Ciak”.

### 5.11 Videotestimonianze

Testimonial confermati:

- Michele Baggio;
- Mariantonietta Tornello;
- Sarah Arensi.

Ogni testimonianza è rappresentata da una busta. Con lo scroll:

1. la busta entra nella scena;
2. si apre il lembo;
3. emerge la foto del partner;
4. sale un messaggio breve realmente tratto dal video;
5. compaiono cinque stelle;
6. appare la CTA “Guarda la testimonianza”.

La CTA apre il video in un modal accessibile. Le frasi devono essere estratte dai file reali, mai inventate. Se un video non è disponibile, la relativa busta non viene pubblicata.

### 5.12 FAQ

Accordion sobrio con il contenuto del sito attuale, sintetizzato quando necessario. Deve supportare tastiera, focus visibile e attributi ARIA.

### 5.13 CTA finale

Chiusura su fondo navy con richiamo alla direzione e CTA verso la masterclass su `www.ciak.io`. Il dominio applicativo va sempre indicato come `www.ciak.io`; `app.evolution-pro.it` è vietato.

## 6. Strategia CTA

Una sola azione primaria, espressa con microcopy coerente:

- header;
- hero;
- dopo Metodo EVO;
- dopo la demo Ciak;
- chiusura finale.

Le CTA portano al funnel Ciak. Non aggiungere azioni concorrenti nella stessa area visiva.

## 7. Copy

`www.evolution-pro.it` è la fonte di verità dei contenuti. Il testo non viene copiato integralmente se compromette il ritmo: viene sintetizzato e redistribuito, senza cambiare fatti, promesse o posizionamento.

Voce: italiana semplice, diretta, concreta, anti-fuffa. Frasi brevi. Nessun registro guru o motivazionale generico.

## 8. Componenti e confini

La pagina viene composta da sezioni autonome:

- `Header`;
- `HeroAgents`;
- `LogoMarquee`;
- `ToolsMarquee`;
- `DirectionSequence`;
- `ProblemSequence`;
- `FounderStory`;
- `EvoMethodSequence`;
- `HumanAiSystem`;
- `CiakPlatformDemo`;
- `EnvelopeTestimonials`;
- `FaqAccordion`;
- `FinalCta`;
- `Footer`.

Ogni sezione possiede contenuto, timeline motion e fallback statico. I dati testuali e gli asset non devono essere incorporati nelle timeline: devono vivere in configurazioni separate, così copy e fotografie possono cambiare senza riscrivere le animazioni.

## 9. Dati e asset

- Logo Evolution PRO: asset ufficiale già presente nel repository.
- Fotografie agenti: asset presenti in `frontend/public/agents/`.
- Fotografie Claudio: i due file consegnati il 13 luglio 2026.
- Loghi collaborazioni: da inventariare prima della build definitiva.
- Loghi strumenti: SVG ufficiali o set coerente con licenze verificabili.
- Video testimonial: file già disponibili; devono essere associati ai tre nomi ed elaborati per estrarre citazioni reali.
- Screenshot Ciak: acquisiti dall'applicazione attuale su `www.ciak.io`.

## 10. Comportamenti di errore e fallback

- Immagine assente: non mostrare un riquadro rotto; usare fallback neutro o rimuovere l'elemento.
- Video assente/non caricabile: nascondere la CTA video e non pubblicare citazioni non verificabili.
- JavaScript disabilitato: contenuto e CTA restano leggibili.
- Motion ridotta: tutte le sezioni mostrano lo stato finale senza sequenze obbligatorie.
- Connessione lenta: immagini responsive, poster video e lazy loading sotto la piega.
- Link Ciak: configurazione centralizzata per impedire riferimenti al dominio dismesso.

## 11. Accessibilità e prestazioni

- Contrasto minimo WCAG AA.
- Navigazione completa da tastiera.
- Focus visibile.
- Alt text informativi per persone e contenuti; decorazioni con alt vuoto.
- Modal video con focus trap, chiusura da tastiera e ripristino del focus.
- Nessun autoplay audio.
- Obiettivo Lighthouse su build di produzione: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Evitare animazioni di proprietà che causano layout thrashing.

## 12. Verifica

La prima versione locale deve essere verificata su:

- desktop ampio, laptop, tablet e smartphone;
- Chrome, Safari e Firefox moderni;
- mouse, tastiera e touch;
- modalità motion normale e ridotta;
- rete rallentata;
- apertura e chiusura dei tre video;
- tutte le CTA e gli anchor link;
- assenza completa di riferimenti ad `app.evolution-pro.it`.

## 13. Bozze approvate

- `docs/sito-istituzionale/bozze/direzioni-hero.html`
- `docs/sito-istituzionale/bozze/ritmo-homepage-v2.html`

La seconda bozza stabilisce il ritmo visivo generale. Non rappresenta copy o UI finali.

