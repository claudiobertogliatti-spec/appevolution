/**
 * genera_analisi.js
 * Genera il documento DOCX dell'Analisi Strategica Personalizzata
 * 
 * Uso: node genera_analisi.js '{"NOME_CLIENTE": "...", ...}' output.docx
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} = require("docx");
const fs = require("fs");

// Colori brand
const BRAND_YELLOW = "F5C518";
const BRAND_DARK = "1E2128";
const BRAND_GRAY = "5F6572";

// Funzione per creare un titolo di sezione
function createSectionTitle(text, number = null) {
  const children = [];
  if (number) {
    children.push(
      new TextRun({
        text: `SEZIONE ${number}  `,
        bold: true,
        color: BRAND_GRAY,
        size: 20,
      })
    );
  }
  children.push(
    new TextRun({
      text: text.toUpperCase(),
      bold: true,
      color: BRAND_DARK,
      size: 28,
    })
  );
  return new Paragraph({
    children,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { color: BRAND_YELLOW, size: 6, style: BorderStyle.SINGLE },
    },
  });
}

// Funzione per creare sottotitolo
function createSubtitle(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        color: BRAND_GRAY,
        size: 22,
      }),
    ],
    spacing: { before: 200, after: 100 },
  });
}

// Funzione per creare testo normale
function createParagraph(text, options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        color: options.color || BRAND_DARK,
        size: options.size || 22,
        italics: options.italics || false,
      }),
    ],
    spacing: { before: 100, after: 100 },
  });
}

// Funzione per creare box con risposta del cliente
function createResponseBox(label, response) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: "Tua risposta:",
          bold: true,
          color: BRAND_GRAY,
          size: 20,
        }),
      ],
      spacing: { before: 200, after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: response,
          italics: true,
          color: BRAND_DARK,
          size: 22,
        }),
      ],
      shading: { fill: "FEF9E7", type: ShadingType.SOLID },
      spacing: { before: 50, after: 150 },
      indent: { left: 200, right: 200 },
    }),
  ];
}

// Funzione per creare considerazioni strategiche
function createConsiderations(text) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: "Considerazioni strategiche",
          bold: true,
          color: BRAND_GRAY,
          size: 20,
        }),
      ],
      spacing: { before: 150, after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text,
          color: BRAND_DARK,
          size: 22,
        }),
      ],
      spacing: { before: 50, after: 200 },
    }),
  ];
}

// Funzione per creare elenco puntato
function createBulletList(items) {
  return items.map(
    (item) =>
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${item}`,
            color: BRAND_DARK,
            size: 22,
          }),
        ],
        spacing: { before: 50, after: 50 },
        indent: { left: 400 },
      })
  );
}

async function generateDocument(data, outputPath) {
  const {
    NOME_CLIENTE,
    AMBITO,
    DATA_ANALISI,
    RISPOSTA_EXPERTISE,
    RISPOSTA_TARGET,
    RISPOSTA_PUBBLICO,
    RISPOSTA_ESPERIENZA,
    RISPOSTA_OSTACOLO,
    RISPOSTA_OBIETTIVO,
    RISPOSTA_PERCHE_ORA,
    COMPETENZA_ARRICCHITA,
    TARGET_ARRICCHITO,
    PUBBLICO_ARRICCHITO,
    ESPERIENZA_ARRICCHITA,
    OSTACOLO_ARRICCHITO,
    OBIETTIVO_ARRICCHITO,
    PERCHE_ORA_ARRICCHITO,
  } = data;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // ═══════════════════════════════════════════════════════════════
          // COPERTINA
          // ═══════════════════════════════════════════════════════════════
          new Paragraph({
            children: [
              new TextRun({
                text: "Evolution",
                bold: true,
                color: BRAND_DARK,
                size: 56,
              }),
              new TextRun({
                text: "PRO",
                bold: true,
                color: BRAND_YELLOW,
                size: 56,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "ANALISI STRATEGICA PERSONALIZZATA",
                bold: true,
                color: BRAND_DARK,
                size: 36,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Trasformare la tua competenza in un Asset Digitale",
                color: BRAND_GRAY,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Documento riservato",
                italics: true,
                color: BRAND_GRAY,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          // Info cliente
          new Paragraph({
            children: [
              new TextRun({ text: "Cliente: ", bold: true, color: BRAND_GRAY, size: 22 }),
              new TextRun({ text: NOME_CLIENTE, color: BRAND_DARK, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Ambito: ", bold: true, color: BRAND_GRAY, size: 22 }),
              new TextRun({ text: AMBITO, color: BRAND_DARK, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Data analisi: ", bold: true, color: BRAND_GRAY, size: 22 }),
              new TextRun({ text: DATA_ANALISI, color: BRAND_DARK, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // INTRODUZIONE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("COSA TROVERAI IN QUESTA ANALISI"),
          createParagraph(
            "Questo documento è il risultato dell'analisi delle informazioni che hai condiviso nel questionario iniziale."
          ),
          createParagraph(
            "Il suo obiettivo è semplice: capire se la tua competenza può essere trasformata in un asset digitale sostenibile nel tempo."
          ),
          createParagraph("In queste pagine troverai:"),
          ...createBulletList([
            "una lettura strategica della tua situazione attuale",
            "un'analisi del mercato e del tuo pubblico",
            "l'individuazione dell'asset digitale più adatto",
            "una possibile evoluzione del tuo modello di lavoro",
            "una valutazione realistica della fattibilità del progetto",
          ]),
          createParagraph(
            "Questa analisi non nasce per convincerti. Nasce per aiutarti a prendere una decisione lucida e consapevole sul prossimo passo del tuo percorso professionale."
          ),
          createParagraph(
            "Durante la videocall strategica commenteremo insieme questo documento punto per punto.",
            { italics: true }
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // CHI SONO
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("CHI SONO"),
          new Paragraph({
            children: [
              new TextRun({ text: "Mi chiamo ", size: 22 }),
              new TextRun({ text: "Claudio Bertogliatti", bold: true, size: 22 }),
              new TextRun({ text: ".", size: 22 }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Sono il fondatore di ", size: 22 }),
              new TextRun({ text: "Evolution PRO", bold: true, size: 22 }),
              new TextRun({
                text: ", una digital agency specializzata nella creazione e vendita di videocorsi online per liberi professionisti.",
                size: 22,
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          createParagraph(
            "Il nostro lavoro consiste nell'aiutare professionisti, coach, consulenti e formatori a trasformare la propria competenza in un asset digitale scalabile."
          ),
          createParagraph("Molti professionisti oggi lavorano con un modello molto semplice:"),
          createParagraph("tempo → consulenza → compenso", { italics: true }),
          createParagraph(
            "Questo modello funziona. Ma ha un limite evidente. Il reddito resta direttamente legato al tempo disponibile."
          ),
          createParagraph(
            "Evolution PRO nasce con un obiettivo preciso: costruire sistemi digitali che permettano alla competenza di continuare a generare valore anche oltre il tempo che una persona può dedicare direttamente ai clienti."
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 1 - PROFILO PROFESSIONALE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("ANALISI DEL TUO PROFILO PROFESSIONALE", "1"),
          createSubtitle("In cosa sei riconosciuto come esperto"),
          ...createResponseBox("Competenza", RISPOSTA_EXPERTISE),
          ...createConsiderations(COMPETENZA_ARRICCHITA),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 2 - CLIENTE IDEALE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("IL TUO CLIENTE IDEALE", "2"),
          createSubtitle("Target dichiarato"),
          ...createResponseBox("Target", RISPOSTA_TARGET),
          ...createConsiderations(TARGET_ARRICCHITO),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 3 - PRESENZA ONLINE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("PRESENZA ONLINE", "3"),
          createSubtitle("Community e pubblico esistente"),
          ...createResponseBox("Pubblico", RISPOSTA_PUBBLICO),
          ...createConsiderations(PUBBLICO_ARRICCHITO),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 4 - ESPERIENZA VENDITA
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("ESPERIENZA DI VENDITA ONLINE", "4"),
          createSubtitle("Esperienze precedenti"),
          ...createResponseBox("Esperienza", RISPOSTA_ESPERIENZA),
          ...createConsiderations(ESPERIENZA_ARRICCHITA),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 5 - OSTACOLO
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("L'OSTACOLO PRINCIPALE", "5"),
          createSubtitle("Il blocco che hai incontrato finora"),
          ...createResponseBox("Ostacolo", RISPOSTA_OSTACOLO),
          ...createConsiderations(OSTACOLO_ARRICCHITO),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 6 - OBIETTIVO
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("OBIETTIVO PER I PROSSIMI 12 MESI", "6"),
          ...createResponseBox("Obiettivo", RISPOSTA_OBIETTIVO),
          ...createConsiderations(OBIETTIVO_ARRICCHITO),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE 7 - PERCHÉ ADESSO
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("PERCHÉ PROPRIO ADESSO", "7"),
          ...createResponseBox("Motivazione", RISPOSTA_PERCHE_ORA),
          ...createConsiderations(PERCHE_ORA_ARRICCHITO),

          // ═══════════════════════════════════════════════════════════════
          // SEZIONE FINALE - FAI DA TE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("PERCHÉ IL FAI-DA-TE FALLISCE NEL 90% DEI CASI"),
          createParagraph("Molti professionisti pensano che basti:"),
          ...createBulletList([
            "registrare qualche video",
            "caricarlo online",
            "pubblicare qualche post sui social",
          ]),
          createParagraph(
            "Nella realtà quasi sempre accade il contrario. Il corso viene registrato ma non viene venduto. Questo accade perché un videocorso non è semplicemente un contenuto. È un sistema."
          ),
          createParagraph("Un sistema che include:"),
          ...createBulletList([
            "posizionamento",
            "struttura del percorso",
            "asset di vendita",
            "funnel",
            "automazioni",
            "strategia di traffico",
          ]),
          createParagraph("Se uno di questi elementi manca, il sistema non funziona."),
          new Paragraph({ children: [new PageBreak()] }),

          // ═══════════════════════════════════════════════════════════════
          // LE TRE STRADE
          // ═══════════════════════════════════════════════════════════════
          createSectionTitle("LE TRE STRADE POSSIBILI DA QUI"),
          new Paragraph({
            children: [
              new TextRun({ text: "1. NON FARE NULLA", bold: true, color: BRAND_DARK, size: 24 }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          createParagraph(
            "Continuare con il modello attuale. Funziona, ma resta legato al tempo disponibile."
          ),
          new Paragraph({
            children: [
              new TextRun({ text: "2. PROVARE DA SOLO", bold: true, color: BRAND_DARK, size: 24 }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          createParagraph(
            "È una strada possibile. Ma spesso porta a mesi di tentativi senza struttura."
          ),
          new Paragraph({
            children: [
              new TextRun({ text: "3. CON UNA STRUTTURA", bold: true, color: BRAND_YELLOW, size: 24 }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          createParagraph(
            "Lavorare con un metodo già testato e un team che conosce gli errori da evitare. Ed è esattamente il motivo per cui esiste Evolution PRO."
          ),

          // ═══════════════════════════════════════════════════════════════
          // DIAGNOSI FINALE
          // ═══════════════════════════════════════════════════════════════
          new Paragraph({ children: [new PageBreak()] }),
          createSectionTitle("DIAGNOSI STRATEGICA FINALE"),
          createParagraph(
            "Dall'analisi delle informazioni condivise emerge che la tua competenza può essere strutturata in un percorso digitale trasferibile."
          ),
          createParagraph(
            "Il modello attuale con cui viene proposta appare ancora fortemente legato al tempo disponibile. Questo non rappresenta un errore — è semplicemente il modello con cui lavorano la maggior parte dei professionisti."
          ),
          createParagraph(
            "La creazione di un asset digitale può rappresentare una evoluzione naturale del tuo percorso professionale. Non come sostituzione del lavoro attuale, ma come estensione del tuo metodo."
          ),
          createParagraph(
            "La fattibilità del progetto appare concreta a condizione che venga costruito con una struttura chiara e un sistema di vendita coerente."
          ),
          new Paragraph({
            children: [
              new TextRun({
                text: "Il prossimo passo sarà la nostra videocall strategica, in cui analizzeremo insieme questa diagnosi e valuteremo se avviare la partnership Evolution PRO.",
                bold: true,
                color: BRAND_DARK,
                size: 22,
              }),
            ],
            spacing: { before: 300, after: 400 },
            shading: { fill: "FEF9E7", type: ShadingType.SOLID },
            indent: { left: 200, right: 200 },
          }),

          // ═══════════════════════════════════════════════════════════════
          // FOOTER
          // ═══════════════════════════════════════════════════════════════
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            children: [
              new TextRun({ text: "Evolution", bold: true, color: BRAND_DARK, size: 32 }),
              new TextRun({ text: "PRO", bold: true, color: BRAND_YELLOW, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Trasformiamo competenze reali in asset digitali sostenibili.",
                italics: true,
                color: BRAND_GRAY,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "www.evolution-pro.it",
                color: BRAND_YELLOW,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Preparato per: ", color: BRAND_GRAY, size: 20 }),
              new TextRun({ text: NOME_CLIENTE, bold: true, color: BRAND_DARK, size: 20 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: DATA_ANALISI, color: BRAND_GRAY, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`DOCX generato: ${outputPath}`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Uso: node genera_analisi.js '{...json...}' output.docx");
  process.exit(1);
}

try {
  const data = JSON.parse(args[0]);
  const outputPath = args[1];
  generateDocument(data, outputPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Errore:", err);
      process.exit(1);
    });
} catch (err) {
  console.error("Errore parsing JSON:", err);
  process.exit(1);
}
