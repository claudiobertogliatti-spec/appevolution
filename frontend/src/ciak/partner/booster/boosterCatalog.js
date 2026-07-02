import {
  Video, Camera, Megaphone, PenLine, Sparkles,
  Bot, Compass, Wrench, Mail, Magnet, UserRound, Clapperboard,
} from "lucide-react";

/**
 * Catalogo Booster EVO — servizi extra facoltativi attivabili durante i 12 mesi
 * del Protocollo EVO. Acceleratori, non obblighi. Prezzo "su preventivo": la CTA
 * "Richiedi questo Booster" porta il partner al team di supporto.
 *
 * Ogni voce ha la struttura della pagina dettaglio:
 *  aCosaServe · quandoTiServe[] · comprende[] · nonComprende[] · output · tempi · investimento
 */

export const BOOSTER_CATALOG = {
  "video-premium": {
    id: "video-premium",
    name: "Video Premium",
    icon: Video,
    beneficio: "Video curati a livello professionale, oltre l'editing standard del percorso.",
    idealePer: "Chi vuole una qualità video superiore per masterclass, lezioni o promo.",
    prezzo: "590 €",
    investimento: "590 € una tantum",
    checkoutServiceId: "video-premium",
    aCosaServe:
      "Alza la qualità dei tuoi video oltre il montaggio incluso nel Protocollo: ritmo, grafiche, color e audio curati nei dettagli.",
    quandoTiServe: [
      "Stai per registrare una masterclass importante e vuoi un risultato impeccabile.",
      "Ti serve un video promo per il lancio o per le campagne pubblicitarie.",
      "I tuoi video sembrano amatoriali rispetto al messaggio che vendi.",
    ],
    comprende: [
      "Montaggio avanzato con tagli, ritmo e musica.",
      "Grafiche e titoli animati sul tuo brand.",
      "Color correction e pulizia dell'audio.",
      "Un round di revisione incluso.",
    ],
    nonComprende: [
      "Riprese in presenza (vedi Shooting Fotografico o Setup Tecnico).",
      "Scrittura dello script (vedi Copywriting Premium).",
      "Pubblicazione e advertising.",
    ],
    output: "Un video finito, pronto da pubblicare, nel formato che ti serve.",
    tempi: "Briefing dopo il pagamento, poi consegna in base alla durata del video.",
  },

  "avatar-videocorso": {
    id: "avatar-videocorso",
    name: "Avatar + Videocorso",
    icon: Clapperboard,
    beneficio: "Creiamo il tuo avatar AI e un videocorso breve pronto da caricare in piattaforma.",
    idealePer: "Chi vuole scalare la formazione senza registrare ogni lezione da zero.",
    prezzo: "1.490 €",
    investimento: "1.490 € una tantum",
    checkoutServiceId: "avatar-video-corso",
    aCosaServe:
      "Trasforma il tuo metodo in lezioni video professionali usando un avatar AI coerente con volto, voce e stile del tuo brand.",
    quandoTiServe: [
      "Vuoi costruire o completare un videocorso senza registrare tutto di persona.",
      "Hai bisogno di lezioni chiare, ordinate e uniformi nella qualità.",
      "Vuoi un asset formativo che rimane nel tempo e può essere riutilizzato.",
    ],
    comprende: [
      "Setup avatar AI con volto, voce e stile.",
      "Struttura del videocorso breve.",
      "Produzione fino a 5 lezioni con avatar.",
      "Script operativo e revisione inclusa.",
      "Call iniziale dopo il pagamento per bloccare direzione e calendario.",
    ],
    nonComprende: [
      "Produzione di un corso lungo oltre 5 lezioni senza accordo aggiuntivo.",
      "Gestione advertising o lancio commerciale.",
      "Licenze esterne non incluse nel pacchetto.",
    ],
    output: "Avatar impostato e videocorso breve pronto da caricare.",
    tempi: "Prima call prenotata dopo il pagamento; tempi produzione definiti in call.",
  },

  "shooting-fotografico": {
    id: "shooting-fotografico",
    name: "Shooting Fotografico",
    icon: Camera,
    beneficio: "Un servizio fotografico professionale coerente con il tuo brand.",
    idealePer: "Chi ha bisogno di foto sue di qualità per sito, social e funnel.",
    prezzo: "490 €",
    investimento: "490 € una tantum",
    checkoutServiceId: "shooting-fotografico",
    aCosaServe:
      "Ottieni un set di foto professionali, coerenti con il tuo posizionamento, da usare ovunque: pagine, social, materiali.",
    quandoTiServe: [
      "Le tue foto attuali sono di bassa qualità o disomogenee.",
      "Stai costruendo landing e social e ti servono immagini tue.",
      "Vuoi trasmettere autorevolezza al primo sguardo.",
    ],
    comprende: [
      "Sessione fotografica con un fotografo.",
      "Selezione e post-produzione degli scatti migliori.",
      "Foto pronte nei formati per sito, social e funnel.",
    ],
    nonComprende: [
      "Spostamenti fuori zona senza accordo preventivo.",
      "Noleggio di location particolari (a parte).",
      "Contenuti video (vedi Video Premium).",
    ],
    output: "Una galleria di foto professionali pronte all'uso.",
    tempi: "Prima call dopo il pagamento per definire data, location e scaletta.",
  },

  "campagne-adv": {
    id: "campagne-adv",
    name: "Campagne ADV",
    icon: Megaphone,
    beneficio: "Pubblicità a pagamento gestita dal team per portarti traffico qualificato.",
    idealePer: "Chi ha il funnel pronto e vuole più persone giuste, subito.",
    prezzo: "348 € / mese + budget ads",
    investimento: "348 € / mese + budget ads a tuo carico",
    checkoutServiceId: "gestione-campagne",
    aCosaServe:
      "Metti budget pubblicitario sul tuo funnel e lascialo gestire al team, perché porti contatti e vendite, non solo click.",
    quandoTiServe: [
      "Il funnel converte ma arrivano poche persone.",
      "Vuoi riempire un webinar o spingere un lancio.",
      "Vuoi smettere di dipendere solo dall'organico.",
    ],
    comprende: [
      "Setup delle campagne su Meta (e canali concordati).",
      "Struttura del pubblico e creatività di base.",
      "Monitoraggio e ottimizzazione continua.",
      "Report periodico su spesa e risultati.",
    ],
    nonComprende: [
      "Il budget pubblicitario (lo paghi tu alla piattaforma).",
      "Produzione di video/foto per le ads (vedi Booster dedicati).",
      "Garanzia di un numero preciso di vendite.",
    ],
    output: "Campagne attive e gestite, con un report chiaro su spesa e risultati.",
    tempi: "Prima call dopo il pagamento, setup in pochi giorni; gestione continuativa.",
  },

  "copywriting-premium": {
    id: "copywriting-premium",
    name: "Copywriting Premium",
    icon: PenLine,
    beneficio: "Testi di vendita scritti da un copywriter, pensati per convertire.",
    idealePer: "Chi vuole pagine ed email che convincono, senza scriverle da solo.",
    prezzo: "497 €",
    investimento: "497 € una tantum",
    checkoutServiceId: "copywriting-premium",
    aCosaServe:
      "Affidi al team i testi del tuo funnel (landing, pagina di vendita, email), scritti per vendere e non solo per informare.",
    quandoTiServe: [
      "Le tue pagine non convertono come vorresti.",
      "Non hai tempo o voglia di scrivere i testi.",
      "Stai per lanciare e vuoi un copy curato.",
    ],
    comprende: [
      "Scrittura di landing e/o pagina di vendita.",
      "Sequenza email di lancio o follow-up.",
      "Titoli e CTA ottimizzati.",
      "Un round di revisione incluso.",
    ],
    nonComprende: [
      "Impaginazione tecnica delle pagine (vedi Setup Tecnico Extra).",
      "Gestione delle email (vedi Email Marketing Extra).",
      "Strategia di posizionamento (già inclusa nel Protocollo).",
    ],
    output: "I testi pronti da inserire nelle tue pagine e nelle tue email.",
    tempi: "Prima call dopo il pagamento, poi consegna in base ai materiali da scrivere.",
  },

  "contenuti-social-extra": {
    id: "contenuti-social-extra",
    name: "Creazione contenuti Reel, Post e Caroselli",
    icon: Sparkles,
    beneficio: "Contenuti social prodotti per te: reel, post e caroselli pronti da pubblicare.",
    idealePer: "Chi vuole pubblicare di più senza produrre tutto da solo.",
    prezzo: "497 €",
    investimento: "497 € una tantum",
    checkoutServiceId: "contenuti-reel-post-caroselli",
    aCosaServe:
      "Il team produce un pacchetto di reel, post e caroselli seguendo il tuo calendario editoriale e il tuo posizionamento.",
    quandoTiServe: [
      "Hai il calendario ma non riesci a produrre tutto.",
      "Vuoi aumentare la frequenza di pubblicazione.",
      "Vuoi contenuti più curati graficamente.",
    ],
    comprende: [
      "4 reel brevi.",
      "4 post grafici.",
      "4 caroselli.",
      "Grafiche coerenti con il tuo brand.",
      "Testi e didascalie pronti.",
      "Call di allineamento dopo il pagamento.",
    ],
    nonComprende: [
      "Gestione e pubblicazione quotidiana degli account.",
      "Risposte a commenti e messaggi.",
      "Advertising (vedi Campagne ADV).",
    ],
    output: "12 contenuti social pronti da pubblicare.",
    tempi: "Prima call dopo il pagamento, poi calendario di consegna concordato.",
  },

  "automazioni-ai": {
    id: "automazioni-ai",
    name: "Automazioni AI",
    icon: Bot,
    beneficio: "Automazioni e strumenti AI che lavorano al posto tuo sulle attività ripetitive.",
    idealePer: "Chi perde tempo in attività che si possono automatizzare.",
    prezzo: "690 €",
    investimento: "690 € una tantum",
    checkoutServiceId: "automazioni-ai",
    aCosaServe:
      "Mettiamo in piedi automazioni (email, lead, follow-up, AI) che gestiscono per te le attività ripetitive del tuo sistema.",
    quandoTiServe: [
      "Rispondi a mano a domande sempre uguali.",
      "I lead si perdono perché manca un follow-up automatico.",
      "Vuoi un assistente AI sul tuo funnel o sul supporto.",
    ],
    comprende: [
      "Analisi dei processi da automatizzare.",
      "Setup delle automazioni (email, CRM, follow-up).",
      "Eventuali strumenti AI su misura.",
      "Test e messa in funzione.",
    ],
    nonComprende: [
      "Costi di strumenti e abbonamenti di terze parti.",
      "Gestione continuativa (salvo accordo).",
      "Creazione di contenuti (vedi Booster dedicati).",
    ],
    output: "Automazioni attive e funzionanti, documentate.",
    tempi: "Prima call dopo il pagamento, poi setup in base alla complessità.",
  },

  "sessione-strategica": {
    id: "sessione-strategica",
    name: "Consulenza strategica con Claudio",
    icon: UserRound,
    beneficio: "Sessioni individuali con Claudio per offerta, prezzo, lancio e direzione business.",
    idealePer: "Chi deve prendere decisioni strategiche e vuole una rotta chiara.",
    prezzo: "Da 299 €",
    investimento: "1 sessione 299 € · 3 sessioni 699 €",
    consultantId: "claudio",
    packages: [
      { label: "1 sessione", price: 299, checkoutServiceId: "consulenza-claudio-1" },
      { label: "3 sessioni", price: 699, checkoutServiceId: "consulenza-claudio-3", perSession: 233 },
    ],
    aCosaServe:
      "Ti confronti 1:1 con Claudio su offerta, posizionamento, prezzo, lancio o priorità strategiche e ne esci con un piano d'azione.",
    quandoTiServe: [
      "Sei bloccato e non sai quale mossa fare.",
      "Devi decidere prezzo, offerta o struttura del lancio.",
      "Vuoi un parere esterno prima di un passo importante.",
    ],
    comprende: [
      "Una sessione individuale dedicata.",
      "Analisi della tua situazione specifica.",
      "Un piano d'azione concreto e prioritizzato.",
      "Una sintesi scritta dei punti decisi.",
      "Calendario per bloccare la prima data utile dopo il pagamento.",
    ],
    nonComprende: [
      "L'esecuzione operativa di ciò che viene deciso.",
      "Esecuzione operativa delle attività decise.",
      "Percorsi di affiancamento continuativo (vedi Ciak Continuità).",
    ],
    output: "Una direzione chiara e i prossimi passi messi nero su bianco.",
    tempi: "Dopo il pagamento apri il calendario e blocchi la prima data utile.",
  },

  "consulenza-antonella": {
    id: "consulenza-antonella",
    name: "Consulenza contenuti con Antonella",
    icon: Compass,
    beneficio: "Sessioni individuali con Antonella per contenuti, reel, caroselli e calendario editoriale.",
    idealePer: "Chi vuole pubblicare meglio, con più costanza e meno confusione.",
    prezzo: "Da 179 €",
    investimento: "1 sessione 179 € · 3 sessioni 399 €",
    consultantId: "antonella",
    packages: [
      { label: "1 sessione", price: 179, checkoutServiceId: "consulenza-antonella-1" },
      { label: "3 sessioni", price: 399, checkoutServiceId: "consulenza-antonella-3", perSession: 133 },
    ],
    aCosaServe:
      "Ti aiuta a trasformare idee e calendario in contenuti pratici: reel, post, caroselli, tono di voce e ritmo editoriale.",
    quandoTiServe: [
      "Hai il calendario ma non riesci a trasformarlo in contenuti concreti.",
      "Vuoi migliorare reel, post e caroselli senza perdere settimane.",
      "Ti serve una guida operativa per pubblicare con più costanza.",
    ],
    comprende: [
      "Sessione individuale dedicata.",
      "Revisione calendario e contenuti.",
      "Idee pratiche per reel, post e caroselli.",
      "Azioni prioritarie da applicare subito.",
      "Calendario per bloccare la prima data utile dopo il pagamento.",
    ],
    nonComprende: [
      "Produzione dei contenuti al posto tuo (vedi Creazione contenuti).",
      "Gestione quotidiana dei social.",
    ],
    output: "Una direzione operativa chiara per pubblicare meglio.",
    tempi: "Dopo il pagamento apri il calendario e blocchi la prima data utile.",
  },

  "setup-tecnico-extra": {
    id: "setup-tecnico-extra",
    name: "Setup Tecnico Extra",
    icon: Wrench,
    beneficio: "Configurazioni tecniche extra che non vuoi gestire da solo.",
    idealePer: "Chi ha bisogni tecnici specifici fuori dal setup standard.",
    prezzo: "390 €",
    investimento: "390 € una tantum",
    checkoutServiceId: "setup-tecnico-extra",
    aCosaServe:
      "Il team esegue per te configurazioni tecniche aggiuntive: domini, integrazioni, pagamenti, strumenti particolari.",
    quandoTiServe: [
      "Ti serve un'integrazione non prevista dal percorso standard.",
      "Hai un problema tecnico che ti blocca.",
      "Vuoi collegare strumenti esterni al tuo funnel.",
    ],
    comprende: [
      "Analisi della configurazione necessaria.",
      "Setup tecnico (domini, integrazioni, pagamenti, ecc.).",
      "Test di funzionamento.",
      "Istruzioni per l'uso.",
    ],
    nonComprende: [
      "Licenze e abbonamenti di strumenti esterni.",
      "Sviluppo software su misura complesso.",
      "Manutenzione continuativa (salvo accordo).",
    ],
    output: "La configurazione tecnica pronta e funzionante.",
    tempi: "Prima call dopo il pagamento, poi intervento in base alla configurazione.",
  },

  "email-marketing-extra": {
    id: "email-marketing-extra",
    name: "Email Marketing Extra",
    icon: Mail,
    beneficio: "Creazione e gestione di email oltre le sequenze standard.",
    idealePer: "Chi vuole sfruttare davvero la propria lista contatti.",
    prezzo: "390 €",
    investimento: "390 € una tantum",
    checkoutServiceId: "email-marketing-extra",
    aCosaServe:
      "Il team crea e gestisce email aggiuntive (newsletter, sequenze, promozioni) per vendere alla tua lista nel tempo.",
    quandoTiServe: [
      "Hai una lista ma non la sfrutti.",
      "Vuoi una newsletter costante senza scriverla tu.",
      "Stai preparando una promozione o un nuovo lancio.",
    ],
    comprende: [
      "Creazione di sequenze o newsletter extra.",
      "Scrittura e impostazione delle email.",
      "Segmentazione della lista.",
      "Report su aperture e click.",
    ],
    nonComprende: [
      "Il costo della piattaforma email.",
      "Gestione completa h24 (salvo accordo).",
      "Generazione di nuovi contatti (vedi Lead Magnet o Campagne ADV).",
    ],
    output: "Email pronte e/o gestite, con report sui risultati.",
    tempi: "Prima call dopo il pagamento, poi consegna in base al volume richiesto.",
  },

  "lead-magnet-extra": {
    id: "lead-magnet-extra",
    name: "Lead Magnet Extra",
    icon: Magnet,
    beneficio: "Un nuovo strumento gratuito per attirare contatti qualificati.",
    idealePer: "Chi vuole far crescere la lista con un'offerta gratuita efficace.",
    prezzo: "490 €",
    investimento: "490 € una tantum",
    checkoutServiceId: "lead-magnet-extra",
    aCosaServe:
      "Creiamo un lead magnet (guida, checklist, mini-corso, webinar) che attira nel tuo funnel i contatti giusti.",
    quandoTiServe: [
      "Le iscrizioni sono poche e ti serve più ingresso.",
      "Vuoi un regalo gratuito che attiri il pubblico giusto.",
      "Stai per fare ads e ti serve un punto d'ingresso forte.",
    ],
    comprende: [
      "Ideazione del lead magnet sul tuo pubblico.",
      "Creazione del contenuto e della grafica.",
      "Pagina di iscrizione collegata al funnel.",
      "Email di consegna.",
    ],
    nonComprende: [
      "Gestione delle ads per promuoverlo (vedi Campagne ADV).",
      "Sequenze email avanzate (vedi Email Marketing Extra).",
    ],
    output: "Un lead magnet pronto, collegato al tuo sistema di raccolta contatti.",
    tempi: "Prima call dopo il pagamento, poi produzione in base al formato scelto.",
  },
};

export const BOOSTER_ORDER = [
  "avatar-videocorso",
  "video-premium",
  "shooting-fotografico",
  "campagne-adv",
  "copywriting-premium",
  "contenuti-social-extra",
  "automazioni-ai",
  "sessione-strategica",
  "consulenza-antonella",
  "setup-tecnico-extra",
  "email-marketing-extra",
  "lead-magnet-extra",
];
