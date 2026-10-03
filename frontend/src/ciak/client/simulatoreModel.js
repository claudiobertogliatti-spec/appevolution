/**
 * Modello del "Simulatore Corsi" dell'area cliente (/cliente/simulatore).
 *
 * Funzioni pure, nessun React: il componente le chiama e basta.
 *
 * ⛔ Le percentuali degli scenari sono IPOTESI DI LAVORO, non dati misurati: oggi non esiste
 * nessun tasso reale di lancio. La pagina lo dice e non presenta mai il risultato come promessa.
 * Quando ci saranno lanci misurati si sostituiscono qui, in un posto solo.
 *
 * Condizioni economiche = quelle del contratto (vedi proposta_chat.py):
 *  - Partnership 2.990 € una tantum (PRICING, SSOT del listino);
 *  - royalty 10% sull'Importo Netto Incassato per 12 mesi dalla firma.
 *    Qui è applicata all'incasso lordo del simulatore: è un po' più prudente del contratto,
 *    che la calcola al netto di rimborsi e commissioni di pagamento.
 */
import { PRICING } from '../pricing';

export const PARTNERSHIP_EUR = PRICING.partnership.cents / 100;
export const ROYALTY = 0.1;
export const MESI = 12;
export const PREZZO_MIN = 97;
export const PREZZO_MAX = 297;

/**
 * Due scenari, volutamente senza uno "centrale": non vogliamo dare l'idea di un risultato
 * "normale" da aspettarsi. Il Prudente è quello da cui si parte.
 */
export const SCENARI = {
  prudente: {
    label: 'Prudente',
    contatti: 150, // persone che lasciano i dati prima della prima live
    iscritti: 30, // % dei contatti che si iscrive alla live
    presenti: 25, // % degli iscritti che si presenta
    acquisti: 3, // % dei presenti che compra
    resa: 40, // % di contatti delle live successive rispetto alla prima
    quotaSecondo: 40, // % dei contatti interessata al secondo corso (se c'è)
    relSecondo: 60, // acquisti del secondo corso rispetto al primo, in %
  },
  ambizioso: {
    label: 'Ambizioso',
    contatti: 1000,
    iscritti: 40,
    presenti: 35,
    acquisti: 10,
    resa: 60,
    quotaSecondo: 40,
    relSecondo: 60,
  },
};

export const INPUT_INIZIALI = {
  prezzo1: 197,
  secondo: false,
  prezzo2: 147,
  lancio: 3, // mese della prima live (mese 1 = firma)
  adsGiorno: 0,
  cpl: 3, // € per ogni contatto portato dalla pubblicità
};

export function limita(valore, min, max) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Prezzi sempre dentro la fascia consentita ai corsi dei partner (97–297 €). */
export function prezzoValido(valore) {
  return limita(valore, PREZZO_MIN, PREZZO_MAX);
}

/**
 * Simula 12 mesi. `inp` = progetto (prezzi, mese live, pubblicità), `ip` = ipotesi sul pubblico.
 * Una live al mese `lancio`, poi ogni 2 mesi fino al mese 12.
 */
export function simula(inp, ip) {
  const lancio = limita(inp.lancio, 1, MESI);
  const quota2 = inp.secondo ? limita(ip.quotaSecondo, 0, 100) / 100 : 0;
  const rel2 = inp.secondo ? limita(ip.relSecondo, 0, 100) / 100 : 0;
  const p1 = prezzoValido(inp.prezzo1);
  const p2 = prezzoValido(inp.prezzo2);
  const cpl = Math.max(0.5, Number(inp.cpl) || 0.5);
  const ads = Math.max(0, Number(inp.adsGiorno) || 0);

  const live = [];
  const incassi = Array(MESI).fill(0);
  for (let m = lancio, k = 0; m <= MESI; m += 2, k += 1) {
    const organici = ip.contatti * Math.pow(ip.resa / 100, k);
    // la pubblicità raccoglie contatti nel mese di contenuti prima della prima live, poi nei 2 mesi tra una live e l'altra
    const daAds = ads > 0 ? (ads * 30 * (k === 0 ? 1 : 2)) / cpl : 0;
    const contatti = organici + daAds;
    const iscritti = contatti * (ip.iscritti / 100);
    const presenti = iscritti * (ip.presenti / 100);
    const c = ip.acquisti / 100;
    const acq1 = presenti * (1 - quota2) * c;
    const acq2 = presenti * quota2 * c * rel2;
    const incasso = acq1 * p1 + acq2 * p2;
    live.push({ mese: m, contatti, iscritti, presenti, acquirenti: acq1 + acq2, incasso });
    incassi[m - 1] += incasso;
  }

  const costi = Array(MESI).fill(0); // costi fissi e pubblicità, senza royalty
  costi[0] += PARTNERSHIP_EUR;
  for (let m = Math.max(1, lancio - 1); m <= MESI; m += 1) costi[m - 1] += ads * 30;
  const royalty = incassi.map((x) => x * ROYALTY);

  const cumulato = [];
  let somma = 0;
  let pareggio = null;
  for (let i = 0; i < MESI; i += 1) {
    somma += incassi[i] - royalty[i] - costi[i];
    cumulato.push(somma);
    if (pareggio === null && somma >= 0 && incassi.slice(0, i + 1).some((x) => x > 0)) pareggio = i + 1;
  }
  const somma_ = (a) => a.reduce((x, y) => x + y, 0);
  const totIncassi = somma_(incassi);
  const totCosti = somma_(costi) + somma_(royalty);
  return {
    live,
    incassi,
    costi,
    royalty,
    cumulato,
    pareggio,
    totIncassi,
    totCosti,
    netto: totIncassi - totCosti,
    acquirenti: live.reduce((x, l) => x + l.acquirenti, 0),
  };
}

/**
 * Calcolo inverso: quanti contatti servono alla prima live per incassare `obiettivo` €.
 * Ignora la pubblicità (conta solo il pubblico che c'è già).
 */
export function contattiNecessari(obiettivo, inp, ip) {
  const quota2 = inp.secondo ? limita(ip.quotaSecondo, 0, 100) / 100 : 0;
  const rel2 = inp.secondo ? limita(ip.relSecondo, 0, 100) / 100 : 0;
  const perPresente =
    (ip.acquisti / 100) * ((1 - quota2) * prezzoValido(inp.prezzo1) + quota2 * rel2 * prezzoValido(inp.prezzo2));
  const k = (ip.iscritti / 100) * (ip.presenti / 100);
  if (perPresente <= 0 || k <= 0) return null;
  const presenti = obiettivo / perPresente;
  const iscritti = presenti / (ip.presenti / 100);
  const contatti = iscritti / (ip.iscritti / 100);
  const acquirenti = presenti * (ip.acquisti / 100) * ((1 - quota2) + quota2 * rel2);
  return { acquirenti, presenti, iscritti, contatti };
}
