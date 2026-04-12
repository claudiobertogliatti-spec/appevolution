import React, { useState } from "react";
import {
  Gift, BookOpen, ChevronRight, Check,
  Target, Clock, Rocket, Megaphone, Users, Lightbulb,
  ArrowLeft, CheckCircle, AlertTriangle
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONTENUTO REALE — capitolo per capitolo
// chiave: `${bonusId}_${chapterId}`
// ─────────────────────────────────────────────────────────────────────────────
const BONUS_CONTENT = {

  // ══════════════════════════════════════════════════════
  // BONUS 1 — Il Blueprint Che Evita il Fallimento del 90%
  // ══════════════════════════════════════════════════════
  "1_intro": {
    paragraphs: [
      "La maggior parte dei videocorsi fallisce prima ancora di essere registrata. Non per mancanza di competenza, non per cattiva volontà. Per mancanza di struttura.",
      "Il professionista che crea un corso tende a voler trasmettere tutto ciò che sa. Anni di esperienza compressi in decine di ore di video. Il risultato è un corso che nessuno completa, che genera recensioni tiepide e che non si vende in modo costante.",
      "Questo bonus ti mostra la struttura che differenzia i corsi che vendono da quelli che rimangono sul server a prendere polvere digitale.",
    ],
    insight: "Non è la quantità di contenuto che vende un corso. È la chiarezza del risultato che promette.",
    keyPoints: [
      "Il 90% dei corsi fallisce per eccesso di contenuto, non per carenza",
      "Un corso che non si completa genera recensioni negative anche se il contenuto è ottimo",
      "La struttura si decide prima di registrare la prima lezione",
      "Il titolo del corso deve comunicare il risultato, non la materia",
    ],
  },
  "1_cap1": {
    paragraphs: [
      "Il vero nemico non è la concorrenza. Non è il mercato saturo. Non è il fatto che 'ormai ce ne sono già troppi di corsi'. Il vero nemico è la confusione tra 'so tanto' e 'posso insegnare tutto'.",
      "Quando un esperto crea un corso, il suo istinto è includere tutto ciò che sa. Dopotutto, più contenuto = più valore, no? Sbagliato. Chi compra il tuo corso non vuole sapere tutto ciò che sai. Vuole risolvere un problema specifico nel minor tempo possibile.",
      "Un corso da 40 ore che copre ogni sfumatura dell'argomento compete con un corso da 6 ore che porta il cliente esattamente dove vuole andare. Indovina quale dei due vince.",
    ],
    insight: "Il cliente che abbandona il corso a metà non lascerà una recensione positiva, anche se il contenuto che non ha visto era eccellente.",
    keyPoints: [
      "Più ore di corso non equivale a più valore percepito",
      "Il tasso di completamento è l'indicatore più importante della qualità",
      "Un corso completato al 100% vende 3x più del corso 'completo' non finito",
      "La brevità non è un limite: è un vantaggio competitivo",
    ],
  },
  "1_cap2": {
    paragraphs: [
      "Un corso accumula contenuti. Un percorso trasporta qualcuno da A a B. La differenza sembra semantica, ma è strutturale — e cambia tutto: come costruisci il contenuto, come lo vendi, come lo valuta chi lo compra.",
      "Chi compra un corso di fotografia non vuole 'capire la fotografia'. Vuole saper fare ritratti professionali con la fotocamera che ha già. Il punto A è definito ('non so come impostare l'esposizione manuale'). Il punto B è definito ('faccio ritratti in luce naturale con risultati professionali'). Il percorso collega i due punti nel modo più diretto possibile.",
      "Ogni modulo del tuo corso deve corrispondere a un passo specifico del percorso. Se un modulo non avvicina lo studente al punto B, è contenuto extra che rallenta, non arricchisce.",
    ],
    insight: "Definisci il punto B prima ancora di pensare al contenuto. Se non sai dove vuoi portare il tuo studente, non puoi costruire il percorso.",
    keyPoints: [
      "Punto A = la situazione attuale dello studente ideale",
      "Punto B = il risultato specifico che ottiene completando il corso",
      "Ogni modulo = un ostacolo superato nel percorso da A a B",
      "Tutto ciò che non è sul percorso diretto A→B va eliminato",
    ],
  },
  "1_cap3": {
    paragraphs: [
      "L'errore più comune nella costruzione di un corso: costruire il contenuto seguendo la logica della materia invece di seguire il percorso mentale dello studente.",
      "Un commercialista che crea un corso di contabilità per piccoli imprenditori tende a partire dalle basi teoriche: cos'è un bilancio, la partita doppia, le norme fiscali. Ma il suo cliente ideale non vuole capire la contabilità — vuole smettere di avere paura di guardare i numeri della sua attività. Sono due percorsi completamente diversi.",
      "Il contenuto giusto è quello che risponde alle domande che il tuo cliente ideale si sta già facendo, nell'ordine in cui se le fa. Non l'ordine logico della materia. L'ordine psicologico del problema.",
    ],
    insight: "Inizia dal momento in cui il tuo cliente è più frustrato. Da lì costruisci all'indietro verso le basi e in avanti verso la soluzione.",
    keyPoints: [
      "La sequenza del corso deve seguire il percorso emotivo dello studente",
      "Le basi teoriche vengono dopo la motivazione iniziale, non prima",
      "Ogni lezione risponde a una domanda che il cliente si sta già facendo",
      "Elimina le lezioni 'prerequisites' che rallentano l'arrivo al primo risultato",
    ],
  },
  "1_cap4": {
    paragraphs: [
      "Prima di registrare una sola lezione, rispondi per iscritto a queste due domande: Dove si trova esattamente il mio studente ideale oggi? Dove vuole essere dopo aver completato il corso?",
      "Il punto A non è 'non sa fare X'. È specifico: 'Gestisce la sua attività da 5 anni, ha 20-30k€ di fatturato annuo, passa 3 ore a settimana a fare manualmente cose che potrebbero essere automatizzate, non sa da dove iniziare con il digitale e ha già fallito un tentativo fai-da-te con WordPress'.",
      "Più sei preciso nel definire il punto A, più il tuo corso risuonerà con chi si trova esattamente in quella situazione. E chi si riconosce nel punto A è già convinto di comprare prima ancora di leggere la sales page.",
    ],
    insight: "La descrizione del punto A nella tua sales page è più potente di qualsiasi promessa. Chi si riconosce nel problema ha già comprato nella sua mente.",
    keyPoints: [
      "Il punto A deve essere così preciso che chi lo legge pensa 'sta parlando di me'",
      "Il punto B deve essere misurabile o verificabile (non 'capire meglio', ma 'fare X in Y tempo')",
      "La distanza tra A e B determina il prezzo percepito del corso",
      "Descrivi A e B prima di aprire qualsiasi tool per creare il corso",
    ],
  },
  "1_cap5": {
    paragraphs: [
      "I moduli non sono capitoli di un libro. Ogni modulo è una milestone: un traguardo intermedio che lo studente raggiunge nel percorso da A a B. E come ogni traguardo, deve essere verificabile.",
      "Un buon modulo ha questa struttura: inizia con il problema specifico che risolve, fornisce gli strumenti per risolverlo, termina con un'azione concreta da eseguire. Lo studente che completa il modulo deve poter dire 'ho fatto X' — non 'ho capito X'.",
      "Numero ottimale di moduli: tra 4 e 7. Meno di 4 e il corso sembra superficiale. Più di 7 e diventa difficile da vendere perché la complessità spaventa chi deve scegliere se comprarlo.",
    ],
    insight: "Il titolo di ogni modulo dovrebbe essere il risultato che si ottiene, non l'argomento che si studia. 'Imposta il tuo primo funnel in 30 minuti' batte 'Introduzione al marketing automation'.",
    keyPoints: [
      "Ogni modulo risolve un ostacolo specifico nel percorso",
      "Il modulo termina sempre con un'azione concreta e verificabile",
      "4-7 moduli è la finestra ottimale",
      "I titoli dei moduli comunicano risultati, non argomenti",
    ],
  },
  "1_cap6": {
    paragraphs: [
      "Eccolo, il blueprint completo in 5 punti. Usalo come checklist ogni volta che costruisci un nuovo corso o rivedi uno esistente.",
      "Punto 1: Definisci il risultato finale (non il contenuto). Cosa sa fare il tuo studente dopo il corso che non sapeva fare prima? Punto 2: Identifica i 3-5 ostacoli principali tra A e B. Cosa impedisce al tuo studente di arrivarci da solo? Punto 3: Costruisci un modulo per ciascun ostacolo — il modulo esiste per abbattere quell'ostacolo, nient'altro.",
      "Punto 4: Ogni modulo termina con una mini-trasformazione verificabile. Lo studente deve poter dimostrare a se stesso di aver superato quell'ostacolo. Punto 5: Il corso finisce quando B è raggiungibile. Non quando hai detto tutto quello che sai. Non quando ti senti soddisfatto del contenuto. Quando lo studente ha gli strumenti per arrivare a B.",
    ],
    insight: "Un corso costruito su questo blueprint si vende più facilmente perché la sales page scrive da sola: problema → ostacoli → soluzione → risultato.",
    keyPoints: [
      "Blueprint: risultato finale → ostacoli → moduli → mini-trasformazioni → B raggiungibile",
      "Non aggiungere contenuto dopo aver completato il blueprint senza una ragione precisa",
      "Rileggilo ogni volta che senti la tentazione di 'aggiungere un modulo extra'",
      "Questo framework funziona per qualsiasi settore e qualsiasi livello di prezzo",
    ],
  },
  "1_checklist": {
    isChecklist: true,
    items: [
      "Ho definito chiaramente chi è il mio studente ideale (punto A con dettagli precisi)",
      "Ho definito il risultato finale misurabile (punto B verificabile)",
      "Il mio corso ha massimo 5-7 moduli principali",
      "Ogni modulo elimina un ostacolo specifico nel percorso A→B",
      "Ogni modulo termina con un'azione concreta da eseguire",
      "Il titolo del corso comunica il risultato, non il contenuto",
      "Ho eliminato tutto il contenuto 'interessante ma non necessario'",
      "I titoli dei moduli descrivono risultati, non argomenti",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 2 — Argomenti che Vendono Ed Eliminare il Superfluo
  // ══════════════════════════════════════════════════════
  "2_intro": {
    paragraphs: [
      "Hai competenze in 20 argomenti diversi. Potresti parlare di 15. Dovresti insegnare al massimo 3-5. Ne venderai bene 1-2. Questo è il paradosso dell'esperto: più sai, più è difficile scegliere cosa insegnare.",
      "La tentazione di includere tutto nasce da una preoccupazione legittima: e se il cliente volesse qualcosa che non ho incluso? E se il corso sembrasse 'troppo poco'? Questa paura porta a corsi sovraccarichi che non convertono e non si completano.",
      "La scelta degli argomenti non è un dettaglio creativo: è la decisione strategica più importante di tutto il progetto.",
    ],
    insight: "I corsi che vendono di più non sono i più completi. Sono i più specifici. La specializzazione non limita il mercato: lo definisce.",
    keyPoints: [
      "Meno argomenti = più chiarezza = più vendite",
      "La specificità è un vantaggio competitivo, non una limitazione",
      "Il cliente vuole la soluzione al suo problema preciso, non un'enciclopedia",
      "Scegliere cosa escludere è tanto importante quanto scegliere cosa includere",
    ],
  },
  "2_cap1": {
    paragraphs: [
      "I corsi che vendono di più non sono quelli più completi. Sono quelli più specifici. 'Come aumentare i clienti per commercialisti usando LinkedIn' batte ogni volta 'Marketing per professionisti'.",
      "La specificità fa paura perché sembra restringere il mercato. In realtà lo definisce. Quando qualcuno cerca una soluzione al suo problema preciso e trova esattamente quello, non confronta i prezzi: compra.",
      "Chi cerca 'marketing per professionisti' è in fase esplorativa. Chi cerca 'come trovare nuovi clienti commercialisti senza passaparola' sa già cosa vuole e ha una carta di credito in mano.",
    ],
    insight: "Ogni parola in più nel titolo del corso riduce la precisione del target e aumenta la difficoltà di vendita.",
    keyPoints: [
      "Più il problema è specifico, meno c'è concorrenza",
      "Un cliente che si riconosce nel problema non cerca alternative",
      "La specificità giustifica prezzi più alti (soluzione su misura vs. corso generico)",
      "Testa la specificità: se il tuo corso va bene a tutti, non va bene a nessuno",
    ],
  },
  "2_cap2": {
    paragraphs: [
      "Per scegliere gli argomenti giusti, usa questo filtro in tre domande. Prima domanda: il mio cliente ideale sta cercando attivamente una soluzione a questo problema? Se la risposta è no, non c'è mercato.",
      "Seconda domanda: è disposto a pagare per risolverlo? Ci sono problemi che le persone hanno ma non reputano urgenti abbastanza da pagare. Il test: se offrissi la soluzione gratis, la userebbero immediatamente? Se la risposta è no, il problema non è abbastanza doloroso.",
      "Terza domanda: posso portare il cliente al risultato in modo verificabile? Se non riesci a definire il risultato in modo misurabile, non riesci nemmeno a venderlo. 'Capire meglio il marketing' non è un risultato. 'Generare i tuoi primi 3 preventivi qualificati al mese' è un risultato.",
    ],
    insight: "Se non supera tutti e tre i filtri, l'argomento non è quello giusto — indipendentemente da quanto sei bravo a trattarlo.",
    keyPoints: [
      "Filtro 1: Il cliente lo cerca attivamente? (validazione della domanda)",
      "Filtro 2: È disposto a pagare? (validazione dell'urgenza)",
      "Filtro 3: Il risultato è misurabile? (validazione della promessa)",
      "Un argomento che supera tutti e tre i filtri si vende praticamente da solo",
    ],
  },
  "2_cap3": {
    paragraphs: [
      "Cosa tagliare: tutto ciò che è 'interessante per me' e non 'urgente per il cliente'. Questa distinzione elimina il 40-60% del contenuto che stai pianificando di inserire.",
      "Taglia i prerequisiti: il cliente non vuole imparare le basi teoriche, vuole il risultato. Se le basi sono indispensabili, includile nel minimo necessario all'interno del modulo in cui servono, non come modulo separato all'inizio.",
      "Taglia le eccezioni e i casi particolari. Ogni 'però dipende da' e 'a meno che non' che aggiungi confonde il messaggio principale. Inserisci le eccezioni solo se il cliente si imbatterà in esse nel 50% o più dei casi. Altrimenti sono rumore.",
    ],
    insight: "Ogni contenuto che aggiungi ha un costo: riduce l'attenzione disponibile per il contenuto che conta davvero.",
    keyPoints: [
      "Taglia ciò che è interessante per te ma non urgente per il cliente",
      "Le basi teoriche vanno inserite solo dove servono, non come modulo introduttivo",
      "Le eccezioni si inseriscono solo se il cliente le incontrerà nel 50%+ dei casi",
      "Meno contenuto completato > più contenuto ignorato",
    ],
  },
  "2_checklist": {
    isChecklist: true,
    items: [
      "Ho identificato i 3 problemi più urgenti del mio cliente ideale",
      "Ho scelto il problema che so risolvere meglio di chiunque altro",
      "Ho applicato il filtro in 3 domande a ogni argomento che volevo includere",
      "Ho eliminato gli argomenti 'interessanti' che non superano il filtro",
      "Il titolo del mio corso descrive la soluzione, non la materia",
      "Ho verificato che il cliente cerchi attivamente questa soluzione (ricerche Google, gruppi Facebook, domande nei forum)",
      "Il risultato promesso è misurabile e verificabile",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 3 — Durata delle Lezioni
  // ══════════════════════════════════════════════════════
  "3_intro": {
    paragraphs: [
      "Quante volte hai iniziato un corso online e l'hai abbandonato a metà? Nella maggior parte dei casi la ragione non è che il contenuto era scarso. È che le lezioni erano troppo lunghe per come le stavi fruendo.",
      "La durata delle lezioni non è un dettaglio tecnico che si decide alla fine. È una delle principali cause di abbandono e, di riflesso, di recensioni negative e mancate vendite future.",
      "Chi crea un corso tende a registrare le lezioni come farebbe in aula: sessioni da 30-60 minuti. Chi studia online si comporta in modo completamente diverso.",
    ],
    insight: "Il completamento di un corso è il tuo principale asset di marketing. Ogni studente che lo completa è un potenziale testimonial e cliente futuro.",
    keyPoints: [
      "Il tasso di completamento impatta direttamente le vendite future",
      "Lezioni lunghe non equivale a più valore: equivale a più abbandono",
      "Il formato della lezione deve adattarsi a come le persone fruiscono i contenuti online",
      "La durata ottimale non è la stessa per tutti i tipi di contenuto",
    ],
  },
  "3_cap1": {
    paragraphs: [
      "Chi studia online non è seduto a una scrivania con un quaderno. È nel tragitto in treno, è in pausa pranzo, è sul divano dopo cena con il telefono in mano mentre la TV è accesa in sottofondo.",
      "L'attenzione disponibile per lo studio online è frammentata per definizione. Non è una questione di disciplina o motivazione: è la struttura del contesto. Chi studia online spezza la sessione più volte, riprende da dove ha lasciato, salta avanti e indietro.",
      "La lezione ideale non è quella che dura il tempo necessario a spiegare l'argomento. È quella che si riesce a completare in una singola sessione di attenzione frammentata — e che lascia lo studente con un'azione concreta da eseguire prima della prossima lezione.",
    ],
    insight: "Progetta le lezioni per chi le studia sul telefono in pausa pranzo, non per chi ha due ore libere davanti al computer.",
    keyPoints: [
      "L'attenzione online è frammentata per struttura, non per pigrizia",
      "La lezione deve essere completabile in una singola sessione realistica",
      "Il momento più frequente di studio online: trasporti, pausa pranzo, sera tardi",
      "Lo studente che interrompe a metà raramente riprende esattamente da dove aveva lasciato",
    ],
  },
  "3_cap2": {
    paragraphs: [
      "La durata ottimale per le lezioni di un corso online è tra 8 e 12 minuti. Non 45 minuti come i video universitari. Non 2 minuti come i reel. La finestra 8-12 minuti è quella in cui uno studente può dire 'finisco questo' senza sentirsi in colpa per interrompere.",
      "Sotto gli 8 minuti il contenuto tende a essere superficiale o frammentato in troppi micro-pezzi che l'utente fatica a connettere. Sopra i 15 minuti il tasso di completamento cala drasticamente — anche con contenuto eccellente.",
      "Per contenuti pratici che richiedono dimostrazione (tutorial, walkthrough) puoi arrivare fino a 15-18 minuti. Ma ogni minuto sopra i 12 deve guadagnarsi il suo posto — non esserci perché hai ancora cose da dire.",
    ],
    insight: "La regola pratica: se una lezione dura più di 15 minuti, hai probabilmente due lezioni in una. Dividila.",
    keyPoints: [
      "Finestra ottimale: 8-12 minuti per lezioni standard",
      "Massimo 15-18 minuti per contenuti pratici con dimostrazione",
      "Lezione > 15 minuti = probabilmente due lezioni in una",
      "La durata percepita è più importante di quella reale (introduzione e ritmo contano)",
    ],
  },
  "3_cap3": {
    paragraphs: [
      "La struttura efficace di ogni lezione segue questo schema in tre parti. Prima parte — Hook (30-60 secondi): perché questa lezione è importante per lo studente. Non 'oggi parleremo di X'. Ma 'dopo questa lezione sarai in grado di fare Y senza dover X'.",
      "Seconda parte — Contenuto principale (6-9 minuti): un solo concetto principale, spiegato e dimostrato. Un solo concetto. Se hai due concetti, hai due lezioni. La chiarezza del singolo concetto è più preziosa della completezza.",
      "Terza parte — Applicazione (1-2 minuti): cosa fare subito. Non 'nella prossima lezione vedremo'. Ma 'prima di andare avanti, fai questo: [azione specifica]'. Lo studente che esegue un'azione concreta ha già investito nella trasformazione.",
    ],
    insight: "Una lezione = un concetto = un'azione. Tutto il resto è introduzione da tagliare o approfondimento da spostare in un modulo avanzato.",
    keyPoints: [
      "Hook in 60 secondi: perché questa lezione cambia qualcosa per lo studente",
      "Un solo concetto principale per lezione, senza eccezioni",
      "Ogni lezione termina con un'azione concreta e specifica",
      "L'azione finale trasforma l'ascolto passivo in apprendimento attivo",
    ],
  },
  "3_checklist": {
    isChecklist: true,
    items: [
      "Ogni lezione dura tra 8 e 12 minuti (max 15-18 per tutorial pratici)",
      "Ogni lezione trasmette un solo concetto principale",
      "Ogni lezione termina con un'azione concreta da eseguire",
      "Nessuna lezione ha un'introduzione generica superiore a 60 secondi",
      "I titoli delle lezioni descrivono il risultato, non l'argomento",
      "Ho diviso le lezioni originariamente > 15 minuti in due lezioni separate",
      "Ho eliminato le lezioni 'prerequisiti' iniziali non indispensabili",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 4 — Funnel di Vendita: La Struttura Minima
  // ══════════════════════════════════════════════════════
  "4_intro": {
    paragraphs: [
      "Puoi avere il miglior corso del mondo. Se non hai un funnel, non vendi. Il funnel non è una tecnica di marketing sofisticata: è il sistema che trasforma un estraneo in un cliente.",
      "Senza un funnel, le vendite dipendono dalla tua energia personale: quando promuovi, vendi; quando smetti, vendi meno. Un funnel trasforma la vendita da evento occasionale a processo sistematico.",
      "La buona notizia: il funnel minimo che funziona è molto più semplice di quello che probabilmente stai immaginando.",
    ],
    insight: "Il funnel non serve a convincere le persone che non vogliono comprare. Serve a rendere facile l'acquisto per chi già vuole comprare.",
    keyPoints: [
      "Senza funnel le vendite dipendono dalla tua energia: sistema vs. fatica manuale",
      "Il funnel minimo funziona: la complessità si aggiunge solo con i dati",
      "Il funnel converte chi è già interessato, non convince chi non lo è",
      "Un funnel semplice che funziona vale infinitamente più di uno complesso che non parte mai",
    ],
  },
  "4_cap1": {
    paragraphs: [
      "Un funnel è il percorso guidato che porta qualcuno dalla prima impressione all'acquisto. È composto da step sequenziali, ognuno con un solo obiettivo: preparare il passo successivo.",
      "Il funnel non è magia né manipolazione. È logica applicata alla vendita: le persone non comprano dalla prima volta che sentono parlare di te. Hanno bisogno di fiducia, e la fiducia si costruisce attraverso touchpoint ripetuti e coerenti.",
      "Ogni step del funnel ha un tasso di conversione. Quando un funnel non vende, non è un problema del prodotto — è un problema di uno step specifico. Questa è la differenza tra avere un sistema e affidarsi all'istinto.",
    ],
    insight: "Un funnel misurabile ti dice esattamente dove perdi i potenziali clienti. Senza funnel, sai solo che non vendi — non perché.",
    keyPoints: [
      "Il funnel è una sequenza di step con obiettivi singoli e misurabili",
      "La fiducia si costruisce attraverso touchpoint ripetuti, non in un singolo incontro",
      "Ogni step del funnel ha un tasso di conversione migliorabile",
      "Un problema di vendita è sempre un problema di uno step specifico del funnel",
    ],
  },
  "4_cap2": {
    paragraphs: [
      "Il funnel minimo indispensabile ha quattro elementi. Primo: un lead magnet — qualcosa di gratuito e specifico che attira esattamente le persone che potrebbero comprare il tuo corso. Non un ebook generico: una checklist, un mini-corso, una guida pratica che risolve un problema piccolo e urgente.",
      "Secondo: una sequenza email di 4-5 messaggi. Non serve una newsletter, non serve inviare ogni giorno. Serve una sequenza automatica che costruisce fiducia e presenta l'offerta nel momento giusto.",
      "Terzo: una sales page con l'offerta. Non una landing page generica: una pagina che descrive il problema del cliente, presenta la soluzione, mostra il risultato, gestisce le obiezioni e invita all'acquisto. Quarto: una pagina di ringraziamento che conferma l'acquisto e dice cosa succede adesso.",
    ],
    insight: "Aggiungi elementi al funnel solo dopo aver dati che giustificano il cambiamento. Prima fai funzionare il minimo, poi ottimizza.",
    keyPoints: [
      "Lead magnet: specifico, gratuito, risolve un problema piccolo e urgente",
      "Sequenza email: 4-5 messaggi automatici di costruzione della fiducia",
      "Sales page: problema → soluzione → risultato → obiezioni → acquisto",
      "Non aggiungere complessità prima di avere dati reali di conversione",
    ],
  },
  "4_cap3": {
    paragraphs: [
      "La sequenza email minima che funziona per la maggior parte dei corsi: Email 1, giorno 0 — consegna il lead magnet e presentati in tre righe. Non la tua storia di vita: chi sei, cosa fai, quale risultato aiuti a ottenere.",
      "Email 2, giorno 2 — il problema principale del tuo cliente. Non la soluzione: il problema. Descrivilo in modo così preciso che chi lo legge pensa 'sta parlando di me'. Email 3, giorno 4 — il tuo metodo. Come risolvi il problema, quali sono i passi, perché funziona.",
      "Email 4, giorno 6 — la tua offerta. Presenta il corso, il prezzo, il risultato. Niente urgenza artificiale, niente scarsità falsa: solo l'offerta chiara. Email 5, giorno 8 — reminder. Chi non ha comprato non ha visto l'email 4, non ha avuto tempo, o aveva un'obiezione. Questa email risponde alle obiezioni più comuni.",
    ],
    insight: "La sequenza in 5 email non è la più sofisticata sul mercato. È quella che un professionista può costruire in un giorno e che funziona dall'inizio.",
    keyPoints: [
      "Email 1 (giorno 0): lead magnet + chi sei in 3 righe",
      "Email 2 (giorno 2): il problema del cliente, descritto con precisione",
      "Email 3 (giorno 4): il tuo metodo, in modo semplice",
      "Email 4 (giorno 6): l'offerta chiara e diretta",
      "Email 5 (giorno 8): risposta alle obiezioni principali",
    ],
  },
  "4_cap4": {
    paragraphs: [
      "Il primo errore: costruire una landing page prima di avere traffico da portarci. Una landing page senza traffico è una vetrina in un vicolo deserto. Prima il traffico (anche organico, anche piccolo), poi la landing.",
      "Il secondo errore: creare 20 email di benvenuto prima di sapere quale converte. Inizia con 5. Quando hai dati, ottimizza le email che hanno tasso di apertura basso o nessun click. Non costruire un castello senza sapere se le fondamenta reggono.",
      "Il terzo errore: usare tool troppo complessi prima di validare l'offerta. Systeme.io, ActiveCampaign, Kajabi — tutti ottimi, tutti inutili se l'offerta non è validata. Il tool più semplice che fa quello di cui hai bisogno adesso è sempre la scelta giusta.",
    ],
    insight: "La complessità prematura è il killer silenzioso dei lanci. Il perfetto nemico del pronto.",
    keyPoints: [
      "Prima il traffico (anche piccolo e organico), poi la landing page",
      "Inizia con 5 email: ottimizza con i dati, non con le ipotesi",
      "Usa il tool più semplice che risolve il problema attuale",
      "Valida l'offerta prima di investire in tecnologia o advertising",
    ],
  },
  "4_checklist": {
    isChecklist: true,
    items: [
      "Ho un lead magnet specifico e utile per il mio target (non generico)",
      "Il lead magnet risolve un problema piccolo e urgente del mio cliente ideale",
      "Ho una sequenza di almeno 4 email automatiche configurata",
      "Ho una sales page con problema, soluzione, risultato e gestione obiezioni",
      "So come portare traffico sulla mia landing page (social, SEO, partnership)",
      "Ho testato l'intero percorso come se fossi un cliente (dalla prima email al pagamento)",
      "Ho dati di conversione reali prima di aumentare la complessità del funnel",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 5 — ADV: Quando Funzionano e Quando Sono Solo Spreco
  // ══════════════════════════════════════════════════════
  "5_intro": {
    paragraphs: [
      "'Faccio un po' di ads e vedo cosa succede.' È la frase che ha bruciato più soldi nella storia del digital marketing italiano. La pubblicità a pagamento non è una leva magica: è un amplificatore.",
      "Un amplificatore amplifica ciò che c'è. Se il tuo funnel converte, gli ads portano più persone nel funnel e moltiplicano i risultati. Se il funnel non converte, gli ads portano più persone a non convertire — e ti fanno pagare per ogni persona che non compra.",
      "Prima di investire un euro in pubblicità, devi rispondere onestamente a una domanda: il mio funnel funziona già?",
    ],
    insight: "Gli ads non risolvono un problema di prodotto o di funnel. Lo amplificano. Se perdi €10 per ogni €100 di ads, con €1000 perdi €100.",
    keyPoints: [
      "La pubblicità amplifica ciò che già esiste — in positivo e in negativo",
      "Un funnel non validato + ads = perdita accelerata di denaro",
      "Gli ads hanno senso solo dopo la validazione organica dell'offerta",
      "Il costo di acquisizione clienti (CAC) deve essere inferiore al margine del corso",
    ],
  },
  "5_cap1": {
    paragraphs: [
      "Il mito più diffuso: con €500 di ads puoi lanciare un corso da zero. La realtà: con €500 di ads su un corso non validato puoi comprare dati — non vendite. E i dati che compri ti dicono solo che la tua audience attuale non converte con il messaggio attuale.",
      "Gli ads funzionano quando hai già tre cose: un'offerta validata (qualcuno ha già pagato per essa), un messaggio che converte (sai quale frase o copy fa cliccare il tuo cliente), un funnel che chiude (dal clic all'acquisto senza attrito).",
      "Senza queste tre cose, stai pagando per imparare. E si impara più velocemente e meno costosamente con traffico organico che con traffico a pagamento.",
    ],
    insight: "Inizia con il traffico organico non perché sia gratis — è costoso in termini di tempo. Inizia perché ti permette di sbagliare e correggere senza costi diretti.",
    keyPoints: [
      "Serve: offerta validata + messaggio che converte + funnel che chiude",
      "Senza questi tre elementi, stai pagando per imparare",
      "Il traffico organico permette di testare senza costi diretti di errore",
      "Il budget ads è un moltiplicatore, non un catalizzatore",
    ],
  },
  "5_cap2": {
    paragraphs: [
      "Investi in advertising quando puoi rispondere sì a queste condizioni. Prima: hai già venduto il corso almeno una volta, anche a prezzo ridotto o a un amico. La vendita reale ti dice che l'offerta funziona.",
      "Seconda: sai quale email, post o conversazione ha portato all'acquisto. Hai un messaggio che funziona — anche se non sai ancora perché. Terza: il tuo tasso di conversione della sales page supera il 2% con traffico organico. Con gli ads, il tasso scende: aspettati 0.5-1.5% se sei bravo.",
      "Quarta: hai un budget che puoi bruciare completamente senza impattare le spese operative. Gli ads richiedono un periodo di apprendimento dell'algoritmo — durante il quale non vedrai risultati lineari. Se quel budget ti serve per vivere, non è il momento giusto.",
    ],
    insight: "La domanda giusta prima degli ads non è 'quanto spendo?' ma 'cosa succede se spendo tutto questo senza risultati?'",
    keyPoints: [
      "Prima condizione: almeno una vendita reale del corso",
      "Seconda: hai un messaggio o copy che ha già convertito organicamente",
      "Terza: conversion rate sales page > 2% con traffico organico",
      "Quarta: budget dedicato che puoi perdere completamente senza problemi",
    ],
  },
  "5_cap3": {
    paragraphs: [
      "Evita gli ads quando stai ancora testando l'offerta — non sai ancora cosa funziona. Ogni giorno di ads con offerta non validata è denaro speso per trovare cose che potresti scoprire gratis.",
      "Evita gli ads se non hai una sequenza email configurata. Il traffico ads è freddo: ha bisogno di nurturing prima di comprare. Senza sequenza email, paghi per portare persone su una sales page che non converte perché non ti conoscono ancora.",
      "Evita gli ads se il tuo corso costa meno di €97. Sotto quella soglia, il margine raramente copre il costo di acquisizione in un mercato competitivo. Con corso a €97, puoi permetterti di pagare fino a €20-30 per cliente. Con corso a €297 o più, il margine lascia spazio per testare e ottimizzare.",
    ],
    insight: "Il prezzo del tuo corso determina quanto puoi permetterti di pagare per ogni cliente. Se il margine è basso, gli ads non sono sostenibili nel lungo periodo.",
    keyPoints: [
      "Offerta non validata + ads = sprecare denaro per accelerare la scoperta dell'errore",
      "Senza sequenza email, il traffico ads non ha un sistema per convertire",
      "Sotto €97 di prezzo corso, il margine raramente copre il CAC",
      "Prima valida organicamente, poi accelera con gli ads",
    ],
  },
  "5_checklist": {
    isChecklist: true,
    items: [
      "Ho già venduto il corso almeno una volta senza advertising",
      "So esattamente quale messaggio o copy ha portato alla vendita",
      "Il mio tasso di conversione sales page supera il 2% con traffico organico",
      "Ho una sequenza email di almeno 4 messaggi configurata e testata",
      "Ho un budget ads separato dal budget operativo",
      "Ho calcolato il mio margine per capire il CAC massimo sostenibile",
      "Ho configurato il Pixel (Meta) o il tag Google Ads sulla sales page",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 6 — Profili Social: La Funzione Reale
  // ══════════════════════════════════════════════════════
  "6_intro": {
    paragraphs: [
      "Il 90% dei professionisti usa i social per 'fare presenza'. Pubblicano con regolarità, curano l'estetica del feed, seguono le tendenze dei format. E non vendono nulla. O vendono poco, in modo imprevedibile, con un effort sproporzionato al risultato.",
      "I social media non sono un canale estetico. Sono un canale di distribuzione. Hanno una sola funzione strategica per chi vende un corso: portare persone fuori dai social e dentro il tuo funnel.",
      "Questa distinzione cambia completamente cosa pubblica, quando, con quale obiettivo e come misuri il successo.",
    ],
    insight: "I like e i follower non pagano le bollette. I click verso il tuo funnel sì.",
    keyPoints: [
      "I social sono un canale di distribuzione, non un canale di vendita diretto",
      "L'obiettivo di ogni contenuto: portare le persone nel tuo funnel",
      "I like sono vanity metric: il click verso il tuo link è la metrica che conta",
      "Presenza costante senza strategia = lavoro che non produce fatturato",
    ],
  },
  "6_cap1": {
    paragraphs: [
      "I social hanno un solo scopo strategico per chi vende un corso: portare persone fuori dai social e dentro il tuo funnel. Ogni post, ogni story, ogni reel ha senso solo se avvicina qualcuno al tuo lead magnet, alla tua email list, alla tua sales page.",
      "Questo non significa che ogni contenuto deve essere una pubblicità. Significa che ogni contenuto deve servire un ruolo nel percorso che porta il tuo cliente dall'essere uno sconosciuto all'essere un lead qualificato.",
      "I contenuti educativi costruiscono la tua autorevolezza e attirano il pubblico giusto. I contenuti di CTA convertono quell'autorevolezza in click verso il funnel. Entrambi sono necessari. Solo i contenuti estetici e di trend senza una funzione nella catena sono uno spreco.",
    ],
    insight: "Ogni contenuto che pubblichi dovrebbe rispondere alla domanda: 'Questo avvicina il mio cliente ideale al mio funnel?' Se la risposta è no, non pubblicarlo.",
    keyPoints: [
      "Ogni contenuto ha una funzione: costruire autorevolezza o portare traffico al funnel",
      "I contenuti educativi attraggono il pubblico giusto e costruiscono fiducia",
      "I contenuti CTA convertono la fiducia in azione (click verso il funnel)",
      "I contenuti 'estetici' senza funzione sono un costo, non un investimento",
    ],
  },
  "6_cap2": {
    paragraphs: [
      "I contenuti che convertono non sono i più belli o i più virali. Sono quelli che risolvono un problema specifico del tuo cliente ideale e terminano con una call to action chiara verso la soluzione completa.",
      "La formula che funziona: problema riconoscibile (il tuo cliente deve pensare 'questa sono io') + soluzione parziale (dai valore reale, non un teaser vuoto) + CTA verso la soluzione completa (il tuo lead magnet o la tua offerta).",
      "Il contenuto che risolve parzialmente un problema crea il desiderio della soluzione completa. Non è manipolazione: è il naturale percorso dall'interesse all'acquisto. Chi riceve valore gratuito da te è molto più incline ad acquistare la soluzione completa.",
    ],
    insight: "Dai il 20% della soluzione gratuitamente. Quel 20% dimostra che hai l'80% rimanente, e l'80% è quello per cui le persone pagano.",
    keyPoints: [
      "Formula: problema riconoscibile + soluzione parziale + CTA chiara",
      "Il contenuto gratuito di qualità è il miglior argomento di vendita",
      "La CTA deve essere una sola, specifica, e portare verso il funnel",
      "Misura il successo con i click verso il link, non con i like",
    ],
  },
  "6_cap3": {
    paragraphs: [
      "La strategia minima efficace che un professionista può sostenere nel tempo: 3 contenuti a settimana, non di più. Due contenuti educativi che costruiscono autorevolezza e un contenuto con CTA diretta verso il lead magnet.",
      "Non servono reel elaborati con musica di tendenza. Non servono grafiche professionali. Non serve ballare su TikTok. Serve consistenza nel messaggio e chiarezza nell'invito all'azione. Un post scritto con cura che risolve un problema specifico performa meglio di dieci reel estetici senza strategia.",
      "La frequenza ottimale è quella che riesci a mantenere per 12 mesi senza esaurirti. Meglio 2 post a settimana per un anno che 10 post questa settimana e poi silenzio per un mese.",
    ],
    insight: "La consistenza batte la perfezione. Un contenuto mediocre pubblicato ogni settimana per un anno costruisce più audience di un contenuto perfetto pubblicato ogni tanto.",
    keyPoints: [
      "3 post a settimana: 2 educativi + 1 CTA verso lead magnet",
      "La consistenza è più importante della qualità puntuale",
      "La strategia ottimale è quella sostenibile nel lungo periodo",
      "Misura solo i click al link bio, non follower e like",
    ],
  },
  "6_checklist": {
    isChecklist: true,
    items: [
      "Ogni mio post ha un obiettivo specifico (educare O portare traffico al funnel)",
      "La mia bio contiene un link diretto al lead magnet (non alla homepage generica)",
      "Non pubblico contenuti 'interessanti' senza una funzione nella catena verso il funnel",
      "Ho un ritmo sostenibile (prefisco 2 post/settimana costanti a 10 e poi stop)",
      "Misuro i click al link bio, non i like",
      "Uso la formula: problema riconoscibile + soluzione parziale + CTA",
      "Il mio CTA principale rimane costante (stessa destinazione) per almeno 2 mesi",
    ],
  },

  // ══════════════════════════════════════════════════════
  // BONUS 7 — Non Fare Tutto da Solo
  // ══════════════════════════════════════════════════════
  "7_intro": {
    paragraphs: [
      "La trappola del libero professionista che crea un corso: fare tutto da soli. Non per forza d'abitudine, ma per una convinzione profondamente radicata: 'se lo faccio io, è fatto bene. Se lo delego, perdo il controllo.'",
      "Il risultato è prevedibile: il 70% del tempo va su attività tecniche e operative che non richiedono la tua competenza principale. Il 30% va sul lavoro che solo tu puoi fare. E quel 30% non è mai abbastanza per costruire qualcosa che duri.",
      "Non è questione di bravura. È questione di sistema — e di sapere quando smettere di fare tutto da soli.",
    ],
    insight: "La tua competenza principale è l'unica cosa per cui le persone sono disposte a pagarti. Ogni ora spesa su altro è un'ora sottratta al tuo asset più prezioso.",
    keyPoints: [
      "Fare tutto da soli non è una virtù: è un collo di bottiglia",
      "La tua competenza principale è l'unica attività non delegabile",
      "Delegare non significa perdere il controllo: significa liberare tempo per ciò che conta",
      "Il fai-da-te ha senso all'inizio, non come strategia definitiva",
    ],
  },
  "7_cap1": {
    paragraphs: [
      "Ogni ora che passi su Canva, su WordPress, su Systeme.io, a fare la grafica delle slide, a editare i video delle lezioni, a configurare le automazioni email — è un'ora che non stai usando la tua competenza principale.",
      "E la tua competenza principale è l'unica cosa per cui le persone sono disposte a pagarti. Non la tua capacità di usare Canva. Non la tua bravura con CapCut. Non la tua pazienza nel configurare tag e sequenze email.",
      "Il paradosso: i professionisti che delegano prima crescono più velocemente. Non perché abbiano più budget. Perché concentrano il 100% del loro tempo sull'unica attività che genera fatturato — la loro expertise.",
    ],
    insight: "Calcola il tuo 'costo orario reale': prendi il tuo fatturato mensile, dividilo per le ore lavorate. Ogni ora su Canva ti costa quell'importo.",
    keyPoints: [
      "Il costo delle attività operative è il costo-opportunità della tua expertise",
      "Nessuno paga per la tua capacità di fare grafica: pagano per la tua competenza principale",
      "Chi delega prima cresce più velocemente, non perché spenda di più",
      "Calcola il tuo costo orario reale prima di decidere cosa fare da solo",
    ],
  },
  "7_cap2": {
    paragraphs: [
      "Cosa delegare per primo, in ordine di impatto: primo, l'editing video delle lezioni. È il task più time-consuming e quello più facile da delegare con un brief chiaro. Un editor video su Fiverr o Workello fa in 2 ore quello che a te richiederebbe 8.",
      "Secondo, la grafica e i template. Dì all'AI o a un freelance il tuo brand color, il font e la struttura che vuoi, e hai template riutilizzabili per anni. Terzo, la configurazione tecnica del funnel. Systeme.io, ActiveCampaign, integrazioni — queste sono attività tecniche che chiunque con esperienza nel tool risolve in ore. Non imparare ogni tool: paga chi lo conosce già.",
      "Cosa non delegare mai: la tua voce (le lezioni del corso le registri tu), il tuo metodo (la struttura del contenuto la decidi tu), la relazione con i clienti (le vendite strategiche le fai tu).",
    ],
    insight: "Delega ciò che è tecnico e ripetibile. Mantieni ciò che è tuo: la voce, il metodo, la relazione.",
    keyPoints: [
      "Prima da delegare: editing video (massimo impatto sul tempo liberato)",
      "Seconda: grafica e template (one-time effort, riutilizzabile a lungo)",
      "Terza: configurazione tecnica (paga chi conosce già il tool)",
      "Non delegare mai: la tua voce, il tuo metodo, la relazione con i clienti",
    ],
  },
  "7_cap3": {
    paragraphs: [
      "Non esiste 'non ho budget per delegare'. Esiste 'non ho ancora venduto abbastanza per delegare'. La sequenza corretta non è spendere per delegare nella speranza di guadagnare: è guadagnare, poi usare una parte di quei guadagni per delegare.",
      "La sequenza pratica: primo lancio da solo con il minimo indispensabile — validazione dell'offerta senza costi fissi. Con i primi guadagni, delega l'editing video e libera il 30-40% del tuo tempo. Con i secondi guadagni, delega la grafica. Con i terzi, delega il tech.",
      "Ogni step di delega libera tempo che reinvesti nella tua expertise principale. Più expertise visible → più vendite → più delega possibile. Il circolo virtuoso si costruisce così, non all'inverso.",
    ],
    insight: "La delega non è un costo: è il meccanismo che trasforma il fatturato di un singolo in quello di un sistema.",
    keyPoints: [
      "Prima lancia da solo, poi delega con i guadagni del lancio",
      "Ogni step di delega libera tempo da reinvestire nell'expertise principale",
      "Non investire in team con soldi che non hai ancora guadagnato",
      "La sequenza: valida → guadagna → delega → cresci → delega di più",
    ],
  },
  "7_checklist": {
    isChecklist: true,
    items: [
      "Ho mappato tutte le attività che faccio in una settimana tipo (almeno 3 categorie: strategia, contenuto, tecnico/operativo)",
      "Ho calcolato il mio costo orario reale",
      "Ho identificato le attività operative che occupano più di 2 ore a settimana",
      "So dove trovare freelance per editing video, grafica e tech (Fiverr, Workello, Upwork)",
      "Ho definito cosa non delegherò mai (la mia voce, il mio metodo, le vendite strategiche)",
      "Quando avrò i primi guadagni, so quale attività delegherò per prima",
      "Ho separato 'attività che generano fatturato' da 'attività operative' nel mio schedule settimanale",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BONUS DATA STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint",
    subtitle: "Che Evita il Fallimento del 90% dei Corsi",
    icon: Target,
    color: "#FFD24D",
    chapters: [
      { id: "intro",     title: "Introduzione",  icon: BookOpen },
      { id: "cap1",      title: "Il Vero Nemico", icon: AlertTriangle },
      { id: "cap2",      title: "Corso vs Percorso", icon: Target },
      { id: "cap3",      title: "L'Errore Comune", icon: Lightbulb },
      { id: "cap4",      title: "Dal Punto A al B", icon: ChevronRight },
      { id: "cap5",      title: "I Moduli",        icon: BookOpen },
      { id: "cap6",      title: "Il Blueprint",    icon: Check },
      { id: "checklist", title: "Checklist",       icon: CheckCircle },
    ],
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata e come evitare questo destino.",
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    subtitle: "Ed Eliminare il Superfluo",
    icon: Lightbulb,
    color: "#10B981",
    chapters: [
      { id: "intro",     title: "Introduzione",  icon: BookOpen },
      { id: "cap1",      title: "Meno è Meglio",  icon: Target },
      { id: "cap2",      title: "Il Filtro",      icon: Lightbulb },
      { id: "cap3",      title: "Cosa Tagliare",  icon: AlertTriangle },
      { id: "checklist", title: "Checklist",      icon: CheckCircle },
    ],
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più.",
  },
  {
    id: 3,
    title: "Durata delle Lezioni",
    subtitle: "La Scelta che Influenza le Vendite",
    icon: Clock,
    color: "#3B82F6",
    chapters: [
      { id: "intro",     title: "Introduzione",    icon: BookOpen },
      { id: "cap1",      title: "Come Studia Online", icon: Users },
      { id: "cap2",      title: "La Durata Ideale", icon: Clock },
      { id: "cap3",      title: "Struttura Efficace", icon: Target },
      { id: "checklist", title: "Checklist",         icon: CheckCircle },
    ],
    summary: "Come ragiona davvero una persona che studia online e quale durata funziona meglio.",
  },
  {
    id: 4,
    title: "Funnel di Vendita",
    subtitle: "La Struttura Minima Indispensabile",
    icon: Rocket,
    color: "#8B5CF6",
    chapters: [
      { id: "intro",     title: "Introduzione",   icon: BookOpen },
      { id: "cap1",      title: "Cos'è un Funnel", icon: Rocket },
      { id: "cap2",      title: "Gli Elementi Base", icon: Target },
      { id: "cap3",      title: "La Sequenza",    icon: ChevronRight },
      { id: "cap4",      title: "Errori da Evitare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist",       icon: CheckCircle },
    ],
    summary: "Senza questa struttura il corso NON vende. Scopri il minimo indispensabile.",
  },
  {
    id: 5,
    title: "ADV: Quando Funzionano",
    subtitle: "E Quando Sono Solo Spreco",
    icon: Megaphone,
    color: "#EF4444",
    chapters: [
      { id: "intro",     title: "Introduzione",        icon: BookOpen },
      { id: "cap1",      title: "Il Mito della Pubblicità", icon: Megaphone },
      { id: "cap2",      title: "Quando Investire",    icon: Target },
      { id: "cap3",      title: "Quando Evitare",      icon: AlertTriangle },
      { id: "checklist", title: "Checklist",            icon: CheckCircle },
    ],
    summary: "La pubblicità non è una soluzione universale. Scopri quando funziona davvero.",
  },
  {
    id: 6,
    title: "Profili Social",
    subtitle: "La Funzione Reale (Non Estetica)",
    icon: Users,
    color: "#EC4899",
    chapters: [
      { id: "intro",     title: "Introduzione",         icon: BookOpen },
      { id: "cap1",      title: "Lo Scopo Vero",         icon: Target },
      { id: "cap2",      title: "Contenuti che Convertono", icon: Lightbulb },
      { id: "cap3",      title: "La Strategia Minima",  icon: ChevronRight },
      { id: "checklist", title: "Checklist",             icon: CheckCircle },
    ],
    summary: "I social non servono a essere creativi. Servono a guidare verso il tuo corso.",
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Users,
    color: "#F97316",
    chapters: [
      { id: "intro",     title: "Introduzione",      icon: BookOpen },
      { id: "cap1",      title: "Il Limite del Fai-da-Te", icon: AlertTriangle },
      { id: "cap2",      title: "Cosa Delegare",      icon: Target },
      { id: "cap3",      title: "Il Sistema",         icon: Lightbulb },
      { id: "checklist", title: "Checklist",          icon: CheckCircle },
    ],
    summary: "Non è questione di bravura. È questione di sistema e di sapere quando chiedere aiuto.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER CONTENT RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function ChapterContent({ bonus, chapterId }) {
  const key = `${bonus.id}_${chapterId}`;
  const content = BONUS_CONTENT[key];

  if (!content) {
    return (
      <div className="bg-white rounded-xl border border-[#ECEDEF] p-6 mb-6">
        <p className="text-sm" style={{ color: "#9CA3AF" }}>Contenuto in arrivo.</p>
      </div>
    );
  }

  if (content.isChecklist) {
    return (
      <ChecklistContent items={content.items} bonusColor={bonus.color} />
    );
  }

  return (
    <div className="space-y-5 mb-6">
      {/* Main content */}
      <div className="bg-white rounded-xl border border-[#ECEDEF] p-6">
        <div className="space-y-4">
          {content.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed" style={{ color: "#3D4148" }}>{p}</p>
          ))}
        </div>
      </div>

      {/* Insight box */}
      {content.insight && (
        <div className="rounded-xl p-5" style={{ background: `${bonus.color}12`, border: `1px solid ${bonus.color}30` }}>
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: bonus.color }} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: bonus.color }}>
                Punto chiave
              </div>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "#1E2128" }}>
                {content.insight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key points */}
      {content.keyPoints?.length > 0 && (
        <div className="bg-white rounded-xl border border-[#ECEDEF] p-6">
          <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: "#9CA3AF" }}>
            Da ricordare
          </h3>
          <ul className="space-y-3">
            {content.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm" style={{ color: "#3D4148" }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${bonus.color}20`, color: bonus.color }}
                >
                  <Check className="w-3 h-3" />
                </div>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistContent({ items, bonusColor }) {
  const [checked, setChecked] = useState({});
  const toggle = (i) => setChecked(prev => ({ ...prev, [i]: !prev[i] }));
  const doneCount = Object.values(checked).filter(Boolean).length;
  const allDone = doneCount === items.length;

  return (
    <div className="space-y-4 mb-6">
      <div className="bg-white rounded-xl border border-[#ECEDEF] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-[#1E2128]">Checklist di completamento</h3>
          <span className="text-sm font-bold" style={{ color: bonusColor }}>
            {doneCount}/{items.length}
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <label
              key={i}
              onClick={() => toggle(i)}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{
                  background: checked[i] ? bonusColor : "#FFFFFF",
                  border: checked[i] ? `2px solid ${bonusColor}` : "2px solid #D1D5DB",
                }}
              >
                {checked[i] && <Check className="w-3 h-3 text-white" style={{ color: "#FFF" }} />}
              </div>
              <span
                className="text-sm leading-relaxed select-none transition-all"
                style={{
                  color: checked[i] ? "#9CA3AF" : "#3D4148",
                  textDecoration: checked[i] ? "line-through" : "none",
                }}
              >
                {item}
              </span>
            </label>
          ))}
        </div>

        {allDone && (
          <div className="mt-5 flex items-center gap-2 p-3 rounded-lg"
            style={{ background: `${bonusColor}15`, border: `1px solid ${bonusColor}30` }}>
            <CheckCircle className="w-5 h-5" style={{ color: bonusColor }} />
            <span className="text-sm font-semibold" style={{ color: bonusColor }}>
              Checklist completata — sei pronto per il prossimo passo.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS CARD
// ─────────────────────────────────────────────────────────────────────────────
function BonusCard({ bonus, isCompleted, onOpen }) {
  const Icon = bonus.icon;
  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-xl border border-[#ECEDEF] p-5 cursor-pointer hover:shadow-lg hover:border-[#FFD24D]/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: bonus.color }}
        >
          {bonus.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                ✓ Completato
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF9E7] text-[#C4990A]">
              Sbloccato
            </span>
          </div>
          <h3 className="font-bold text-[#1E2128] group-hover:text-[#FFD24D] transition-colors">
            {bonus.title}
          </h3>
          <p className="text-sm text-[#9CA3AF]">{bonus.subtitle}</p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#6B7280" }}>{bonus.summary}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#FAFAF7] flex items-center justify-center group-hover:bg-[#FFD24D] transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#1E2128]" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BONUS READER
// ─────────────────────────────────────────────────────────────────────────────
function BonusReader({ bonus, onBack, onComplete, completedChapters, setCompletedChapters }) {
  const [activeChapter, setActiveChapter] = useState("intro");

  const handleChapterComplete = (chapterId) => {
    if (!completedChapters.includes(chapterId)) {
      const newCompleted = [...completedChapters, chapterId];
      setCompletedChapters(newCompleted);
      if (newCompleted.length === bonus.chapters.length) {
        onComplete(bonus.id);
      }
    }
  };

  const currentChapterIndex = bonus.chapters.findIndex(c => c.id === activeChapter);
  const nextChapter = bonus.chapters[currentChapterIndex + 1];
  const prevChapter = bonus.chapters[currentChapterIndex - 1];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-[#ECEDEF] flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#ECEDEF]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-[#5F6572] hover:text-[#FFD24D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai Bonus
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ background: bonus.color }}
            >
              {bonus.id}
            </div>
            <h3 className="font-bold text-sm text-[#1E2128] leading-tight">{bonus.title}</h3>
          </div>

          <div className="space-y-1">
            {bonus.chapters.map((chapter) => {
              const Icon = chapter.icon;
              const isActive = activeChapter === chapter.id;
              const isComplete = completedChapters.includes(chapter.id);
              return (
                <button
                  key={chapter.id}
                  onClick={() => setActiveChapter(chapter.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    isActive ? "font-semibold" : "text-[#5F6572] hover:bg-[#FAFAF7]"
                  }`}
                  style={isActive ? { background: bonus.color, color: "#1E2128" } : {}}
                >
                  {isComplete
                    ? <Check className={`w-4 h-4 ${isActive ? "text-[#1E2128]" : "text-green-500"}`} />
                    : <Icon className="w-4 h-4" />
                  }
                  <span className="truncate">{chapter.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-3 rounded-lg bg-[#FAFAF7]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#5F6572]">Progresso</span>
              <span className="font-bold text-[#1E2128]">{completedChapters.length}/{bonus.chapters.length}</span>
            </div>
            <div className="h-2 bg-[#ECEDEF] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(completedChapters.length / bonus.chapters.length) * 100}%`, background: bonus.color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAF7]">
        <div className="max-w-3xl mx-auto p-8">
          {/* Chapter header */}
          <div className="flex items-center gap-3 mb-6">
            {React.createElement(
              bonus.chapters.find(c => c.id === activeChapter)?.icon || BookOpen,
              { className: "w-6 h-6", style: { color: bonus.color } }
            )}
            <h1 className="text-2xl font-bold text-[#1E2128]">
              {bonus.chapters.find(c => c.id === activeChapter)?.title}
            </h1>
          </div>

          {/* Real content */}
          <ChapterContent bonus={bonus} chapterId={activeChapter} />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {prevChapter ? (
              <button
                onClick={() => setActiveChapter(prevChapter.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#5F6572] hover:bg-white border border-transparent hover:border-[#ECEDEF] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {prevChapter.title}
              </button>
            ) : <div />}

            <button
              onClick={() => {
                handleChapterComplete(activeChapter);
                if (nextChapter) setActiveChapter(nextChapter.id);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: completedChapters.includes(activeChapter) ? "#E5E7EB" : bonus.color,
                color: completedChapters.includes(activeChapter) ? "#5F6572" : "#1E2128",
              }}
            >
              {completedChapters.includes(activeChapter) ? (
                <><Check className="w-4 h-4" /> Completato</>
              ) : nextChapter ? (
                <>Completa e Continua <ChevronRight className="w-4 h-4" /></>
              ) : (
                <><Check className="w-4 h-4" /> Completa Guida</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function BonusStrategici({ partner }) {
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [completedBonuses, setCompletedBonuses] = useState([]);
  const [chapterProgress, setChapterProgress] = useState({});

  React.useEffect(() => {
    const saved = sessionStorage.getItem(`bonus_progress_${partner?.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      setCompletedBonuses(data.completedBonuses || []);
      setChapterProgress(data.chapterProgress || {});
    }
  }, [partner?.id]);

  const saveProgress = (newCompleted, newChapterProgress) => {
    sessionStorage.setItem(`bonus_progress_${partner?.id}`, JSON.stringify({
      completedBonuses: newCompleted,
      chapterProgress: newChapterProgress,
    }));
  };

  const handleBonusComplete = (bonusId) => {
    const newCompleted = [...completedBonuses, bonusId];
    setCompletedBonuses(newCompleted);
    saveProgress(newCompleted, chapterProgress);
  };

  const handleChapterProgressUpdate = (bonusId, chapters) => {
    const newProgress = { ...chapterProgress, [bonusId]: chapters };
    setChapterProgress(newProgress);
    saveProgress(completedBonuses, newProgress);
  };

  if (selectedBonus) {
    const bonus = BONUS_DATA.find(b => b.id === selectedBonus);
    return (
      <BonusReader
        bonus={bonus}
        onBack={() => setSelectedBonus(null)}
        onComplete={handleBonusComplete}
        completedChapters={chapterProgress[selectedBonus] || []}
        setCompletedChapters={(chapters) => handleChapterProgressUpdate(selectedBonus, chapters)}
      />
    );
  }

  const completedCount = completedBonuses.length;
  const totalCount = BONUS_DATA.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6 p-6" style={{ background: "#FAFAF7", minHeight: "100vh" }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
          style={{ background: "#FEF9E7", color: "#C4990A", border: "1px solid #FFD24D" }}>
          <Gift className="w-4 h-4" />
          Contenuti Esclusivi
        </div>
        <h1 className="text-2xl font-bold text-[#1E2128] mb-2">
          I Tuoi <span style={{ color: "#FFD24D" }}>7 Bonus Strategici</span>
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-lg mx-auto">
          Guide operative per chi vuole costruire un corso online che vende davvero.
          Ogni bonus include contenuto pratico e una checklist di completamento.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#1E2128]">Il Tuo Progresso</h3>
            <p className="text-sm text-[#9CA3AF]">{completedCount} di {totalCount} bonus completati</p>
          </div>
          <div className="text-3xl font-bold" style={{ color: "#FFD24D" }}>{progressPercent}%</div>
        </div>
        <div className="h-3 bg-[#ECEDEF] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: "#FFD24D" }}
          />
        </div>
        {completedCount === totalCount && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">
              Hai completato tutti i bonus. Ora sai come costruire un corso che vende.
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-4">
        {BONUS_DATA.map((bonus) => (
          <BonusCard
            key={bonus.id}
            bonus={bonus}
            isCompleted={completedBonuses.includes(bonus.id)}
            onOpen={() => setSelectedBonus(bonus.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#1E2128] rounded-xl p-5 text-white mt-8">
        <h3 className="font-bold text-[#FFD24D] mb-2">Come usare questi bonus</h3>
        <p className="text-sm text-white/80">
          Leggili in ordine — ogni bonus costruisce sulle basi del precedente.
          Completa la checklist al fondo di ogni guida prima di passare alla successiva.
          Quando hai completato tutti e 7, hai le basi per decidere se e come procedere con Evolution PRO.
        </p>
      </div>
    </div>
  );
}

export default BonusStrategici;
