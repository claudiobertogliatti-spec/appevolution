/**
 * Registro domande "Il tuo posizionamento" (Esamina, Valentina).
 * IMPORTANTE: gli `id` sono le CHIAVI storiche già usate dal documento, da Matteo
 * e dal Blueprint — NON cambiarle. Qui cambia solo il linguaggio (più semplice).
 * Le risposte si salvano in step.data.answers[<id>] e il PDF lo genera l'endpoint
 * /api/partner/posizionamento/finalize esistente.
 *
 * tipo: "lungo" (textarea) | "breve" (input)
 */
export const POSIZIONAMENTO_QUESTIONS = [
  // ── Il cliente ideale ──
  { id: "nicchia", blocco: "Il cliente ideale", tipo: "lungo", minChar: 30,
    domanda: "Chi aiuti? Descrivi le persone.",
    hint: "Più sei preciso, meglio è. Non \"tutti\", ma il gruppo esatto di persone.",
    esempio: "Donne 35-50 che vogliono rimettersi in forma dopo una gravidanza." },
  { id: "momento_di_vita", blocco: "Il cliente ideale", tipo: "lungo", minChar: 25,
    domanda: "In che momento della loro vita ti cercano?",
    hint: "Quando \"scatta\" qualcosa e ti vengono a cercare: una crisi, un cambiamento, una svolta.",
    esempio: "Dopo aver provato diete da sole senza risultati, quando si sentono allo sbando." },
  { id: "livello_consapevolezza", blocco: "Il cliente ideale", tipo: "lungo", minChar: 25,
    domanda: "Quanto sanno già del loro problema quando ti incontrano?",
    hint: "Non sanno di averlo? Lo sanno ma cercano soluzioni sbagliate? Hanno già provato cose che non hanno funzionato?",
    esempio: "Sanno di avere il problema e hanno già provato di tutto, quindi sono diffidenti." },
  { id: "paure_avatar", blocco: "Il cliente ideale", tipo: "lungo", minChar: 40,
    domanda: "Cosa le tiene sveglie la notte?",
    hint: "Le paure vere, dette con parole loro.",
    esempio: "La paura di non riuscire mai a sentirsi bene nel proprio corpo e di arrendersi per sempre." },
  { id: "desideri_avatar", blocco: "Il cliente ideale", tipo: "lungo", minChar: 40,
    domanda: "Cosa desiderano davvero, in fondo?",
    hint: "Non il risultato tecnico, ma la vita che vogliono davvero.",
    esempio: "Sentirsi di nuovo sicure, guardarsi allo specchio con serenità, avere energia per i figli." },
  { id: "costo_del_no", blocco: "Il cliente ideale", tipo: "lungo", minChar: 40,
    domanda: "Cosa perdono se NON risolvono il problema?",
    hint: "Il prezzo del restare ferme: tempo, salute, autostima, occasioni. Rendilo concreto.",
    esempio: "Ogni anno che passa è più difficile, e intanto perdono fiducia e si isolano." },

  // ── La trasformazione ──
  { id: "promessa", blocco: "La trasformazione", tipo: "lungo", minChar: 40,
    domanda: "Qual è la tua promessa, in una frase?",
    hint: "Specifica, con un risultato e un tempo. Non \"ti aiuto a stare meglio\".",
    esempio: "In 90 giorni torni in forma con un metodo semplice, senza diete estreme né palestra ore al giorno." },
  { id: "trasformazione_90gg", blocco: "La trasformazione", tipo: "lungo", minChar: 50,
    domanda: "Cosa cambia nella loro vita dopo aver lavorato con te?",
    hint: "Cose concrete e misurabili: numeri, comportamenti, sensazioni.",
    esempio: "Perde 6-8 kg, dorme meglio, ha più energia e ha imparato a mangiare senza ossessioni." },
  { id: "prezzo_e_formato", blocco: "La trasformazione", tipo: "lungo", minChar: 30,
    domanda: "Quanto costa e in che forma lo vendi?",
    hint: "Un prezzo indicativo va benissimo. Se non lo sai, scrivi quello che immagini: lo affiniamo insieme.",
    esempio: "Percorso di gruppo di 8 settimane, tra 690€ e 990€. Più avanti vorrei un 1-1 premium." },

  // ── Il tuo metodo ──
  { id: "metodo_nome", blocco: "Il tuo metodo", tipo: "breve", minChar: 5,
    domanda: "Come si chiama il tuo metodo? (anche provvisorio)",
    hint: "Un nome breve e memorabile. Se non ce l'hai, scrivi 2-3 idee: lo scegliamo insieme.",
    esempio: "Metodo Rinascita (è provvisorio, ma mi piace)." },
  { id: "metodo_step", blocco: "Il tuo metodo", tipo: "lungo", minChar: 80,
    domanda: "Quali sono le fasi del tuo percorso, in ordine?",
    hint: "Le tappe che la persona attraversa. Una riga per fase.",
    esempio: "1. Valutazione iniziale. 2. Piano alimentare su misura. 3. Allenamento da casa. 4. Abitudini che restano. 5. Mantenimento." },
  { id: "prova_sociale_concreta", blocco: "Il tuo metodo", tipo: "lungo", minChar: 50,
    domanda: "Un risultato concreto che hai ottenuto, con un numero.",
    hint: "Nome + cosa è cambiato + in quanto tempo. Se non hai casi, scrivi quello più vicino al risultato (anche il tuo).",
    esempio: "Giulia M.: -9 kg in 4 mesi e ha smesso di fare diete, dopo anni di tentativi falliti." },

  // ── Perché tu ──
  { id: "origin_story", blocco: "Perché tu", tipo: "lungo", minChar: 80,
    domanda: "Perché sei proprio tu a fare questo?",
    hint: "Una storia vera, anche piccola: il momento in cui hai capito che dovevi farlo. È quello che ti rende credibile.",
    esempio: "Sono partita dal mio percorso: ho lottato anni col peso finché ho trovato un sistema che funziona davvero. Oggi lo insegno." },
  { id: "contrarian_view", blocco: "Perché tu", tipo: "lungo", minChar: 50,
    domanda: "Cosa pensi che gli altri, nel tuo settore, sbaglino?",
    hint: "Non per attaccare nessuno: per piantare la tua bandiera. Una frase netta.",
    esempio: "Quasi tutti vendono diete drastiche. Io penso che senza cambiare le abitudini il peso torna sempre." },
  { id: "differenza_riconoscibile", blocco: "Perché tu", tipo: "lungo", minChar: 40,
    domanda: "Come ti descriverebbe una cliente a un'amica, in una frase?",
    hint: "Non \"la migliore di tutte\", ma una caratteristica concreta e riconoscibile.",
    esempio: "Quella che ti rimette in forma senza farti rinunciare a tutto e senza farti sentire in colpa." },

  // ── Il mercato ──
  { id: "concorrenti_principali", blocco: "Il mercato", tipo: "lungo", minChar: 30,
    domanda: "Se una persona non sceglie te, da chi va di solito?",
    hint: "Nomi veri, oppure il tipo (\"le app di diete\", \"i personal trainer generici\").",
    esempio: "Le app di conta-calorie e i personal trainer che danno solo schede di allenamento." },
  { id: "mercato_affollato", blocco: "Il mercato", tipo: "lungo", minChar: 40,
    domanda: "Cosa promettono o fanno un po' tutti, nel tuo campo?",
    hint: "La frase che ripetono in tanti. È il territorio affollato da NON occupare.",
    esempio: "Tutti promettono \"-10 kg in un mese\" e \"il corpo dei tuoi sogni\". È diventato rumore di fondo." },
  { id: "obiezione_principale", blocco: "Il mercato", tipo: "lungo", minChar: 50,
    domanda: "Qual è la frase che ti senti dire più spesso prima che decidano? E come rispondi?",
    hint: "La frase che frena (\"ci ho già provato\", \"non ho tempo\", \"costa troppo\") + la tua risposta onesta.",
    esempio: "\"Ho già provato di tutto.\" Rispondo: quelle erano diete, io ti do un metodo per cambiare le abitudini." },

  // ── Cosa ti rende unico ──
  { id: "limite_onesto", blocco: "Cosa ti rende unico", tipo: "lungo", minChar: 40,
    domanda: "Per chi NON sei la persona giusta? O cosa NON fai di proposito?",
    hint: "Ammettere un limite ti rende credibile: uno specialista non è per tutti.",
    esempio: "Non sono per chi cerca la pillola magica: lavoro solo con chi è pronto a cambiare abitudini." },
  { id: "spazio_specialista", blocco: "Cosa ti rende unico", tipo: "lungo", minChar: 40,
    domanda: "Qual è la cosa che fai TU e gli altri no?",
    hint: "Una cosa precisa che ti rende lo specialista di qualcosa. Non \"più qualità\": una specializzazione netta.",
    esempio: "Lavoro solo con neo-mamme e parto dalle abitudini, non dalla dieta: è il contrario di quello che fanno gli altri." },
];
