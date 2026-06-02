/**
 * Motore di raccomandazione "Accelera la crescita" (Evolution One) — fase Ottimizza.
 *
 * Logica pura, data-triggered: dati il segnale del partner (KPI funnel + pochi flag),
 * restituisce QUALE servizio extra proporgli ORA, ordinato per leva. Stesso spirito di
 * getRecommendedLevel(kpi) in F7Ottimizzazione (che sceglie il TIER di continuità):
 * qui scegliamo l'EXTRA a-la-carte da comprare DA NOI.
 *
 * Ordine per leva (dal frame strategico Ottimizza, leva decrescente):
 *   1. anti-abbandono (consulenza 1:1)  — killer #1 = abbandono mese 2-3
 *   2. fill-rate webinar (lead magnet)  — webinar vuoto = fallimento piu comune
 *   3. traffico (gestione ADV)          — senza visite non parte nulla
 *   4. produzione (contenuti done-for-you) — il partner non pubblica con costanza
 *
 * I 4 extra NON sono la card Moltiplicatori (Fase 12): qui e cio che il partner compra
 * DA NOI per accelerare; i Moltiplicatori sono leve di scala SUE (vivono nel tier Scale).
 *
 * Stesso segnale puo alimentare l'alert al team (outreach umano allineato): tieni questa
 * funzione pura cosi e riusabile sia in UI sia lato notifiche.
 */

export const ACCELERA_CATALOG = {
  consulenza: {
    id: "consulenza",
    name: "Consulenza 1:1",
    tagline: "Sblocca con Claudio o Antonella",
    motivation:
      "Sei fermo da un po'. Una sessione individuale serve a capire dove sei bloccato e ripartire con una sola priorità chiara.",
    cta: "Prenota una consulenza",
  },
  lead_magnet: {
    id: "lead_magnet",
    name: "Lead magnet per il webinar",
    tagline: "Riempila il webinar live",
    motivation:
      "Hai contatti ma poche iscrizioni al webinar. Costruiamo un lead magnet che porta più persone davanti al tuo live, dove avvengono le vendite.",
    cta: "Crea il lead magnet",
  },
  adv: {
    id: "adv",
    name: "Gestione campagne ADV",
    tagline: "Porta traffico qualificato",
    motivation:
      "Le visite sono ancora poche e l'organico non basta a far decollare. Gestiamo noi le campagne per portare traffico mirato al tuo funnel.",
    cta: "Attiva la gestione ADV",
  },
  contenuti: {
    id: "contenuti",
    name: "Contenuti professionali done-for-you",
    tagline: "Pubblichiamo noi per te",
    motivation:
      "Il calendario c'è ma produrre e pubblicare con costanza ti porta via tempo. Creiamo e pubblichiamo noi i contenuti seguendo il tuo piano.",
    cta: "Delega i contenuti",
  },
};

/**
 * @param {object} signals
 * @param {object} [signals.kpi]            KPI funnel { visite, contatti, vendite, conversione }
 * @param {number} [signals.giorniDaUltimaAzione]  giorni dall'ultima "prossima azione" completata
 * @param {number} [signals.iscrittiWebinar]       iscritti all'ultimo/prossimo webinar
 * @param {boolean}[signals.pubblicaConCostanza]   il partner sta pubblicando il calendario?
 * @returns {Array<object>} extra consigliati, ordinati per leva, ognuno { ...catalogo, reason, priority }
 */
export function recommendAccelera(signals = {}) {
  const { kpi = {}, giorniDaUltimaAzione, iscrittiWebinar, pubblicaConCostanza } = signals;
  const visite = kpi.visite ?? 0;
  const contatti = kpi.contatti ?? 0;

  const out = [];

  // 1. Anti-abbandono: fermo da troppo tempo (killer #1). Soglia 14 giorni.
  if (typeof giorniDaUltimaAzione === "number" && giorniDaUltimaAzione >= 14) {
    out.push({
      ...ACCELERA_CATALOG.consulenza,
      priority: 1,
      reason: `Nessuna azione completata da ${giorniDaUltimaAzione} giorni.`,
    });
  }

  // 2. Fill-rate webinar basso: ha contatti ma poche iscrizioni al live.
  if (contatti > 10 && typeof iscrittiWebinar === "number" && iscrittiWebinar < Math.max(5, contatti * 0.1)) {
    out.push({
      ...ACCELERA_CATALOG.lead_magnet,
      priority: 2,
      reason: `${iscrittiWebinar} iscritti al webinar su ${contatti} contatti: il live si riempie poco.`,
    });
  }

  // 3. Traffico basso: l'organico non porta abbastanza visite.
  if (visite < 200) {
    out.push({
      ...ACCELERA_CATALOG.adv,
      priority: 3,
      reason: visite === 0 ? "Nessuna visita ancora tracciata." : `Solo ${visite} visite finora.`,
    });
  }

  // 4. Produzione: non pubblica con costanza il calendario.
  if (pubblicaConCostanza === false) {
    out.push({
      ...ACCELERA_CATALOG.contenuti,
      priority: 4,
      reason: "Il calendario c'è ma la pubblicazione è discontinua.",
    });
  }

  out.sort((a, b) => a.priority - b.priority);
  return out;
}

/** L'extra a piu alta leva da mostrare ORA (o null se nessun segnale attivo). */
export function topAcceleraReco(signals = {}) {
  return recommendAccelera(signals)[0] || null;
}
