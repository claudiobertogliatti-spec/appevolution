// Le otto domande di Ciak Start, in parole di tutti i giorni.
// Gli `id` sono quelli storici del questionario partner e dei generatori della
// consegna Start (backend/services/ciak_start_domande.py): NON rinominarli.
export const START_DOMANDE = [
  {
    id: "nicchia",
    domanda: "Chi aiuti con il tuo lavoro?",
    hint: "Descrivi le persone: chi sono, più o meno quanti anni hanno, cosa fanno. Meglio un gruppo preciso che «tutti».",
    esempio: "Donne tra i 35 e i 50 anni che vogliono ritrovare energia dopo una gravidanza.",
  },
  {
    id: "momento_di_vita",
    domanda: "Quando le persone ti cercano? Cosa è successo nella loro vita?",
    hint: "Pensa al momento in cui dicono: «adesso chiedo aiuto».",
    esempio: "Hanno provato da sole e non ci sono riuscite, e si sentono stanche e sfiduciate.",
  },
  {
    id: "promessa",
    domanda: "Cosa ottengono lavorando con te? Scrivilo in una frase.",
    hint: "Un risultato chiaro. Meglio evitare frasi generiche come «ti aiuto a stare meglio».",
    esempio: "Tornare a sentirsi in forma e piene di energia, senza diete estreme.",
  },
  {
    id: "trasformazione_90gg",
    domanda: "Dopo tre mesi con te, come sta la persona? Cosa è cambiato?",
    hint: "Racconta la differenza tra com'era prima e com'è dopo.",
    esempio: "Prima si svegliava stanca e rimandava sempre. Dopo ha una routine che riesce a mantenere.",
  },
  {
    id: "metodo_nome",
    domanda: "Che nome diamo al tuo lavoro o al tuo metodo?",
    hint: "Se non ne hai ancora uno, scrivi il tuo nome e cognome.",
    esempio: "Metodo Rinascita, oppure Anna Rossi.",
  },
  {
    id: "differenza_riconoscibile",
    domanda: "Cosa fai tu di diverso dagli altri che fanno un lavoro simile?",
    hint: "Un tuo modo di lavorare, una tua esperienza, qualcosa per cui ti riconoscono.",
    esempio: "Lavoro con piccoli gruppi e seguo ogni persona da vicino, anche tra un incontro e l'altro.",
  },
  {
    id: "mercato_affollato",
    domanda: "Gli altri, nel tuo settore, cosa promettono o cosa fanno di solito?",
    hint: "Pensa a quello che vedi online o a quello che ti raccontano i clienti.",
    esempio: "Promettono risultati veloci con programmi tutti uguali per tutti.",
  },
  {
    id: "prezzo_e_formato",
    domanda: "Come lavori con le persone e quanto costa, più o meno?",
    hint: "Una consulenza singola, un percorso di più incontri, un corso... Anche una cifra indicativa va bene.",
    esempio: "Percorso di 8 incontri, circa 600 euro.",
  },
];

export const MIN_CARATTERI = 8;
