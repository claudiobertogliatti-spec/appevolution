// Messaggi di "risveglio": primo contatto con chi ha già avuto un rapporto con Evolution Pro
// (ex clienti con analisi, "interessati" dei vecchi setter, rete di Claudio). Testi approvati
// da Claudio il 5/10/2026. Identici per chiunque scriva (Mariangela o Claudio): cambia solo
// la firma, quindi parlano al "noi" di Evolution Pro. Stile e regole di copy come lo Script
// a freddo: potenziale ("può diventare"), niente numeri, prezzi o promesse.

export const RISVEGLIO_ASSET = {
  n: "1c",
  title: "Messaggi di risveglio (chi ha già avuto un contatto con noi)",
  note: "Primo contatto per chi non è un freddo: ex clienti con analisi già consegnata, chi in passato si era detto interessato, la rete di Claudio. Prima si cerca il profilo (LinkedIn, poi Instagram o Facebook), poi si scrive. Stesso testo per chiunque scriva: cambiano solo il nome in firma e il nome del mittente in apertura.",
  blocks: [
    {
      h: "1 · Ex clienti con analisi già consegnata",
      s: `Buongiorno [Nome],

sono [Nome mittente] di Evolution Pro. Qualche tempo fa abbiamo preparato per Lei un'analisi sul Suo progetto in [settore], e poi non ci siamo più sentiti. Ci sembrava giusto riprendere il filo.

Nel frattempo abbiamo cambiato il modo di iniziare: oggi si parte da un'analisi gratuita del Suo progetto, che commentiamo insieme in una breve call, e solo dopo si decide se ha senso proseguire. Nessun impegno.

In due parole: con Evolution Pro aiutiamo professionisti e formatori a trasformare la propria esperienza in un percorso formativo strutturato. Lei mette la competenza e i contenuti; noi ci occupiamo di struttura, marketing e vendite. Un percorso costruito bene può diventare una fonte di entrata più stabile e un modo per far conoscere il Suo lavoro a nuove persone.

Se l'idea è ancora attuale, mi farebbe piacere sentirLa per una telefonata di una decina di minuti. Mi dica pure quando preferisce.

Cordiali saluti,
[Nome e cognome]
Evolution Pro`,
    },
    {
      h: "2 · Chi in passato si era detto interessato (vecchi setter)",
      s: `Buongiorno [Nome],

sono [Nome mittente] di Evolution Pro. A [mese anno] Evolution Pro Le aveva scritto su LinkedIn e Lei aveva mostrato interesse per l'idea di trasformare la Sua competenza in [settore] in un videocorso. Allora non è andata avanti, e capiamo: non sempre è il momento giusto.

Le riscriviamo perché nel frattempo abbiamo cambiato il modo di iniziare: prima un'analisi gratuita del Suo progetto, commentata insieme in una breve call, e solo dopo si valuta se proseguire.

In breve: Lei mette competenza e contenuti, noi la struttura del percorso, il marketing e le vendite. Un videocorso costruito bene può diventare una fonte di entrata più stabile e un modo per avvicinare persone a consulenze e percorsi di valore più alto.

Se oggi il momento è più adatto, mi farebbe piacere risentirLa. Se preferisce lasciar perdere, nessun problema: mi basta un cenno.

Grazie e a presto,
[Nome e cognome]
Evolution Pro`,
    },
    {
      h: "3 · Rete e rubrica (chi conosce Claudio)",
      s: `Buongiorno [Nome],

sono [Nome mittente] di Evolution Pro. Claudio Bertogliatti, che Lei conosce da [contesto], guida Evolution Pro: lavoriamo con professionisti e formatori che hanno un metodo e clienti in presenza, ma faticano a portare il proprio lavoro online.

Li aiutiamo a trasformare la loro esperienza in un percorso formativo strutturato: loro mettono competenza e contenuti, noi struttura, marketing e vendite. Un percorso costruito bene può diventare una fonte di entrata più stabile e un modo per farsi trovare da nuove persone.

Per questo abbiamo pensato a Lei. Se le va, ci sentiamo per una telefonata di una decina di minuti: Le spiego come funziona e vediamo insieme se ha senso approfondire. Nessun impegno.

Un saluto,
[Nome e cognome]
Evolution Pro`,
    },
    {
      h: "Versione breve (Instagram, Facebook, messaggio LinkedIn)",
      s: `Buongiorno [Nome], sono [Nome mittente] di Evolution Pro. [Ci eravamo sentiti / Le scrivo a nome di Claudio Bertogliatti, che Lei conosce da [contesto]] e ci farebbe piacere riprendere il filo. Aiutiamo professionisti e formatori a trasformare la propria esperienza in un percorso formativo, partendo da un'analisi gratuita del progetto. Se Le va, ci sentiamo per una telefonata di una decina di minuti, senza impegno. Grazie!`,
    },
    {
      h: "Messaggio di seguito (dopo circa 5 giorni, se non risponde)",
      s: `Buongiorno [Nome], Le riscrivo solo per sapere se ha visto il mio messaggio. Se non è il momento, nessun problema: mi basta un cenno e non Le scrivo più.`,
    },
  ],
  tip: "Il testo 3 si usa solo se per quel contatto c'è un contesto vero in cui Claudio è conosciuto; altrimenti non va usato. Il messaggio di seguito offre l'uscita: è la scelta corretta per chi ci ha conosciuto tempo fa. Non si inviano messaggi automatici su Instagram o Facebook: si scrive a mano, pochi al giorno.",
  warn: "Onestà (Codice del Consumo): parliamo di potenziale (\"può diventare\"), mai di risultati già ottenuti. Niente numeri, prezzi, percentuali o testimonianze inventate. \"Analisi gratuita\" = quella generata da Ciak dalle 10 Domande e commentata in call.",
};
