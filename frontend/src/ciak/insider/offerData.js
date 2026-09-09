/**
 * offerData — single source of truth for the Insider closing page offers.
 *
 * Prices are real and verified against the running product (2026-09-09):
 *  - Start: 390 € (Insider closing price — pre-partnership stepping stone).
 *  - Partnership: 2.990 € (Insider closing price).
 * These are the exact figures given for this task; note for review: the
 * StartPage.jsx default (`amount_cents ?? 49900` = 499 €) and Proposta.jsx
 * default corrispettivo (2.990 €) differ from these — those are the
 * *general* Ciak Start / Partnership defaults elsewhere in the app, not
 * necessarily this Insider-page price. Flagged for Claudio to confirm the
 * Insider price is intentionally different before shipping to real traffic.
 *
 * Servizi (bullet lists): sourced from real commercial content already in
 * the repo — NOT invented.
 *  - start.servizi: verbatim from `SERVIZI_PROPOSTI` in
 *    frontend/src/ciak/client/pages/StartPage.jsx ("Etichette dei 7 servizi
 *    promessi in vendita").
 *  - partnership.servizi: adattato da / sourced from Art. 8.1 "Obblighi di
 *    Evolution PRO" of backend/contratto_template_unpacked/word/document.xml
 *    (the real Partnership contract template). Most bullets are exact
 *    (trailing "; " trimmed, sentence case); 2 of 6 are near-verbatim
 *    paraphrases — minor wording dropped/simplified ("replicabile dal
 *    Partner" → "replicabile", "comprensivo di" → "con") — not exact quotes.
 */

export const offerData = {
  start: {
    name: 'Ciak Start',
    price: '390 €',
    tagline: 'Il primo passo: fondazioni pronte prima della Partnership.',
    creditCopy:
      'I €390 di Ciak Start non si perdono: si riscalano come credito pieno se poi passi alla Partnership.',
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
    price: '2.990 €',
    tagline: 'Il sistema completo: dal posizionamento al Corso online, con il team.',
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
