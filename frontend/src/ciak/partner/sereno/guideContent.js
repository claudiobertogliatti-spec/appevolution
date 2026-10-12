// Guide per il partner. Testo di partenza da far rivedere al team prima di darlo per definitivo.
// Non contiene misure o promesse tecniche non verificate. I formati dei caroselli vengono da fonti pubbliche
// (verificate il 12/10/2026): Instagram e LinkedIn accettano 1080×1350 (4:5) e la prima slide decide il rapporto
// di tutte; su LinkedIn il carosello è un documento, di solito PDF.
export const VIDEO_DI_PROVA = []; // quando ci sono: { titolo, url } — la sezione compare solo se non è vuota

export const GUIDE = [
  {
    id: 'prima-di-registrare',
    titolo: 'Prima di registrare',
    intro: 'Cinque cose da controllare prima di premere rec. Ti bastano pochi minuti e il video verrà molto più professionale.',
    passi: [
      ['La distanza', 'Mettiti a una distanza che inquadri il mezzo busto: il viso resta ben visibile e hai spazio per muovere le mani. La camera all’altezza degli occhi.'],
      ['Lo sfondo', 'Scegli un muro o un angolo ordinato, senza cose che attirano l’occhio. Togli ciò che si muove o che non vuoi far vedere.'],
      ['La luce', 'Mettiti con la luce davanti a te (una finestra va benissimo), non dietro: se la luce è alle tue spalle il viso resta scuro.'],
      ['L’audio', 'È la cosa che si nota di più. Registra in una stanza silenziosa, senza eco, lontano da frigorifero, traffico e notifiche. Fai una prova di 10 secondi e riascoltala con le cuffie.'],
      ['Una prova prima', 'Registra 20 secondi, guardali dal telefono, poi parti. Se qualcosa non ti piace lo correggi adesso, non dopo mezz’ora di registrazione.'],
    ],
    nota: 'Se ti blocchi su un errore mentre parli, fermati un secondo e ripeti la frase da capo: al montaggio ci pensiamo noi.',
  },
  {
    id: 'reel',
    titolo: 'Come si fa un reel',
    intro: 'Un reel è un video breve in verticale. Una sola idea, detta bene.',
    passi: [
      ['Una sola idea', 'Scegli un solo messaggio: una domanda dei tuoi clienti, un errore comune, un consiglio pratico.'],
      ['Parti dal punto', 'Nei primi secondi dì subito di cosa parli e a chi serve. Niente presentazioni lunghe.'],
      ['Parla a una persona', 'Immagina di rispondere a un tuo cliente. Frasi corte, parole semplici.'],
      ['Aggiungi i sottotitoli', 'Molte persone guardano senza audio: i sottotitoli fanno la differenza.'],
      ['Chiudi con un invito', 'Una cosa sola da fare: segui, scrivimi, guarda la masterclass.'],
      ['Pubblicalo dove ti seguono', 'Instagram per primo; lo stesso video verticale lo puoi pubblicare anche su Facebook e LinkedIn, adattando la descrizione.'],
    ],
  },
  {
    id: 'carosello',
    titolo: 'Come si fa un carosello',
    intro: 'Un carosello è una serie di slide che si scorrono col dito. Funziona quando spieghi qualcosa in pochi passaggi.',
    passi: [
      ['Il formato', 'Usa 1080 × 1350 pixel (4:5, verticale) per tutte le slide. La prima slide decide il formato di tutte: devono avere lo stesso.'],
      ['La prima slide è la promessa', 'Un titolo chiaro: cosa imparerà chi legge. Se non incuriosisce, non scorrono.'],
      ['Una idea per slide', 'Poche parole, scritte grandi. Se una slide ha troppo testo, dividila in due.'],
      ['L’ultima slide è l’invito', 'Dì cosa fare dopo: salva, scrivimi, vai alla masterclass.'],
      ['Su Instagram e su Facebook', 'Carichi le immagini una dopo l’altra, nello stesso ordine.'],
      ['Su LinkedIn', 'Il carosello è un documento: esporta le slide in un unico PDF e caricalo come documento.'],
    ],
  },
];

export const PUBBLICAZIONE = 'Pubblichi tu i tuoi contenuti. Se preferisci non occupartene, puoi affidarli a noi come servizio extra.';
export const EXTRA_CONTENUTI = 'contenuti-social-extra';
