/**
 * Il "prossimo passo" del cliente Ciak Start, calcolato dai dati VERI che l'area gia'
 * legge (risposte, scelte sul marchio, materiali approvati dal team, date delle tappe).
 * Solo presentazione: non sblocca niente e non inventa uno stato. Se i dati non ci sono
 * (caricamento o errore) il chiamante lo dice, il modello non risponde "tutto ok".
 *
 * Ordine: prima cio' che tocca al CLIENTE (domande, marchio), poi i materiali pronti da
 * usare, poi "tocca a noi". I materiali sono quelli del backend (`type` dei deliverable).
 */
import { START_DOMANDE, MIN_CARATTERI } from "../startDomande";

export const MATERIALI = [
  { type: "positioning", titolo: "Chi sei e cosa offri", tappa: 1 },
  { type: "brand_kit", titolo: "Il tuo marchio", tappa: 1 },
  { type: "social_profiles", titolo: "I tuoi profili social", tappa: 2 },
  { type: "showcase", titolo: "La tua pagina web", tappa: 2 },
  { type: "content_plan_90d", titolo: "Il calendario dei 60 giorni", tappa: 3 },
  { type: "partnership_readiness", titolo: "Il controllo finale", tappa: null },
];

export const TAPPE = {
  1: "Chi sei e il tuo marchio",
  2: "Profili social e pagina web",
  3: "Il calendario dei 60 giorni",
};

/** Quante domande hanno una risposta utile (stessa soglia della pagina delle domande). */
export function domandeRisposte(answers) {
  return START_DOMANDE.filter((d) => String((answers || {})[d.id] || "").trim().length >= MIN_CARATTERI).length;
}

const approvati = (items) => new Set((items || []).map((d) => d.type));

/** La prima tappa che ha ancora materiali non approvati, con la sua data promessa. */
export function tappaCorrente(items, consegne) {
  const ok = approvati(items);
  for (const t of [1, 2, 3]) {
    const mancano = MATERIALI.filter((m) => m.tappa === t && !ok.has(m.type));
    if (mancano.length) return { numero: t, titolo: TAPPE[t], data: (consegne || [])[t - 1] || null };
  }
  return null;
}

export function startOggiModel({ risposte, marchio, deliverables, consegne }) {
  if (!risposte || !marchio) return { kind: "loading" };

  const ok = approvati(deliverables);
  const pronti = MATERIALI.filter((m) => ok.has(m.type)).length;
  const progress = { done: pronti, total: MATERIALI.length };
  const tappa = tappaCorrente(deliverables, consegne);
  const fatte = domandeRisposte(risposte.answers);
  const totDomande = START_DOMANDE.length;
  const base = { progress, tappa };

  if (!risposte.completato_at) {
    const iniziato = fatte > 0;
    return {
      ...base, kind: "action", badge: "Il tuo prossimo passo", to: "/cliente/start/domande",
      title: iniziato ? "Continua a rispondere alle domande su di te" : "Rispondi alle domande su di te",
      description: iniziato
        ? `Hai già risposto a ${fatte} domande su ${totDomande}. Ci vogliono pochi minuti per volta e si salva da solo: puoi fermarti e riprendere quando vuoi.`
        : `Sono ${totDomande} domande, una alla volta. Ci vogliono pochi minuti per volta e si salva da solo: puoi fermarti e riprendere quando vuoi.`,
      cta: iniziato ? "Continua con le domande" : "Inizia le domande",
    };
  }
  if (!marchio.completato_at) {
    return {
      ...base, kind: "action", badge: "Il tuo prossimo passo", to: "/cliente/start/marchio",
      title: (marchio.valori && Object.keys(marchio.valori).length) ? "Finisci di scegliere il tuo marchio" : "Scegli il tuo marchio",
      description: "Colori, modo di parlare, parole che ti rappresentano. Anche qui si salva da solo, e logo e foto sono facoltativi.",
      cta: (marchio.valori && Object.keys(marchio.valori).length) ? "Continua con il marchio" : "Inizia dal marchio",
    };
  }
  if (pronti === MATERIALI.length) {
    return {
      ...base, kind: "complete", badge: "Tutto pronto", to: "/cliente/materiali", cta: "Guarda i tuoi materiali",
      title: "Il tuo pacchetto è completo.",
      description: "Hai tutti i materiali. Trovi ogni passo spiegato, con un esempio, nella pagina dei tuoi materiali.",
    };
  }
  if (pronti > 0) {
    return {
      ...base, kind: "ready", badge: "Pronto per te", to: "/cliente/materiali", cta: "Guarda i tuoi materiali",
      title: pronti === 1 ? "Hai un materiale pronto da usare" : `Hai ${pronti} materiali pronti da usare`,
      description: "Apri i materiali: ogni passo è spiegato, con un esempio. Gli altri li stiamo preparando.",
    };
  }
  return {
    ...base, kind: "waiting", badge: "Ora tocca a noi", to: "/cliente/percorso", cta: "Guarda il percorso",
    title: "Stiamo preparando i tuoi materiali",
    description: tappa?.data
      ? `Hai fatto la tua parte, grazie. Li prepariamo e il primo ti arriva entro il ${tappa.data}.`
      : "Hai fatto la tua parte, grazie. Li prepariamo e te li mostriamo qui appena sono pronti.",
  };
}

/** Le 8 voci del percorso, con lo stato in parole semplici. */
export function startPercorsoModel({ risposte, marchio, deliverables }) {
  if (!risposte || !marchio) return null;
  const ok = approvati(deliverables);
  const fatte = domandeRisposte(risposte.answers);
  const inputs = [
    {
      id: "domande", titolo: "Rispondi alle domande su di te", tocca: "te",
      stato: risposte.completato_at ? "fatto" : "da_fare",
      nota: risposte.completato_at ? "Inviate" : fatte ? `${fatte} su ${START_DOMANDE.length}` : "Da iniziare",
      to: "/cliente/start/domande",
    },
    {
      id: "marchio", titolo: "Scegli il tuo marchio", tocca: "te",
      stato: marchio.completato_at ? "fatto" : "da_fare",
      nota: marchio.completato_at ? "Inviato" : (marchio.valori && Object.keys(marchio.valori).length) ? "Iniziato" : "Da iniziare",
      to: "/cliente/start/marchio",
    },
  ];
  const inviato = Boolean(risposte.completato_at && marchio.completato_at);
  const materiali = MATERIALI.map((m) => ({
    id: m.type, titolo: m.titolo, tocca: "noi", tappa: m.tappa,
    stato: ok.has(m.type) ? "fatto" : inviato ? "in_preparazione" : "in_attesa",
    nota: ok.has(m.type) ? "Pronto" : inviato ? "Lo stiamo preparando" : "Parte quando hai finito le tue parti",
    to: ok.has(m.type) ? "/cliente/materiali" : null,
  }));
  return [...inputs, ...materiali];
}
