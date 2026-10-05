/**
 * Ricerca ⌘K — regole pure (niente rete, niente React).
 *
 * La ricerca per persona vive nel backend (`GET /api/admin/ciak/cerca`): qui ci sono
 * solo le decisioni dell'interfaccia — a che pagina porta una persona, come si
 * scrive il suo stato, quali pagine del menu corrispondono al testo.
 */

/** Sotto questa lunghezza non si cercano persone (come il backend). */
export const CERCA_MIN = 2;
/** Le pagine invece da 3 lettere: con 2 quasi ogni pagina contiene quelle lettere. */
export const PAGINE_MIN = 3;

// Stati del funnel gratuito, scritti per chi legge (stessi testi di Lead).
const STATO_LABEL = {
  lead_created: "Lead",
  ciak_started: "Questionario iniziato",
  ciak_completed: "Questionario completato",
  report_generated: "Analisi pronta",
  call_booked: "Call prenotata",
  call_done: "Call fatta",
};

export const statoLabel = (stato) => STATO_LABEL[stato] || null;

/** Tono del badge per tipo di persona (il testo del badge e' sempre scritto). */
export const TIPO_TONE = { lead: "neutral", cliente_start: "info", partner: "good" };

/**
 * Dove si apre una persona. La scheda lead (`/admin/leads/:email`) mostra anche se e'
 * cliente Start o partner: vale per chiunque abbia un questionario o un opt-in. Un
 * partner storico senza scheda lead ripiega sulla Pipeline Partner.
 */
export function hrefPersona(item) {
  if (item.ha_scheda || item.tipo !== "partner") {
    return `/admin/leads/${encodeURIComponent(item.email)}`;
  }
  return "/admin/partner";
}

const norm = (s) => String(s || "").toLocaleLowerCase("it-IT");

/**
 * Pagine del menu che corrispondono al testo. Chi ha il testo nel titolo viene prima
 * di chi lo ha solo nella descrizione o nel reparto.
 */
export function filtraPagine(pagine, testo, max = 5) {
  const q = norm(testo).trim();
  if (q.length < PAGINE_MIN) return [];
  const trovate = (pagine || [])
    .map((p) => {
      const titolo = norm(p.label).includes(q);
      const altro = norm(`${p.desc || ""} ${p.department || ""}`).includes(q);
      return titolo || altro ? { ...p, _rango: titolo ? 0 : 1 } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a._rango - b._rango);
  return trovate.slice(0, max).map(({ _rango, ...p }) => p);
}

/** Tasti freccia: indice attivo con giro completo (dall'ultimo al primo e viceversa). */
export function muovi(indice, delta, totale) {
  if (totale <= 0) return -1;
  if (indice < 0) return delta > 0 ? 0 : totale - 1;
  return (indice + delta + totale) % totale;
}
