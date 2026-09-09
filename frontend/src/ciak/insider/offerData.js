/**
 * offerData — single source of truth for the Insider closing page offers.
 *
 * Copy di vendita APPROVATO da Claudio (9/9/2026): usare verbatim. Modello
 * foot-in-the-door — Ciak Start è il primo passo dato per scontato, poi la
 * Partnership è l'upgrade ("turbo") e resta il trattamento visivo hero.
 *
 * Prezzi da `frontend/src/ciak/pricing.js` (SSOT), listino 2026-09-09:
 *  - Start 390 € · Partnership 2.990 € · upgrade da Start 2.600 €.
 *
 * Servizi (bullet lists): contenuto commerciale reale già nel repo — NON inventati.
 *  - start.servizi: verbatim da `SERVIZI_PROPOSTI` in StartPage.jsx.
 *  - partnership.servizi: da Art. 8.1 "Obblighi di Evolution PRO" del contratto
 *    reale (backend/contratto_template_unpacked/word/document.xml).
 */

import { PRICING } from '../pricing';

export const offerData = {
  start: {
    name: 'Ciak Start',
    price: PRICING.start.label,
    priceNote: 'si riscalano interi sulla Partnership',
    body:
      'Prima di costruire il sistema di vendita, dobbiamo mettere in ordine le fondamenta: '
      + 'posizionamento, basi del brand, presenza, contenuti. È il minimo necessario perché '
      + 'tutto il resto poggi su una direzione chiara, non sul rumore e sulla confusione.',
    creditCopy:
      'Non è una spesa a parte: i 390 € tornano interi come credito quando passi alla '
      + 'Partnership. È il primo passo e non lo fai da solo.',
    cta: 'Inizia da Ciak Start',
    servizi: [
      'Direzione di posizionamento',
      'Basi del brand',
      'Sistemazione profili social',
      'Sito vetrina semplice',
      'Strategia contenuti',
      'Calendario contenuti',
      'Revisione finale e readiness partnership',
    ],
  },
  partnership: {
    name: 'Partnership Evolution PRO',
    price: PRICING.partnership.label,
    priceNote: `oppure ${PRICING.upgradeFromStart.label} dopo il primo passo con Ciak Start`,
    body: [
      "Qui non prepari le fondamenta: costruisci e metti in strada l'intero sistema che "
      + 'trasforma la tua competenza in un Corso che vende. Posizionamento, offerta, piattaforma, '
      + "funnel, lancio, piano editoriale — dalla direzione all'implementazione, con il team al tuo fianco.",
      'È il punto dove il tuo progetto smette di essere una presenza e diventa un modello. '
      + 'Non lo fai da solo: ti accompagna il team.',
    ],
    cta: 'Entra in Partnership',
    servizi: [
      'Analisi strategica iniziale e definizione del posizionamento del progetto',
      "Supporto alla strutturazione dei contenuti formativi e dell'offerta commerciale",
      'Configurazione tecnica della piattaforma di marketing e vendita (Systeme.io o equivalente), inclusi area corsi, funnel e automazioni',
      'Realizzazione e ottimizzazione degli asset digitali necessari alla vendita del Corso (pagine, copy, materiali di supporto)',
      'Definizione di un piano editoriale mensile dedicato alla fase di lancio del Corso, replicabile nella fase post-lancio',
      'Accesso a un gruppo Telegram dedicato e a un videocorso formativo riservato, con risorse supplementari scaricabili',
    ],
  },
};
