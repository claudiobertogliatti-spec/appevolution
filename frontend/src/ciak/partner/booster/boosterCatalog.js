import {
  Video, Camera, Megaphone, PenLine, Sparkles,
  Bot, Compass, Wrench, Mail, Magnet,
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
    prezzo: "Su preventivo",
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
    tempi: "Variabili in base a durata e complessità: te li confermiamo nel preventivo.",
    investimento: "Su preventivo",
  },

  "shooting-fotografico": {
    id: "shooting-fotografico",
    name: "Shooting Fotografico",
    icon: Camera,
    beneficio: "Un servizio fotografico professionale coerente con il tuo brand.",
    idealePer: "Chi ha bisogno di foto sue di qualità per sito, social e funnel.",
    prezzo: "Su preventivo",
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
    tempi: "Da concordare: dipendono da location e disponibilità.",
    investimento: "Su preventivo",
  },

  "campagne-adv": {
    id: "campagne-adv",
    name: "Campagne ADV",
    icon: Megaphone,
    beneficio: "Pubblicità a pagamento gestita dal team per portarti traffico qualificato.",
    idealePer: "Chi ha il funnel pronto e vuole più persone giuste, subito.",
    prezzo: "Su preventivo (gestione) + budget ads a parte",
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
    tempi: "Setup in pochi giorni; la gestione è continuativa.",
    investimento: "Su preventivo (gestione) + budget ads a tuo carico",
  },

  "copywriting-premium": {
    id: "copywriting-premium",
    name: "Copywriting Premium",
    icon: PenLine,
    beneficio: "Testi di vendita scritti da un copywriter, pensati per convertire.",
    idealePer: "Chi vuole pagine ed email che convincono, senza scriverle da solo.",
    prezzo: "Su preventivo",
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
    tempi: "In base al numero di pagine: confermati nel preventivo.",
    investimento: "Su preventivo",
  },

  "contenuti-social-extra": {
    id: "contenuti-social-extra",
    name: "Contenuti Social Extra",
    icon: Sparkles,
    beneficio: "Contenuti social prodotti per te, oltre il piano editoriale standard.",
    idealePer: "Chi vuole pubblicare di più senza produrre tutto da solo.",
    prezzo: "Su preventivo",
    aCosaServe:
      "Il team produce contenuti social aggiuntivi (reel, post, caroselli) così mantieni costanza senza fermarti.",
    quandoTiServe: [
      "Hai il calendario ma non riesci a produrre tutto.",
      "Vuoi aumentare la frequenza di pubblicazione.",
      "Vuoi contenuti più curati graficamente.",
    ],
    comprende: [
      "Un pacchetto di contenuti extra (reel, post, caroselli).",
      "Grafiche coerenti con il tuo brand.",
      "Testi e didascalie pronti.",
      "Adattamento ai formati dei canali.",
    ],
    nonComprende: [
      "Gestione e pubblicazione quotidiana degli account.",
      "Risposte a commenti e messaggi.",
      "Advertising (vedi Campagne ADV).",
    ],
    output: "Un pacchetto di contenuti pronti da pubblicare.",
    tempi: "In base al numero di contenuti richiesti.",
    investimento: "Su preventivo",
  },

  "automazioni-ai": {
    id: "automazioni-ai",
    name: "Automazioni AI",
    icon: Bot,
    beneficio: "Automazioni e strumenti AI che lavorano al posto tuo sulle attività ripetitive.",
    idealePer: "Chi perde tempo in attività che si possono automatizzare.",
    prezzo: "Su preventivo",
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
    tempi: "In base alla complessità: confermati nel preventivo.",
    investimento: "Su preventivo",
  },

  "sessione-strategica": {
    id: "sessione-strategica",
    name: "Sessione Strategica 1:1",
    icon: Compass,
    beneficio: "Una sessione individuale per sbloccare una decisione o una fase.",
    idealePer: "Chi è fermo su una scelta e vuole una direzione chiara.",
    prezzo: "Su preventivo",
    aCosaServe:
      "Ti confronti 1:1 con il team su una decisione concreta (offerta, prezzo, lancio, priorità) e ne esci con un piano d'azione.",
    quandoTiServe: [
      "Sei bloccato e non sai quale mossa fare.",
      "Devi decidere prezzo, offerta o struttura del lancio.",
      "Vuoi un parere esterno prima di un passo importante.",
    ],
    comprende: [
      "Una call individuale dedicata.",
      "Analisi della tua situazione specifica.",
      "Un piano d'azione concreto e prioritizzato.",
      "Una sintesi scritta dei punti decisi.",
    ],
    nonComprende: [
      "L'esecuzione operativa di ciò che viene deciso.",
      "Percorsi di affiancamento continuativo (vedi EVO-S).",
    ],
    output: "Una direzione chiara e i prossimi passi messi nero su bianco.",
    tempi: "La call si fissa in base alle disponibilità.",
    investimento: "Su preventivo",
  },

  "setup-tecnico-extra": {
    id: "setup-tecnico-extra",
    name: "Setup Tecnico Extra",
    icon: Wrench,
    beneficio: "Configurazioni tecniche extra che non vuoi gestire da solo.",
    idealePer: "Chi ha bisogni tecnici specifici fuori dal setup standard.",
    prezzo: "Su preventivo",
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
    tempi: "In base all'intervento richiesto.",
    investimento: "Su preventivo",
  },

  "email-marketing-extra": {
    id: "email-marketing-extra",
    name: "Email Marketing Extra",
    icon: Mail,
    beneficio: "Creazione e gestione di email oltre le sequenze standard.",
    idealePer: "Chi vuole sfruttare davvero la propria lista contatti.",
    prezzo: "Su preventivo",
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
    tempi: "In base al volume richiesto.",
    investimento: "Su preventivo",
  },

  "lead-magnet-extra": {
    id: "lead-magnet-extra",
    name: "Lead Magnet Extra",
    icon: Magnet,
    beneficio: "Un nuovo strumento gratuito per attirare contatti qualificati.",
    idealePer: "Chi vuole far crescere la lista con un'offerta gratuita efficace.",
    prezzo: "Su preventivo",
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
    tempi: "In base al tipo di lead magnet.",
    investimento: "Su preventivo",
  },
};

export const BOOSTER_ORDER = [
  "video-premium",
  "shooting-fotografico",
  "campagne-adv",
  "copywriting-premium",
  "contenuti-social-extra",
  "automazioni-ai",
  "sessione-strategica",
  "setup-tecnico-extra",
  "email-marketing-extra",
  "lead-magnet-extra",
];
